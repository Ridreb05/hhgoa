// Runs only against a real cluster: TG_LIVE=1 npm run test:live
// Requires `npm run tg:setup && npm run seed:tigergraph` to have been run.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TigerGraphAdapter } from '../../lib/graph/tigergraph-adapter';
import demoData from '../../data/demo/entities.json';
import { generateDataset } from '../../scripts/lib/dataset';

const live = process.env.TG_LIVE === '1';
const envFile = path.resolve(process.cwd(), '.env.local');
if (live && fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#') && t.includes('=')) {
      const [k, ...rest] = t.split('=');
      process.env[k.trim()] ??= rest.join('=').trim();
    }
  }
}
const truthFile = path.resolve(process.cwd(), 'data/generated/ground_truth.json');

describe.skipIf(!live)('live TigerGraph cluster', () => {
  const tg = new TigerGraphAdapter({ timeoutMs: 60_000, scope: 'synthetic' });
  const truth = fs.existsSync(truthFile) ? JSON.parse(fs.readFileSync(truthFile, 'utf-8')) : null;

  it('is reachable and ONLINE', async () => {
    expect((await tg.checkHealth()).status).toBe('ONLINE');
  });

  it('finds every planted fast ring and none of the slow decoys', async () => {
    const res = await tg.detectCycles(600, 5);
    const key = (xs: string[]) => [...xs].sort().join('|');
    const found = new Set(res.cycles.map((c) => key(c.hops.slice(0, -1))));
    for (const ring of truth.fast_rings) expect(found.has(key(ring.wallets))).toBe(true);
    for (const slow of truth.slow_cycles) expect(found.has(key(slow.wallets))).toBe(false);
  });

  it('recovers planted sybil farms and does not cluster exchange crowds', async () => {
    const res = await tg.getSybilClusters(5);
    const members = res.clusters.map((c) => new Set(c.member_wallets));
    for (const farm of truth.sybil_farms) {
      const best = Math.max(0, ...members.map((m) => farm.wallets.filter((w: string) => m.has(w)).length));
      expect(best / farm.wallets.length).toBeGreaterThanOrEqual(0.8);
    }
    expect(res.clusters.every((c) => c.member_count < 100)).toBe(true);
  });

  it('community detection agrees with an independent client-side union-find, member for member', async () => {
    // Same rules as ghostshield_sybil_clusters, re-implemented from the raw dataset.
    const ds = generateDataset(truth.wallets, truth.seed);
    const demo: any = demoData.edges;
    const control = [...ds.controlEdges, ...demo.control_edges];
    const funding = [...ds.fundingEdges, ...demo.funding_edges];
    const AGENT_CAP = 100, FUNDER_CAP = 500, BURST_MIN = 5, BURST = 7200, MIN = 2;

    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      let r = x;
      while (parent.get(r) !== r) r = parent.get(r)!;
      parent.set(x, r);
      return r;
    };
    const union = (a: string, b: string) => parent.set(find(a), find(b));

    const byAgent = new Map<string, string[]>();
    control.forEach((c: any) => byAgent.set(c.from, [...(byAgent.get(c.from) || []), c.to]));
    for (const ws of byAgent.values()) if (ws.length <= AGENT_CAP) ws.forEach((w) => union(ws[0], w));

    const funderDegree = new Map<string, number>();
    funding.forEach((f: any) => funderDegree.set(f.from, (funderDegree.get(f.from) || 0) + 1));
    const bursts = new Map<string, string[]>();
    funding.forEach((f: any) => {
      if ((funderDegree.get(f.from) || 0) > FUNDER_CAP) return;
      const k = `${f.from}:${Math.floor(f.funding_timestamp / BURST)}`;
      bursts.set(k, [...(bursts.get(k) || []), f.to]);
    });
    for (const ws of bursts.values()) if (ws.length >= BURST_MIN) ws.forEach((w) => union(ws[0], w));

    const comps = new Map<string, Set<string>>();
    for (const w of parent.keys()) {
      const r = find(w);
      comps.set(r, (comps.get(r) || new Set()).add(w));
    }
    const expected = [...comps.values()].filter((c) => c.size >= MIN);

    const res = await tg.getSybilClusters(MIN);
    // structures planted by scripts/evasion_study.ts are not part of the generated dataset
    const evasionFile = path.resolve(process.cwd(), 'data/generated/evasion_truth.json');
    const evasion = new Set<string>(fs.existsSync(evasionFile) ? JSON.parse(fs.readFileSync(evasionFile, 'utf-8')).wallets : []);
    const isEvasion = (c: { member_wallets: string[] }) => c.member_wallets.every((w) => evasion.has(w));
    const actual = res.clusters.filter((c) => !isEvasion(c));
    if (evasion.size > 0) expect(res.clusters.filter(isEvasion).length).toBe(12); // 4 farms x 3 fragments
    expect(actual.length).toBe(expected.length);

    const expectedBySize = expected.map((c) => c.size).sort((a, b) => a - b);
    expect(actual.map((c) => c.member_count).sort((a, b) => a - b)).toEqual(expectedBySize);
    // members are reported up to 40 per cluster: compare exact membership for every cluster that fits
    for (const c of actual.filter((c) => c.member_count <= 40)) {
      const match = expected.find((e) => c.member_wallets.every((w) => e.has(w)) && e.size === c.member_count);
      expect(match, `cluster ${c.root_entity_id} has no exact counterpart`).toBeDefined();
    }
  });

  it('ranks planted tainted wallets at the top of risk propagation', async () => {
    const res = await tg.getRiskPropagation(4, 100);
    const tainted = new Set(Object.keys(truth.tainted));
    const topK = res.top_risk_wallets.slice(0, tainted.size).filter((w) => tainted.has(w.wallet_id)).length;
    expect(topK / tainted.size).toBeGreaterThan(0.8);
  });

  it('risk evidence reports a windowed cycle for a ring wallet and none for a slow decoy', async () => {
    const ring = truth.fast_rings[0].wallets;
    const hit = await tg.getRiskEvidence(ring[0], { from_wallet: ring[0], to_wallet: ring[1], amount: 1, asset: 'ETH' });
    expect(hit.detected_cycle_count).toBeGreaterThan(0);
    const decoy = truth.slow_cycles[0].wallets;
    const miss = await tg.getRiskEvidence(decoy[0], { from_wallet: decoy[0], to_wallet: decoy[1], amount: 1, asset: 'ETH' });
    expect(miss.detected_cycle_count).toBe(0);
  });

  it('finds a temporally ordered path through a ring', async () => {
    const [a, , c] = truth.fast_rings[0].wallets;
    const res = await tg.findPath(a, c, 3);
    expect(res.paths_found).toBeGreaterThan(0);
    expect(res.paths[0].hops.length).toBeGreaterThan(0);
  });
});
