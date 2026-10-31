# Real data

The synthetic benchmarks ([`BENCHMARK.md`](BENCHMARK.md), [`SCALE.md`](SCALE.md)) validate the detectors against structure I planted myself.
This page is about evidence that does not depend on my generator. Two real datasets are used. They live in the **same graph storage** as the synthetic data
and are kept apart by a `scope` parameter (a vertex-provenance prefix: `synthetic`, `elliptic`, `ethereum`) that every query scanning globally accepts.

> **Why scope and not separate graphs.** In TigerGraph, vertex and edge types defined globally are shared storage: a second graph over the same global types
> shows the *same* data. I first assumed a second graph would isolate the real data, and the loader's own count check showed it did not
> (the "real" graph reported synthetic plus Elliptic totals). Deleting from the cloud workspace was not possible in this session, so isolation is done by scoping.
> Truly separate storage would need graph-local types with different names, or a separate workspace. A stray second graph, `GhostShieldReal`, exists on the
> workspace as an alias of the same data and is unused.

| Dataset | Labels | What it can show | Report |
|---|---|---|---|
| **Elliptic Bitcoin** (Weber et al., KDD Workshop 2019): 203,769 transactions, 234,355 flow edges | 4,545 illicit / 42,019 licit (real) | **Accuracy** of taint propagation with held-out labels, against baselines | [`REAL_DATA_ELLIPTIC.md`](REAL_DATA_ELLIPTIC.md) |
| **Ethereum mainnet**, recent blocks via public RPC, OFAC sanctions list, Etherscan labels | none for fraud | **Behaviour and false-alarm profile** on real traffic: what is flagged and why it plausibly is or is not suspicious | [`REAL_DATA_ETHEREUM.md`](REAL_DATA_ETHEREUM.md) |

## Why two, and what each does not do

* Only Elliptic has fraud labels, but it models Bitcoin *transactions* (no addresses, amounts, or timestamps beyond 49 steps) and is a DAG, so
  it can exercise taint propagation but not cycles or funding clusters.
* Ethereum traffic exercises cycles and clustering on real behaviour but has no ground truth, so those results are audited, not scored.
* Neither is a billion-edge benchmark, and neither is current Ethereum laundering activity (native ETH only, a few hours of blocks, non-archive RPC).

## Data handling and licences

The raw data is **not** committed or redistributed (`data/real/` is git-ignored). Check each source's terms before reuse.

* **Elliptic data set**: Weber, M., Domeniconi, G., Chen, J., Weidele, D. K. I., Bellei, C., Robinson, T., Leiserson, C. E. (2019),
  *Anti-Money Laundering in Bitcoin: Experimenting with Graph Convolutional Networks for Financial Forensics*, KDD Workshop on Anomaly Detection in Finance.
  Downloaded from the PyTorch Geometric mirror (`data.pyg.org/datasets/elliptic/`). The dataset is released by Elliptic for research use; verify its licence before any commercial use.
* **OFAC sanctioned addresses**: `ultrasoundmoney/ofac-ethereum-addresses` (derived from the public US Treasury SDN list).
* **Address labels**: `brianleect/etherscan-labels` (community-collected Etherscan labels; accuracy not guaranteed).
* **Ethereum blocks**: public JSON-RPC (`ethereum-rpc.publicnode.com`).

## Reproduce

```bash
npm run tg:setup                  # schema, queries (with the scope parameter), install

# Elliptic: download (see Data handling), then
npm run load:elliptic             # provenance "elliptic"
npm run evaluate:elliptic         # scope "elliptic"; rewrites the stored seed flags per split

# Ethereum
npm run fetch:ethereum -- --blocks 600
npm run load:ethereum             # provenance "ethereum_rpc"
npm run evaluate:ethereum         # scope "ethereum"

# the app and the synthetic benchmarks stay on the synthetic data with
export GHOSTSHIELD_SCOPE=synthetic
```

Files expected under `data/real/`: `elliptic_raw/elliptic_txs_{classes,edgelist,features}.csv` (extracted), `elliptic_timesteps.csv`
(first two columns of the features file), `ethereum_raw/{ofac.csv,labels.json}`.

## Modelling choices that affect the results

* An Elliptic transaction is a `Wallet` vertex; edges have weight 1 (no amounts in the data); time is the dataset's two-week steps.
* On Ethereum only one edge per ordered (from, to) pair is kept, and the share of value transfers lost to that rule is reported in the Ethereum report.
* Seeds are never inferred from the test labels: Elliptic seeds are a random half of the illicit labels (several random splits), and the stored seed flag is
  rewritten from the deterministic split before every run.
