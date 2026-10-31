// ==============================================================================
// GHOSTSHIELD: Live TigerGraph seeding via the `ghostshield_load` GSQL loading job
//   tsx scripts/seed_tigergraph.ts [--wallets 20000] [--seed 42] [--from transfers [--offset 42500]]
// Loads the 5 curated demo scenarios plus (unless --wallets 0) a deterministic
// scale dataset with planted fraud patterns. Ground truth is written to
// data/generated/ground_truth.json for scripts/evaluate_live.ts.
// Re-running with the same arguments is idempotent (upserts).
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import demoData from '../data/demo/entities.json';
import { Dataset, generateDataset } from './lib/dataset';
import { graph, host, loadCsv, runQuery } from './lib/tg';

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};

function demoAsDataset(): Dataset {
  const e = demoData.edges as any;
  return {
    wallets: demoData.vertices.wallets as any,
    fundingSources: demoData.vertices.funding_sources as any,
    agents: demoData.vertices.agents as any,
    contracts: demoData.vertices.smart_contracts as any,
    transfers: e.transfers,
    fundingEdges: e.funding_edges,
    controlEdges: e.control_edges,
    delegationEdges: e.delegation_edges,
    interactions: e.interactions,
    truth: { fast_rings: [], slow_cycles: [], sybil_farms: [], crowd_funders: [], bot_fleet_agents: [], seeds: [], tainted: {} },
  };
}

const OFFSET = arg('offset', 0);
const FROM = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : '';

async function load(label: string, ds: Dataset, resumeAt = '') {
  const files: [string, unknown[][]][] = [
    ['wallets', ds.wallets.map((w) => [w.id, w.network, w.label, w.creation_time, w.provenance, w.is_risk_seed])],
    ['funding_sources', ds.fundingSources.map((f) => [f.id, f.category, f.label, f.provenance])],
    ['agents', ds.agents.map((a) => [a.id, a.display_name, a.agent_type, a.provenance])],
    ['contracts', ds.contracts.map((c) => [c.id, c.network, c.protocol, c.category])],
    ['transfers', ds.transfers.map((t) => [t.from, t.to, t.amount, t.asset, t.event_timestamp, t.tx_id])],
    ['funding_edges', ds.fundingEdges.map((f) => [f.from, f.to, f.amount, f.funding_timestamp, f.event_id])],
    ['control_edges', ds.controlEdges.map((c) => [c.from, c.to, c.provenance, c.recorded_at])],
    ['delegation_edges', ds.delegationEdges.map((d) => [d.from, d.to, d.delegation_type, 1])],
    ['interactions', ds.interactions.map((x) => [x.from, x.to, x.interaction_type, x.interaction_timestamp, x.tx_id])],
  ];
  console.log(`${label}`);
  let skipping = Boolean(resumeAt);
  for (const [name, rows] of files) {
    if (name === resumeAt) skipping = false;
    if (skipping || !rows.length) continue;
    const t0 = Date.now();
    const r = await loadCsv(name, rows, undefined, undefined, name === resumeAt ? OFFSET : 0);
    console.log(`  ${name.padEnd(17)} ${String(r.valid).padStart(7)} valid ${r.invalid ? `${r.invalid} REJECTED` : ''} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    if (r.invalid) throw new Error(`${name}: ${r.invalid} rows rejected by loading job`);
  }
}

async function main() {
  const wallets = arg('wallets', 20000);
  const seed = arg('seed', 42);

  console.log(`Target: ${host} (${graph})\n`);
  await load('demo scenarios', demoAsDataset());

  if (wallets > 0) {
    const ds = generateDataset(wallets, seed);
    await load(`scale dataset (seed ${seed})`, ds, FROM);
    const dir = path.resolve(process.cwd(), 'data/generated');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ground_truth.json'), JSON.stringify({ wallets, seed, ...ds.truth }));
    console.log('\n  ground truth -> data/generated/ground_truth.json');
  }

  const { results, ms } = await runQuery('ghostshield_dashboard_metrics');
  console.log(`\nVerified live (${ms}ms):`, JSON.stringify(results[0]));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
