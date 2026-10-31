import { describe, it, expect } from 'vitest';
import { generateDataset, T0 } from '../../scripts/lib/dataset';

describe('scale dataset generator', () => {
  const a = generateDataset(4000, 7);
  const b = generateDataset(4000, 7);
  const c = generateDataset(4000, 8);

  it('is deterministic per seed and differs across seeds', () => {
    expect(a.transfers.slice(0, 50)).toEqual(b.transfers.slice(0, 50));
    expect(a.truth).toEqual(b.truth);
    expect(a.wallets[0].id).not.toBe(c.wallets[0].id);
  });

  it('never emits two transfers for the same ordered pair (REST++ keeps one edge per pair)', () => {
    const seen = new Set<string>();
    for (const t of a.transfers) {
      const k = `${t.from}|${t.to}`;
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });

  it('plants fast rings that close inside 10 minutes in strict time order', () => {
    const byPair = new Map(a.transfers.map((t) => [`${t.from}|${t.to}`, t]));
    expect(a.truth.fast_rings.length).toBeGreaterThan(0);
    for (const ring of a.truth.fast_rings) {
      const hops = ring.wallets.map((w, i) => byPair.get(`${w}|${ring.wallets[(i + 1) % ring.length]}`)!);
      hops.forEach((h) => expect(h).toBeDefined());
      for (let i = 1; i < hops.length; i++) expect(hops[i].event_timestamp).toBeGreaterThanOrEqual(hops[i - 1].event_timestamp);
      expect(hops[hops.length - 1].event_timestamp - hops[0].event_timestamp).toBeLessThan(600);
    }
  });

  it('plants slow cycles as hard negatives that exceed the window', () => {
    const byPair = new Map(a.transfers.map((t) => [`${t.from}|${t.to}`, t]));
    let checked = 0;
    for (const { wallets } of a.truth.slow_cycles) {
      const hops = wallets.map((w, i) => byPair.get(`${w}|${wallets[(i + 1) % 3]}`));
      if (hops.some((h) => !h)) continue; // a benign pair may have pre-existed and been deduplicated
      const ts = hops.map((h) => h!.event_timestamp);
      expect(Math.max(...ts) - Math.min(...ts)).toBeGreaterThan(600);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('plants sybil farms with one agent and a small-fan-out funder, and mega-funders as hard negatives', () => {
    const fanOut = (f: string) => a.fundingEdges.filter((e) => e.from === f).length;
    for (const farm of a.truth.sybil_farms) {
      expect(farm.wallets.length).toBeGreaterThanOrEqual(8);
      expect(fanOut(farm.funder)).toBe(farm.wallets.length);
      const controlled = a.controlEdges.filter((e) => e.from === farm.agent).length;
      expect(controlled).toBe(farm.wallets.length);
    }
    for (const f of a.truth.crowd_funders) expect(fanOut(f)).toBeGreaterThan(100);
    for (const agent of a.truth.bot_fleet_agents) expect(a.controlEdges.filter((e) => e.from === agent).length).toBeGreaterThan(100);
  });

  it('plants taint chains hanging off known-bad seeds with increasing hop distance', () => {
    expect(a.truth.seeds.length).toBeGreaterThan(0);
    const seedSet = new Set(a.truth.seeds);
    expect(a.wallets.filter((w) => w.is_risk_seed).every((w) => seedSet.has(w.id))).toBe(true);
    for (const hop of Object.values(a.truth.tainted)) expect(hop).toBeGreaterThanOrEqual(1);
    expect(a.transfers.every((t) => t.event_timestamp >= T0 - 1)).toBe(true);
  });
});
