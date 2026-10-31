# GhostShield on TigerGraph Savanna

Everything below is scripted and idempotent. Nothing here drops data.

## 1. Prerequisites

* A TigerGraph **Savanna** workspace (free tier works): <https://tgcloud.io>. Resume it if it shows *Idle*.
* A database **secret**: *Database Secrets → Create Secret* (32 characters). Secrets authenticate with a JWT, so the password is not needed.
* Node 20+.

## 2. Configure `.env.local`

```bash
GHOSTSHIELD_ENGINE_MODE=tigergraph
TIGERGRAPH_HOST=https://tg-xxxxxxxx.tg-yyyyyyyy.i.tgcloud.io   # workgroup host, shown in the console network calls / Connect panel
TIGERGRAPH_GRAPH_NAME=GhostShieldGraph
TIGERGRAPH_SECRET=<32 character secret>
```

`TIGERGRAPH_USERNAME` / `TIGERGRAPH_PASSWORD` are only a fallback; Savanna enterprise workspaces usually reject basic auth.

## 3. Install schema, queries and data

```bash
npm run tg:setup                                 # schema (+ migrations) -> create queries -> compile & install
npm run seed:tigergraph -- --wallets 20000       # loading job: demo scenarios + 18k wallet / 108k edge scale dataset
npm run evaluate:live                            # scores detectors against planted ground truth, writes docs/BENCHMARK.md
npm run test:live                                # integration tests against the cluster
```

What each step does:

| Step | Detail |
|---|---|
| `tg:schema` | Creates `GhostShieldGraph` if missing, then applies `database/tigergraph/migrations/*`. Migration 001 adds an `id` attribute to every vertex type (primary ids are not addressable inside a query body), plus `risk_score` and `community_id` on `Wallet` for algorithm write-back. |
| `tg:queries` | `CREATE OR REPLACE QUERY` for every file in `database/tigergraph/queries/`. Reports compile errors per file. |
| `tg:install` | `INSTALL QUERY ALL` (1 to 3 minutes the first time). |
| `seed:tigergraph` | Creates the `ghostshield_load` loading job (`database/tigergraph/loading/`) and streams CSV to `/restpp/ddl`. Use `--from transfers` to resume an interrupted load. The load is idempotent. |

The scale dataset is deterministic (`--seed`). Ground truth for the planted patterns is written to `data/generated/ground_truth.json` (git-ignored).

## 4. Queries

| Query | Purpose |
|---|---|
| `ghostshield_dashboard_metrics` | Global counts, volume, risk seeds |
| `ghostshield_detect_cycles` | Temporally ordered round trips of 3 to 5 hops inside a time window (pattern matching) |
| `ghostshield_sybil_clusters` | Connected components over agent control and funding bursts, with hub pruning |
| `ghostshield_risk_propagation` | Value-weighted taint propagation from known-bad seeds (BSP supersteps), optional write-back |
| `ghostshield_path_find` | All simple 1 to 4 hop paths between two wallets, optional temporal ordering |
| `ghostshield_investigate_wallet` | 1-hop forensic neighborhood |
| `ghostshield_risk_evidence` | Evidence counters feeding the deterministic policy engine |
| `ghostshield_topology` | Bounded subgraph for the explorer |

## 5. Known modeling limits

* `TRANSFERRED_TO` has no discriminator, so there is **one edge per ordered wallet pair**. A production deployment should model each transaction as its own edge (an edge type with `DISCRIMINATOR(tx_id)`), which needs a new edge type and a reload.
* Cycle detection covers 3 to 5 hops. Longer loops need a different algorithm; pattern matching cost grows with each hop.
* The Savanna proxy cuts requests at roughly 8 seconds, so ingestion is chunked (250 rows per request) and retried.
