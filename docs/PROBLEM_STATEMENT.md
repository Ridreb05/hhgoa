# GhostShield: Problem Statement

## 1. Executive Summary

Decentralized finance (DeFi) protocols, smart contract platforms, and autonomous financial agent networks operate in permissionless environments where entities can generate arbitrary numbers of cryptographic keypairs at negligible cost. This structural reality facilitates coordinated multi-wallet operations—such as wash trading, liquidity spoofing, Sybil attacks, and multi-hop fund obfuscation—where individual transactions appear routine and compliant when examined in isolation.

**GhostShield** is a graph-native transaction risk detection engine powered by **TigerGraph**. It reconstructs multi-hop relational topologies across cryptographic wallets, funding sources, autonomous agents, and smart contracts to identify coordinated patterns—specifically directed transaction cycles occurring within tight temporal windows, shared upstream funding clusters, and proximity to known risk seeds.

---

## 2. The Problem: Coordinated Sybil & Circular Activity

Traditional rule-based and relational transaction monitoring systems inspect transactions as isolated tuple records `(sender, recipient, amount, timestamp)`. Malicious actors deliberately structure operations to bypass these threshold checks through:

1. **Layering & Rapid Circular Transfers:** Splitting funds across intermediary puppet wallets that route capital in a closed directed cycle ($W_A \to W_B \to W_C \to W_A$) within minutes to artificially inflate trade volumes, manipulate automated market maker (AMM) pricing, or obfuscate stolen assets while retaining ownership.
2. **Dispersed Sybil Topologies:** Creating dozens of autonomous agent wallets funded from a single high-risk bridge, mixer, or centralized exchange deposit sweep, which then interact concurrently with target DeFi contracts while masking their common origin.
3. **Agent Delegation Chains:** Autonomous AI agents delegating execution permissions through multi-tier hierarchies where rogue or compromised sub-agents execute unauthorized capital transfers.

### Concrete Example: Rapid Cycle with Mixer Sweeping

Consider three wallets on Ethereum/Polygon:
* At `T+00:00`: High-risk funding entity `FS_TORNADO_CASH_01` funds `0xWallet_Alpha` with 10.0 ETH.
* At `T+00:02`: `0xWallet_Alpha` transfers 9.9 ETH to `0xWallet_Beta` (`TRANSFERRED_TO`).
* At `T+00:05`: `0xWallet_Beta` transfers 9.8 ETH to `0xWallet_Gamma` (`TRANSFERRED_TO`).
* At `T+00:08`: `0xWallet_Gamma` transfers 9.7 ETH back to `0xWallet_Alpha` (`TRANSFERRED_TO`).

**Individual transaction analysis:**
Each transfer appears to be an ordinary peer-to-peer transaction of roughly 9.8 ETH between valid accounts with sufficient balance and normal gas fees.

**Relational graph analysis:**
Examined as a graph within a 10-minute window ($\Delta t \le 600\text{s}$), the sequence forms a closed directed 3-cycle ($W_\alpha \to W_\beta \to W_\gamma \to W_\alpha$) with volume retention $>97\%$ and a shared upstream mixer funding source. This topology is an unambiguous wash-trading or capital churning pattern.

---

## 3. Intended Users

* **DeFi Protocol Security Engineers & Risk Analysts:** Monitoring automated market makers, lending pools, and cross-chain bridges for wash trading, pool draining, or flash-loan Sybil manipulation.
* **Autonomous Financial Agent Developers:** Verifying counterparty safety before an AI agent signs or executes automated programmatic settlements.
* **Compliance & Forensics Investigators:** Requiring deterministic, explainable graph paths and time-bounded evidence trees rather than opaque black-box machine learning probability scores.

---

## 4. Why Graph Traversal is Required

Relational databases (SQL) and columnar stores struggle with multi-hop cyclic path analysis because:
* Detecting a cycle of arbitrary length $k$ in SQL requires $k-1$ expensive recursive `JOIN` operations across massive transaction tables, resulting in exponential query slowdowns ($O(V^k)$ complexity).
* Filtering paths by edge attributes (temporal proximity $\Delta t \le \text{window}$ and volume similarity) across dynamic multi-hop walks is computationally prohibitive in traditional document/relational databases at scale.
* Graph databases like TigerGraph store vertices and edges natively, enabling real-time parallel graph traversal with bounded depth ($O(d)$ where $d$ is vertex degree) using vertex-attached accumulators (`Accum`) to track visited sets, accumulated paths, and minimum timestamps without query explosion.

---

## 5. Scope: What GhostShield V1 Does and Does Not Do

### What Version 1 DOES:
* **Heterogeneous Graph Model:** Ingests and maintains 4 vertex types (`Wallet`, `FundingSource`, `Agent`, `SmartContract`) and 5 edge types (`TRANSFERRED_TO`, `FUNDED`, `CONTROLS`, `DELEGATES_TO`, `INTERACTS_WITH`).
* **Real GSQL Queries:** Implements native TigerGraph GSQL queries for dashboard aggregation, bounded temporal cycle detection, 2-hop neighborhood investigation, and evidence extraction.
* **Dual Execution Modes:**
  1. *Demo Mode:* Purely local, deterministic synthetic graph engine with zero external dependencies, reproducing identical GSQL semantics.
  2. *TigerGraph Cloud Mode:* Real REST++ query execution against a live TigerGraph instance with verified credential authentication, latency measurement, and error handling.
* **Deterministic Risk Engine:** Calculates a 0–100 risk score based on transparent, explainable weights (cycle temporal validity, volume retention, shared funding overlap, risk seed proximity, and agent controls).
* **Interactive Security Dashboard:** Interactive visualization of topological paths, entity inspection, transaction simulation, and explainable rule breakdowns.
* **Integrations:**
  * AI-powered structured narrative generation with automatic deterministic fallback.
  * viaSocket webhook alert dispatch with live delivery verification.

### What Version 1 DOES NOT DO:
* Does not sign or broadcast live blockchain transactions on Mainnet or Testnet (risk actions are simulated: `ALLOW`, `REVIEW`, `REJECT`).
* Does not claim 100% fraud certainty; graph patterns represent corroborating risk signals requiring security analyst review.
* Does not run unbounded, infinite-depth cycle traversals that could exhaust database memory.
* Does not fabricate data or silently fall back to demo mode when live TigerGraph queries fail.
