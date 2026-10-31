import { describe, it, expect } from 'vitest';
import { splitSeeds } from '../../scripts/lib/elliptic';
import { fundingCategory } from '../../scripts/load_ethereum';

describe('Elliptic seed split (no leakage)', () => {
  const illicit = Array.from({ length: 1000 }, (_, i) => `tx${i}`);

  it('seeds and held-out are disjoint and together cover every illicit label', () => {
    const { seeds, heldOut } = splitSeeds(illicit, 42, 0.5);
    expect(heldOut.every((id) => !seeds.has(id))).toBe(true);
    expect(seeds.size + heldOut.length).toBe(illicit.length);
    expect(new Set([...seeds, ...heldOut]).size).toBe(illicit.length);
  });

  it('honours the seed fraction', () => {
    expect(splitSeeds(illicit, 1, 0.5).seeds.size).toBe(500);
    expect(splitSeeds(illicit, 1, 0.2).seeds.size).toBe(200);
  });

  it('is deterministic per split seed and differs across split seeds', () => {
    const a = [...splitSeeds(illicit, 42, 0.5).seeds].sort();
    const b = [...splitSeeds(illicit, 42, 0.5).seeds].sort();
    const c = [...splitSeeds(illicit, 43, 0.5).seeds].sort();
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('is an unbiased shuffle: seeds are spread across the id range, not a prefix', () => {
    const { seeds } = splitSeeds(illicit, 42, 0.5);
    const inFirstHalf = [...seeds].filter((id) => Number(id.slice(2)) < 500).length;
    expect(inFirstHalf).toBeGreaterThan(200);
    expect(inFirstHalf).toBeLessThan(300);
  });
});

describe('funding source classification from public labels', () => {
  it('recognises mixers, bridges and exchanges', () => {
    expect(fundingCategory(['tornado-cash'], 'Tornado.Cash: Router')).toBe('MIXER');
    expect(fundingCategory(['bridge', 'layer-2'], 'Arbitrum One: L1 Gateway Router')).toBe('BRIDGE');
    expect(fundingCategory(['gate-io'], 'Gate.io: Deposit Funder')).toBe('EXCHANGE');
    expect(fundingCategory(['coinbase'], 'Coinbase 5')).toBe('EXCHANGE');
  });

  it('does not treat ordinary protocol or builder addresses as funding origins', () => {
    expect(fundingCategory(['dex'], 'Uniswap V3: Router')).toBeNull();
    expect(fundingCategory(['mev-builder'], 'Titan Builder')).toBeNull();
    expect(fundingCategory([], 'Some wallet')).toBeNull();
  });
});
