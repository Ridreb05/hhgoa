# GhostShield 🛡️
### Graph-Based Transaction Risk & Sybil Detection Powered by TigerGraph

[![CI](https://github.com/your-username/ghostshield/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/ghostshield/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TigerGraph](https://img.shields.io/badge/Database-TigerGraph_3.x/4.x-orange.svg)](https://www.tigergraph.com/)
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
* `Wallet`: Cryptographic accounts (`id`, `network`, `label`, `creation_time`, `provenance`, `is_risk_seed`).
* `FundingSource`: Upstream liquidity origins (`id`, `category` [MIXER, EXCHANGE, BRIDGE, TREASURY], `label`, `provenance`).
* `Agent`: Autonomous off-chain/on-chain decision entities (`id`, `display_name`, `agent_type`, `provenance`).
* `SmartContract`: Protocols and pools (`id`, `network`, `protocol`, `category`).

### Edge Types
* `TRANSFERRED_TO` (`Wallet → Wallet`): P2P transfers with `amount`, `asset`, `event_timestamp`, and `tx_id`.
* `FUNDED` (`FundingSource → Wallet`): Upstream deposit events with `amount`, `funding_timestamp`, and `event_id`.
* `CONTROLS` (`Agent → Wallet`): Agent execution authority with `provenance` and `recorded_at`.
* `DELEGATES_TO` (`Agent → Agent`): Multi-tier delegation hierarchies with `delegation_type`.
* `INTERACTS_WITH` (`Wallet → SmartContract`): Contract calls with `interaction_timestamp` and `interaction_type`.

---

## 5. Compiled GSQL Queries

Located in [`database/tigergraph/queries/`](database/tigergraph/queries/):

| Query File | Description & GSQL Features Used |
| :--- | :--- |
| [`ghostshield_dashboard_metrics.gsql`](database/tigergraph/queries/ghostshield_dashboard_metrics.gsql) | Computes global vertex counts, edge counts, cumulative volume, and latest timestamps using `SumAccum`, `MaxAccum`, and parallel vertex sets. |
| [`ghostshield_detect_cycles.gsql`](database/tigergraph/queries/ghostshield_detect_cycles.gsql) | Performs bounded directed cycle detection ($k \in [3, 4]$) with an explicit chronological order and temporal window constraint ($\Delta t = t_{\max} - t_{\min} \le 600\text{s}$), and calculates volume retention ratios. |
| [`ghostshield_investigate_wallet.gsql`](database/tigergraph/queries/ghostshield_investigate_wallet.gsql) | Traverses a bounded 1-hop and 2-hop neighborhood from a target wallet, extracting incoming/outgoing transfers, direct funding, shared funding peer wallets, controlling agents, and risk seed proximity. |
| [`ghostshield_risk_evidence.gsql`](database/tigergraph/queries/ghostshield_risk_evidence.gsql) | Extracts multi-modal risk features across cycle participation, common funding overlap, and seed proximity using `SetAccum` intersections and `OrAccum`. |
| [`ghostshield_sybil_clusters.gsql`](database/tigergraph/queries/ghostshield_sybil_clusters.gsql) | Identifies coordinated Sybil syndicates sharing high-degree funding sources (mixers, bridges, CEX sweeps) or shared controlling agents using vertex `SetAccum` and parallel set clustering. |
| [`ghostshield_path_find.gsql`](database/tigergraph/queries/ghostshield_path_find.gsql) | Reconstructs step-by-step bounded multi-hop transaction paths between any source wallet and target entity with timestamps, transaction IDs, and volume loss tracking. |

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

To execute queries against a live TigerGraph Cloud instance:

1. Provision a free cluster on [TigerGraph Cloud](https://tgcloud.io).
2. Follow the setup instructions in [`docs/TIGERGRAPH_SETUP.md`](docs/TIGERGRAPH_SETUP.md) to install `database/tigergraph/setup_graph.gsql` and load `database/tigergraph/load_data.gsql`.
3. Create `.env.local` with your cluster credentials:
   ```bash
   GHOSTSHIELD_ENGINE_MODE=tigergraph
   TIGERGRAPH_HOST=https://your-cluster.i.tgcloud.io
   TIGERGRAPH_GRAPH_NAME=GhostShieldGraph
   TIGERGRAPH_USERNAME=tigergraph
   TIGERGRAPH_PASSWORD=your_password
   ```
4. Restart the development server (`npm run dev`). The header badge will immediately switch to **TIGERGRAPH LIVE** with real-time measured REST++ latency.

---

## 9. Running Tests & Benchmarks

```bash
# Run Vitest unit & integration test suite
npm run test

# Run synthetic ground truth precision/recall benchmark
npm run evaluate

# Run Next.js production build verification
npm run build
```

---

## 10. Synthetic Benchmark Results

Executed via `npm run evaluate`:

* **Accuracy:** 100.0%
* **Precision:** 100.0%
* **Recall:** 100.0%
* **F1 Score:** 100.0%
* **Confusion Matrix:** TP: 2, TN: 3, FP: 0, FN: 0

*(Measured over curated synthetic ground truth fixtures. See [`docs/EVALUATION.md`](docs/EVALUATION.md) for full breakdown and caveats).*

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

* **Simulation Gateway:** GhostShield generates advisory risk assessments (`ALLOW`, `REVIEW`, `REJECT`) for transaction gatekeeping; it does not hold custody or sign live transactions.
* **Corroborating Signals:** Participating in a cycle or sharing a centralized exchange deposit address does not automatically prove criminal intent; the system treats these as explainable risk signals for security analyst review.
