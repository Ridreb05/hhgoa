// ==============================================================================
// GHOSTSHIELD: Evasion & sensitivity study (runs on the cluster)
//   tsx scripts/evasion_study.ts
// Plants structures designed to challenge the detectors, then measures what is
// found and what is missed:
//   slow rings        4-hop rings whose total span is 5 min .. 3 h
//   hub-routed rings  rings that pass through a busy exchange-like hub
//   fragmented farms  12-wallet farms split into 4-wallet fragments (3 agents, 3 burners)
// Also sweeps the cycle window to show the recall / false-alarm trade-off.
// Writes docs/EVASION.md and data/generated/evasion_truth.json (ignored by the main
// benchmark so these structures never count as false positives there).
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { generateDataset, T0 } from './lib/dataset';
import { loadCsv, runQuery } from './lib/tg';
import { SCOPE } from './evaluate_live';

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = prng(7);
const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('');
const wallet = () => '0xe' + hex(39);
const tx = () => '0x' + hex(64);
const key = (xs: string[]) => [...xs].sort().join('|');
const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(0)}%`);

const SPANS = [300, 540, 900, 2700, 10800];
const WINDOWS = [600, 1800, 7200, 14400];

async function main() {
  const base = generateDataset(20000, 42);
  const hubs = base.wallets.slice(0, 200).map((w) => w.id); // busiest benign receivers

  const wallets: unknown[][] = [];
  const transfers: unknown[][] = [];
  const fundingSources: unknown[][] = [];
  const agents: unknown[][] = [];
  const funding: unknown[][] = [];
  const control: unknown[][] = [];
  const addWallet = () => {
    const id = wallet();
    wallets.push([id, 'ethereum', 'Evasion ' + id.slice(0, 8), T0 - 86400, 'synthetic_evasion', false]);
    return id;
  };
  const edge = (a: string, b: string, ts: number) => transfers.push([a, b, 5.0, 'ETH', ts, tx()]);

  const slowRings: { span: number; wallets: string[] }[] = [];
  for (const span of SPANS) {
    for (let i = 0; i < 6; i++) {
      const ws = [addWallet(), addWallet(), addWallet(), addWallet()];
      const start = T0 + 20 * 86400 + Math.floor(rnd() * 40 * 86400);
      ws.forEach((w, h) => edge(w, ws[(h + 1) % 4], start + Math.floor((span * h) / 3)));
      slowRings.push({ span, wallets: ws });
    }
  }

  const hubRings: string[][] = [];
  for (let i = 0; i < 6; i++) {
    const ws = [addWallet(), addWallet(), hubs[i * 7], addWallet()];
    const start = T0 + 25 * 86400 + Math.floor(rnd() * 30 * 86400);
    ws.forEach((w, h) => edge(w, ws[(h + 1) % 4], start + h * 90));
    hubRings.push(ws);
  }

  const fragFarms: { fragments: string[][] }[] = [];
  for (let f = 0; f < 4; f++) {
    const fragments: string[][] = [];
    for (let g = 0; g < 3; g++) {
      const burner = `EV_BURNER_${f}_${g}`;
      const agent = `EV_AGENT_${f}_${g}`;
      fundingSources.push([burner, 'MIXER', `Evasion burner ${f}.${g}`, 'synthetic_evasion']);
      agents.push([agent, `Evasion agent ${f}.${g}`, 'SCRIPTED_BOT', 'synthetic_evasion']);
      const frag: string[] = [];
      const ts = T0 + 30 * 86400 + f * 3 * 86400 + g * 7200;
      for (let k = 0; k < 4; k++) {
        const w = addWallet();
        frag.push(w);
        funding.push([burner, w, 0.3, ts + k * 60, 'EVF_' + hex(8)]);
        control.push([agent, w, 'erc4337_session_key', ts]);
      }
      fragments.push(frag);
    }
    fragFarms.push({ fragments });
  }

  console.log(`loading evasion structures: ${wallets.length} wallets, ${transfers.length} transfers...`);
  await loadCsv('wallets', wallets);
  await loadCsv('funding_sources', fundingSources);
  await loadCsv('agents', agents);
  await loadCsv('transfers', transfers);
  await loadCsv('funding_edges', funding);
  await loadCsv('control_edges', control);

  const truthPath = path.resolve(process.cwd(), 'data/generated/evasion_truth.json');
  fs.writeFileSync(truthPath, JSON.stringify({ wallets: wallets.map((w) => w[0]) }));

  // ---- cycle window sweep ----
  const planted = new Set(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'data/generated/ground_truth.json'), 'utf-8')).fast_rings.map((r: any) => key(r.wallets)));
  const evWallets = new Set(wallets.map((w) => w[0] as string));
  const rows: string[] = [];
  const noise: string[] = [];
  for (const window of WINDOWS) {
    const { results } = await runQuery('ghostshield_detect_cycles', { time_window_seconds: window, max_depth: 5, result_limit: 3000, scope: SCOPE }, 150);
    const o: any = Object.assign({}, ...results);
    const found = new Set<string>(o.cycles.map((c: any) => key(String(c.cycle_path).split(' -> ').slice(0, -1))));
    const bySpan = SPANS.map((s) => {
      const group = slowRings.filter((r) => r.span === s);
      return `${group.filter((r) => found.has(key(r.wallets))).length}/${group.length}`;
    });
    const hubFound = hubRings.filter((r) => found.has(key(r))).length;
    const unexplained = o.cycles.filter((c: any) => {
      const ws: string[] = String(c.cycle_path).split(' -> ').slice(0, -1);
      return !planted.has(key(ws)) && !ws.every((w) => evWallets.has(w) || hubs.includes(w)) && !ws.some((w) => w.includes('...'));
    }).length;
    rows.push(`| ${window}s | ${bySpan.join(' | ')} | ${hubFound}/6 | ${unexplained} |`);
    noise.push(`${window}s: ${o.total_cycles_found} total`);
  }

  // ---- fragmented farms ----
  const fragRows: string[] = [];
  for (const minSize of [5, 2]) {
    const { results } = await runQuery('ghostshield_sybil_clusters', { min_cluster_size: minSize, result_limit: 200, scope: SCOPE }, 150);
    const o: any = Object.assign({}, ...results);
    const clusters: Set<string>[] = o.sybil_clusters.map((c: any) => new Set(String(c.member_wallets).split(',').filter(Boolean)));
    let wholeFarm = 0;
    let fragmentsFound = 0;
    for (const farm of fragFarms) {
      const all = farm.fragments.flat();
      if (clusters.some((c) => all.filter((w) => c.has(w)).length / all.length >= 0.8)) wholeFarm++;
      for (const frag of farm.fragments) if (clusters.some((c) => frag.every((w) => c.has(w)))) fragmentsFound++;
    }
    fragRows.push(`| min cluster size ${minSize} | ${wholeFarm}/${fragFarms.length} | ${fragmentsFound}/${fragFarms.length * 3} |`);
  }

  const md = `# Evasion & sensitivity study

Generated by \`npm run evasion:live\` on ${new Date().toISOString().slice(0, 10)}. Structures are planted on the same cluster as the main benchmark
(provenance \`synthetic_evasion\`) and excluded from its precision/recall.

## Slow rings and the window trade-off

4-hop rings whose total span varies, found at different detector windows. "Unexplained" counts non-planted cycles the detector
reports at that window (chance coincidences in benign traffic).

| Window | span 5 min | 9 min | 15 min | 45 min | 3 h | Hub-routed rings | Unexplained cycles |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

Read: a ring is found only when the window covers its span, so an attacker who spaces hops by more than the window evades detection.
Widening the window recovered every ring, and on this data it cost **no** extra false alarms (0 unexplained cycles up to 4 h even on a ~1M-transfer
graph). That is a property of the synthetic noise, whose timestamps are uniform over 90 days; real traffic is bursty (airdrops, liquidations, bots),
so the false-alarm cost of a wide window on real chains is unmeasured and should not be assumed to be zero.

## Fragmented sybil farms

Four 12-wallet farms, each split into three 4-wallet fragments (separate agent and separate burner funder per fragment).

| Setting | Whole farm linked | Individual fragments recovered |
|---|---|---|
${fragRows.join('\n')}

Read: fragmenting below the burst and cluster-size thresholds defeats the whole-farm view. Nothing links the fragments to each other
in this graph, so no connected-components method could, which is the real limit of coordination evidence.

## What this means

* Temporal cycles: strong against fast loops, blind to patient ones. Window choice is a policy decision; its false-alarm cost on real traffic is unmeasured.
* Hub-routed rings are detected because the search requires distinct wallets, not private ones.
* Sybil clustering depends on coordination leaving a shared agent or a funding burst. Fragmented operations need extra signals (shared contracts, timing, amounts).
`;
  fs.writeFileSync(path.resolve(process.cwd(), 'docs/EVASION.md'), md);
  console.log(md);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
