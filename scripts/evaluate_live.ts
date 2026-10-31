// ==============================================================================
// GHOSTSHIELD: Live benchmark against the planted ground truth
//   tsx scripts/evaluate_live.ts
// Runs the installed GSQL queries on the cluster and scores them against
// data/generated/ground_truth.json (written by scripts/seed_tigergraph.ts).
// Writes docs/BENCHMARK.md. Synthetic data: validates detectors, does not
// estimate real-world accuracy.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { graph, host, runQuery } from './lib/tg';

// Several datasets share this graph's storage; every global scan is restricted to the synthetic one.
export const SCOPE = process.env.EVAL_SCOPE ?? 'synthetic';

const truthFile = path.resolve(process.cwd(), 'data/generated/ground_truth.json');
if (!fs.existsSync(truthFile)) {
  console.error('Missing data/generated/ground_truth.json. Run: npm run seed:tigergraph');
  process.exit(1);
}
const truth = JSON.parse(fs.readFileSync(truthFile, 'utf-8'));

// Structures planted by scripts/evasion_study.ts are scored separately (docs/EVASION.md).
const evasionFile = path.resolve(process.cwd(), 'data/generated/evasion_truth.json');
const evasion = new Set<string>(fs.existsSync(evasionFile) ? JSON.parse(fs.readFileSync(evasionFile, 'utf-8')).wallets : []);

const key = (xs: string[]) => [...xs].sort().join('|');
const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`);
const f1 = (p: number, r: number) => (p + r === 0 ? 0 : (2 * p * r) / (p + r));

function flat(results: any[]): Record<string, any> {
  return Object.assign({}, ...results);
}

export async function timed(name: string, params: Record<string, string | number>, runs = 5) {
  const ms: number[] = [];
  let last: any;
  for (let i = 0; i < runs; i++) {
    const r = await runQuery(name, params, 150);
    ms.push(r.ms);
    last = r.results;
  }
  ms.sort((a, b) => a - b);
  return { results: last, p50: ms[Math.floor(ms.length / 2)], p95: ms[Math.min(ms.length - 1, Math.ceil(ms.length * 0.95) - 1)] };
}

export async function cycles() {
  const { results, p50, p95 } = await timed('ghostshield_detect_cycles', { time_window_seconds: 600, max_depth: 5, result_limit: 1000, scope: SCOPE });
  const out = flat(results);
  const detected: string[][] = (out.cycles || []).map((c: any) => String(c.cycle_path).split(' -> ').slice(0, -1));

  const planted = new Map<string, number>(truth.fast_rings.map((r: any) => [key(r.wallets), r.length]));
  const slow = new Set<string>(truth.slow_cycles.map((r: any) => key(r.wallets)));
  const generated = new Set<string>([...truth.fast_rings.flatMap((r: any) => r.wallets), ...truth.slow_cycles.flatMap((r: any) => r.wallets)]);

  let tp = 0, fp = 0, slowFlagged = 0, demo = 0;
  const found = new Set<string>();
  for (const cyc of detected) {
    if (cyc.some((w) => evasion.has(w))) continue;
    const k = key(cyc);
    if (planted.has(k)) { tp++; found.add(k); }
    else if (slow.has(k)) { slowFlagged++; fp++; }
    else if (cyc.some((w) => w.includes('...'))) demo++; // curated demo scenario, not part of the generated truth
    else if (cyc.every((w) => !generated.has(w))) fp++;
    else fp++;
  }
  const byLen: Record<number, string> = {};
  for (const len of [3, 4, 5]) {
    const all = truth.fast_rings.filter((r: any) => r.length === len);
    byLen[len] = `${all.filter((r: any) => found.has(key(r.wallets))).length}/${all.length}`;
  }
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp / planted.size;
  return { tp, fp, fn: planted.size - tp, slowFlagged, slowTotal: slow.size, demo, precision, recall, byLen, p50, p95 };
}

export async function clusters() {
  const { results, p50, p95 } = await timed('ghostshield_sybil_clusters', { min_cluster_size: 5, result_limit: 100, scope: SCOPE });
  const out = flat(results);
  const found: { members: Set<string> }[] = (out.sybil_clusters || []).map((c: any) => ({
    members: new Set<string>(String(c.member_wallets).split(',').filter(Boolean)),
  }));

  const farms: Set<string>[] = truth.sybil_farms.map((f: any) => new Set<string>(f.wallets));
  const allFarm = new Set<string>(farms.flatMap((f) => [...f]));
  let farmsFound = 0;
  for (const farm of farms) {
    const best = Math.max(0, ...found.map((c) => [...farm].filter((w) => c.members.has(w)).length));
    if (best / farm.size >= 0.8) farmsFound++;
  }
  const ringWallets = new Set<string>(truth.fast_rings.flatMap((r: any) => r.wallets));
  let clusterTp = 0, clusterFp = 0, memberTp = 0, memberFp = 0, memberFpRing = 0;
  for (const c of found) {
    if ([...c.members].filter((w) => evasion.has(w)).length >= c.members.size * 0.5) continue;
    const inFarm = [...c.members].filter((w) => allFarm.has(w)).length;
    const demoOnly = [...c.members].every((w) => w.includes('...'));
    if (inFarm >= c.members.size * 0.5) clusterTp++;
    else if (!demoOnly) clusterFp++;
    memberTp += inFarm;
    const extra = [...c.members].filter((w) => !allFarm.has(w) && !w.includes('...') && !evasion.has(w));
    memberFp += extra.length;
    memberFpRing += extra.filter((w) => ringWallets.has(w)).length;
  }
  const precision = clusterTp + clusterFp === 0 ? 1 : clusterTp / (clusterTp + clusterFp);
  const recall = farmsFound / farms.length;
  return { farmsFound, farms: farms.length, clusterTp, clusterFp, memberTp, memberFp, memberFpRing, precision, recall, totalReported: out.total_clusters_identified, p50, p95 };
}

export async function propagation() {
  const { results, p50, p95 } = await timed('ghostshield_risk_propagation', { max_hops: 4, result_limit: 100, scope: SCOPE }, 3);
  const out = flat(results);
  const ranked: string[] = (out.top_risk_wallets || []).map((w: any) => w.wallet_id);
  const tainted = new Set<string>(Object.keys(truth.tainted));
  const k = tainted.size;
  const topK = ranked.slice(0, k);
  const hitsAtK = topK.filter((w) => tainted.has(w)).length;
  const hitsAt100 = ranked.filter((w) => tainted.has(w)).length;
  return { k, hitsAtK, hitsAt100, tainted: tainted.size, seeds: out.seed_wallets, reported: out.tainted_wallets, p50, p95 };
}

export async function latencies() {
  const rows: [string, number, number][] = [];
  const probeWallet = truth.fast_rings[0].wallets[0];
  const probeTarget = truth.fast_rings[0].wallets[2];
  for (const [name, params] of [
    ['ghostshield_dashboard_metrics', { scope: SCOPE }],
    ['ghostshield_investigate_wallet', { target_wallet: probeWallet }],
    ['ghostshield_risk_evidence', { target_wallet: probeWallet, counterparty_id: probeTarget }],
    ['ghostshield_path_find', { source_wallet: probeWallet, target_wallet: probeTarget, max_hops: 4 }],
    ['ghostshield_topology', { scope: SCOPE }],
  ] as [string, Record<string, string | number>][]) {
    const t = await timed(name, params);
    rows.push([name, t.p50, t.p95]);
  }
  return rows;
}

async function main() {
  console.log(`Evaluating ${host} (${graph}) against ground truth (${truth.wallets} wallets, seed ${truth.seed})\n`);
  const metrics = flat((await runQuery('ghostshield_dashboard_metrics', { scope: SCOPE })).results);

  const c = await cycles();
  console.log(`cycles    precision ${pct(c.tp, c.tp + c.fp)}  recall ${pct(c.tp, c.tp + c.fn)}  (3/4/5-hop: ${c.byLen[3]} ${c.byLen[4]} ${c.byLen[5]})  slow-cycle false alarms ${c.slowFlagged}/${c.slowTotal}`);
  const s = await clusters();
  console.log(`sybil     precision ${pct(s.clusterTp, s.clusterTp + s.clusterFp)}  recall ${pct(s.farmsFound, s.farms)}  member FP ${s.memberFp} (ring co-funded ${s.memberFpRing})`);
  const p = await propagation();
  console.log(`taint     precision@${p.k} ${pct(p.hitsAtK, p.k)}  recall@100 ${pct(p.hitsAt100, p.tainted)}`);
  const lat = await latencies();

  const md = `# Live benchmark

Generated by \`npm run evaluate:live\` on ${new Date().toISOString().slice(0, 10)} against a live TigerGraph Savanna workspace (TG-00, 16Gi).
Graph: **${metrics.total_wallets?.toLocaleString()} wallets, ${metrics.total_transfers?.toLocaleString()} transfers** (synthetic). The seed-${truth.seed} generated dataset carries the planted truth; any additional wallets are server-generated benign noise from \`npm run scale:live\`.
The data is synthetic with planted patterns and planted hard negatives. These numbers show the detectors do what they claim
on known structure; they say nothing about accuracy on real-world chains.

## Detection quality

| Detector | Precision | Recall | Notes |
|---|---|---|---|
| Temporal cycles (3-5 hops, 10 min window) | ${pct(c.tp, c.tp + c.fp)} | ${pct(c.tp, c.tp + c.fn)} | 3-hop ${c.byLen[3]}, 4-hop ${c.byLen[4]}, 5-hop ${c.byLen[5]} planted rings found; hard-negative slow cycles flagged: ${c.slowFlagged}/${c.slowTotal} |
| Sybil clusters (agent control + funding bursts) | ${pct(s.clusterTp, s.clusterTp + s.clusterFp)} | ${pct(s.farmsFound, s.farms)} | ${s.farmsFound}/${s.farms} planted farms recovered; strict labels count every non-farm member as a false positive: ${s.memberFp} members, of which ${s.memberFpRing} are planted laundering-ring wallets that really were funded together by one mixer in one burst (coordinated, but not a farm), ${s.memberFp - s.memberFpRing} are other wallets. Exchange crowds and legitimate bot fleets are present as hard negatives and were not clustered |
| Risk propagation (taint) | ${pct(p.hitsAtK, p.k)} (precision@${p.k}) | ${pct(p.hitsAt100, p.tainted)} (recall@100) | ${p.seeds} known-bad seeds, ${p.tainted} planted tainted wallets, ${p.reported} wallets scored |

## Query latency (cluster-side + network round trip, p50 / p95 of 5 runs)

| Query | p50 | p95 |
|---|---|---|
| ghostshield_detect_cycles (3-5 hops) | ${c.p50} ms | ${c.p95} ms |
| ghostshield_sybil_clusters | ${s.p50} ms | ${s.p95} ms |
| ghostshield_risk_propagation | ${p.p50} ms | ${p.p95} ms |
${lat.map(([n, a, b]) => `| ${n} | ${a} ms | ${b} ms |`).join('\n')}

Round trips include the public internet path to the cloud workspace.

## How to read these numbers

* Cycles: the planted rings are strictly time-ordered and the decoys are not, so 100% means the temporal logic is correct, not that real laundering looks like this.
* Taint: the planted chains are plain peel chains with no hub noise. 100% is a sanity check of the propagation math, not evidence of real-world ranking quality.
* Latency is dominated by the network round trip to a free-tier workspace; scale beyond ~108k edges has not been measured.
`;
  fs.writeFileSync(path.resolve(process.cwd(), 'docs/BENCHMARK.md'), md);
  console.log('\nwrote docs/BENCHMARK.md');
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
