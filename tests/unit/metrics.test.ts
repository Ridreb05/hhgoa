import { describe, it, expect } from 'vitest';
import { auc, precisionAtK, mean, stdev } from '../../scripts/lib/metrics';

describe('ranking metrics', () => {
  it('AUC is 1 for perfect separation and 0 for perfectly inverted', () => {
    expect(auc([0.9, 0.8], [0.1, 0.2])).toBe(1);
    expect(auc([0.1, 0.2], [0.9, 0.8])).toBe(0);
  });

  it('AUC is 0.5 when every score is tied (unreached nodes all score 0)', () => {
    expect(auc([0, 0, 0], [0, 0, 0, 0])).toBe(0.5);
  });

  it('AUC counts ties as half: matches the brute-force pairwise definition', () => {
    const pos = [0.5, 0.5, 0.9, 0.0];
    const neg = [0.5, 0.1, 0.0, 0.7, 0.5];
    let wins = 0;
    for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
    expect(auc(pos, neg)).toBeCloseTo(wins / (pos.length * neg.length), 12);
  });

  it('AUC matches brute force on random data', () => {
    let seed = 1;
    const r = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const pos = Array.from({ length: 60 }, () => Math.round(r() * 10) / 10 + 0.15);
    const neg = Array.from({ length: 80 }, () => Math.round(r() * 10) / 10);
    let wins = 0;
    for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
    expect(auc(pos, neg)).toBeCloseTo(wins / (pos.length * neg.length), 12);
  });

  it('AUC is NaN without both classes', () => {
    expect(auc([], [1])).toBeNaN();
    expect(auc([1], [])).toBeNaN();
  });

  it('precision@k counts positives among the top k scores', () => {
    const items = [
      { score: 0.9, positive: true },
      { score: 0.8, positive: false },
      { score: 0.7, positive: true },
      { score: 0.1, positive: false },
    ];
    expect(precisionAtK(items, 1)).toBe(1);
    expect(precisionAtK(items, 2)).toBe(0.5);
    expect(precisionAtK(items, 3)).toBeCloseTo(2 / 3, 12);
  });

  it('mean and sample standard deviation', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(stdev([1, 2, 3])).toBe(1);
  });
});
