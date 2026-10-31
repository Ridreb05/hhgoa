// Ranking metrics used by the real-data evaluation. Pure functions, unit-tested.

/** Area under the ROC curve via the rank-sum (Mann-Whitney U) with tie correction (average ranks). */
export function auc(positives: number[], negatives: number[]): number {
  if (positives.length === 0 || negatives.length === 0) return NaN;
  const all = [
    ...positives.map((s) => ({ s, pos: true })),
    ...negatives.map((s) => ({ s, pos: false })),
  ].sort((a, b) => a.s - b.s);
  let rankSumPos = 0;
  for (let i = 0; i < all.length; ) {
    let j = i;
    while (j < all.length && all[j].s === all[i].s) j++;
    const avgRank = (i + 1 + j) / 2; // ranks are 1-based; tied block spans i+1..j
    for (let k = i; k < j; k++) if (all[k].pos) rankSumPos += avgRank;
    i = j;
  }
  const nPos = positives.length;
  const nNeg = negatives.length;
  return (rankSumPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/** Precision among the k highest scores. Ties at the cut are broken by `tieBreak` (default: stable, input order). */
export function precisionAtK(items: { score: number; positive: boolean }[], k: number): number {
  const top = [...items].sort((a, b) => b.score - a.score).slice(0, k);
  return top.length === 0 ? NaN : top.filter((x) => x.positive).length / top.length;
}

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stdev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
}
