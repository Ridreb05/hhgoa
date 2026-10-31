// ==============================================================================
// GHOSTSHIELD: TigerGraph admin (never drops anything)
//   tsx scripts/tg_admin.ts schema     create graph if missing + apply pending migrations
//   tsx scripts/tg_admin.ts loading    create the ghostshield_load loading job on the graph
//   tsx scripts/tg_admin.ts queries    create/replace every query in database/tigergraph/queries
//   tsx scripts/tg_admin.ts install    compile + install every query
//   tsx scripts/tg_admin.ts enrich     run taint propagation + community detection with write-back
//                                      (fills Wallet.risk_score / community_id used by the explorer)
//   tsx scripts/tg_admin.ts all        schema -> queries -> install
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { authHeader, graph, gsql, host, quiet, runQuery } from './lib/tg';

const dbDir = path.resolve(process.cwd(), 'database/tigergraph');
const DEFAULT_GRAPH = 'GhostShieldGraph';
const forGraph = (text: string) => text.split(DEFAULT_GRAPH).join(graph); // lets the same files target another graph

async function graphSchema(): Promise<any | null> {
  const res = await fetch(`${host}/gsql/v1/schema/graphs/${graph}`, { headers: { Authorization: await authHeader() } });
  if (!res.ok) return null;
  const body: any = await res.json();
  return body.results ?? body;
}

async function schema() {
  let current = await graphSchema();
  if (!current) {
    console.log(`Graph ${graph} not found.`);
    const ddl = forGraph(fs.readFileSync(path.join(dbDir, 'schema.gsql'), 'utf-8'));
    // 1. Types already exist (secondary graph on a migrated cluster): only CREATE GRAPH is needed.
    const createGraph = ddl.slice(ddl.indexOf('CREATE GRAPH'));
    console.log(quiet(await gsql(createGraph)));
    // 2. Clean cluster: create the types first, then the graph.
    if (!(await graphSchema())) {
      console.log('Creating vertex/edge types, then the graph...');
      console.log(quiet(await gsql(ddl.slice(0, ddl.indexOf('CREATE GRAPH')))));
      console.log(quiet(await gsql(createGraph)));
    }
    current = await graphSchema();
    if (!current) process.exit(1);
  }

  const wallet = (current.VertexTypes || []).find((v: any) => v.Name === 'Wallet');
  const hasId = (wallet?.Attributes || []).some((a: any) => a.AttributeName === 'id');
  if (hasId) {
    console.log('Schema is up to date (migration 001 applied).');
    return;
  }
  console.log('Applying migration 001 (queryable ids + algorithm write-back attributes)...');
  const out = await gsql(fs.readFileSync(path.join(dbDir, 'migrations', '001_queryable_ids.gsql'), 'utf-8'));
  console.log(out.split('\n').filter((l) => /succe|fail|error/i.test(l)).join('\n'));
  if (!/Global schema change succeeded/.test(out)) process.exit(1);
}

function queryFiles(): string[] {
  return fs
    .readdirSync(path.join(dbDir, 'queries'))
    .filter((f) => f.endsWith('.gsql'))
    .sort();
}

async function queries() {
  let failed = 0;
  for (const f of queryFiles()) {
    // the synthetic traffic generator must never exist on a graph holding real data
    if (graph !== DEFAULT_GRAPH && f.includes('synth_amplify')) continue;
    const out = quiet(await gsql(forGraph(fs.readFileSync(path.join(dbDir, 'queries', f), 'utf-8')), graph));
    const ok = /Successfully created queries/.test(out);
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${f}`);
    if (!ok) {
      failed++;
      console.log(out.split('\n').map((l) => '     ' + l).join('\n'));
    }
  }
  if (failed) process.exit(1);
}

async function install() {
  console.log('Installing all queries (1-3 minutes)...');
  const out = await gsql(`USE GRAPH ${graph}\nINSTALL QUERY ALL`);
  const summary = out.split('\n').filter((l) => /installation summary|installation failed/i.test(l)).pop();
  console.log(summary || out.slice(-300));
  if (/failed: [1-9]|installation failed/i.test(out)) {
    console.log(out.slice(-800));
    process.exit(1);
  }
}

async function loading() {
  for (const f of fs.readdirSync(path.join(dbDir, 'loading')).filter((x) => x.endsWith('.gsql'))) {
    const out = quiet(await gsql(forGraph(fs.readFileSync(path.join(dbDir, 'loading', f), 'utf-8')), graph));
    console.log(/Successfully created loading jobs/.test(out) ? `ok   ${f}` : `${/already exist/i.test(out) ? 'ok   (exists)' : 'FAIL'} ${f}\n${out}`);
  }
}

async function enrich() {
  const prop = await runQuery('ghostshield_risk_propagation', { max_hops: 4, result_limit: 1, write_back: 'true' });
  const p: any = Object.assign({}, ...prop.results);
  console.log(`risk_score written for ${p.tainted_wallets} wallets (${prop.ms}ms)`);
  const clu = await runQuery('ghostshield_sybil_clusters', { min_cluster_size: 2, result_limit: 1, write_back: 'true' });
  const c: any = Object.assign({}, ...clu.results);
  console.log(`community_id written for ${c.total_clusters_identified} communities (${clu.ms}ms)`);
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'schema') return schema();
  if (cmd === 'queries') return queries();
  if (cmd === 'install') return install();
  if (cmd === 'enrich') return enrich();
  if (cmd === 'loading') return loading();
  if (cmd === 'all') {
    await schema();
    await loading();
    await queries();
    return install();
  }
  console.log('usage: tsx scripts/tg_admin.ts <schema|loading|queries|install|enrich|all>  (TIGERGRAPH_GRAPH_NAME selects the graph)');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
