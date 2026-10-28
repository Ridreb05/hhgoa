# GhostShield: 3-Minute Hackathon Demo Script

This script provides a concise, high-impact demonstration sequence designed for hackathon judges and technical evaluators.

---

## ⏱️ [0:00 - 0:25] The Problem Statement

**Speaker Action:** Stand on the **Overview** page (`http://localhost:3000`).

**Script:**
> "In decentralized finance, examining transactions as isolated records `(sender, recipient, amount)` is no longer enough. Malicious actors structure wash trading, Sybil attacks, and fund obfuscation across multiple coordinated wallets. When viewed independently, each transfer appears normal and legitimate.
> 
> GhostShield solves this using **TigerGraph** to uncover hidden relational patterns—specifically directed transaction cycles completed within tight temporal windows, shared upstream mixer funding, and connections to known risk seeds."

---

## ⏱️ [0:25 - 0:55] Visualizing the Heterogeneous Graph

**Speaker Action:** Click the **Graph Explorer** tab.

**Script:**
> "Here in the Graph Explorer, GhostShield models the network as a heterogeneous graph:
> * **Cyan nodes** are cryptographic Wallets.
> * **Purple nodes** are upstream Funding Sources like Tornado Cash and centralized exchanges.
> * **Pink nodes** represent autonomous decision agents.
> * **Red nodes** are flagged exploit and sanctions seeds.
> 
> Notice this 3-wallet cluster (`0x71c...sus1`, `0x82d...sus2`, `0x93e...sus3`). If I click the **'Highlight Cycles'** toggle, the directed cyclic flow lights up in amber. We can click any node to inspect its degree, network, and direct links in real time."

---

## ⏱️ [0:55 - 1:35] Detecting Suspicious Coordinated Activity (Scenario A)

**Speaker Action:** Click the **Investigations** tab and ensure `0x71c...sus1` is active.

**Script:**
> "Let's investigate this suspect wallet:
> * GhostShield executes a bounded multi-hop traversal in TigerGraph.
> * The deterministic risk engine scores the activity at **85 out of 100**, issuing an authoritative **REJECT** decision.
> * Notice the mathematical rule breakdown:
>   1. **Rapid Circular Transfer Window (+40 pts):** TigerGraph detected a 3-hop directed cycle completed in just 340 seconds—well within our 10-minute threshold.
>   2. **Capital Conservation (+15 pts):** 98% of the capital was retained through the cycle.
>   3. **Shared Mixer Funding (+20 pts):** Upstream liquidity originates from Tornado Cash.
>   4. **Multi-Tier Agent Delegation (+10 pts):** Controlled by an autonomous bot coordinator."

---

## ⏱️ [1:35 - 2:00] Benign & Common Funding Baseline (Scenario B & C)

**Speaker Action:** Click the **Transaction Simulator** tab, select **'Scenario B: Ordinary Benign Peer Transfer'**, and click **'Execute Pre-Flight Risk Simulation'**.

**Script:**
> "Crucially, GhostShield avoids false alarms. If I simulate an ordinary peer-to-peer transfer between Alice and Bob funded via Coinbase, GhostShield scores it at **17 out of 100**, recommending **ALLOW**.
> 
> Similarly, when multiple wallets share common Binance exchange funding in **Scenario C**, GhostShield attributes a moderate signal without falsely classifying the wallets as malicious. Not every graph connection is an attack."

---

## ⏱️ [2:00 - 2:30] AI Investigation Synthesis & viaSocket Dispatch

**Speaker Action:** Return to **Investigations**, click **'Generate Narrative Report'**, and click **'Dispatch viaSocket Alert'**.

**Script:**
> "To assist human analysts, GhostShield features an AI synthesis module powered by AI Grants India. It ingests verified TigerGraph evidence and compiles a clear narrative summary with recommended operational actions.
> 
> When high-risk activity is detected, GhostShield immediately dispatches a structured incident webhook to **viaSocket**, triggering automated incident response in Slack, Discord, or pager systems."

---

## ⏱️ [2:30 - 3:00] Advanced GSQL Under the Hood & TigerGraph Live Mode

**Speaker Action:** Click the **System Status** tab, or open `database/tigergraph/queries/ghostshield_detect_cycles.gsql` in the editor.

**Script:**
> "Behind the scenes, all heavy lifting is powered by native **GSQL queries**:
> * We leverage TigerGraph accumulators—`SumAccum`, `SetAccum`, and `ListAccum`—to traverse multi-hop paths in parallel without exponential SQL join overhead.
> * Our cycle detection query enforces strict chronological ordering and edge-attribute duration constraints in C++.
> * In TigerGraph Cloud mode, queries execute via compiled REST++ endpoints in under 30 milliseconds.
> 
> GhostShield demonstrates that graph traversal is the missing layer in decentralized transaction security."
