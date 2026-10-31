// ==============================================================================
// GHOSTSHIELD: Fetch real recent Ethereum mainnet native transfers (public RPC)
//   tsx scripts/fetch_ethereum.ts [--blocks 600] [--rpc https://ethereum-rpc.publicnode.com]
// Writes data/real/ethereum/{edges.json,meta.json}. Only transactions with value > 0 and a
// recipient are kept. The RPC is non-archive, so only recent blocks are available.
// One edge per ordered (from,to) pair is kept (the earliest), matching the graph model;
// the number of dropped repeats is recorded. Data is not committed or redistributed.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const RPC = arg('rpc', 'https://ethereum-rpc.publicnode.com');
const BLOCKS = Number(arg('blocks', '600'));

async function rpc(batch: any[], attempts = 6): Promise<any[]> {
  let last = '';
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch), signal: AbortSignal.timeout(45_000) });
      if (res.ok) {
        const json: any = await res.json();
        const arr = Array.isArray(json) ? json : [json];
        if (arr.every((x) => x && !x.error)) return arr;
        last = JSON.stringify(arr.find((x) => x.error)?.error).slice(0, 200);
      } else last = `HTTP ${res.status}`;
    } catch (e: any) {
      last = e.message;
    }
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  throw new Error(`rpc failed: ${last}`);
}

async function main() {
  const latest = parseInt((await rpc([{ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }]))[0].result, 16);
  const to = latest - 12; // stay clear of reorgs
  const from = to - BLOCKS + 1;
  console.log(`fetching blocks ${from}..${to} (${BLOCKS}) from ${RPC}`);

  const numbers = Array.from({ length: BLOCKS }, (_, i) => from + i);
  const groups: number[][] = [];
  for (let i = 0; i < numbers.length; i += 10) groups.push(numbers.slice(i, i + 10));

  const edges = new Map<string, { from: string; to: string; amount: number; ts: number; hash: string }>();
  let txs = 0, valueTxs = 0, repeats = 0, first = Infinity, last = 0;
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < groups.length) {
      const g = groups[next++];
      const res = await rpc(g.map((n, i) => ({ jsonrpc: '2.0', id: i, method: 'eth_getBlockByNumber', params: ['0x' + n.toString(16), true] })));
      for (const { result: b } of res) {
        const ts = parseInt(b.timestamp, 16);
        first = Math.min(first, ts);
        last = Math.max(last, ts);
        for (const t of b.transactions) {
          txs++;
          const value = BigInt(t.value);
          if (value === 0n || !t.to) continue;
          valueTxs++;
          const a = t.from.toLowerCase(), z = t.to.toLowerCase();
          if (a === z) continue;
          const k = `${a}|${z}`;
          if (edges.has(k)) { repeats++; continue; }
          edges.set(k, { from: a, to: z, amount: Number(value) / 1e18, ts, hash: t.hash });
        }
      }
      if (++done % 10 === 0) process.stdout.write(`  ${done}/${groups.length} groups\r`);
    }
  }));

  const dir = path.resolve(process.cwd(), 'data/real/ethereum');
  fs.mkdirSync(dir, { recursive: true });
  const list = [...edges.values()].sort((a, b) => a.ts - b.ts);
  fs.writeFileSync(path.join(dir, 'edges.json'), JSON.stringify(list));
  const meta = { rpc: RPC, fromBlock: from, toBlock: to, blocks: BLOCKS, firstTimestamp: first, lastTimestamp: last, transactions: txs, valueTransfers: valueTxs, uniqueEdges: list.length, repeatPairsDropped: repeats, fetchedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('\n' + JSON.stringify(meta, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
