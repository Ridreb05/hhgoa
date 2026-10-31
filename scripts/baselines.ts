// ==============================================================================
// GHOSTSHIELD: Naive baselines on the same generated dataset (no cluster needed)
//   tsx scripts/baselines.ts
// Quantifies what each design choice buys: time-aware cycles vs topology-only,
// hub-pruned clustering vs "shares a funder", value-weighted multi-hop taint vs
// 1-hop exposure. Writes docs/BASELINES.md.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { generateDataset } from './lib/dataset';

const ds = generateDataset(20000, 42);
const truth = ds.truth;
const key = (xs: string[]) => [...xs].sort().join('|');
const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`);

// ---- 1. cycles: topology only (ignore timestamps) vs the time-aware detector -------------------
function topologicalCycles(maxLen: number): string[][] {
  const out = new Map<string, any[]>();
  for (const t of ds.transfers) out.set(t.from, [...(out.get(t.from) || []), t]);
  const found: string[][] = [];
  for (const start of out.keys()) {
    const walk = (cur: string, path: string[], depth: number) => {
      for (const e of out.get(cur) || []) {
        if (e.to === start && depth >= 3) {
          if (path.every((w) => start < w || w === start)) found.push([...path]); // canonical: smallest id first
        } else if (depth < maxLen && !path.includes(e.to) && e.to > start) walk(e.to, [...path, e.to], depth + 1);
      }
    };
    walk(start, [start], 1);
  }
  return found;
}
const topo = topologicalCycles(5);
const planted = new Set(truth.fast_rings.map((r) => key(r.wallets)));
const topoTp = topo.filter((c) => planted.has(key(c))).length;

// ---- 2. clustering: "wallets that share a funder" vs hub-pruned burst/agent components ----------
const byFunder = new Map<string, Set<string>>();
for (const e of ds.fundingEdges) {
  if (!byFunder.has(e.from)) byFunder.set(e.from, new Set());
  byFunder.get(e.from)!.add(e.to);
}
const farmWallets = new Set(truth.sybil_farms.flatMap((f) => f.wallets));
const naiveClusters = [...byFunder.entries()].filter(([, m]) => m.size >= 5);
const naiveTp = naiveClusters.filter(([, m]) => [...m].filter((w) => farmWallets.has(w)).length >= m.size * 0.5).length;
const naiveFlaggedBenign = new Set(naiveClusters.flatMap(([, m]) => [...m]).filter((w) => !farmWallets.has(w))).size;

const byAgent = new Map<string, Set<string>>();
for (const e of ds.controlEdges) {
  if (!byAgent.has(e.from)) byAgent.set(e.from, new Set());
  byAgent.get(e.from)!.add(e.to);
}
const agentNoCap = [...byAgent.entries()].filter(([, m]) => m.size >= 5);
const agentNoCapTp = agentNoCap.filter(([, m]) => [...m].filter((w) => farmWallets.has(w)).length >= m.size * 0.5).length;
const fleetWalletsFlagged = new Set(agentNoCap.filter(([a]) => truth.bot_fleet_agents.includes(a)).flatMap(([, m]) => [...m])).size;

// ---- 3. taint: 1-hop exposure vs multi-hop propagation -----------------------------------------
const tainted = Object.entries(truth.tainted);
const oneHop = tainted.filter(([, h]) => h === 1).length;

const md = `# Baselines (same data as BENCHMARK.md)

Dataset: seed 42, ${ds.wallets.length.toLocaleString()} wallets, ${ds.transfers.length.toLocaleString()} transfers. Computed client-side by \`npm run baselines\`.
Each row shows what the naive version of a detector does on the data the real detector is scored on.

| Question | Naive baseline | Result | GhostShield detector |
|---|---|---|---|
| Round trips | Any directed cycle of 3 to 5 hops, ignoring time | ${topo.length} cycles reported, ${topoTp} are planted rings: **precision ${pct(topoTp, topo.length)}** (recall ${pct(topoTp, planted.size)}) | Time-ordered, 10 min window: 100% / 100% on the cluster |
| Sybil clusters | "Wallets sharing a funder" (>= 5) | ${naiveClusters.length} clusters, ${naiveTp} contain farms: **precision ${pct(naiveTp, naiveClusters.length)}**, ${naiveFlaggedBenign.toLocaleString()} benign wallets flagged | Burst + agent components with hub pruning: 80% precision, 10 flagged wallets (all co-funded ring wallets) |
| Agent control | "Wallets sharing an agent" with no fleet cap | ${agentNoCap.length} clusters, ${agentNoCapTp} contain farms: **precision ${pct(agentNoCapTp, agentNoCap.length)}**, ${fleetWalletsFlagged.toLocaleString()} legitimate fleet wallets flagged | Agents above ${100} wallets pruned as hubs |
| Taint | Direct 1-hop exposure to a seed | Reaches ${oneHop} of ${tainted.length} planted tainted wallets: **recall ${pct(oneHop, tainted.length)}** | Value-weighted multi-hop propagation: 32/32 at top-k |

These comparisons are against the same hand-built generator, so they show that each design choice matters on this structure,
not how much it would matter on real traffic.
`;
fs.writeFileSync(path.resolve(process.cwd(), 'docs/BASELINES.md'), md);
console.log(md);
