import { describe, it, expect } from 'vitest';
import { TigerGraphAdapter } from '@/lib/graph/tigergraph-adapter';
import { AIReportGenerator } from '@/lib/ai/report-generator';
import { ViaSocketNotifier } from '@/lib/integrations/viasocket';
import { RiskAssessment } from '@/lib/graph/types';

describe('Integrations & Boundary Tests', () => {
  it('TigerGraphAdapter accurately reports UNCONFIGURED status when credentials are not present', async () => {
    const adapter = new TigerGraphAdapter({ host: '', graphName: 'GhostShieldGraph' });
    const health = await adapter.checkHealth();

    expect(health.mode).toBe('tigergraph');
    expect(health.status).toBe('UNCONFIGURED');
    expect(health.message).toContain('credentials not set');
  });

  it('AIReportGenerator falls back to deterministic zero-hallucination template without API keys', async () => {
    const generator = new AIReportGenerator();
    const mockAssessment: RiskAssessment = {
      investigation_id: 'INV-TEST-001',
      timestamp: new Date().toISOString(),
      target_wallet: '0x71c...sus1',
      score: 85,
      action: 'REJECT',
      contributing_rules: [
        {
          rule_id: 'TEMPORAL_CIRCULAR_TRANSFER',
          name: 'Rapid Circular Transfer Window',
          points: 40,
          max_points: 40,
          triggered: true,
          explanation: '3-hop cycle within 6 minutes.',
        },
      ],
      detected_cycles: [
        {
          cycle_path: '0x71c...sus1 -> 0x82d...sus2 -> 0x93e...sus3 -> 0x71c...sus1',
          hops: ['0x71c...sus1', '0x82d...sus2', '0x93e...sus3', '0x71c...sus1'],
          hop_count: 3,
          start_time: 1700000100,
          end_time: 1700000440,
          duration_seconds: 340,
          min_amount: 9.8,
          max_amount: 10.0,
          volume_retention: 0.98,
          temporally_valid: true,
          risk_level: 'HIGH',
        },
      ],
      shared_funding_sources: ['FS_TORNADO_CASH_01'],
      risk_seed_exposure: [],
      agent_connections: [],
      missing_data_warnings: [],
      explanation: 'Critical wash trading cycle detected.',
      latency_ms: 2,
      engine_mode: 'demo',
    };

    const report = await generator.generateReport(mockAssessment);

    expect(report.source).toBe('deterministic_template');
    expect(report.executive_summary).toContain('GhostShield Forensic Synthesis');
    expect(report.detailed_findings.length).toBeGreaterThan(0);
    expect(report.recommended_analyst_actions.length).toBeGreaterThan(0);
    expect(report.disclaimer).toContain('Zero hallucination guarantee');
  });

  it('ViaSocketNotifier reports UNCONFIGURED and does not fabricate delivery when unconfigured', async () => {
    const notifier = new ViaSocketNotifier();
    // In test environment, VIASOCKET_WEBHOOK_URL is not set
    const result = await notifier.sendTestAlert();

    expect(result.status).toBe('UNCONFIGURED');
    expect(result.success).toBe(false);
    expect(result.message).toContain('VIASOCKET_WEBHOOK_URL is not set');
  });
});
