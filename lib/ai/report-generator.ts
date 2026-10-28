// ==============================================================================
// GHOSTSHIELD: AI Grants India (AIGI) & LLM Forensic Narrative Generator
// Produces evidence-backed investigation reports from verified TigerGraph evidence
// Fully compatible with AIGI endpoints (AICredits, Velona, OpenAI compatible routers)
// Authoritative risk scores are strictly deterministic and never overridden by LLMs
// ==============================================================================

import { RiskAssessment } from '@/lib/graph/types';

export interface AIReportResult {
  investigation_id: string;
  source: 'aigi_llm' | 'deterministic_template';
  model_used?: string;
  endpoint_used?: string;
  generated_at: string;
  latency_ms: number;
  executive_summary: string;
  detailed_findings: string[];
  graph_evidence_citations: string[];
  recommended_analyst_actions: string[];
  disclaimer: string;
}

export interface AIConnectionHealth {
  configured: boolean;
  connected: boolean;
  endpoint: string;
  model: string;
  latency_ms: number;
  message: string;
}

export class AIReportGenerator {
  private apiKey?: string;
  private apiEndpoint: string;
  private modelName: string;
  private timeoutMs: number;

  constructor() {
    this.apiKey = process.env.AIGI_API_KEY || process.env.OPENAI_API_KEY;

    // Resolve API endpoint: supports explicit endpoint or base URL
    const rawEndpoint =
      process.env.AIGI_API_ENDPOINT ||
      process.env.AIGI_API_BASE ||
      process.env.OPENAI_API_BASE ||
      'https://api.aicredits.in/v1';

    if (rawEndpoint.endsWith('/chat/completions')) {
      this.apiEndpoint = rawEndpoint;
    } else {
      this.apiEndpoint = `${rawEndpoint.replace(/\/$/, '')}/chat/completions`;
    }

    this.modelName = process.env.AIGI_MODEL || 'openai/gpt-4o-mini';
    this.timeoutMs = parseInt(process.env.AIGI_TIMEOUT_MS || '7000', 10);
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  public async generateReport(assessment: RiskAssessment): Promise<AIReportResult> {
    const startTime = performance.now();

    if (this.isConfigured()) {
      try {
        const aiResponse = await this.callAIEndpoint(assessment, startTime);
        if (aiResponse) {
          return aiResponse;
        }
      } catch (err: any) {
        console.warn(`[GhostShield AI] AIGI live call failed (${err.message}), falling back to deterministic template.`);
      }
    }

    const elapsed = Math.round(performance.now() - startTime);
    return this.generateDeterministicTemplate(assessment, elapsed);
  }

  private async callAIEndpoint(assessment: RiskAssessment, startTime: number): Promise<AIReportResult | null> {
    const systemPrompt = `You are GhostShield's Senior Graph Forensics & Blockchain Intelligence Analyst.
Your task is to analyze the following topological evidence verified by TigerGraph and compile an executive forensic dossier.

MANDATORY RULES:
1. Do not invent any wallet addresses, transaction IDs, or timestamps not present in the evidence.
2. The risk score (${assessment.score}/100) and recommendation (${assessment.action}) are authoritative and mathematical; do NOT modify them.
3. Distinguish proven graph relationships (closed cycles, verified seeds) from uncorroborated patterns.
4. Output valid JSON only, with the following exact structure:
{
  "executive_summary": "High-level 2-3 sentence overview of the investigation findings.",
  "detailed_findings": [
    "Specific topological finding 1 (citing paths/timestamps/amounts)",
    "Specific topological finding 2"
  ],
  "graph_evidence_citations": [
    "Specific graph entities/edges cited as evidence"
  ],
  "recommended_analyst_actions": [
    "Concrete actionable security step 1",
    "Concrete actionable security step 2"
  ]
}`;

    const userPayload = {
      investigationId: assessment.investigation_id,
      timestamp: assessment.timestamp,
      targetWallet: assessment.target_wallet,
      counterparty: assessment.counterparty,
      score: assessment.score,
      action: assessment.action,
      engineMode: assessment.engine_mode,
      triggeredRules: assessment.contributing_rules.filter((r) => r.triggered),
      allRulesEvaluated: assessment.contributing_rules,
      detectedCycles: assessment.detected_cycles,
      sharedFundingSources: assessment.shared_funding_sources,
      riskSeedExposure: assessment.risk_seed_exposure,
      agentConnections: assessment.agent_connections,
      missingDataWarnings: assessment.missing_data_warnings,
    };

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://ghostshield.ai',
        'X-Title': 'GhostShield TigerGraph Risk Engine',
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userPayload) },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const elapsed = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AIGI API responded with HTTP ${response.status}: ${errText.substring(0, 160)}`);
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    // Clean JSON content if wrapped in markdown fences
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();

    const parsed = JSON.parse(cleanedContent);

    return {
      investigation_id: assessment.investigation_id,
      source: 'aigi_llm',
      model_used: this.modelName,
      endpoint_used: this.apiEndpoint,
      generated_at: new Date().toISOString(),
      latency_ms: elapsed,
      executive_summary: parsed.executive_summary || assessment.explanation,
      detailed_findings: parsed.detailed_findings || [],
      graph_evidence_citations: parsed.graph_evidence_citations || [
        assessment.target_wallet,
        ...assessment.shared_funding_sources,
      ],
      recommended_analyst_actions: parsed.recommended_analyst_actions || [],
      disclaimer:
        'Synthesized via AI Grants India (AIGI) model access using verified TigerGraph graph topology. Authoritative risk scoring is strictly deterministic.',
    };
  }

  public generateDeterministicTemplate(assessment: RiskAssessment, elapsedMs: number = 1): AIReportResult {
    const triggered = assessment.contributing_rules.filter((r) => r.triggered);
    const findings: string[] = [];
    const citations: string[] = [assessment.target_wallet];
    const actions: string[] = [];

    // Severity assessment
    if (assessment.action === 'REJECT') {
      findings.push(
        `Critical anomaly confirmed: Risk score ${assessment.score}/100 exceeds protocol safety threshold (${DEFAULT_REJECT_THRESHOLD}).`
      );
    } else if (assessment.action === 'REVIEW') {
      findings.push(
        `Moderate risk detected: Risk score ${assessment.score}/100 falls into the analyst human review corridor.`
      );
    } else {
      findings.push(
        `Benign transaction activity: Risk score ${assessment.score}/100 complies with baseline protocol parameters.`
      );
    }

    // Rule citations
    for (const rule of triggered) {
      findings.push(`[${rule.name}] ${rule.explanation}${rule.evidence_snippet ? ` (Evidence Path: ${rule.evidence_snippet})` : ''}`);
      if (rule.evidence_snippet) {
        citations.push(rule.evidence_snippet);
      }
    }

    // Cycle breadcrumbs
    if (assessment.detected_cycles.length > 0) {
      const c = assessment.detected_cycles[0];
      findings.push(
        `Cyclic Routing Topology: ${c.cycle_path} traversed in ${c.duration_seconds}s with ${(c.volume_retention * 100).toFixed(1)}% capital retention.`
      );
      citations.push(c.cycle_path);
    }

    // Shared funding
    if (assessment.shared_funding_sources.length > 0) {
      findings.push(`Upstream Liquidity Roots: Common funding origin from ${assessment.shared_funding_sources.join(', ')}.`);
      citations.push(...assessment.shared_funding_sources);
    }

    // Risk seed exposure
    if (assessment.risk_seed_exposure.length > 0) {
      findings.push(`Threat Seed Proximity: Verified counterparty connection with flagged threat seed ${assessment.risk_seed_exposure.join(', ')}.`);
      citations.push(...assessment.risk_seed_exposure);
    }

    // Operational actions
    if (assessment.action === 'REJECT') {
      actions.push('Block candidate transaction execution at protocol gateway.');
      actions.push('Flag connected cluster wallets for automated monitoring.');
      actions.push('Dispatch automated alert to compliance team via viaSocket webhook.');
    } else if (assessment.action === 'REVIEW') {
      actions.push('Escalate to Tier-2 security analyst for manual graph path verification.');
      actions.push('Inspect counterparty wallet deposit history on target network explorer.');
    } else {
      actions.push('Permit candidate transaction to proceed through standard protocol pipeline.');
      actions.push('Record clean graph traversal evidence to telemetry audit store.');
    }

    return {
      investigation_id: assessment.investigation_id,
      source: 'deterministic_template',
      model_used: 'Deterministic Rule Engine (Offline)',
      endpoint_used: 'Internal Rule Pipeline',
      generated_at: new Date().toISOString(),
      latency_ms: elapsedMs,
      executive_summary: `GhostShield Forensic Synthesis: Entity ${assessment.target_wallet} assessed at risk score ${assessment.score}/100 (${assessment.action}). Deterministic graph traversal confirms ${triggered.length} corroborating risk indicator(s).`,
      detailed_findings: findings,
      graph_evidence_citations: Array.from(new Set(citations)),
      recommended_analyst_actions: actions,
      disclaimer:
        'Compiled deterministically from active graph traversal. Zero hallucination guarantee.',
    };
  }

  public async testConnection(): Promise<AIConnectionHealth> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        endpoint: this.apiEndpoint,
        model: this.modelName,
        latency_ms: 0,
        message: 'AIGI_API_KEY environment variable is not configured. Standby template mode active.',
      };
    }

    const startTime = performance.now();
    try {
      const res = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const latency = Math.round(performance.now() - startTime);

      if (res.ok) {
        return {
          configured: true,
          connected: true,
          endpoint: this.apiEndpoint,
          model: this.modelName,
          latency_ms: latency,
          message: `Successfully connected to AIGI model endpoint (${this.modelName}).`,
        };
      }

      const errText = await res.text();
      return {
        configured: true,
        connected: false,
        endpoint: this.apiEndpoint,
        model: this.modelName,
        latency_ms: latency,
        message: `AIGI endpoint responded with HTTP ${res.status}: ${errText.substring(0, 100)}`,
      };
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      return {
        configured: true,
        connected: false,
        endpoint: this.apiEndpoint,
        model: this.modelName,
        latency_ms: latency,
        message: `Failed to connect to AIGI endpoint: ${err.message}`,
      };
    }
  }
}

const DEFAULT_REJECT_THRESHOLD = 65;
export const defaultAIReportGenerator = new AIReportGenerator();
