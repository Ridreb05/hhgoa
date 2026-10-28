// ==============================================================================
// GHOSTSHIELD: Deterministic Risk Policy Engine
// Authoritative, explainable mathematical scoring from graph-derived evidence
// No LLM dependency in the scoring path; strictly reproducible
// ==============================================================================

import {
  RiskEvidence,
  RiskAssessment,
  RiskAction,
  RuleContribution,
  CandidateTransaction,
  CycleRecord,
} from '@/lib/graph/types';

export interface RiskPolicyConfig {
  temporalCycleMaxPoints: number; // default 40
  volumeRetentionMaxPoints: number; // default 15
  sharedFundingMaxPoints: number; // default 20
  riskSeedExposureMaxPoints: number; // default 15
  agentDelegationMaxPoints: number; // default 10
  allowThreshold: number; // <= 34
  reviewThreshold: number; // 35 - 64
  rejectThreshold: number; // >= 65
}

export const DEFAULT_RISK_CONFIG: RiskPolicyConfig = {
  temporalCycleMaxPoints: 40,
  volumeRetentionMaxPoints: 15,
  sharedFundingMaxPoints: 20,
  riskSeedExposureMaxPoints: 15,
  agentDelegationMaxPoints: 10,
  allowThreshold: 34,
  reviewThreshold: 64,
  rejectThreshold: 65,
};

export class RiskEngine {
  private config: RiskPolicyConfig;

  constructor(config: Partial<RiskPolicyConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  public evaluate(
    evidence: RiskEvidence,
    cycles: CycleRecord[] = [],
    candidate?: CandidateTransaction
  ): RiskAssessment {
    const rules: RuleContribution[] = [];
    let totalScore = 0;
    const missingDataWarnings: string[] = [];

    // --------------------------------------------------------------------------
    // Rule 1: Temporally Correlated Directed Cycle (Max 40 points)
    // --------------------------------------------------------------------------
    const relevantCycles = cycles.filter(
      (c) => c.hops.includes(evidence.target_wallet_id) || (candidate && c.hops.includes(candidate.to_wallet))
    );
    const validTemporalCycle = relevantCycles.find((c) => c.temporally_valid);

    if (validTemporalCycle) {
      const pts = this.config.temporalCycleMaxPoints;
      totalScore += pts;
      rules.push({
        rule_id: 'TEMPORAL_CIRCULAR_TRANSFER',
        name: 'Rapid Circular Transfer Window',
        points: pts,
        max_points: this.config.temporalCycleMaxPoints,
        triggered: true,
        explanation: `Wallet participates in a closed ${validTemporalCycle.hop_count}-hop directed cycle completed in ${validTemporalCycle.duration_seconds}s (limit: 600s).`,
        evidence_snippet: validTemporalCycle.cycle_path,
      });
    } else if (relevantCycles.length > 0) {
      // Topological cycle present but exceeded temporal window
      rules.push({
        rule_id: 'TEMPORAL_CIRCULAR_TRANSFER',
        name: 'Rapid Circular Transfer Window',
        points: 0,
        max_points: this.config.temporalCycleMaxPoints,
        triggered: false,
        explanation: 'Topological cycle detected, but transfer timestamps exceeded the 10-minute suspicious window; not flagged as rapid wash-trading.',
      });
    } else {
      rules.push({
        rule_id: 'TEMPORAL_CIRCULAR_TRANSFER',
        name: 'Rapid Circular Transfer Window',
        points: 0,
        max_points: this.config.temporalCycleMaxPoints,
        triggered: false,
        explanation: 'No circular transfer patterns found in the investigated neighborhood.',
      });
    }

    // --------------------------------------------------------------------------
    // Rule 2: Corroborating Transaction Behavior & Volume Retention (Max 15 points)
    // --------------------------------------------------------------------------
    const highRetentionCycle = relevantCycles.find((c) => c.volume_retention >= 0.85);
    if (highRetentionCycle && validTemporalCycle) {
      const pts = this.config.volumeRetentionMaxPoints;
      totalScore += pts;
      rules.push({
        rule_id: 'HIGH_VOLUME_RETENTION',
        name: 'High Cycle Capital Conservation',
        points: pts,
        max_points: this.config.volumeRetentionMaxPoints,
        triggered: true,
        explanation: `Substantial capital retention (${(highRetentionCycle.volume_retention * 100).toFixed(1)}%) conserved across the cyclic routing path.`,
        evidence_snippet: `Min: ${highRetentionCycle.min_amount} ETH, Max: ${highRetentionCycle.max_amount} ETH`,
      });
    } else if (evidence.total_transferred_volume > 0 && evidence.neighbor_wallets_count <= 2) {
      // Modest volume concentration
      const pts = 5;
      totalScore += pts;
      rules.push({
        rule_id: 'HIGH_VOLUME_RETENTION',
        name: 'Transaction Volume Concentration',
        points: pts,
        max_points: this.config.volumeRetentionMaxPoints,
        triggered: true,
        explanation: 'High capital concentration localized between very few counterparties.',
      });
    } else {
      rules.push({
        rule_id: 'HIGH_VOLUME_RETENTION',
        name: 'Capital Retention & Behavior',
        points: 0,
        max_points: this.config.volumeRetentionMaxPoints,
        triggered: false,
        explanation: 'Transaction amounts and routing exhibit normal dispersion.',
      });
    }

    // --------------------------------------------------------------------------
    // Rule 3: Relevant Shared Funding Structure (Max 20 points)
    // --------------------------------------------------------------------------
    const hasMixerFunding = evidence.common_funding_sources.some((fs) =>
      fs.toLowerCase().includes('tornado') || fs.toLowerCase().includes('mixer')
    );
    const hasSharedFunding = evidence.shared_funding_sources_count > 0;

    if (hasMixerFunding) {
      const pts = this.config.sharedFundingMaxPoints;
      totalScore += pts;
      rules.push({
        rule_id: 'SHARED_HIGH_RISK_FUNDING',
        name: 'Shared Mixer / Obfuscation Funding',
        points: pts,
        max_points: this.config.sharedFundingMaxPoints,
        triggered: true,
        explanation: `Target wallet and counterparty share upstream funding from high-risk obfuscation source: ${evidence.common_funding_sources.join(', ')}.`,
        evidence_snippet: evidence.common_funding_sources.join(', '),
      });
    } else if (hasSharedFunding) {
      const pts = 12; // Moderate signal for common exchange/bridge
      totalScore += pts;
      rules.push({
        rule_id: 'SHARED_COMMON_FUNDING',
        name: 'Shared Upstream Liquidity Source',
        points: pts,
        max_points: this.config.sharedFundingMaxPoints,
        triggered: true,
        explanation: `Entities share common upstream deposit infrastructure (${evidence.common_funding_sources.join(', ')}). May indicate Sybil cluster or routine exchange users.`,
        evidence_snippet: evidence.common_funding_sources.join(', '),
      });
    } else {
      rules.push({
        rule_id: 'SHARED_FUNDING',
        name: 'Shared Upstream Funding',
        points: 0,
        max_points: this.config.sharedFundingMaxPoints,
        triggered: false,
        explanation: 'No common upstream liquidity or mixer sources identified.',
      });
    }

    // --------------------------------------------------------------------------
    // Rule 4: Connection to Known Risk Seed (Direct 1-Hop: up to 50 pts, 2-Hop: up to 15 pts)
    // --------------------------------------------------------------------------
    const isDirectSeedTarget = candidate?.to_wallet && evidence.connected_risk_seeds.includes(candidate.to_wallet);
    const hasDirect1HopSeed = evidence.risk_seed_connections_count > 0;

    if (isDirectSeedTarget) {
      const pts = 55; // Direct transaction targeting a confirmed risk seed
      totalScore += pts;
      rules.push({
        rule_id: 'DIRECT_RISK_SEED_EXPOSURE',
        name: 'Target Counterparty is Known Risk Seed',
        points: pts,
        max_points: 55,
        triggered: true,
        explanation: `Proposed counterparty (${candidate!.to_wallet}) is a verified high-risk / exploit seed entity. Transaction directly facilitates fund routing to flagged entity.`,
        evidence_snippet: candidate!.to_wallet,
      });
    } else if (hasDirect1HopSeed) {
      const pts = 45; // Direct 1-hop neighbor is a risk seed
      totalScore += pts;
      rules.push({
        rule_id: 'DIRECT_RISK_SEED_EXPOSURE',
        name: 'Direct Counterparty Risk Seed Exposure',
        points: pts,
        max_points: 45,
        triggered: true,
        explanation: `Target wallet has direct transaction history with confirmed risk seed: ${evidence.connected_risk_seeds.join(', ')}.`,
        evidence_snippet: evidence.connected_risk_seeds.join(', '),
      });
    } else {
      rules.push({
        rule_id: 'DIRECT_RISK_SEED_EXPOSURE',
        name: 'Known Risk Seed Proximity',
        points: 0,
        max_points: 45,
        triggered: false,
        explanation: 'No recorded proximity to active OFAC or exploit seed addresses.',
      });
    }

    // --------------------------------------------------------------------------
    // Rule 5: Corroborating Agent Delegation & Control (Max 10 points)
    // --------------------------------------------------------------------------
    if (evidence.delegated_agents_count > 0) {
      const pts = this.config.agentDelegationMaxPoints;
      totalScore += pts;
      rules.push({
        rule_id: 'MULTI_TIER_AGENT_DELEGATION',
        name: 'Multi-Tier Autonomous Delegation',
        points: pts,
        max_points: this.config.agentDelegationMaxPoints,
        triggered: true,
        explanation: 'Wallet execution authority is delegated through a multi-tier agent chain, indicating potential automated botnet coordination.',
      });
    } else if (evidence.controlling_agents_count > 0) {
      const pts = 5;
      totalScore += pts;
      rules.push({
        rule_id: 'AUTONOMOUS_AGENT_CONTROLLED',
        name: 'Autonomous Agent Controlled',
        points: pts,
        max_points: this.config.agentDelegationMaxPoints,
        triggered: true,
        explanation: 'Wallet is linked to a registered autonomous trading or solver agent.',
      });
    } else {
      rules.push({
        rule_id: 'AGENT_CONTROL',
        name: 'Autonomous Agent Association',
        points: 0,
        max_points: this.config.agentDelegationMaxPoints,
        triggered: false,
        explanation: 'No registered autonomous agent controls or delegations found.',
      });
    }

    // Data completeness check
    if (evidence.neighbor_wallets_count === 0 && evidence.total_transferred_volume === 0) {
      missingDataWarnings.push('Target wallet has zero recorded transfer history in the active graph.');
    }
    if (!candidate?.to_wallet) {
      missingDataWarnings.push('No counterparty supplied; shared funding overlap was evaluated based solely on direct targets.');
    }

    // Cap total score to [0, 100]
    const finalScore = Math.min(100, Math.max(0, totalScore));

    // Determine Action
    let action: RiskAction = 'ALLOW';
    if (finalScore >= this.config.rejectThreshold) {
      action = 'REJECT';
    } else if (finalScore >= this.config.reviewThreshold - 29) { // 35-64
      action = 'REVIEW';
    } else {
      action = 'ALLOW';
    }

    // Construct human-readable explanation
    const triggeredRules = rules.filter((r) => r.triggered);
    let explanationText = '';
    if (action === 'REJECT') {
      explanationText = `High-risk transaction pattern detected (${finalScore}/100). Triggered: ${triggeredRules.map((r) => r.name).join(', ')}. Bounded graph traversal confirms critical wash-trading or risk exposure signals.`;
    } else if (action === 'REVIEW') {
      explanationText = `Moderate risk identified (${finalScore}/100). Triggered: ${triggeredRules.map((r) => r.name).join(', ')}. Corroborating signals warrant manual analyst review before protocol execution.`;
    } else {
      explanationText = `Low risk assessment (${finalScore}/100). No rapid circular routing, mixer funding, or exploit seed proximity detected. Action recommended: ALLOW.`;
    }

    return {
      investigation_id: `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      target_wallet: evidence.target_wallet_id,
      counterparty: candidate?.to_wallet,
      score: finalScore,
      action,
      contributing_rules: rules,
      detected_cycles: relevantCycles,
      shared_funding_sources: evidence.common_funding_sources,
      risk_seed_exposure: evidence.connected_risk_seeds,
      agent_connections: evidence.evidence_flags.filter((f) => f.includes('AGENT')),
      missing_data_warnings: missingDataWarnings,
      explanation: explanationText,
      latency_ms: evidence.query_latency_ms,
      engine_mode: evidence.engine_mode,
    };
  }
}

export const defaultRiskEngine = new RiskEngine();
