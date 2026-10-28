# GhostShield: Prior Art & Comparative Analysis

## 1. Landscape Overview

Graph-based forensic analysis and anomaly detection in cryptographic transaction networks are well-studied domains. This document surveys established industrial and academic approaches, distinguishing widely known techniques from GhostShield's specific architectural and algorithmic contribution.

---

## 2. Existing Approaches

| Category | Representative Solutions | Primary Methodology | Key Limitations & Tradeoffs |
| :--- | :--- | :--- | :--- |
| **Enterprise Blockchain Forensics** | Chainalysis Reactor, Elliptic Investigator, TRM Labs | Proprietary clustering algorithms, centralized identity attribution, off-chain entity resolution, address poisoning tracking. | Black-box scoring, proprietary closed databases, slow batch processing unsuitable for pre-execution transaction gatekeeping; prohibitive enterprise pricing for indie DeFi protocols. |
| **Academic Sybil & Wash Trading Detection** | Victor & Weintraud (2021) "Detecting Wash Trading in Decentralized Exchanges", Wang et al. (2020) | Offline heuristics, topological subgraph isomorphism, network motif extraction, graph neural networks (GNNs). | Designed for post-hoc empirical research on static snapshot datasets. High computational overhead ($O(V^3)$), poor temporal filtering for real-time validation. |
| **Classical Graph Algorithms** | Tarjan's Strongly Connected Components (SCC), Johnson's Elementary Cycles | Depth-First Search (DFS) with path backtracking. Identifies all simple cycles in a directed graph. | Johnson's algorithm is $O((V+E)(C+1))$ where $C$ is the number of cycles. In dense financial graphs, cyclic explosion causes combinatorial out-of-memory crashes without temporal pruning and depth bounds. |
| **Graph Database Native Analytics** | Neo4j Cypher / APOC, TigerGraph Graph Data Science (GDS) | Native Graph Storage, parallel BFS/DFS, GDS cycle detection algorithms. | Standard cycle detection identifies *topological* cycles without assessing whether transfers occurred within realistic operational time windows (e.g., 10 minutes) or conserved capital. |

---

## 3. Detailed Comparative Breakdown

### 3.1 Chainalysis / TRM Labs vs. GhostShield
* **Established Technique:** Both rely on bipartite graph clustering to link deposit addresses and hot wallets to known entities (e.g., mixers, exchanges, sanctions lists).
* **GhostShield's Position:** GhostShield does not attempt to reproduce global KYC attribution databases. Instead, GhostShield operates as a self-contained, protocol-embeddable risk engine that performs localized, real-time multi-hop graph analysis against an organization's transaction graph using open GSQL queries.

### 3.2 Standard Directed Cycle Detection vs. GhostShield Temporal Cycle GSQL
* **Established Technique:** Standard topological cycle detection (e.g., TigerGraph GDS `cycle_detection` or Johnson's algorithm) checks whether directed path $v_1 \to v_2 \to \dots \to v_k \to v_1$ exists.
* **Problem:** In any active financial network, cyclic topologies occur routinely over months (e.g., arbitrage routes, market maker rebalancing, circular settlement). Flagging every topological cycle produces overwhelming false positive rates.
* **GhostShield's Specific Contribution:**
  1. **Bounded Depth ($k \in [3, 5]$):** Prevents combinatorial explosion on high-degree hub nodes.
  2. **Strict Temporal Constraint Window ($\Delta t = t_{\text{last}} - t_{\text{first}} \le \tau_{\text{window}}$, default 600s):** Traversal keeps track of transfer event timestamps along candidate edges. A path is only classified as a suspicious cycle if all participating transfers occurred sequentially within the configured window.
  3. **Corroborating Multi-Modal Evidence:** Cross-references cycles against shared upstream funding sources (`FUNDED` by same `FundingSource`) and agent delegation trees (`CONTROLS` / `DELEGATES_TO`).

### 3.3 Relational SQL Transaction Monitoring vs. TigerGraph Native Graph
* **Relational Limitations:** SQL queries with recursive CTEs (Common Table Expressions) require joining transaction tables repeatedly:
  ```sql
  -- Traditional SQL 3-hop cycle query (infeasible at scale)
  SELECT t1.sender, t2.sender, t3.sender 
  FROM transfers t1
  JOIN transfers t2 ON t1.recipient = t2.sender AND t2.timestamp >= t1.timestamp
  JOIN transfers t3 ON t2.recipient = t3.sender AND t3.timestamp >= t2.timestamp
  WHERE t3.recipient = t1.sender 
    AND (t3.timestamp - t1.timestamp) <= 600;
  ```
  On a table of 10M transactions, this query requires full index scans and Cartesian joins that timeout or lock tables.
* **TigerGraph GSQL Execution:** Uses Massively Parallel Processing (MPP) vertex-centric compute. Traversal operates concurrently across vertices using vertex-attached accumulators (`SetAccum`, `MinAccum`, `SumAccum`), traversing outgoing edges in parallel in sub-second latency.

---

## 4. Known Techniques vs. GhostShield Contributions

### Established Techniques Utilized:
* Directed graph representation of financial transactions ($V = \text{Accounts}$, $E = \text{Transfers}$).
* Bounded Breadth-First Search (BFS) for neighborhood expansion.
* Deterministic weighted scoring models for composite risk evaluation.
* Graph-driven explainability trees for forensic analyst review.

### GhostShield's Project Contribution:
* **Production-Grade GSQL Implementation:** Handcrafted, verified GSQL queries specifically structured for time-bounded cyclic anomaly detection and heterogeneous agent-wallet multi-hop queries.
* **Dual-Mode Pluggable Architecture:** A unified TypeScript `GraphProvider` interface running either against TigerGraph Cloud REST++ endpoints or a zero-dependency local deterministic simulator, allowing seamless local development, testing, and cloud deployment.
* **Explainable Deterministic Policy Engine:** Authoritative risk calculations decoupled from LLM stochasticity, with optional AI report generation grounded strictly in TigerGraph-derived evidence tuples.
* **Real-time Alerting Pipeline:** Direct webhook integration with viaSocket to bridge graph-detected threats into operational security workflows.
