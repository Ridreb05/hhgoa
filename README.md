# GhostShield 🛡️
### Graph-Based Transaction Risk & Sybil Detection Powered by TigerGraph

[![CI](https://github.com/your-username/ghostshield/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/ghostshield/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TigerGraph](https://img.shields.io/badge/Database-TigerGraph_4.x_Savanna-orange.svg)](https://www.tigergraph.com/)
[![Next.js 14](https://img.shields.io/badge/Framework-Next.js_14-black.svg)](https://nextjs.org/)

---

## 1. Problem Statement

Decentralized finance (DeFi) protocols, automated market makers (AMMs), and autonomous agent networks operate in permissionless environments where creating new wallet keypairs is trivial. This enables malicious actors to execute coordinated multi-wallet operations—such as rapid wash trading, liquidity spoofing, Sybil attacks, and capital obfuscation. 

When examined as isolated transaction records `(sender, recipient, amount, timestamp)`, individual transfers appear completely routine and compliant. Only by traversing the multi-hop relational graph across wallets, upstream funding sources, autonomous agents, and smart contracts can coordinated cyclic flows and shared origins be uncovered.

---

## 2. Proposed Solution

**GhostShield** is a graph-native transaction risk detection engine. Built on **TigerGraph** and compiled GSQL queries, GhostShield inspects proposed transactions and suspect addresses to:

1. **Detect Rapid Directed Cycles:** Identifies closed directed loops ($W_A \to W_B \to W_C \to W_A$) occurring within a configurable temporal window ($\Delta t \le 600\text{s}$) with high volume conservation.
2. **Cluster Shared Upstream Funding:** Traces liquidity back to common mixers (e.g. Tornado Cash) or shared centralized exchange hot wallets.
3. **Assess Risk Seed Proximity:** Traverses 1-hop and 2-hop neighborhoods to identify connections with verified sanctions and exploit seeds.
4. **Calculate Deterministic Risk Scores:** Translates verified graph evidence into a reproducible $0 \dots 100$ score with explainable rule attribution (`ALLOW`, `REVIEW`, `REJECT`).
5. **Multi-Channel Integrations:** Synthesizes structured narrative reports via AI Grants India (with deterministic template fallbacks) and dispatches real-time webhook incident alerts to **viaSocket**.

---

## 3. Architecture & Data Flow

```mermaid
graph TD
    Client[Next.js Client / UI] <-->|JSON / REST| API[Next.js Serverless Route Handlers]
    API --> Engine[Deterministic Risk Engine]
    API --> AI[AI Report Generator (AIGI/Fallback)]
    API --> Alerts[viaSocket Alert Dispatcher]
    Engine <--> Provider[Graph Provider Abstraction]
    Provider -->|Demo Mode| LocalAdapter[Deterministic In-Memory Graph]
    Provider -->|TigerGraph Mode| TGAdapter[TigerGraph Cloud REST++ API]
    TGAdapter <--> TGInstance[(TigerGraph Server / GSQL Queries)]
```

---

## 4. Heterogeneous Graph Schema

Located in [`database/tigergraph/schema.gsql`](database/tigergraph/schema.gsql):

### Vertex Types
* `Wallet`: Cryptographic accounts (`id`, `network`, `label`, `creation_time`, `provenance`, `is_risk_seed`, plus `risk_score` and `community_id` written back by the algorithms).
* `FundingSource`: Upstream liquidity origins (`id`, `category` [MIXER, EXCHANGE, BRIDGE, TREASURY], `label`, `provenance`).
* `Agent`: Autonomous off-chain/on-chain decision entities (`id`, `display_name`, `agent_type`, `provenance`).
* `SmartContract`: Protocols and pools (`id`, `network`, `protocol`, `category`).

### Edge Types
* `TRANSFERRED_TO` (`Wallet → Wallet`): P2P transfers with `amount`, `asset`, `event_timestamp`, and `tx_id`.
* `FUNDED` (`FundingSource → Wallet`): Upstream deposit events with `amount`, `funding_timestamp`, and `tx_id`.
* `CONTROLS` (`Agent → Wallet`): Agent execution authority with `authority_level` and `delegation_timestamp`.
* `DELEGATES_TO` (`Agent → Agent`): Multi-tier delegation hierarchies with `role` and `depth`.
* `INTERACTS_WITH` (`Wallet → SmartContract`): Contract calls with `method`, `interaction_timestamp` and `tx_id`.

---

## 5. Compiled GSQL Queries

Located in [`database/tigergraph/queries/`](database/tigergraph/queries/):

| Query File | Description & GSQL Features Used |
| :--- | :--- |
| [`ghostshield_dashboard_metrics.gsql`](database/tigergraph/queries/ghostshield_dashboard_metrics.gsql) | Computes global vertex counts, edge counts, cumulative volume, and latest timestamps using `SumAccum`, `MaxAccum`, and parallel vertex sets. |
| [`ghostshield_detect_cycles.gsql`](database/tigergraph/queries/ghostshield_detect_cycles.gsql) | Temporally ordered round trips of 3 to 5 hops closed inside a time window, found with in-engine pattern matching; reports volume retention per cycle. |
| [`ghostshield_sybil_clusters.gsql`](database/tigergraph/queries/ghostshield_sybil_clusters.gsql) | Connected components (min-label propagation) over shared small-fleet agent control and coordinated funding bursts. Mega-funders and large legitimate bot fleets are pruned as hubs. Optional `community_id` write-back. |
| [`ghostshield_risk_propagation.gsql`](database/tigergraph/queries/ghostshield_risk_propagation.gsql) | Value-weighted forward taint propagation (haircut model) from known-bad seeds in BSP supersteps, `HeapAccum` top-k, optional `risk_score` write-back. |
| [`ghostshield_path_find.gsql`](database/tigergraph/queries/ghostshield_path_find.gsql) | All simple 1 to 4 hop paths between two wallets with per-hop amount, asset, timestamp and tx id; optional temporal ordering. |
| [`ghostshield_investigate_wallet.gsql`](database/tigergraph/queries/ghostshield_investigate_wallet.gsql) | Bounded forensic neighborhood: transfers in both directions, upstream funding, funder peers, controlling agents and delegations, protocol interactions, adjacent risk wallets. |
| [`ghostshield_risk_evidence.gsql`](database/tigergraph/queries/ghostshield_risk_evidence.gsql) | Evidence counters for the policy engine: windowed cycle through the target, common funding with a counterparty, seed exposure, agent chains. |
| [`ghostshield_topology.gsql`](database/tigergraph/queries/ghostshield_topology.gsql) | Bounded subgraph for the explorer: the hot subgraph (seeds, tainted, clustered) or a wallet neighborhood, capped by `vertex_limit`. |

---

## 6. Deterministic Risk Policy

Authoritative scoring ($0 \dots 100$) is computed mathematically in [`lib/risk/engine.ts`](lib/risk/engine.ts):

* **Temporally Correlated Circular Flow:** Up to 40 points ($\le 10$ minute window).
* **Capital Retention & Volume Concentration:** Up to 15 points ($\ge 85\%$ volume retention).
* **Shared Upstream Funding:** Up to 20 points (Mixer: 20 pts, Exchange: 12 pts).
* **Risk Seed Proximity:** Up to 55 points (Direct 1-hop: 45–55 pts, 2-hop: 15 pts).
* **Autonomous Agent Delegation Chains:** Up to 10 points.

### Decision Thresholds
* `0 – 34`: **ALLOW**
* `35 – 64`: **REVIEW**
* `65 – 100`: **REJECT**

---

## 7. Quickstart (One-Command Setup)

GhostShield runs immediately with **zero external accounts or credentials required** in Demo Mode:

```bash
# 1. Clone repository
git clone https://github.com/your-username/ghostshield.git
cd ghostshield

# 2. Install dependencies
npm ci

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Enabling Live TigerGraph Cloud Mode

```bash
# .env.local
GHOSTSHIELD_ENGINE_MODE=tigergraph
TIGERGRAPH_HOST=https://tg-<id>.tg-<id>.i.tgcloud.io
TIGERGRAPH_GRAPH_NAME=GhostShieldGraph
TIGERGRAPH_SECRET=<32 character database secret>

npm run tg:setup                            # schema + migrations, create queries, compile and install
npm run seed:tigergraph -- --wallets 20000  # GSQL loading job: demo scenarios + 18k wallet / 108k edge dataset
npm run dev                                 # header badge switches to TG-CLOUD
```

Full walkthrough and the query catalogue: [`docs/TIGERGRAPH_SETUP.md`](docs/TIGERGRAPH_SETUP.md).

---

## 9. Tests & Benchmarks

```bash
npm run test            # unit tests (generator invariants, adapter behaviour with mocked HTTP, risk engine, demo graph)
npm run typecheck
npm run evaluate        # 5 curated demo scenarios (fixtures, in-memory)
npm run evaluate:live   # scores the installed GSQL queries on the cluster against planted ground truth -> docs/BENCHMARK.md
npm run baselines       # naive baselines on the same data -> docs/BASELINES.md
npm run scale:live      # grows the graph server-side to ~1M transfers and re-measures everything -> docs/SCALE.md
npm run evasion:live    # slow rings, hub-routed rings, fragmented farms; window trade-off -> docs/EVASION.md
npm run evaluate:elliptic   # REAL labeled Bitcoin graph (Elliptic): held-out taint accuracy -> docs/REAL_DATA_ELLIPTIC.md
npm run evaluate:ethereum   # REAL Ethereum blocks: what the detectors flag + audit -> docs/REAL_DATA_ETHEREUM.md
npm run test:live       # integration tests against the cluster (needs a seeded workspace)
```

---

## 10. Results

Real-data results: [`docs/REAL_DATA.md`](docs/REAL_DATA.md) (Elliptic labeled Bitcoin graph, real Ethereum blocks). Synthetic results: [`docs/BENCHMARK.md`](docs/BENCHMARK.md) (quality), [`docs/SCALE.md`](docs/SCALE.md) (up to ~1M transfers), [`docs/BASELINES.md`](docs/BASELINES.md) (what each design choice buys), [`docs/EVASION.md`](docs/EVASION.md) (what it misses). The benchmark run: detector precision/recall against planted
patterns **and planted hard negatives** (slow round-trips, exchange crowds, legitimate bot fleets), plus p50/p95 query latency.
The data is synthetic; these numbers validate the detectors on known structure and are not a real-world accuracy claim.
The five-scenario fixture suite (`npm run evaluate`) is a regression check, not a benchmark.

---

## 11. Project Documentation Index

* [`docs/PROBLEM_STATEMENT.md`](docs/PROBLEM_STATEMENT.md): Detailed problem statement, concrete coordinated attack example, target users, and v1 scope.
* [`docs/PRIOR_ART.md`](docs/PRIOR_ART.md): Comparison with Chainalysis, academic wash trading heuristics, and classical graph algorithms.
* [`docs/TECHNICAL_DECISIONS.md`](docs/TECHNICAL_DECISIONS.md): Stack choices, provider abstraction pattern, and integration boundaries.
* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): System component design and data flow.
* [`docs/TIGERGRAPH_SETUP.md`](docs/TIGERGRAPH_SETUP.md): Step-by-step schema deployment, query installation, and CSV data loading.
* [`docs/EVALUATION.md`](docs/EVALUATION.md): Ground truth matrix, performance metrics, and algorithmic insights.
* [`docs/SECURITY.md`](docs/SECURITY.md): Threat modeling, credential secrecy, parameterized GSQL, and simulation boundaries.
* [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md): 3-minute timed presentation script for evaluators.
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Production deployment to Vercel and TigerGraph Cloud.

---

## 12. Known Limitations & Scope Boundaries

* **Synthetic benchmarks vs real data.** `BENCHMARK.md` / `SCALE.md` use a generated graph with planted patterns. Real-data evidence is in `docs/REAL_DATA*.md`: labeled Bitcoin (taint accuracy) and unlabeled Ethereum (behaviour audit, no precision claim). No labeled Ethereum fraud dataset was used.
* **Scale tested:** see `docs/SCALE.md` (about 1M transfers of server-generated benign noise on the smallest Savanna workspace). Billion-edge behaviour is unmeasured.
* **One edge per ordered wallet pair** (`TRANSFERRED_TO` has no discriminator); see `docs/TIGERGRAPH_SETUP.md` section 5.
* **Cycle detection is 3 to 5 hops** inside a time window, by temporal state propagation.
* **Demo mode differs from live mode for Sybil clustering.** Demo uses simple funder/agent grouping suited to a 12-wallet fixture; live mode uses connected components with hub pruning.
* **Free-tier workspaces auto-suspend** when idle and take about a minute to wake; the first request after a pause can fail with a "starting" message.

* **Simulation Gateway:** GhostShield generates advisory risk assessments (`ALLOW`, `REVIEW`, `REJECT`) for transaction gatekeeping; it does not hold custody or sign live transactions.
* **Corroborating Signals:** Participating in a cycle or sharing a centralized exchange deposit address does not automatically prove criminal intent; the system treats these as explainable risk signals for security analyst review.
