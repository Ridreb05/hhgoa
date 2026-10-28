# GhostShield: Technical Architecture Decisions

## 1. System Architecture & Core Stack

```mermaid
graph TD
    Client[Next.js Client / UI] <-->|JSON / Typed REST| API[Next.js Route Handlers / API]
    API --> Engine[Deterministic Risk Engine]
    API --> AI[AI Report Generator (AIGI/Fallback)]
    API --> Alerts[viaSocket Alert Dispatcher]
    Engine <--> Provider[Graph Provider Abstraction]
    Provider -->|Demo Mode| LocalAdapter[Deterministic In-Memory Graph]
    Provider -->|TigerGraph Mode| TGAdapter[TigerGraph Cloud REST++ API]
    TGAdapter <--> TGInstance[(TigerGraph Server / GSQL Queries)]
```

### Chosen Technology Stack
* **Framework:** Next.js 14+ (App Router) with full-stack TypeScript (strict mode enabled).
* **Styling & UI:** Tailwind CSS with a security operations center (SOC) dark theme, custom responsive grid, and Lucide React icons.
* **Graph Visualization:** Interactive HTML5 Canvas / SVG graph explorer with physics-based force layout, pan/zoom, node-type color coding, and path highlighting for evidence inspection.
* **Database Engine:** TigerGraph 3.x / 4.x on TigerGraph Cloud running custom compiled GSQL queries.
* **Testing Framework:** Vitest for rapid unit/integration testing with zero-config TypeScript compilation; automated synthetic evaluation suite for precision/recall benchmarking.

---

## 2. Decision Rationale

### 2.1 Full-Stack Monorepo vs. Separated Backend/Frontend
* **Decision:** Single Next.js full-stack application using Node.js serverless route handlers.
* **Rationale:** Eliminates CORS friction, eliminates dual-repo synchronization hurdles, simplifies environment variable management, and allows shared TypeScript interfaces (`GraphTopology`, `InvestigationResult`, `RiskSignal`) between client visualization and backend risk computation.

### 2.2 Dual Graph Provider Pattern
* **Decision:** Abstract graph interactions behind a unified `GraphProvider` interface:
  ```typescript
  export interface GraphProvider {
    readonly mode: 'demo' | 'tigergraph';
    getDashboardMetrics(): Promise<DashboardMetrics>;
    investigateWallet(walletId: string, maxHops?: number): Promise<WalletInvestigation>;
    detectCycles(timeWindowSeconds?: number, maxDepth?: number): Promise<CycleDetectionResult>;
    getRiskEvidence(walletId: string, proposedTx?: CandidateTransaction): Promise<RiskEvidence>;
    getGraphTopology(): Promise<GraphTopology>;
    checkHealth(): Promise<ProviderHealth>;
  }
  ```
* **Rationale:** Guarantees that the repository is immediately runnable and testable by judges or developers without requiring a paid TigerGraph Cloud account, while ensuring that the exact same data contracts and risk scoring rules govern both demo and live modes. If TigerGraph mode fails (e.g., bad credentials or timeout), the system transparently reports the live failure instead of secretly spoofing demo data.

### 2.3 Heterogeneous Graph Schema Design
* **Decision:** Model four distinct vertex types (`Wallet`, `FundingSource`, `Agent`, `SmartContract`) and five directional edge types (`TRANSFERRED_TO`, `FUNDED`, `CONTROLS`, `DELEGATES_TO`, `INTERACTS_WITH`).
* **Rationale:** Modern financial attacks in Web3/DeFi are not restricted to peer-to-peer wallet transfers. They involve automated agents executing on behalf of keypairs, mixers/bridges serving as upstream liquidity roots, and protocol interaction footprints. Explicit typing allows targeted GSQL accumulators without expensive runtime property inspection.

### 2.4 Deterministic Risk Engine Decoupled from LLMs
* **Decision:** Risk scoring ($0 \dots 100$) and recommendation decisions (`ALLOW`, `REVIEW`, `REJECT`) are strictly calculated by deterministic mathematical rules in `lib/risk/engine.ts`.
* **Rationale:** Financial risk gatekeeping requires absolute reproducibility, auditability, and deterministic unit-testing. LLMs are non-deterministic, subject to hallucination, and cannot be trusted with authoritative authorization decisions. AI is strictly confined to generating explanatory natural language summaries based on verified graph evidence tuples.

### 2.5 Time-Bounded Temporal Cycle Traversal in GSQL
* **Decision:** Restrict GSQL cycle detection to a bounded depth ($3 \le k \le 5$) with an explicit temporal window filter ($\Delta t \le 600\text{s}$).
* **Rationale:** Unbounded cycle detection on graphs with millions of edges is NP-hard or prone to path explosion. In DeFi, wash trading and flash arbitrage occur within a few blocks (seconds to minutes). Filtering edge timestamps during traversal limits candidate paths and keeps query response times under 50ms.

---

## 3. Integration Boundaries

### 3.1 TigerGraph Cloud REST++ API
* Query endpoints: `/restpp/query/{graph_name}/{query_name}`
* Authentication: Secret-based token generation via `/restpp/requesttoken` or header-based HTTP Basic/Bearer authentication.
* Parameterization: Strict type-checked query parameters (`wallet_id`, `time_window`, `max_depth`) preventing query injection.

### 3.2 AI Grants India (AIGI) / OpenAI LLM Integration
* Ingests strictly structured JSON evidence tuples: `{ score, rulesTriggered, cyclePaths, sharedFundingSources, seedProximity }`.
* Temperature set to $0.1$ for factual fidelity.
* System prompt strictly prohibits introducing external wallet addresses, inventing balances, or declaring legal guilt.
* Deterministic string-template fallback provides instantaneous narrative generation when credentials are unset.

### 3.3 viaSocket Webhook Dispatcher
* Endpoint: Configurable webhook URL (`VIASOCKET_WEBHOOK_URL`).
* Payload: Compact incident alert containing `investigationId`, `timestamp`, `walletId`, `riskScore`, `recommendedAction`, and `primaryEvidence`.
* Resilience: Timeout after 4000ms, non-blocking execution, failure logging without disrupting user transaction simulation.
