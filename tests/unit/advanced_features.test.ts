import { describe, it, expect, beforeEach } from 'vitest';
import { DemoGraphAdapter } from '@/lib/graph/demo-adapter';
import { RiskEngine, DEFAULT_RISK_CONFIG } from '@/lib/risk/engine';
import { defaultHistoryStore } from '@/lib/history/store';

describe('Advanced Enterprise Features: Path Finding, Sybil Clustering & Policy Customization', () => {
  let adapter: DemoGraphAdapter;

  beforeEach(() => {
    adapter = new DemoGraphAdapter();
  });

  it('findPath discovers multi-hop transfer sequences with step-by-step breadcrumbs', async () => {
    // Suspect 1 -> Suspect 2 -> Suspect 3
    const result = await adapter.findPath('0x71c...sus1', '0x93e...sus3', 4);

    expect(result.paths_found).toBeGreaterThan(0);
    const path = result.paths[0];
    expect(path.total_hops).toBe(2);
    expect(path.hops.length).toBe(2);
    expect(path.hops[0].from_id).toBe('0x71c...sus1');
    expect(path.hops[0].to_id).toBe('0x82d...sus2');
    expect(path.hops[1].from_id).toBe('0x82d...sus2');
    expect(path.hops[1].to_id).toBe('0x93e...sus3');
    expect(path.total_volume).toBe(19.9);
  });

  it('findPath returns zero paths when no directed graph route exists', async () => {
    // Clean LP to Alice (Clean LP only receives, never transfers to Alice)
    const result = await adapter.findPath('0xbbb...clean_lp', '0x11a...norm1', 3);
    expect(result.paths_found).toBe(0);
  });

  it('getSybilClusters groups wallets sharing mixers, exchanges, and agents', async () => {
    const result = await adapter.getSybilClusters(2);

    expect(result.clusters_identified).toBeGreaterThan(0);

    // Tornado Cash cluster check
    const tcCluster = result.clusters.find((c) => c.root_entity_id === 'FS_TORNADO_CASH_01');
    expect(tcCluster).toBeDefined();
    expect(tcCluster!.risk_level).toBe('CRITICAL');
    expect(tcCluster!.member_count).toBeGreaterThanOrEqual(2);
    expect(tcCluster!.member_wallets).toContain('0x71c...sus1');
    expect(tcCluster!.member_wallets).toContain('0x82d...sus2');

    // Agent coordinator cluster check
    const agentCluster = result.clusters.find((c) => c.root_type === 'Agent');
    expect(agentCluster).toBeDefined();
    expect(agentCluster!.risk_level).toBe('HIGH_COORDINATION');
  });

  it('RiskEngine allows dynamic weight reconfiguration and reset', () => {
    const customEngine = new RiskEngine({
      temporalCycleMaxPoints: 50,
      rejectThreshold: 70,
    });

    expect(customEngine.getConfig().temporalCycleMaxPoints).toBe(50);
    expect(customEngine.getConfig().rejectThreshold).toBe(70);

    customEngine.updateConfig({ temporalCycleMaxPoints: 30 });
    expect(customEngine.getConfig().temporalCycleMaxPoints).toBe(30);

    customEngine.resetConfig();
    expect(customEngine.getConfig().temporalCycleMaxPoints).toBe(DEFAULT_RISK_CONFIG.temporalCycleMaxPoints);
  });

  it('HistoryStore records investigations and supports CSV/JSON export', () => {
    const initialCount = defaultHistoryStore.list().length;
    expect(initialCount).toBeGreaterThan(0);

    const jsonExport = defaultHistoryStore.exportJSON();
    expect(jsonExport).toContain('INV-DEMO-001');

    const csvExport = defaultHistoryStore.exportCSV();
    expect(csvExport).toContain('id,timestamp,target_wallet');
    expect(csvExport).toContain('0x71c...sus1');
  });
});
