# Baselines (same data as BENCHMARK.md)

Dataset: seed 42, 18,215 wallets, 80,076 transfers. Computed client-side by `npm run baselines`.
Each row shows what the naive version of a detector does on the data the real detector is scored on.

| Question | Naive baseline | Result | GhostShield detector |
|---|---|---|---|
| Round trips | Any directed cycle of 3 to 5 hops, ignoring time | 540 cycles reported, 13 are planted rings: **precision 2.4%** (recall 100.0%) | Time-ordered, 10 min window: 100% / 100% on the cluster |
| Sybil clusters | "Wallets sharing a funder" (>= 5) | 54 clusters, 8 contain farms: **precision 14.8%**, 18,051 benign wallets flagged | Burst + agent components with hub pruning: 80% precision, 10 flagged wallets (all co-funded ring wallets) |
| Agent control | "Wallets sharing an agent" with no fleet cap | 10 clusters, 8 contain farms: **precision 80.0%**, 921 legitimate fleet wallets flagged | Agents above 100 wallets pruned as hubs |
| Taint | Direct 1-hop exposure to a seed | Reaches 10 of 32 planted tainted wallets: **recall 31.3%** | Value-weighted multi-hop propagation: 32/32 at top-k |

These comparisons are against the same hand-built generator, so they show that each design choice matters on this structure,
not how much it would matter on real traffic.
