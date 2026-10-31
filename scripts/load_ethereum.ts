// ==============================================================================
// GHOSTSHIELD: Load real Ethereum transfers (from scripts/fetch_ethereum.ts) into a real-data graph
//   tsx scripts/load_ethereum.ts  (provenance "ethereum_rpc"; queries use scope=ethereum)
// Wallets are the addresses seen in the fetched blocks. Seeds are OFAC-sanctioned addresses
// (ultrasoundmoney/ofac-ethereum-addresses). Transfers from a publicly labelled source
// (Etherscan label dataset: tornado-cash, exchange, bridge) also create FUNDED edges from
// a FundingSource vertex, so the funding-burst clustering has real input.
// Neither dataset is redistributed.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { graph, host, loadCsvParallel, runQuery } from './lib/tg';

const root = path.resolve(process.cwd(), 'data/real');

export function loadLabels(): Map<string, { name: string; labels: string[] }> {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'ethereum_raw/labels.json'), 'utf-8'));
  return new Map(Object.entries(raw).map(([a, v]: any) => [a.toLowerCase(), v]));
}

export function loadOfac(): Set<string> {
  return new Set(fs.readFileSync(path.join(root, 'ethereum_raw/ofac.csv'), 'utf-8').split('\n').slice(1).filter(Boolean).map((l) => l.split(',')[0].trim().toLowerCase()));
}

/** Category of a funding source, or null when the address is not a recognised funding origin. */
export function fundingCategory(labels: string[], name: string): string | null {
  const text = `${labels.join(' ')} ${name}`.toLowerCase();
  if (labels.includes('tornado-cash') || text.includes('tornado')) return 'MIXER';
  if (labels.includes('bridge') || text.includes('bridge')) return 'BRIDGE';
  if (text.includes('exchange') || /binance|coinbase|kraken|okx|bybit|kucoin|huobi|crypto\.com|bitfinex|gemini|bitstamp|gate\.io|mexc/.test(text)) return 'EXCHANGE';
  return null;
}

async function main() {
  const edges: { from: string; to: string; amount: number; ts: number; hash: string }[] = JSON.parse(fs.readFileSync(path.join(root, 'ethereum/edges.json'), 'utf-8'));
  const labels = loadLabels();
  // seeds: addresses on the current OFAC list, plus addresses the label dataset marks as sanctioned
  // (includes historical designations such as Tornado Cash, delisted in 2025)
  const ofac = loadOfac();
  for (const [a, v] of labels) if (v.labels.includes('ofac-sanctions-lists')) ofac.add(a);

  const first = new Map<string, number>();
  for (const e of edges) {
    for (const a of [e.from, e.to]) if (!first.has(a) || e.ts < first.get(a)!) first.set(a, e.ts);
  }
  const seeds = [...first.keys()].filter((a) => ofac.has(a));

  const wallets = [...first.entries()].map(([a, ts]) => [a, 'ethereum', labels.get(a)?.name || `${a.slice(0, 8)}…${a.slice(-4)}`, ts, 'ethereum_rpc', ofac.has(a)]);
  const transfers = edges.map((e) => [e.from, e.to, e.amount, 'ETH', e.ts, e.hash]);

  const funders = new Map<string, string>(); // address -> category
  for (const a of first.keys()) {
    const l = labels.get(a);
    const cat = l ? fundingCategory(l.labels, l.name) : null;
    if (cat) funders.set(a, cat);
  }
  const fundingSources = [...funders.entries()].map(([a, cat]) => [a, cat, labels.get(a)!.name, 'ethereum_etherscan_labels']);
  const funded = edges.filter((e) => funders.has(e.from) && !funders.has(e.to)).map((e) => [e.from, e.to, e.amount, e.ts, e.hash]);

  console.log(`graph ${graph} @ ${host}`);
  console.log(`${wallets.length} wallets, ${transfers.length} transfers, ${seeds.length} OFAC seeds present, ${fundingSources.length} labelled funding sources, ${funded.length} FUNDED edges`);

  const progress = (n: string) => (d: number, t: number) => process.stdout.write(`  ${n} ${d}/${t} chunks\r`);
  for (const [name, rows] of [['wallets', wallets], ['funding_sources', fundingSources], ['transfers', transfers], ['funding_edges', funded]] as [string, unknown[][]][]) {
    if (!rows.length) continue;
    const r = await loadCsvParallel(name, rows, { chunk: 250, width: 3, onProgress: progress(name) });
    console.log(`${name.padEnd(16)} ${r.valid} valid ${r.invalid} rejected                `);
    if (r.invalid || r.valid !== rows.length) throw new Error(`${name}: load incomplete`);
  }
  const m: any = Object.assign({}, ...(await runQuery('ghostshield_dashboard_metrics', { scope: 'ethereum' }, 150)).results);
  console.log('graph now:', JSON.stringify(m));
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
