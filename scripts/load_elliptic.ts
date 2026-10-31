// ==============================================================================
// GHOSTSHIELD: Load the Elliptic Bitcoin dataset into a (separate) real-data graph
//   tsx scripts/load_elliptic.ts [--seed-fraction 0.5] [--seed 42] [--offset N]
// Data is tagged with provenance "elliptic"; queries isolate it with scope=elliptic.
// Source: Weber et al., "Anti-Money Laundering in Bitcoin: Experimenting with Graph
// Convolutional Networks for Financial Forensics", KDD Workshop 2019. 203,769 Bitcoin
// transactions (nodes), 234,355 payment-flow edges, 4,545 illicit / 42,019 licit labels.
// The raw files are NOT redistributed; download them as described in docs/REAL_DATA.md.
//
// Modelling: a transaction is a `Wallet` vertex (an entity that holds and forwards value),
// an edge is TRANSFERRED_TO. The dataset carries no amounts, so every edge has amount 1.0
// (taint is then split evenly over a transaction's outputs). Time is the dataset's
// 49 two-week steps, mapped to seconds.
// Labels are kept CLIENT-SIDE (data/real/elliptic_split.json) and never written to the
// graph; only the seed flag of the chosen training seeds is stored.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { graph, host, loadCsvParallel, runQuery } from './lib/tg';
import { loadElliptic, splitSeeds, STEP_SECONDS, walletRow } from './lib/elliptic';

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};

const root = path.resolve(process.cwd(), 'data/real');

async function main() {
  const seedFraction = arg('seed-fraction', 0.5);
  const seed = arg('seed', 42);
  const offset = arg('offset', 0);

  const d = loadElliptic();
  const { seeds, heldOut: heldOutIllicit } = splitSeeds(d.illicit, seed, seedFraction);
  const illicit = d.illicit;
  const licit = d.licit;
  const edges = d.edges;

  fs.writeFileSync(path.join(root, 'elliptic_split.json'), JSON.stringify({ seed, seedFraction, seeds: [...seeds], heldOutIllicit, licit }));
  console.log(`graph ${graph} @ ${host}`);
  console.log(`illicit ${illicit.length}: ${seeds.size} seeds, ${heldOutIllicit.length} held out; licit ${licit.length}`);

  const wallets = [...d.classes.keys()].map((id) => walletRow(d, id, seeds.has(id)));
  const transfers = edges.map(([a, b]) => [a, b, 1.0, 'BTC', (d.step.get(a) ?? 0) * STEP_SECONDS, `${a}>${b}`]);

  const progress = (name: string) => (d: number, t: number) => process.stdout.write(`  ${name} ${d}/${t} chunks\r`);
  let t0 = Date.now();
  if (offset === 0) {
    const w = await loadCsvParallel('wallets', wallets, { chunk: 250, width: 3, onProgress: progress('wallets') });
    console.log(`wallets   ${w.valid} valid ${w.invalid} rejected (${((Date.now() - t0) / 1000).toFixed(0)}s)                `);
    if (w.invalid || w.valid !== wallets.length) throw new Error('wallet load incomplete');
  }
  t0 = Date.now();
  const e = await loadCsvParallel('transfers', transfers, { chunk: 250, width: 3, offset: offset > 0 ? offset : 0, onProgress: progress('transfers') });
  console.log(`transfers ${e.valid} valid ${e.invalid} rejected (${((Date.now() - t0) / 1000).toFixed(0)}s)                `);

  const m: any = Object.assign({}, ...(await runQuery('ghostshield_dashboard_metrics', {}, 150)).results);
  console.log('graph now:', m.total_wallets, 'wallets,', m.total_transfers, 'transfers,', m.risk_seed_wallets, 'seeds');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
