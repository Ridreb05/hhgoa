# GhostShield: Evaluation

**Two different things are measured here. Do not conflate them.**

1. **Detector benchmark at scale** (`npm run evaluate:live`, results in [`BENCHMARK.md`](BENCHMARK.md)): the in-engine GSQL
   detectors run on a ~18k wallet / ~108k edge synthetic graph with planted fraud patterns *and planted hard negatives*
   (slow round-trips, exchange crowds, legitimate bot fleets). Precision and recall are computed against that ground truth.
2. **Scenario regression suite** (this page, `npm run evaluate`): five hand-written fixtures that check the risk policy
   engine end to end. With five labelled cases the 100% figures are a regression check, not an accuracy estimate.

Neither is a claim about real-world blockchain data.

## 1. Evaluation Methodology

To validate the deterministic risk engine and graph traversal queries, GhostShield incorporates an automated synthetic benchmarking suite (`scripts/evaluate.ts`). The test suite evaluates five canonical decentralized transaction topologies representing distinct risk profiles.

> [!IMPORTANT]
> **Evaluation Disclaimer:** The performance metrics reported below are measured strictly over curated, labelled synthetic test fixtures designed to exercise cyclic routing, shared mixer funding, and risk seed proximity. They must not be interpreted as empirical real-world model accuracy across unrestricted blockchain transaction distributions.

---

## 2. Benchmark Ground Truth Matrix

| Scenario ID | Name & Description | Ground Truth Label | Expected Score Range | Primary Evaluated Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Scenario A** | Rapid Circular Transfer ($W_1 \to W_2 \to W_3 \to W_1$ in 340s, 98% retention, Tornado Cash mixer funding) | **REJECT** | $\ge 75$ | `TEMPORAL_CIRCULAR_TRANSFER`, `HIGH_VOLUME_RETENTION`, `SHARED_HIGH_RISK_FUNDING` |
| **Scenario B** | Ordinary Benign Peer Transfer (Alice to Bob, Coinbase funding, clean transaction history) | **ALLOW** | $\le 25$ | Clean baseline, zero anomaly flags |
| **Scenario C** | Shared Common Funding (Binance Hot Wallet funding claimers without cycles) | **ALLOW** | $15 \dots 34$ | `SHARED_COMMON_FUNDING` (moderate non-critical signal) |
| **Scenario D** | Direct Exposure to Flagged Risk Seed (Compromised treasury sending directly to OFAC exploit seed) | **REJECT / REVIEW** | $\ge 60$ | `DIRECT_RISK_SEED_EXPOSURE` |
| **Scenario E** | Ambiguous Single Signal (Isolated autonomous bot wallet with no cycles or mixer funds) | **ALLOW** | $10 \dots 30$ | `AUTONOMOUS_AGENT_CONTROLLED` (weak uncorroborated signal) |

---

## 3. Scenario Suite Output (regression check, n = 5)

Executed via `npm run evaluate`:

```text
================================================================
  GHOSTSHIELD: SYNTHETIC DATASET RISK DETECTION BENCHMARK
  Notice: Evaluated strictly over curated synthetic fixtures.
  Not to be construed as real-world blockchain distribution metric.
================================================================

┌─────────┬──────────────────────────────────────────────────────────┬──────────┬───────────┬──────────┬──────────────────────┐
│ (index) │ Scenario                                                 │ Expected │ Predicted │ Score    │ Outcome              │
├─────────┼──────────────────────────────────────────────────────────┼──────────┼───────────┼──────────┼──────────────────────┤
│ 0       │ 'Scenario A: Rapid Circular Transfer with Mixer Funding' │ 'REJECT' │ 'REJECT'  │ '85/100' │ 'TP (True Positive)' │
│ 1       │ 'Scenario B: Ordinary Benign Peer Transfer'              │ 'ALLOW'  │ 'ALLOW'   │ '17/100' │ 'TN (True Negative)' │
│ 2       │ 'Scenario C: Shared Exchange Funding Without Cycles'     │ 'ALLOW'  │ 'ALLOW'   │ '17/100' │ 'TN (True Negative)' │
│ 3       │ 'Scenario D: Direct Exposure to Flagged Risk Seed'       │ 'REJECT' │ 'REVIEW'  │ '60/100' │ 'TP (True Positive)' │
│ 4       │ 'Scenario E: Ambiguous Single Signal (Isolated Agent)'   │ 'ALLOW'  │ 'ALLOW'   │ '10/100' │ 'TN (True Negative)' │
└─────────┴──────────────────────────────────────────────────────────┴──────────┴───────────┴──────────┴──────────────────────┘

--- CONFUSION MATRIX ---
True Positives  (TP): 2
True Negatives  (TN): 3
False Positives (FP): 0
False Negatives (FN): 0

--- PERFORMANCE METRICS ---
Accuracy:  100.0%
Precision: 100.0%
Recall:    100.0%
F1 Score:  100.0%
================================================================
```

---

## 4. Key Algorithmic Insights

1. **Temporal Filtering Prevents False Positives:** In Scenario B and C, wallets participate in peer transactions, but the absence of closed directed cycles within $\Delta t \le 600\text{s}$ ensures the score remains in the `ALLOW` corridor ($< 35$).
2. **Distinguishing Clean Exchanges from Mixers:** When wallets share a centralized exchange hot wallet (e.g. Binance or Coinbase), the engine attributes 12 points (`SHARED_COMMON_FUNDING`), correctly keeping the transaction allowable while acknowledging the common origin. When funding originates from a mixer (Tornado Cash), it attributes 20 points, elevating the risk profile.
3. **Multi-Modal Corroboration:** High-risk classification (`REJECT`, $\ge 65$) is triggered only when topological cycles are corroborated by rapid velocity ($< 10$ minutes) and volume conservation, or when direct exposure to flagged exploit seeds occurs.
