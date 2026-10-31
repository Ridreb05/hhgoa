// ==============================================================================
// GHOSTSHIELD: Deterministic scale dataset generator with ground truth
//
// Produces a synthetic on-chain graph with PLANTED fraud patterns and HARD
// NEGATIVES, so detector precision/recall can be measured honestly:
//   fast rings      A->B->C(->D->E)->A inside 10 minutes          (must be flagged)
//   slow cycles     same topology but hours apart, benign          (must NOT be flagged)
//   sybil farms     one agent + one burner funder + small fan-out  (must cluster)
//   crowds          thousands of wallets sharing one CEX funder    (must NOT cluster)
//   bot fleets      legitimate agents controlling many wallets     (must NOT cluster)
//   taint chains    peel chains hanging off known-bad seed wallets (must rank high)
//
// Same seed -> byte-identical dataset. This is synthetic: it validates the
// detectors, it is NOT a claim about real-world blockchain distributions.
// ==============================================================================

export const T0 = 1_700_000_000;
export const DAY = 86_400;

export interface WalletV { id: string; network: string; label: string; creation_time: number; provenance: string; is_risk_seed: boolean }
export interface FundingV { id: string; category: string; label: string; provenance: string }
export interface AgentV { id: string; display_name: string; agent_type: string; provenance: string }
export interface ContractV { id: string; network: string; protocol: string; category: string }
export interface TransferE { from: string; to: string; amount: number; asset: string; event_timestamp: number; tx_id: string }
export interface FundingE { from: string; to: string; amount: number; funding_timestamp: number; event_id: string }
export interface ControlE { from: string; to: string; provenance: string; recorded_at: number }
export interface DelegationE { from: string; to: string; delegation_type: string; recorded_at: number }
export interface InteractionE { from: string; to: string; interaction_timestamp: number; tx_id: string; interaction_type: string }

export interface GroundTruth {
  fast_rings: { wallets: string[]; length: number }[];
  slow_cycles: { wallets: string[] }[];
  sybil_farms: { wallets: string[]; agent: string; funder: string }[];
  crowd_funders: string[];
  bot_fleet_agents: string[];
  seeds: string[];
  tainted: Record<string, number>; // wallet -> hop distance from nearest seed
}

export interface Dataset {
  wallets: WalletV[];
  fundingSources: FundingV[];
  agents: AgentV[];
  contracts: ContractV[];
  transfers: TransferE[];
  fundingEdges: FundingE[];
  controlEdges: ControlE[];
  delegationEdges: DelegationE[];
  interactions: InteractionE[];
  truth: GroundTruth;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDataset(wallets = 20_000, seed = 42): Dataset {
  const rnd = mulberry32(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('');
  const addr = () => '0x' + hex(40);
  const tx = () => '0x' + hex(64);
  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const lognormal = (median: number) => median * Math.exp((rnd() + rnd() + rnd() - 1.5) * 1.6);
  const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

  const d: Dataset = {
    wallets: [], fundingSources: [], agents: [], contracts: [], transfers: [],
    fundingEdges: [], controlEdges: [], delegationEdges: [], interactions: [],
    truth: { fast_rings: [], slow_cycles: [], sybil_farms: [], crowd_funders: [], bot_fleet_agents: [], seeds: [], tainted: {} },
  };

  const addWallet = (prov: string, created: number, seedFlag = false): WalletV => {
    const id = addr();
    const w = { id, network: 'ethereum', label: `Wallet ${short(id)}`, creation_time: created, provenance: prov, is_risk_seed: seedFlag };
    d.wallets.push(w);
    return w;
  };
  // TRANSFERRED_TO has no discriminator, so REST++ keeps one edge per ordered pair.
  const pairs = new Set<string>();
  const transfer = (from: string, to: string, amount: number, ts: number) => {
    if (pairs.has(`${from}|${to}`)) return;
    pairs.add(`${from}|${to}`);
    d.transfers.push({ from, to, amount: r4(amount), asset: 'ETH', event_timestamp: ts, tx_id: tx() });
  };
  const fund = (from: string, to: string, amount: number, ts: number) =>
    d.fundingEdges.push({ from, to, amount: r4(amount), funding_timestamp: ts, event_id: 'FND_' + hex(10) });
  const addFunder = (id: string, category: string, label: string) => {
    d.fundingSources.push({ id, category, label, provenance: 'synthetic_scale' });
    return id;
  };
  const addAgent = (id: string, name: string, type: string) => {
    d.agents.push({ id, display_name: name, agent_type: type, provenance: 'synthetic_scale' });
    return id;
  };
  const control = (agent: string, wallet: string, ts: number) =>
    d.controlEdges.push({ from: agent, to: wallet, provenance: 'erc4337_session_key', recorded_at: ts });

  // ---- reference entities ----------------------------------------------------
  const cex = Array.from({ length: 30 }, (_, i) => addFunder(`FS_CEX_${i}`, 'EXCHANGE', `Exchange Hot Wallet ${i}`));
  const bridges = Array.from({ length: 5 }, (_, i) => addFunder(`FS_BRIDGE_${i}`, 'BRIDGE', `Cross-chain Bridge ${i}`));
  const treasuries = Array.from({ length: 3 }, (_, i) => addFunder(`FS_TREASURY_${i}`, 'TREASURY', `DAO Treasury ${i}`));
  const mixers = Array.from({ length: 8 }, (_, i) => addFunder(`FS_MIXER_${i}`, 'MIXER', `Mixer Pool ${i}`));
  const protocols = ['Uniswap V3 Router', 'Aave V3 Pool', 'Curve 3pool', 'Lido stETH', 'Compound', 'OpenSea Seaport', '1inch Router', 'Balancer Vault'];
  const contracts = Array.from({ length: 24 }, (_, i) => {
    const id = addr();
    d.contracts.push({ id, network: 'ethereum', protocol: `${protocols[i % protocols.length]} #${i}`, category: i % 3 === 0 ? 'DEX' : i % 3 === 1 ? 'LENDING' : 'STAKING' });
    return id;
  });

  // ---- benign population -----------------------------------------------------
  const benignCount = Math.floor(wallets * 0.9);
  const benign: string[] = [];
  const crowdPool = [...cex.slice(0, 4)]; // four mega-funders: thousands of users each (hard negatives)
  d.truth.crowd_funders = [...crowdPool];

  for (let i = 0; i < benignCount; i++) {
    const created = T0 - int(30, 400) * DAY;
    const w = addWallet('synthetic_benign', created);
    benign.push(w.id);
    const r = rnd();
    const funder = r < 0.62 ? pick(crowdPool) : r < 0.9 ? pick(cex) : r < 0.97 ? pick(bridges) : r < 0.99 ? pick(treasuries) : pick(mixers);
    fund(funder, w.id, lognormal(2), created + int(0, DAY));
  }

  // hubs: the most active ~1.5% of wallets (exchange deposits, routers) receive many transfers
  const hubs = benign.slice(0, Math.max(10, Math.floor(benign.length * 0.015)));
  const horizon = 90 * DAY;
  for (const from of benign) {
    const k = Math.min(14, Math.floor(-Math.log(1 - rnd()) * 4) + 1);
    for (let j = 0; j < k; j++) {
      const to = rnd() < 0.55 ? pick(hubs) : pick(benign);
      if (to !== from) transfer(from, to, lognormal(0.6), T0 + int(0, horizon));
    }
    if (rnd() < 0.5) {
      const c = pick(contracts);
      d.interactions.push({ from, to: c, interaction_timestamp: T0 + int(0, horizon), tx_id: tx(), interaction_type: pick(['SWAP_EXACT_TOKENS', 'ADD_LIQUIDITY', 'DEPOSIT', 'STAKE']) });
    }
  }

  // legitimate bot fleets: agents controlling many benign wallets (must NOT form sybil clusters)
  const fleets = Math.max(2, Math.floor(wallets / 8000));
  for (let i = 0; i < fleets; i++) {
    const a = addAgent(`AGENT_FLEET_${i}`, `Market Maker Fleet ${i}`, 'MARKET_MAKER');
    d.truth.bot_fleet_agents.push(a);
    for (const w of benign.slice(i * 700 + 100, i * 700 + 100 + int(250, 600))) control(a, w, T0 - 20 * DAY);
  }

  // hard negative: slow cycles (hours apart, outside any 10 minute window)
  const slowCount = Math.max(6, Math.floor(wallets / 500));
  for (let i = 0; i < slowCount; i++) {
    const ring = [pick(benign), pick(benign), pick(benign)];
    if (new Set(ring).size < 3) continue;
    const base = T0 + int(0, horizon - 3 * DAY);
    for (let h = 0; h < 3; h++) transfer(ring[h], ring[(h + 1) % 3], lognormal(1.5), base + h * int(6 * 3600, 20 * 3600));
    d.truth.slow_cycles.push({ wallets: ring });
  }

  // ---- planted fast rings ------------------------------------------------------
  const ringCount = Math.max(6, Math.floor(wallets / 1500));
  for (let i = 0; i < ringCount; i++) {
    const length = 3 + (i % 3); // 3,4,5
    const ring = Array.from({ length }, () => addWallet('synthetic_ring', T0 - int(1, 5) * DAY).id);
    const mixer = pick(mixers);
    const base = T0 + int(2 * DAY, horizon - DAY);
    let amount = lognormal(12) + 5;
    ring.forEach((w, k) => fund(mixer, w, amount * 0.6, base - int(300, 3000)));
    let ts = base;
    for (let h = 0; h < length; h++) {
      transfer(ring[h], ring[(h + 1) % length], amount, ts);
      ts += int(40, 110); // one draw per hop, so timestamps are strictly increasing
      amount *= 0.98;
    }
    d.truth.fast_rings.push({ wallets: ring, length });
  }

  // ---- planted sybil farms -----------------------------------------------------
  const farmCount = Math.max(4, Math.floor(wallets / 2500));
  const farmCollector = addWallet('synthetic_collector', T0 - 2 * DAY).id;
  for (let i = 0; i < farmCount; i++) {
    const size = int(8, 25);
    const burner = addFunder(`FS_BURNER_${i}`, i % 2 ? 'MIXER' : 'BRIDGE', `Burner Funder ${i}`);
    const agent = addAgent(`AGENT_SYBIL_${i}`, `Sybil Coordinator ${i}`, 'SCRIPTED_BOT');
    const base = T0 + int(DAY, horizon - DAY);
    const farm = Array.from({ length: size }, () => addWallet('synthetic_sybil', base - int(0, 3600)).id);
    farm.forEach((w) => {
      fund(burner, w, lognormal(0.3), base + int(0, 3600));
      control(agent, w, base + int(0, 600));
      transfer(w, farmCollector, lognormal(0.05), base + int(3600, 7200));
      d.interactions.push({ from: w, to: contracts[0], interaction_timestamp: base + int(3600, 7200), tx_id: tx(), interaction_type: 'CLAIM_AIRDROP' });
    });
    d.truth.sybil_farms.push({ wallets: farm, agent, funder: burner });
  }

  // ---- taint chains from known-bad seeds ---------------------------------------
  const seedCount = Math.max(5, Math.floor(wallets / 2000));
  for (let i = 0; i < seedCount; i++) {
    const seedW = addWallet('synthetic_exploit', T0 - 60 * DAY, true);
    d.truth.seeds.push(seedW.id);
    let prev = seedW.id;
    let amount = lognormal(40) + 20;
    let ts = T0 + int(0, horizon / 2);
    const depth = int(2, 4);
    for (let h = 1; h <= depth; h++) {
      const next = addWallet('synthetic_laundering', ts - DAY).id;
      transfer(prev, next, amount, ts);
      d.truth.tainted[next] = h;
      amount *= 0.92;
      ts += int(600, 6 * 3600);
      prev = next;
    }
  }

  return d;
}
