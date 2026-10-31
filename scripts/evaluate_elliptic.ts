// ==============================================================================
// GHOSTSHIELD: Held-out evaluation of taint propagation on the real Elliptic graph
//   tsx scripts/evaluate_elliptic.ts [--splits 42,43,44] [--fraction 0.5]
//
// Protocol (no leakage):
//   1. A random half of the ILLICIT labels become known-bad seeds (is_risk_seed = true).
//   2. The other half of the illicit labels (held out) and all LICIT labels are the test set.
//      Unknown-class transactions are never scored against anything.
//   3. The in-engine propagation query ranks wallets; the test set is scored with 0 for
//      wallets the taint never reached (ties count as half in AUC).
//   4. Repeated over several random splits; mean +/- sd reported.
// Baselines use the SAME seeds: random, degree, and unweighted hop distance to a seed.
// Writes docs/REAL_DATA_ELLIPTIC.md. Elliptic carries no amounts, so edges have weight 1.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { loadElliptic, mulberry32, splitSeeds, walletRow } from './lib/elliptic';
import { auc, mean, precisionAtK, stdev } from './lib/metrics';
import { graph, loadCsvParallel, runQuery } from './lib/tg';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const SPLITS = arg('splits', '42,43,44').split(',').map(Number);
const FRACTION = Number(arg('fraction', '0.5'));
const CONFIGS: { direction: string; hops: number }[] = [
  { direction: 'forward', hops: 4 },
  { direction: 'backward', hops: 4 },
  { direction: 'both', hops: 2 },
  { direction: 'both', hops: 4 },
  { direction: 'both', hops: 6 },
];

const SCOPE = 'elliptic'; // the graph's storage is shared with other datasets; restrict every global scan to this one

const d = loadElliptic();
const out = new Map<string, string[]>();
const inn = new Map<string, string[]>();
for (const [a, b] of d.edges) {
  out.set(a, [...(out.get(a) || []), b]);
  inn.set(b, [...(inn.get(b) || []), a]);
}

/** Multi-source BFS hop distance from the seeds. */
function hopDistance(seeds: Set<string>, neighbours: (id: string) => string[], maxHops: number): Map<string, number> {
  const dist = new Map<string, number>();
  let frontier = [...seeds];
  for (const s of frontier) dist.set(s, 0);
  for (let h = 1; h <= maxHops && frontier.length; h++) {
    const next: string[] = [];
    for (const v of frontier) for (const w of neighbours(v)) if (!dist.has(w)) { dist.set(w, h); next.push(w); }
    frontier = next;
  }
  return dist;
}

async function setSeeds(seeds: Set<string>) {
  // rewrite every illicit wallet so the stored flag is exactly this split (never rely on earlier state)
  const rows = d.illicit.map((id) => walletRow(d, id, seeds.has(id)));
  const r = await loadCsvParallel('wallets', rows, { chunk: 250, width: 3 });
  if (r.invalid || r.valid !== rows.length) throw new Error('failed to reset seeds');
}

interface Row { name: string; auc: number[]; p100: number[]; p1000: number[]; coveragePos: number[]; coverageNeg: number[]; ms: number[] }
const rows = new Map<string, Row>();
const add = (name: string, a: number, p100: number, p1000: number, cp: number, cn: number, ms = 0) => {
  const r = rows.get(name) || { name, auc: [], p100: [], p1000: [], coveragePos: [], coverageNeg: [], ms: [] };
  r.auc.push(a); r.p100.push(p100); r.p1000.push(p1000); r.coveragePos.push(cp); r.coverageNeg.push(cn); r.ms.push(ms);
  rows.set(name, r);
};

function evaluate(name: string, score: (id: string) => number, heldOut: string[], ms = 0) {
  const pos = heldOut.map(score);
  const neg = d.licit.map(score);
  const labelled = [...heldOut.map((id) => ({ score: score(id), positive: true })), ...d.licit.map((id) => ({ score: score(id), positive: false }))];
  // deterministic tie-break so unreached (score 0) nodes cannot win precision@k by input order
  const rnd = mulberry32(12345);
  const shuffled = labelled.map((x) => ({ ...x, j: rnd() })).sort((a, b) => a.j - b.j);
  add(name, auc(pos, neg), precisionAtK(shuffled, 100), precisionAtK(shuffled, 1000), pos.filter((s) => s > 0).length / pos.length, neg.filter((s) => s > 0).length / neg.length, ms);
}

async function main() {
  console.log(`graph ${graph}; ${d.illicit.length} illicit, ${d.licit.length} licit labels; seed fraction ${FRACTION}\n`);
  const base = d.illicit.length * (1 - FRACTION) / (d.illicit.length * (1 - FRACTION) + d.licit.length);
  let cyclesMs = 0;
  let cyclesFound = -1;

  for (const split of SPLITS) {
    const { seeds, heldOut } = splitSeeds(d.illicit, split, FRACTION);
    if (heldOut.some((id) => seeds.has(id))) throw new Error('leakage: held-out overlaps seeds');
    console.log(`split ${split}: ${seeds.size} seeds, ${heldOut.length} held-out illicit`);
    await setSeeds(seeds);

    const metrics: any = Object.assign({}, ...(await runQuery('ghostshield_dashboard_metrics', { scope: SCOPE }, 150)).results);
    if (metrics.risk_seed_wallets !== seeds.size) throw new Error(`graph has ${metrics.risk_seed_wallets} seeds, expected ${seeds.size}`);

    for (const c of CONFIGS) {
      const r = await runQuery('ghostshield_risk_propagation', { max_hops: c.hops, result_limit: 150000, direction: c.direction, scope: SCOPE }, 150);
      const o: any = Object.assign({}, ...r.results);
      if (o.seed_wallets !== seeds.size) throw new Error('engine seed count mismatch');
      if (o.tainted_wallets > 150000) throw new Error('result_limit too small: scores truncated');
      const score = new Map<string, number>(o.top_risk_wallets.map((w: any) => [w.wallet_id, w.score]));
      evaluate(`GhostShield taint (${c.direction}, ${c.hops} hops)`, (id) => score.get(id) ?? 0, heldOut, r.ms);
      console.log(`  ${c.direction.padEnd(8)} ${c.hops}h  reached ${o.tainted_wallets}  ${r.ms}ms`);
    }

    // baselines with the same seeds
    const rnd = mulberry32(split * 7919);
    const rs = new Map<string, number>();
    evaluate('Baseline: random', (id) => (rs.has(id) ? rs.get(id)! : (rs.set(id, rnd()), rs.get(id)!)), heldOut);
    evaluate('Baseline: node degree', (id) => (out.get(id)?.length || 0) + (inn.get(id)?.length || 0), heldOut);
    const und = (id: string) => [...(out.get(id) || []), ...(inn.get(id) || [])];
    const dist2 = hopDistance(seeds, und, 2);
    evaluate('Baseline: unweighted distance to a seed (undirected, <= 2 hops)', (id) => (dist2.has(id) && !seeds.has(id) ? 1 / dist2.get(id)! : 0), heldOut);
    const dist4 = hopDistance(seeds, und, 4);
    evaluate('Baseline: unweighted distance to a seed (undirected, <= 4 hops)', (id) => (dist4.has(id) && !seeds.has(id) ? 1 / dist4.get(id)! : 0), heldOut);
    const dist6 = hopDistance(seeds, und, 6);
    evaluate('Baseline: unweighted distance to a seed (undirected, <= 6 hops)', (id) => (dist6.has(id) && !seeds.has(id) ? 1 / dist6.get(id)! : 0), heldOut);
    const one = new Set<string>();
    for (const s of seeds) for (const w of und(s)) one.add(w);
    evaluate('Baseline: direct neighbour of a seed', (id) => (one.has(id) && !seeds.has(id) ? 1 : 0), heldOut);

    if (cyclesFound < 0) {
      const c = await runQuery('ghostshield_detect_cycles', { time_window_seconds: 600, max_depth: 5, result_limit: 100, scope: SCOPE }, 150);
      const o: any = Object.assign({}, ...c.results);
      cyclesFound = o.total_cycles_found;
      cyclesMs = c.ms;
    }
  }

  const f = (xs: number[], pctFmt = true) => (pctFmt ? `${(100 * mean(xs)).toFixed(1)}% ± ${(100 * stdev(xs)).toFixed(1)}` : `${mean(xs).toFixed(3)} ± ${stdev(xs).toFixed(3)}`);
  const table = [...rows.values()]
    .map((r) => `| ${r.name} | ${mean(r.auc).toFixed(3)} ± ${stdev(r.auc).toFixed(3)} | ${f(r.p100)} | ${f(r.p1000)} | ${f(r.coveragePos)} | ${f(r.coverageNeg)} | ${r.ms[0] ? Math.round(mean(r.ms)) + ' ms' : '-'} |`)
    .join('\n');

  const all = [...rows.values()];
  const gs = all.filter((r) => r.name.startsWith('GhostShield'));
  const bl = all.filter((r) => r.name.startsWith('Baseline') && !r.name.includes('random') && !r.name.includes('degree'));
  const top = (rs: Row[], key: 'auc' | 'p100' | 'p1000') => rs.reduce((b, r) => (mean(r[key]) > mean(b[key]) ? r : b));
  const gsAuc = top(gs, 'auc'), blAuc = top(bl, 'auc'), gsP = top(gs, 'p100'), blP = top(bl, 'p100');
  const rand = all.find((r) => r.name === 'Baseline: random')!;
  const dirOnly = gs.filter((r) => /forward|backward/.test(r.name));
  const bothRows = gs.filter((r) => r.name.includes('both'));
  const pairs: [string, string][] = [
    ['GhostShield taint (both, 2 hops)', 'Baseline: unweighted distance to a seed (undirected, <= 2 hops)'],
    ['GhostShield taint (both, 4 hops)', 'Baseline: unweighted distance to a seed (undirected, <= 4 hops)'],
    ['GhostShield taint (both, 6 hops)', 'Baseline: unweighted distance to a seed (undirected, <= 6 hops)'],
  ];
  const mismatches = pairs.filter(([g, b]) => {
    const R = all.find((r) => r.name === g)!, B = all.find((r) => r.name === b)!;
    return Math.abs(mean(R.coveragePos) - mean(B.coveragePos)) > 1e-9 || Math.abs(mean(R.coverageNeg) - mean(B.coverageNeg)) > 1e-9;
  });
  const crossCheck = mismatches.length === 0
    ? 'at 2, 4 and 6 hops the set of wallets the engine reaches (share of held-out illicit and of licit with a non-zero score) is identical to an independent client-side BFS from the same seeds.'
    : `**MISMATCH** between the engine's reached set and an independent client-side BFS for: ${mismatches.map((m) => m[0]).join(', ')}. Investigate before trusting these results.`;
  const findings = [
    `* **Overall ranking (AUC), at equal hop horizons:** ${pairs.map(([g, b]) => { const R = all.find((r) => r.name === g)!, B = all.find((r) => r.name === b)!; return `${g.match(/\d+ hops/)![0]}: GhostShield ${mean(R.auc).toFixed(3)} vs unweighted distance ${mean(B.auc).toFixed(3)} (${mean(R.auc) - mean(B.auc) >= 0 ? '+' : ''}${(mean(R.auc) - mean(B.auc)).toFixed(3)})`; }).join('; ')}; random = ${mean(rand.auc).toFixed(3)}.`,
    `* **Top of the ranking (precision@100):** best GhostShield variant ${(100 * mean(gsP.p100)).toFixed(1)}% vs best baseline ${(100 * mean(blP.p100)).toFixed(1)}%${mean(gsP.p100) < mean(blP.p100) ? ' — **the engine is worse than the naive rule at the very top**. A plausible but untested reason: without amounts, the haircut reduces to degree normalisation, which favours low-degree, chain-like neighbours' : ''}.`,
    `* **Direction:** one-directional propagation reaches AUC ${dirOnly.map((r) => mean(r.auc).toFixed(3)).join(' / ')} (${dirOnly.map((r) => r.name.match(/forward|backward/)![0]).join(' / ')}), close to random; propagating in both directions reaches ${bothRows.map((r) => mean(r.auc).toFixed(3)).join(' / ')} at 2 / 4 / 6 hops. Illicit transactions are associated with seeds both upstream and downstream.`,
    `* **Coverage trade-off:** at ${bothRows[bothRows.length - 1].name.match(/\d+ hops/)![0]} the method reaches ${(100 * mean(bothRows[bothRows.length - 1].coveragePos)).toFixed(0)}% of held-out illicit but also ${(100 * mean(bothRows[bothRows.length - 1].coverageNeg)).toFixed(0)}% of licit transactions; at 2 hops it reaches ${(100 * mean(bothRows[0].coveragePos)).toFixed(0)}% / ${(100 * mean(bothRows[0].coverageNeg)).toFixed(0)}%.`,
    `* **Engine correctness cross-check:** ${crossCheck}`,
  ].join('\n');

  const md = `# Real data: Elliptic Bitcoin dataset (labeled)

Generated by \`npm run evaluate:elliptic\` on ${new Date().toISOString().slice(0, 10)}, TigerGraph Savanna TG-00, graph \`${graph}\`.

**Data.** Weber et al., *Anti-Money Laundering in Bitcoin: Experimenting with Graph Convolutional Networks for Financial Forensics*,
KDD Workshop 2019. ${d.classes.size.toLocaleString()} Bitcoin transactions (nodes), ${d.edges.length.toLocaleString()} payment-flow edges,
${d.illicit.length.toLocaleString()} illicit and ${d.licit.length.toLocaleString()} licit labels (the rest unknown). Real labels, real topology.
A transaction is modelled as a \`Wallet\` vertex. The dataset has no amounts or addresses, so edges have weight 1 and time is the dataset's
49 two-week steps. Raw files are not redistributed (see REAL_DATA.md).

**Protocol (no leakage).** A random ${Math.round(FRACTION * 100)}% of the illicit labels are known-bad seeds. The remaining illicit labels (held out) and all licit labels form
the test set. The engine ranks wallets by propagated taint; wallets the taint never reaches score 0 (ties count as half). Unknown-class
nodes are never scored. ${SPLITS.length} random splits, mean ± sd. Base rate of held-out illicit in the test set: **${(100 * base).toFixed(1)}%**.

| Method | AUC | Precision@100 | Precision@1000 | Held-out illicit reached | Licit reached | Query time |
|---|---|---|---|---|---|---|
${table}

*Precision@k is over labeled test nodes with ties broken at random; "reached" is the share of each class with a non-zero score.*

## Sanity check: cycle detection on a DAG

The Elliptic transaction graph is a directed acyclic flow graph. The temporal cycle detector reported **${cyclesFound}** cycles (${cyclesMs} ms), as it should.

## Findings (computed from the table above)

${findings}

## What this does and does not show

* It is a structure-only method: no transaction features are used. It is **not** comparable to supervised classifiers on this dataset (the
  paper's random forest uses 166 anonymised features per node).
* Elliptic has **no amounts**, so every edge has weight 1 and the "haircut by amount share" reduces to dividing by a transaction's degree.
  This dataset therefore does **not** test the value-weighting that the algorithm was designed around; that part is untested on real data.
* Seeds are labeled illicit transactions; unknown-class nodes are ignored, and labels may themselves be noisy.
* One dataset, one chain (Bitcoin), 2019 data: external validity to Ethereum fraud or to current traffic is unknown.
`;
  fs.writeFileSync(path.resolve(process.cwd(), 'docs/REAL_DATA_ELLIPTIC.md'), md);
  console.log('\n' + table);
  console.log(`\ncycles on DAG: ${cyclesFound}\nwrote docs/REAL_DATA_ELLIPTIC.md`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
