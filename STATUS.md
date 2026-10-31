# GhostShield: Project Status

**Last verified:** 2026-10-31 against a live TigerGraph Savanna workspace (TG-00).

## Real-data results (see [`docs/REAL_DATA.md`](docs/REAL_DATA.md))

| Dataset | Result |
|---|---|
| **Elliptic Bitcoin** (real labels, held-out, 3 random splits) | Taint propagation AUC **0.887 ± 0.009** (both directions, 6 hops) vs 0.849 for unweighted distance at the same horizon (+0.038) and 0.498 for random. Forward-only or backward-only is near random (0.576 / 0.578). **Worse than the naive rule at the very top:** precision@100 18.0% (best config) vs 43.7%. Engine reach matches an independent BFS exactly. Elliptic has no amounts, so value-weighting is untested on real data. |
| **Ethereum mainnet** (600 blocks, no fraud labels) | 272 temporal cycles in a 10 min window (1,068 in 1 h); engine count equals an independent recount exactly. **85% of them (230) are one pair-of-wallets pattern**: 34 families, not 272 events. All 8 funding-burst clusters are labelled exchange deposit/operational wallets (false-alarm profile of burst clustering); 0 after suppressing the `EXCHANGE` funder category. 1 sanctioned seed (historical Tornado Cash designation) reached 3 wallets. No precision/recall claim: no ground truth. |

## What is verified (and how)

| Area | Evidence |
|---|---|
| Unit tests | `npm run test`: 43 pass (generator invariants, adapter behaviour with mocked HTTP incl. scope, ranking metrics checked against brute force, seed-split no-leakage, funder classification, risk engine, demo graph) |
| Typecheck | `npm run typecheck` clean |
| Live integration | `npm run test:live`: 7 pass against the cluster (rings found, slow decoys not flagged, farms recovered, union-find agreement, taint ranked, evidence cycle check, path) |
| Scale | [`docs/SCALE.md`](docs/SCALE.md): graph grown server-side to 986,697 transfers / 245k wallets; detection quality unchanged, cycle latency 0.4s -> 2.4s (about linear) |
| Baselines | [`docs/BASELINES.md`](docs/BASELINES.md): topology-only cycles 2.4% precision, shared-funder clustering 14.8%, 1-hop taint 31% recall |
| Evasion | [`docs/EVASION.md`](docs/EVASION.md): rings found only when the window covers their span; fragmented farms evade whole-farm clustering |
| Differential check | `npm run test:live`: community detection equals an independent client-side union-find member for member |
| Detector benchmark | [`docs/BENCHMARK.md`](docs/BENCHMARK.md): cycles 100% / 100%, Sybil clusters 80% precision / 100% recall (strict labels), taint 100% on planted chains. Synthetic data, 18,229 wallets, 80,086 transfers |
| Queries | 8 GSQL queries compile and install via `npm run tg:setup` |

## Defects found and fixed during live verification

* Cycle query ignored cross-edge timestamp conditions in `WHERE` (negative durations); rewritten as temporal state propagation.
* A second version required "smallest id first" and temporal order together, missing most rings.
* `instr()` returns -1 (not 0) when not found.
* Funding-burst clustering linked chance bursts from mega-funders; added a funder hub cap.
* Adapter cached the JWT forever (401 after expiry); now refreshed.
* **Storage is shared across graphs.** A second graph over global types shows the same data, so my first "isolated" real-data graph was not isolated (caught by the loader's own count check). Datasets are now separated by a `scope` provenance prefix on every global query.
* `instr()` is 0-based, returning 0 for a prefix match and -1 for no match (two earlier bugs came from assuming otherwise).
* `schema.gsql` had trailing semicolons the GSQL endpoint rejects, so a clean-cluster install could never have worked; fixed.
* Generator produced non-monotonic ring timestamps (caught by its own test).
* `schema.gsql` did not match the live cluster's edge attributes; aligned.
* Health check probed `/echo` (404 on Savanna); now `/api/ping`.

## Known gaps

See README section 12. Real-data limits: Elliptic is Bitcoin 2019 with no addresses or amounts; Ethereum is 2 hours of native ETH only (no tokens, internal transactions or archive history); 19% of value transfers there were dropped by the one-edge-per-pair rule. Query latency on this tier is noisy (1-20 s for the heaviest propagation runs). Main ones: synthetic data only, ~1M-edge scale (not billions), one edge per wallet pair, demo vs live Sybil semantics, auto-suspending free tier.

## Operating it

```bash
npm run tg:setup                            # schema + migrations, queries, install
npm run seed:tigergraph -- --wallets 20000  # resumable: --from <file> --offset <rows>
npm run tg:enrich                           # write back risk_score / community_id for the explorer
npm run evaluate:live && npm run test:live
```

## Leftovers on the cluster

The cluster storage now holds three datasets, separated by provenance prefix: `synthetic*`, `elliptic` (203,769 wallets), `ethereum_rpc` (45,981 wallets); the two real ones were loaded by me and could not be deleted in this session. A stray graph `GhostShieldReal` is an alias of the same data and unused. Also identifiable by provenance: `synthetic_amplify` (scale noise), `synthetic_evasion` (evasion study), `synthetic_*` (generated dataset), and two `0xprobe*` wallets from debugging. Deleting data from the cloud workspace was blocked by the session's safety rules, so cleanup is manual.
