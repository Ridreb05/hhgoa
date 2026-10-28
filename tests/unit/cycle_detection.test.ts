import { describe, it, expect, beforeEach } from 'vitest';
import { DemoGraphAdapter } from '@/lib/graph/demo-adapter';

describe('DemoGraphAdapter: Directed Cycle Detection & Temporal Windows', () => {
  let adapter: DemoGraphAdapter;

  beforeEach(() => {
    adapter = new DemoGraphAdapter();
  });

  it('detects the 3-hop circular wash-trading pattern in Scenario A', async () => {
    const result = await adapter.detectCycles(600, 4);

    expect(result.cycles_found).toBeGreaterThan(0);
    const susCycle = result.cycles.find(
      (c) =>
        c.hops.includes('0x71c...sus1') &&
        c.hops.includes('0x82d...sus2') &&
        c.hops.includes('0x93e...sus3')
    );

    expect(susCycle).toBeDefined();
    expect(susCycle!.hop_count).toBe(3);
    expect(susCycle!.duration_seconds).toBeLessThanOrEqual(600);
    expect(susCycle!.temporally_valid).toBe(true);
    expect(susCycle!.volume_retention).toBeGreaterThanOrEqual(0.8);
    expect(susCycle!.risk_level).toBe('HIGH');
  });

  it('marks cycles as non-temporally valid when time window is tighter than cycle duration', async () => {
    // Scenario A duration is 340 seconds (from 1700000100 to 1700000440)
    // If we specify a time window of 100 seconds, the cycle should fail the temporal constraint
    const result = await adapter.detectCycles(100, 4);
    const susCycle = result.cycles.find(
      (c) =>
        c.hops.includes('0x71c...sus1') &&
        c.hops.includes('0x82d...sus2') &&
        c.hops.includes('0x93e...sus3')
    );

    expect(susCycle).toBeDefined();
    expect(susCycle!.temporally_valid).toBe(false);
    expect(susCycle!.risk_level).toBe('LOW_TOPOLOGICAL_ONLY');
  });

  it('returns zero cycles when max_depth is less than cycle length', async () => {
    // 3-hop cycle requires maxDepth >= 3
    const result = await adapter.detectCycles(600, 2);
    expect(result.cycles_found).toBe(0);
  });
});
