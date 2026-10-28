// ==============================================================================
// GHOSTSHIELD: viaSocket Real-Time Alert Integration
// Dispatches structured incident webhooks to viaSocket workflows
// Never fabricates deliveries; reports real HTTP delivery status or UNCONFIGURED
// ==============================================================================

import { RiskAssessment } from '@/lib/graph/types';

export interface ViaSocketPayload {
  event: 'RISK_THRESHOLD_EXCEEDED' | 'TEST_NOTIFICATION';
  investigationId: string;
  timestamp: string;
  walletId: string;
  counterpartyId?: string;
  riskScore: number;
  recommendedAction: string;
  primaryEvidence: string[];
  explanation: string;
  investigationLink?: string;
}

export interface ViaSocketDeliveryResult {
  success: boolean;
  status: 'DELIVERED' | 'FAILED' | 'UNCONFIGURED';
  httpStatus?: number;
  message: string;
  timestamp: string;
  payloadSent?: ViaSocketPayload;
}

export class ViaSocketNotifier {
  private webhookUrl?: string;
  private timeoutMs: number;

  constructor() {
    this.webhookUrl = process.env.VIASOCKET_WEBHOOK_URL;
    this.timeoutMs = parseInt(process.env.VIASOCKET_TIMEOUT_MS || '4000', 10);
  }

  public isConfigured(): boolean {
    return Boolean(this.webhookUrl && this.webhookUrl.startsWith('http'));
  }

  public async sendAlert(assessment: RiskAssessment, appBaseUrl?: string): Promise<ViaSocketDeliveryResult> {
    const timestamp = new Date().toISOString();

    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'UNCONFIGURED',
        message: 'VIASOCKET_WEBHOOK_URL environment variable is not configured. Webhook alert skipped.',
        timestamp,
      };
    }

    const triggeredRules = assessment.contributing_rules
      .filter((r) => r.triggered)
      .map((r) => `${r.name}: ${r.explanation}`);

    const payload: ViaSocketPayload = {
      event: 'RISK_THRESHOLD_EXCEEDED',
      investigationId: assessment.investigation_id,
      timestamp,
      walletId: assessment.target_wallet,
      counterpartyId: assessment.counterparty,
      riskScore: assessment.score,
      recommendedAction: assessment.action,
      primaryEvidence: triggeredRules,
      explanation: assessment.explanation,
      investigationLink: appBaseUrl ? `${appBaseUrl}/investigations/${assessment.investigation_id}` : undefined,
    };

    return this.postPayload(payload);
  }

  public async sendTestAlert(appBaseUrl?: string): Promise<ViaSocketDeliveryResult> {
    const timestamp = new Date().toISOString();

    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'UNCONFIGURED',
        message: 'VIASOCKET_WEBHOOK_URL is not set. To test viaSocket, add your webhook URL to .env.',
        timestamp,
      };
    }

    const payload: ViaSocketPayload = {
      event: 'TEST_NOTIFICATION',
      investigationId: `TEST-PING-${Date.now()}`,
      timestamp,
      walletId: '0x71c...sus1',
      riskScore: 85,
      recommendedAction: 'REJECT',
      primaryEvidence: ['Test probe verifying viaSocket webhook integration from GhostShield SOC.'],
      explanation: 'Diagnostic health check verifying viaSocket channel connectivity.',
      investigationLink: appBaseUrl ? `${appBaseUrl}/` : undefined,
    };

    return this.postPayload(payload);
  }

  private async postPayload(payload: ViaSocketPayload): Promise<ViaSocketDeliveryResult> {
    const timestamp = new Date().toISOString();
    try {
      const res = await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GhostShield-Alert-Dispatcher/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (res.ok) {
        return {
          success: true,
          status: 'DELIVERED',
          httpStatus: res.status,
          message: `Alert dispatched successfully to viaSocket (HTTP ${res.status}).`,
          timestamp,
          payloadSent: payload,
        };
      }

      return {
        success: false,
        status: 'FAILED',
        httpStatus: res.status,
        message: `viaSocket webhook returned error status HTTP ${res.status}.`,
        timestamp,
        payloadSent: payload,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        message: `Network or timeout error dispatching viaSocket alert: ${err.message}`,
        timestamp,
        payloadSent: payload,
      };
    }
  }
}

export const defaultViaSocketNotifier = new ViaSocketNotifier();
