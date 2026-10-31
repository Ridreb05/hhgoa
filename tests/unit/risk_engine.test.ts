import { describe, it, expect, beforeEach } from 'vitest';
import { DemoGraphAdapter } from '@/lib/graph/demo-adapter';
import { defaultRiskEngine } from '@/lib/risk/engine';
import demoData from '@/data/demo/entities.json';

describe('Deterministic Risk Policy Engine', () => {
  let adapter: DemoGraphAdapter;

  beforeEach(() => {
    adapter = new DemoGraphAdapter();
  });

  it('correctly classifies Scenario A (Circular flow + Mixer funding) as REJECT (Score >= 75)', async () => {
    const scA = demoData.scenarios[0];
    const evidence = await adapter.getRiskEvidence(scA.target_wallet, {
      from_wallet: scA.target_wallet,
      to_wallet: scA.counterparty,
      amount: 10.0,
      asset: 'ETH',
    });
    const cycleRes = await adapter.detectCycles(600, 4);

    const assessment = defaultRiskEngine.evaluate(evidence, cycleRes.cycles, {
      from_wallet: scA.target_wallet,
      to_wallet: scA.counterparty,
      amount: 10.0,
      asset: 'ETH',
    });

    expect(assessment.action).toBe('REJECT');
    expect(assessment.score).toBeGreaterThanOrEqual(scA.expected_min_score ?? 0);
    expect(assessment.detected_cycles.length).toBeGreaterThan(0);
    expect(assessment.shared_funding_sources.length).toBeGreaterThan(0);
  });

  it('correctly classifies Scenario B (Normal transfers) as ALLOW (Score <= 25)', async () => {
    const scB = demoData.scenarios[1];
    const evidence = await adapter.getRiskEvidence(scB.target_wallet, {
      from_wallet: scB.target_wallet,
      to_wallet: scB.counterparty,
      amount: 1.5,
      asset: 'ETH',
    });
    const cycleRes = await adapter.detectCycles(600, 4);

    const assessment = defaultRiskEngine.evaluate(evidence, cycleRes.cycles, {
      from_wallet: scB.target_wallet,
      to_wallet: scB.counterparty,
      amount: 1.5,
      asset: 'ETH',
    });

    expect(assessment.action).toBe('ALLOW');
    expect(assessment.score).toBeLessThanOrEqual(scB.expected_max_score ?? 100);
    expect(assessment.detected_cycles.length).toBe(0);
  });

  it('correctly classifies Scenario C (Common funding without cycle) as ALLOW (Lower than Scenario A)', async () => {
    const scC = demoData.scenarios[2];
    const evidence = await adapter.getRiskEvidence(scC.target_wallet, {
      from_wallet: scC.target_wallet,
      to_wallet: scC.counterparty,
      amount: 0.5,
      asset: 'ETH',
    });
    const cycleRes = await adapter.detectCycles(600, 4);

    const assessment = defaultRiskEngine.evaluate(evidence, cycleRes.cycles, {
      from_wallet: scC.target_wallet,
      to_wallet: scC.counterparty,
      amount: 0.5,
      asset: 'ETH',
    });

    expect(assessment.action).toBe('ALLOW');
    expect(assessment.score).toBeGreaterThanOrEqual(scC.expected_min_score ?? 0);
    expect(assessment.score).toBeLessThanOrEqual(scC.expected_max_score ?? 100);
  });

  it('correctly identifies direct exposure to known-risk seed in Scenario D', async () => {
    const scD = demoData.scenarios[3];
    const evidence = await adapter.getRiskEvidence(scD.target_wallet, {
      from_wallet: scD.target_wallet,
      to_wallet: scD.counterparty,
      amount: 45.0,
      asset: 'ETH',
    });
    const cycleRes = await adapter.detectCycles(600, 4);

    const assessment = defaultRiskEngine.evaluate(evidence, cycleRes.cycles, {
      from_wallet: scD.target_wallet,
      to_wallet: scD.counterparty,
      amount: 45.0,
      asset: 'ETH',
    });

    expect(assessment.risk_seed_exposure.length).toBeGreaterThan(0);
    const seedRule = assessment.contributing_rules.find((r) => r.rule_id === 'DIRECT_RISK_SEED_EXPOSURE');
    expect(seedRule).toBeDefined();
    expect(seedRule!.triggered).toBe(true);
  });

  it('caps risk score to maximum 100 without overflow', () => {
    const syntheticEvidence = {
      engine_mode: 'demo' as const,
      target_wallet_id: '0xTest',
      neighbor_wallets_count: 10,
      outgoing_tx_count: 5,
      incoming_tx_count: 5,
      total_transferred_volume: 500,
      shared_funding_sources_count: 3,
      common_funding_sources: ['FS_TORNADO_CASH_01', 'FS_OTHER_MIXER'],
      risk_seed_connections_count: 2,
      connected_risk_seeds: ['0xSeed1', '0xSeed2'],
      controlling_agents_count: 2,
      delegated_agents_count: 1,
      detected_cycle_count: 2,
      cycle_participant_wallets: ['0xPeer1', '0xPeer2'],
      evidence_flags: ['RAPID_TEMPORAL_CYCLE_DETECTED', 'COMMON_FUNDING_SOURCE_DETECTED', 'DIRECT_RISK_SEED_EXPOSURE'],
      query_latency_ms: 2,
    };

    const mockCycle = {
      cycle_path: '0xTest -> 0xPeer1 -> 0xPeer2 -> 0xTest',
      hops: ['0xTest', '0xPeer1', '0xPeer2', '0xTest'],
      hop_count: 3,
      start_time: 1700000000,
      end_time: 1700000200,
      duration_seconds: 200,
      min_amount: 10,
      max_amount: 10,
      volume_retention: 1.0,
      temporally_valid: true,
      risk_level: 'HIGH' as const,
    };

    const assessment = defaultRiskEngine.evaluate(syntheticEvidence, [mockCycle]);
    expect(assessment.score).toBeLessThanOrEqual(100);
    expect(assessment.action).toBe('REJECT');
  });
});
