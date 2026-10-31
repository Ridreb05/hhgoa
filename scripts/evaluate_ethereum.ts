// ==============================================================================
// GHOSTSHIELD: Run the detectors on real Ethereum traffic and AUDIT what they flag
//   tsx scripts/evaluate_ethereum.ts  (every query uses scope=ethereum)
// There is NO fraud ground truth here. The report therefore does not claim precision or recall.
// It reports what the detectors find on real blocks and classifies each finding with public
// evidence: on-chain code (contract vs EOA, via eth_getCode) and the Etherscan label dataset
// (mev-bot, dex, exchange, ...). Writes docs/REAL_DATA_ETHEREUM.md.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { fundingCategory, loadLabels } from './load_ethereum';
import { graph, runQuery } from './lib/tg';

const root = path.resolve(process.cwd(), 'data/real');
const RPC = 'https://ethereum-rpc.publicnode.com';
const SCOPE = 'ethereum'; // storage is shared with other datasets; restrict every global scan to this one

async function isContract(addresses: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  for (let i = 0; i < addresses.length; i += 20) {
    const group = addresses.slice(i, i + 20);
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const res = await fetch(RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(group.map((a, k) => ({ jsonrpc: '2.0', id: k, method: 'eth_getCode', params: [a, 'latest'] }))),
          signal: AbortSignal.timeout(30_000),
        });
        const json: any[] = await res.json();
        json.forEach((r) => result.set(group[r.id], typeof r.result === 'string' && r.result !== '0x'));
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  return result;
}

/** Independent client-side recount of temporal cycles (same rules as the GSQL query) to validate the engine. */
function clientCycleCount(edges: { from: string; to: string; ts: number }[], window: number): number {
  const out = new Map<string, typeof edges>();
  for (const e of edges) out.set(e.from, [...(out.get(e.from) || []), e]);
  let count = 0;
  for (const e1 of edges) {
    if (e1.from === e1.to) continue;
    const walk = (cur: string, visited: string[], tLast: number, len: number) => {
      for (const e of out.get(cur) || []) {
        if (e.ts < tLast || e.ts - e1.ts > window) continue;
        if (e.to === e1.from) { if (len + 1 >= 3) count++; }
        else if (len + 1 < 5 && !visited.includes(e.to)) walk(e.to, [...visited, e.to], e.ts, len + 1);
      }
    };
    walk(e1.to, [e1.from, e1.to], e1.ts, 1);
  }
  return count;
}

const INFRA = /mev|dex|router|exchange|bridge|aggregator|swap|uniswap|sushi|1inch|cow|paraswap|builder|relay|bot/i;

async function main() {
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'ethereum/meta.json'), 'utf-8'));
  const edges: { from: string; to: string; amount: number; ts: number; hash: string }[] = JSON.parse(fs.readFileSync(path.join(root, 'ethereum/edges.json'), 'utf-8'));
  const byPair = new Map(edges.map((e) => [`${e.from}|${e.to}`, e]));
  const labels = loadLabels();
  const labelOf = (a: string) => labels.get(a);

  const stats: any = Object.assign({}, ...(await runQuery('ghostshield_dashboard_metrics', { scope: SCOPE }, 150)).results);
  console.log(`graph ${graph}: ${stats.total_wallets} wallets, ${stats.total_transfers} transfers, ${stats.risk_seed_wallets} OFAC seeds`);

  // ---------------- cycles ----------------
  const cycleSections: string[] = [];
  const verification: string[] = [];
  const concentration: string[] = [];
  const cycleSummary: string[] = [];
  for (const window of [600, 3600]) {
    const r = await runQuery('ghostshield_detect_cycles', { time_window_seconds: window, max_depth: 5, result_limit: 500, scope: SCOPE }, 150);
    const o: any = Object.assign({}, ...r.results);
    const cycles: any[] = o.cycles;
    const wallets = [...new Set(cycles.flatMap((c) => String(c.cycle_path).split(' -> ').slice(0, -1)))];
    const code = await isContract(wallets);

    const classify = (ws: string[]) => {
      const contracts = ws.filter((w) => code.get(w)).length;
      const infra = ws.filter((w) => {
        const l = labelOf(w);
        return l && INFRA.test(`${l.labels.join(' ')} ${l.name}`);
      }).length;
      if (contracts === ws.length) return 'all contracts';
      if (contracts > 0) return 'contract + EOA';
      if (infra > 0) return 'EOAs, some publicly labelled infra';
      return 'unlabelled EOAs only';
    };
    const counts = new Map<string, number>();
    const examples = new Map<string, string[]>();
    for (const c of cycles) {
      const ws: string[] = String(c.cycle_path).split(' -> ').slice(0, -1);
      const k = classify(ws);
      counts.set(k, (counts.get(k) || 0) + 1);
      const hashes = ws.map((w, i) => byPair.get(`${w}|${ws[(i + 1) % ws.length]}`)?.hash).filter(Boolean) as string[];
      const line = `${c.hop_count}-hop, ${c.duration_seconds}s, ${Number(c.min_amount).toFixed(4)}-${Number(c.max_amount).toFixed(4)} ETH, ${ws.map((w) => `${w.slice(0, 8)}…${labelOf(w) ? ` (${labelOf(w)!.name.slice(0, 28)})` : ''}`).join(' → ')}; txs ${hashes.map((h) => `[${h.slice(0, 10)}…](https://etherscan.io/tx/${h})`).join(' ')}`;
      examples.set(k, [...(examples.get(k) || []), line]);
    }
    const recount = clientCycleCount(edges, window);
    const part = new Map<string, number>();
    for (const c of cycles) for (const w of String(c.cycle_path).split(' -> ').slice(0, -1)) part.set(w, (part.get(w) || 0) + 1);
    const topPart = [...part.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    // families: cycles that share >= 2 wallets are merged (one operator's pattern is not many independent events)
    const sets = cycles.map((c) => new Set<string>(String(c.cycle_path).split(' -> ').slice(0, -1)));
    const parent = sets.map((_, i) => i);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const pairToCycle = new Map<string, number>();
    sets.forEach((st, i) => {
      const ws = [...st].sort();
      for (let a = 0; a < ws.length; a++) for (let b = a + 1; b < ws.length; b++) {
        const k = `${ws[a]}|${ws[b]}`;
        if (pairToCycle.has(k)) parent[find(i)] = find(pairToCycle.get(k)!);
        else pairToCycle.set(k, i);
      }
    });
    const famSize = new Map<number, number>();
    sets.forEach((_, i) => famSize.set(find(i), (famSize.get(find(i)) || 0) + 1));
    const families = famSize.size;
    const biggest = Math.max(0, ...famSize.values());
    const amounts = cycles.map((c) => Number(c.max_amount)).sort((a, b) => a - b);
    const med = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0;
    const dust = amounts.filter((a) => a < 0.001).length;
    const shown = cycles.length;
    verification.push(`| ${window}s | ${o.total_cycles_found} | ${recount} | ${o.total_cycles_found === recount ? 'match' : '**MISMATCH**'} |`);
    concentration.push(`| ${window}s | ${shown} | ${families} (largest: ${biggest}) | ${part.size} | ${topPart.map(([w, n]) => `${w.slice(0, 8)}…${labelOf(w) ? ' (' + labelOf(w)!.name.slice(0, 22) + ')' : ''} in ${n}`).join('; ')} | ${med.toFixed(5)} ETH | ${dust} (${shown ? Math.round((100 * dust) / shown) : 0}%) |`);
    console.log(`cycles @${window}s: ${o.total_cycles_found} (engine) vs ${recount} (client)  (${r.ms}ms)  ${JSON.stringify(Object.fromEntries(counts))}`);
    cycleSummary.push(`| ${window}s | ${o.total_cycles_found} | ${[...counts.entries()].map(([k, n]) => `${k}: ${n}`).join('; ') || '-'} | ${r.ms} ms |`);
    cycleSections.push(`### Window ${window}s: examples\n\n` + ([...examples.entries()].map(([k, xs]) => `**${k}** (${xs.length}):\n` + xs.slice(0, 4).map((x) => `* ${x}`).join('\n')).join('\n\n') || '_none_'));
  }

  // ---------------- taint from OFAC seeds ----------------
  const seedsPresent = stats.risk_seed_wallets as number;
  const taintLines: string[] = [];
  let taintReached: any[] = [];
  for (const direction of ['forward', 'both']) {
    const r = await runQuery('ghostshield_risk_propagation', { max_hops: 4, result_limit: 200, direction, scope: SCOPE }, 150);
    const o: any = Object.assign({}, ...r.results);
    taintLines.push(`| ${direction}, 4 hops | ${o.seed_wallets} | ${o.tainted_wallets} | ${r.ms} ms |`);
    if (direction === 'both') taintReached = o.top_risk_wallets;
  }
  const taintCode = await isContract(taintReached.slice(0, 40).map((w) => w.wallet_id));
  const taintExamples = taintReached.slice(0, 10).map((w) => `| ${w.wallet_id.slice(0, 10)}… | ${labelOf(w.wallet_id)?.name || '-'} | ${taintCode.get(w.wallet_id) ? 'contract' : 'EOA'} | ${w.hop} | ${Number(w.score).toFixed(4)} |`);

  // ---------------- funding clusters ----------------
  const funderOf = new Map<string, Set<string>>();
  for (const e of edges) {
    const l = labels.get(e.from);
    if (l && fundingCategory(l.labels, l.name)) funderOf.set(e.to, (funderOf.get(e.to) || new Set()).add(l.name));
  }
  const clusterLines: string[] = [];
  const clusterDetail: string[] = [];
  const suppressed: string[] = [];
  for (const ignore of ['EXCHANGE']) {
    const r = await runQuery('ghostshield_sybil_clusters', { min_cluster_size: 2, result_limit: 50, scope: SCOPE, ignore_funder_category: ignore }, 150);
    const o: any = Object.assign({}, ...r.results);
    suppressed.push(`| ignore_funder_category = ${ignore} | ${o.total_clusters_identified} | ${r.ms} ms |`);
  }
  for (const min of [2, 5]) {
    const r = await runQuery('ghostshield_sybil_clusters', { min_cluster_size: min, result_limit: 50, scope: SCOPE }, 150);
    const o: any = Object.assign({}, ...r.results);
    clusterLines.push(`| ${min} | ${o.total_clusters_identified} | ${r.ms} ms |`);
    if (min === 2) {
      for (const c of o.sybil_clusters as any[]) {
        const members = String(c.member_wallets).split(',').filter(Boolean);
        const tally = new Map<string, number>();
        for (const m of members) for (const f of funderOf.get(m) || []) tally.set(f, (tally.get(f) || 0) + 1);
        const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
        clusterDetail.push(`| ${c.member_count} | ${c.category} | ${top ? `${top[0]} (${top[1]} of ${members.length} listed)` : 'no labelled funder among listed members'} |`);
      }
    }
  }

  const md = `# Real data: Ethereum mainnet (unlabeled), detector audit

Generated by \`npm run evaluate:ethereum\` on ${new Date().toISOString().slice(0, 10)}, graph \`${graph}\`.

**Data.** ${meta.blocks} consecutive mainnet blocks (${meta.fromBlock}..${meta.toBlock}, ${((meta.lastTimestamp - meta.firstTimestamp) / 3600).toFixed(1)} hours) fetched from a public RPC:
${meta.transactions.toLocaleString()} transactions, ${meta.valueTransfers.toLocaleString()} with value > 0, ${meta.uniqueEdges.toLocaleString()} unique (from, to) edges loaded
(**${meta.repeatPairsDropped.toLocaleString()} repeated pairs, ${((100 * meta.repeatPairsDropped) / meta.valueTransfers).toFixed(0)}% of value transfers, were dropped** by the one-edge-per-pair model).
${stats.total_wallets.toLocaleString()} wallets; ${seedsPresent} are OFAC-sanctioned addresses (seeds). Labels: Etherscan label dataset; contract status: \`eth_getCode\` at the head block.

**There is no fraud ground truth in this data**, so this report makes no precision or recall claim. It shows what the detectors flag on real traffic and
classifies each finding with public evidence, which is the closest honest measure of false-alarm behaviour available without labels.

## Temporal cycles (max 5 hops)

| Window | Cycles found | Classification of participants | Query time |
|---|---|---|---|
${cycleSummary.join('\n')}

### Engine correctness check

An independent client-side recount over the raw fetched edges (same rules: 3 to 5 hops, non-decreasing timestamps, distinct wallets, window) must equal the engine's total.

| Window | Engine | Client recount | |
|---|---|---|---|
${verification.join('\n')}

### Concentration and size (cycles listed; the result limit is approximate under parallel execution, so this can be below the total)

| Window | Cycles listed | Families (cycles sharing >= 2 wallets merged) | Distinct wallets | Wallets in the most cycles | Median largest hop | Dust cycles (< 0.001 ETH) |
|---|---|---|---|---|---|---|
${concentration.join('\n')}

${cycleSections.join('\n\n')}

## Taint from OFAC-sanctioned seeds

${seedsPresent === 0 ? '_No sanctioned address transacted in this window, so there is nothing to propagate. Extend the block range to include some._\n' : ''}
Seeds are addresses the Etherscan label dataset marks as sanctioned (here the historical Tornado Cash designation; Tornado Cash was delisted by OFAC in 2025) plus the current OFAC list. Scores are cumulative multi-hop exposure, **not probabilities**, and can exceed 1 when taint recirculates.

| Direction | Seeds | Wallets reached | Query time |
|---|---|---|---|
${taintLines.join('\n')}

${taintExamples.length ? `Top reached wallets (both directions):\n\n| Wallet | Public label | Type | Hop | Score |\n|---|---|---|---|---|\n${taintExamples.join('\n')}\n` : ''}
## Funding-burst clusters (labelled exchange / mixer / bridge sources)

| Min cluster size | Clusters | Query time |
|---|---|---|
${clusterLines.join('\n')}

Clusters found (min size 2), attributed to the labelled funder of their listed members:

| Wallets | Category | Dominant labelled funder |
|---|---|---|
${clusterDetail.join('\n')}

With label-aware suppression of the \`EXCHANGE\` funder category:

| Setting | Clusters (min size 2) | Query time |
|---|---|---|
${suppressed.join('\n')}

The suppression depends on public labels being correct and complete; an operator using an unlabelled funder would not be suppressed (and would not be an exchange).

Real exchanges fan out to thousands of wallets, so the hub cap prunes the biggest by design. What remains are low-fan-out labelled sources, and any funder that provisions fresh wallets in batches (for example exchange "Deposit Funder" accounts provisioning deposit addresses) is, structurally, indistinguishable from a sybil funder: this is the false-alarm profile of burst-based clustering on real traffic.

## Limits

* ${meta.blocks} blocks (~${((meta.lastTimestamp - meta.firstTimestamp) / 3600).toFixed(0)} h) is a small window; the RPC is non-archive, so older blocks (for example historical Tornado Cash flows) were not available.
* Native ETH transfers only: no ERC-20 transfers, internal transactions, or event logs. Most laundering and wash-trading volume moves as tokens, so this under-sees it.
* Contract status is read at the head block, not at transaction time.
* Classification above is a plausibility audit, not a verdict: a loop between unlabelled EOAs is not proof of wrongdoing.
`;
  fs.writeFileSync(path.resolve(process.cwd(), 'docs/REAL_DATA_ETHEREUM.md'), md);
  console.log('\nwrote docs/REAL_DATA_ETHEREUM.md');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
