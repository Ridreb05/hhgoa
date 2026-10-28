// ==============================================================================
// GHOSTSHIELD: Session Investigation & Forensic Audit Trail Store
// Records audit logs and enables CSV/JSON export for compliance reviews
// ==============================================================================

import { RiskAssessment } from '@/lib/graph/types';

export interface AuditRecord {
  id: string;
  timestamp: string;
  target_wallet: string;
  counterparty?: string;
  score: number;
  action: string;
  engine_mode: string;
  latency_ms: number;
  explanation: string;
  primary_evidence: string;
  assessment: RiskAssessment;
}

class InvestigationHistoryStore {
  private records: AuditRecord[] = [];

  constructor() {
    this.seedDefaultHistory();
  }

  private seedDefaultHistory() {
    // Seed initial historical records matching demo scenarios
    this.records = [
      {
        id: 'INV-DEMO-001',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        target_wallet: '0x71c...sus1',
        counterparty: '0x82d...sus2',
        score: 85,
        action: 'REJECT',
        engine_mode: 'demo',
        latency_ms: 2,
        explanation: '3-hop directed cycle (340s) with Tornado Cash funding and 98% volume retention.',
        primary_evidence: 'TEMPORAL_CIRCULAR_TRANSFER, SHARED_HIGH_RISK_FUNDING',
        assessment: null as any,
      },
      {
        id: 'INV-DEMO-002',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        target_wallet: '0x11a...norm1',
        counterparty: '0x22b...norm2',
        score: 17,
        action: 'ALLOW',
        engine_mode: 'demo',
        latency_ms: 1,
        explanation: 'Clean retail transfers funded via Coinbase institutional payroll.',
        primary_evidence: 'None (Clean Baseline)',
        assessment: null as any,
      },
      {
        id: 'INV-DEMO-003',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        target_wallet: '0x66f...target4',
        counterparty: '0x999...seed_exploit',
        score: 60,
        action: 'REVIEW',
        engine_mode: 'demo',
        latency_ms: 2,
        explanation: 'Direct fund transfer connection with verified sanctions/exploit seed.',
        primary_evidence: 'DIRECT_RISK_SEED_EXPOSURE',
        assessment: null as any,
      },
    ];
  }

  public add(assessment: RiskAssessment): AuditRecord {
    const triggered = assessment.contributing_rules
      .filter((r) => r.triggered)
      .map((r) => r.rule_id)
      .join(', ');

    const record: AuditRecord = {
      id: assessment.investigation_id,
      timestamp: assessment.timestamp,
      target_wallet: assessment.target_wallet,
      counterparty: assessment.counterparty,
      score: assessment.score,
      action: assessment.action,
      engine_mode: assessment.engine_mode,
      latency_ms: assessment.latency_ms,
      explanation: assessment.explanation,
      primary_evidence: triggered || 'None',
      assessment,
    };

    this.records.unshift(record);
    if (this.records.length > 50) {
      this.records.pop();
    }
    return record;
  }

  public list(): AuditRecord[] {
    return [...this.records];
  }

  public get(id: string): AuditRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  public clear(): void {
    this.seedDefaultHistory();
  }

  public exportJSON(): string {
    return JSON.stringify(this.records, null, 2);
  }

  public exportCSV(): string {
    const headers = ['id', 'timestamp', 'target_wallet', 'counterparty', 'score', 'action', 'engine_mode', 'latency_ms', 'primary_evidence', 'explanation'];
    const rows = this.records.map((r) => [
      r.id,
      r.timestamp,
      r.target_wallet,
      r.counterparty || '',
      r.score,
      r.action,
      r.engine_mode,
      r.latency_ms,
      `"${r.primary_evidence}"`,
      `"${r.explanation.replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}

export const defaultHistoryStore = new InvestigationHistoryStore();

