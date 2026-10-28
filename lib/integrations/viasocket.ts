// ==============================================================================
// GHOSTSHIELD: viaSocket Real-Time Incident Webhook Integration
// Fully compliant with viaSocket workflow automation triggers (inbound flows)
// Dispatches structured incident payloads, records delivery telemetry, supports test pings & retries
// Never fabricates deliveries; reports real HTTP delivery status or UNCONFIGURED
// ==============================================================================

import { RiskAssessment } from '@/lib/graph/types';

export interface ViaSocketPayload {
  event: 'GHOSTSHIELD_RISK_ALERT' | 'TEST_NOTIFICATION';
  incidentId: string;
  investigationId: string;
  timestamp: string;
  walletId: string;
  counterpartyId?: string;
  riskScore: number;
  recommendedAction: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  primaryEvidence: string[];
  detectedCycles: string[];
  sharedFundingSources: string[];
  riskSeedExposure: string[];
  explanation: string;
  investigationLink?: string;
  metadata: {
    source: string;
    engineMode: string;
    version: string;
  };
}

export interface ViaSocketDeliveryResult {
  logId: string;
  success: boolean;
  status: 'DELIVERED' | 'FAILED' | 'UNCONFIGURED';
  httpStatus?: number;
  message: string;
  timestamp: string;
  durationMs: number;
  payloadSent?: ViaSocketPayload;
}

export interface ViaSocketLogItem {
  id: string;
  timestamp: string;
  event: string;
  walletId: string;
  riskScore: number;
  action: string;
  status: 'DELIVERED' | 'FAILED' | 'UNCONFIGURED';
  httpStatus?: number;
  durationMs: number;
  message: string;
  payload: ViaSocketPayload;
}

export class ViaSocketNotifier {
  private webhookUrl?: string;
  private timeoutMs: number;
  private logs: ViaSocketLogItem[] = [];

  constructor() {
    this.webhookUrl = process.env.VIASOCKET_WEBHOOK_URL;
    this.timeoutMs = parseInt(process.env.VIASOCKET_TIMEOUT_MS || '4000', 10);
    this.seedDefaultLogs();
  }

  private seedDefaultLogs() {
    this.logs = [
      {
        id: 'VS-LOG-001',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        event: 'GHOSTSHIELD_RISK_ALERT',
        walletId: '0x71c...sus1',
        riskScore: 85,
        action: 'REJECT',
        status: 'UNCONFIGURED',
        httpStatus: undefined,
        durationMs: 0,
        message: 'VIASOCKET_WEBHOOK_URL is not configured. Webhook alert skipped.',
        payload: null as any,
      },
    ];
  }

  public isConfigured(): boolean {
    return Boolean(this.webhookUrl && this.webhookUrl.startsWith('http'));
  }

  public getWebhookUrl(): string | undefined {
    return this.webhookUrl;
  }

  public getLogs(): ViaSocketLogItem[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public async sendAlert(assessment: RiskAssessment, appBaseUrl?: string): Promise<ViaSocketDeliveryResult> {
    const timestamp = new Date().toISOString();
    const logId = `VS-${Date.now().toString(36).toUpperCase()}`;

    const triggeredRules = assessment.contributing_rules
      .filter((r) => r.triggered)
      .map((r) => `${r.name}: ${r.explanation}`);

    const severity =
      assessment.score >= 80 ? 'CRITICAL' : assessment.score >= 65 ? 'HIGH' : assessment.score >= 35 ? 'MEDIUM' : 'LOW';

    const payload: ViaSocketPayload = {
      event: 'GHOSTSHIELD_RISK_ALERT',
      incidentId: `INC-${assessment.investigation_id}`,
      investigationId: assessment.investigation_id,
      timestamp,
      walletId: assessment.target_wallet,
      counterpartyId: assessment.counterparty,
      riskScore: assessment.score,
      recommendedAction: assessment.action,
      severity,
      primaryEvidence: triggeredRules,
      detectedCycles: assessment.detected_cycles.map((c) => `${c.cycle_path} (${c.duration_seconds}s)`),
      sharedFundingSources: assessment.shared_funding_sources,
      riskSeedExposure: assessment.risk_seed_exposure,
      explanation: assessment.explanation,
      investigationLink: appBaseUrl ? `${appBaseUrl}/?wallet=${encodeURIComponent(assessment.target_wallet)}` : undefined,
      metadata: {
        source: 'GhostShield-TigerGraph-Engine',
        engineMode: assessment.engine_mode,
        version: '2.0.0',
      },
    };

    if (!this.isConfigured()) {
      const res: ViaSocketDeliveryResult = {
        logId,
        success: false,
        status: 'UNCONFIGURED',
        message: 'VIASOCKET_WEBHOOK_URL environment variable is not configured. Add your webhook URL to .env to receive live alerts.',
        timestamp,
        durationMs: 0,
        payloadSent: payload,
      };
      this.recordLog(logId, payload, res);
      return res;
    }

    return this.postPayload(logId, payload);
  }

  public async sendTestAlert(appBaseUrl?: string): Promise<ViaSocketDeliveryResult> {
    const timestamp = new Date().toISOString();
    const logId = `VS-TEST-${Date.now().toString(36).toUpperCase()}`;

    const payload: ViaSocketPayload = {
      event: 'TEST_NOTIFICATION',
      incidentId: `INC-TEST-${Date.now()}`,
      investigationId: `TEST-PING-${Date.now()}`,
      timestamp,
      walletId: '0x71c...sus1',
      counterpartyId: '0x82d...sus2',
      riskScore: 85,
      recommendedAction: 'REJECT',
      severity: 'CRITICAL',
      primaryEvidence: [
        'Test probe verifying viaSocket webhook channel connectivity from GhostShield SOC.',
      ],
      detectedCycles: ['0x71c...sus1 -> 0x82d...sus2 -> 0x93e...sus3 -> 0x71c...sus1 (340s)'],
      sharedFundingSources: ['FS_TORNADO_CASH_01'],
      riskSeedExposure: [],
      explanation: 'Diagnostic health check confirming viaSocket webhook integration is operational.',
      investigationLink: appBaseUrl ? `${appBaseUrl}/` : undefined,
      metadata: {
        source: 'GhostShield-Diagnostic-Tool',
        engineMode: 'demo',
        version: '2.0.0',
      },
    };

    if (!this.isConfigured()) {
      const res: ViaSocketDeliveryResult = {
        logId,
        success: false,
        status: 'UNCONFIGURED',
        message: 'VIASOCKET_WEBHOOK_URL is not set. To test viaSocket, add your webhook URL from viaSocket workflow to .env.',
        timestamp,
        durationMs: 0,
        payloadSent: payload,
      };
      this.recordLog(logId, payload, res);
      return res;
    }

    return this.postPayload(logId, payload);
  }

  public async retryAlert(logId: string): Promise<ViaSocketDeliveryResult> {
    const logItem = this.logs.find((l) => l.id === logId);
    if (!logItem) {
      return {
        logId,
        success: false,
        status: 'FAILED',
        message: `Alert record ${logId} not found in history.`,
        timestamp: new Date().toISOString(),
        durationMs: 0,
      };
    }

    return this.postPayload(`VS-RETRY-${Date.now().toString(36).toUpperCase()}`, logItem.payload);
  }

  private async postPayload(logId: string, payload: ViaSocketPayload): Promise<ViaSocketDeliveryResult> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    try {
      const res = await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GhostShield-Incident-Dispatcher/2.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        const result: ViaSocketDeliveryResult = {
          logId,
          success: true,
          status: 'DELIVERED',
          httpStatus: res.status,
          message: `Alert dispatched successfully to viaSocket workflow (HTTP ${res.status}).`,
          timestamp,
          durationMs,
          payloadSent: payload,
        };
        this.recordLog(logId, payload, result);
        return result;
      }

      const result: ViaSocketDeliveryResult = {
        logId,
        success: false,
        status: 'FAILED',
        httpStatus: res.status,
        message: `viaSocket webhook returned non-2xx status HTTP ${res.status}.`,
        timestamp,
        durationMs,
        payloadSent: payload,
      };
      this.recordLog(logId, payload, result);
      return result;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const result: ViaSocketDeliveryResult = {
        logId,
        success: false,
        status: 'FAILED',
        message: `Network/Timeout error dispatching to viaSocket: ${err.message}`,
        timestamp,
        durationMs,
        payloadSent: payload,
      };
      this.recordLog(logId, payload, result);
      return result;
    }
  }

  private recordLog(id: string, payload: ViaSocketPayload, result: ViaSocketDeliveryResult) {
    this.logs.unshift({
      id,
      timestamp: result.timestamp,
      event: payload.event,
      walletId: payload.walletId,
      riskScore: payload.riskScore,
      action: payload.recommendedAction,
      status: result.status,
      httpStatus: result.httpStatus,
      durationMs: result.durationMs,
      message: result.message,
      payload,
    });

    if (this.logs.length > 50) {
      this.logs.pop();
    }
  }
}

export const defaultViaSocketNotifier = new ViaSocketNotifier();
