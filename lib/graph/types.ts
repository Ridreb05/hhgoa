// ==============================================================================
// GHOSTSHIELD: Universal Graph and Domain Type Contracts
// Standardized across TigerGraph REST++ queries and Demo In-Memory provider
// ==============================================================================

export type EngineMode = 'demo' | 'tigergraph';

export type NodeCategory = 'wallet' | 'funding_source' | 'agent' | 'smart_contract';

export interface WalletVertex {
  id: string;
  network: string;
  label: string;
  creation_time: number;
  provenance: string;
  is_risk_seed: boolean;
}

export interface FundingSourceVertex {
  id: string;
  category: string; // 'MIXER' | 'EXCHANGE' | 'BRIDGE' | 'TREASURY'
  label: string;
  provenance: string;
}

export interface AgentVertex {
  id: string;
  display_name: string;
  agent_type: string; // 'AI_AGENT' | 'SCRIPTED_BOT' | 'SOLVER'
  provenance: string;
}

export interface SmartContractVertex {
  id: string;
  network: string;
  protocol: string;
  category: string;
}

export interface TransferEdge {
  from: string;
  to: string;
  amount: number;
  asset: string;
  event_timestamp: number;
  tx_id: string;
}

export interface FundingEdge {
  from: string;
  to: string;
  amount: number;
  funding_timestamp: number;
  event_id: string;
}

export interface ControlEdge {
  from: string;
  to: string;
  provenance: string;
  recorded_at: number;
}

export interface DelegationEdge {
  from: string;
  to: string;
  delegation_type: string;
  recorded_at: number;
}

export interface InteractionEdge {
  from: string;
  to: string;
  interaction_timestamp: number;
  tx_id: string;
  interaction_type: string;
}

// ------------------------------------------------------------------------------
// Dashboard Metrics
// ------------------------------------------------------------------------------
export interface DashboardMetrics {
  engine_mode: EngineMode;
  total_wallets: number;
  total_funding_sources: number;
  total_agents: number;
  total_contracts: number;
  total_transfers: number;
  total_transfer_volume: number;
  risk_seed_wallets: number;
  latest_transfer_timestamp: number;
  query_latency_ms: number;
  timestamp: string;
}

// ------------------------------------------------------------------------------
// Cycle Detection
// ------------------------------------------------------------------------------
export interface CycleRecord {
  cycle_path: string;
  hops: string[];
  hop_count: number;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  min_amount: number;
  max_amount: number;
  volume_retention: number; // min_amount / max_amount
  temporally_valid: boolean; // duration <= time_window
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW_TOPOLOGICAL_ONLY';
}

export interface CycleDetectionResult {
  engine_mode: EngineMode;
  time_window_seconds: number;
  max_depth: number;
  cycles_found: number;
  cycles: CycleRecord[];
  query_latency_ms: number;
}

// ------------------------------------------------------------------------------
// Wallet Investigation
// ------------------------------------------------------------------------------
export interface WalletInvestigation {
  engine_mode: EngineMode;
  target_wallet: WalletVertex;
  transfers: {
    from_id: string;
    to_id: string;
    amount: number;
    asset: string;
    event_timestamp: number;
    tx_id: string;
    direction: 'INCOMING' | 'OUTGOING';
  }[];
  direct_funding_sources: {
    source_id: string;
    category: string;
    label: string;
    amount: number;
    funding_timestamp: number;
    event_id: string;
  }[];
  shared_funding_peer_wallets: string[];
  controlling_agents: {
    agent_id: string;
    display_name: string;
    agent_type: string;
    delegation_partner_id?: string;
    delegation_type?: string;
  }[];
  contract_interactions: {
    contract_id: string;
    protocol: string;
    category: string;
    interaction_type: string;
    interaction_timestamp: number;
  }[];
  risk_seed_connections: {
    entity_id: string;
    entity_type: string;
    hop_distance: number;
    reason: string;
  }[];
  query_latency_ms: number;
}

// ------------------------------------------------------------------------------
// Candidate Transaction & Multi-Modal Risk Evidence
// ------------------------------------------------------------------------------
export interface CandidateTransaction {
  from_wallet: string;
  to_wallet: string;
  amount: number;
  asset: string;
  proposed_timestamp?: number;
}

export interface RiskEvidence {
  engine_mode: EngineMode;
  target_wallet_id: string;
  counterparty_id?: string;
  neighbor_wallets_count: number;
  outgoing_tx_count: number;
  incoming_tx_count: number;
  total_transferred_volume: number;
  shared_funding_sources_count: number;
  common_funding_sources: string[];
  risk_seed_connections_count: number;
  connected_risk_seeds: string[];
  controlling_agents_count: number;
  delegated_agents_count: number;
  detected_cycle_count: number;
  cycle_participant_wallets: string[];
  evidence_flags: string[];
  query_latency_ms: number;
}

// ------------------------------------------------------------------------------
// Deterministic Risk Assessment Decision
// ------------------------------------------------------------------------------
export type RiskAction = 'ALLOW' | 'REVIEW' | 'REJECT';

export interface RuleContribution {
  rule_id: string;
  name: string;
  points: number;
  max_points: number;
  triggered: boolean;
  explanation: string;
  evidence_snippet?: string;
}

export interface RiskAssessment {
  investigation_id: string;
  timestamp: string;
  target_wallet: string;
  counterparty?: string;
  score: number; // 0 to 100
  action: RiskAction; // ALLOW (0-34), REVIEW (35-64), REJECT (65-100)
  contributing_rules: RuleContribution[];
  detected_cycles: CycleRecord[];
  shared_funding_sources: string[];
  risk_seed_exposure: string[];
  agent_connections: string[];
  missing_data_warnings: string[];
  explanation: string;
  latency_ms: number;
  engine_mode: EngineMode;
}

// ------------------------------------------------------------------------------
// Topology for Force-Directed Graph Rendering
// ------------------------------------------------------------------------------
export interface GraphNode {
  id: string;
  label: string;
  category: NodeCategory;
  is_risk_seed?: boolean;
  highlighted?: boolean;
  details?: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'TRANSFERRED_TO' | 'FUNDED' | 'CONTROLS' | 'DELEGATES_TO' | 'INTERACTS_WITH';
  amount?: number;
  asset?: string;
  timestamp?: number;
  highlighted?: boolean;
}

export interface GraphTopology {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ------------------------------------------------------------------------------
// Universal Graph Provider Interface
// ------------------------------------------------------------------------------
export interface ProviderHealth {
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNCONFIGURED';
  mode: EngineMode;
  latency_ms: number;
  message: string;
  details?: Record<string, any>;
}

export interface GraphProvider {
  readonly mode: EngineMode;
  getDashboardMetrics(): Promise<DashboardMetrics>;
  investigateWallet(walletId: string, maxHops?: number): Promise<WalletInvestigation>;
  detectCycles(timeWindowSeconds?: number, maxDepth?: number): Promise<CycleDetectionResult>;
  getRiskEvidence(walletId: string, candidate?: CandidateTransaction): Promise<RiskEvidence>;
  getGraphTopology(): Promise<GraphTopology>;
  checkHealth(): Promise<ProviderHealth>;
}
