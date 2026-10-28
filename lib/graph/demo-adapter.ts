// ==============================================================================
// GHOSTSHIELD: In-Memory Deterministic Graph Provider (Demo Mode)
// Implements GraphProvider interface using synthetic fixtures with GSQL-identical semantics
// ==============================================================================

import demoData from '@/data/demo/entities.json';
import {
  GraphProvider,
  EngineMode,
  DashboardMetrics,
  WalletInvestigation,
  CycleDetectionResult,
  CycleRecord,
  RiskEvidence,
  GraphTopology,
  ProviderHealth,
  CandidateTransaction,
  WalletVertex,
  FundingSourceVertex,
  AgentVertex,
  SmartContractVertex,
  TransferEdge,
  FundingEdge,
  ControlEdge,
  DelegationEdge,
  InteractionEdge,
  GraphNode,
  GraphLink,
} from './types';

export class DemoGraphAdapter implements GraphProvider {
  public readonly mode: EngineMode = 'demo';

  private wallets: Map<string, WalletVertex> = new Map();
  private fundingSources: Map<string, FundingSourceVertex> = new Map();
  private agents: Map<string, AgentVertex> = new Map();
  private contracts: Map<string, SmartContractVertex> = new Map();

  private transfers: TransferEdge[] = [];
  private fundingEdges: FundingEdge[] = [];
  private controlEdges: ControlEdge[] = [];
  private delegationEdges: DelegationEdge[] = [];
  private interactions: InteractionEdge[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.wallets.clear();
    this.fundingSources.clear();
    this.agents.clear();
    this.contracts.clear();

    demoData.vertices.wallets.forEach((w) => this.wallets.set(w.id, w as WalletVertex));
    demoData.vertices.funding_sources.forEach((fs) => this.fundingSources.set(fs.id, fs as FundingSourceVertex));
    demoData.vertices.agents.forEach((a) => this.agents.set(a.id, a as AgentVertex));
    demoData.vertices.smart_contracts.forEach((sc) => this.contracts.set(sc.id, sc as SmartContractVertex));

    this.transfers = [...demoData.edges.transfers];
    this.fundingEdges = [...demoData.edges.funding_edges];
    this.controlEdges = [...demoData.edges.control_edges];
    this.delegationEdges = [...demoData.edges.delegation_edges];
    this.interactions = [...demoData.edges.interactions];
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const startTime = performance.now();

    const totalWallets = this.wallets.size;
    const totalFundingSources = this.fundingSources.size;
    const totalAgents = this.agents.size;
    const totalContracts = this.contracts.size;
    const totalTransfers = this.transfers.length;

    let totalTransferVolume = 0;
    let latestTransferTimestamp = 0;
    for (const tx of this.transfers) {
      totalTransferVolume += tx.amount;
      if (tx.event_timestamp > latestTransferTimestamp) {
        latestTransferTimestamp = tx.event_timestamp;
      }
    }

    let riskSeedWallets = 0;
    for (const w of this.wallets.values()) {
      if (w.is_risk_seed) riskSeedWallets++;
    }

    const latency = Math.max(1, Math.round(performance.now() - startTime));

    return {
      engine_mode: 'demo',
      total_wallets: totalWallets,
      total_funding_sources: totalFundingSources,
      total_agents: totalAgents,
      total_contracts: totalContracts,
      total_transfers: totalTransfers,
      total_transfer_volume: parseFloat(totalTransferVolume.toFixed(2)),
      risk_seed_wallets: riskSeedWallets,
      latest_transfer_timestamp: latestTransferTimestamp,
      query_latency_ms: latency,
      timestamp: new Date().toISOString(),
    };
  }

  public async detectCycles(timeWindowSeconds: number = 600, maxDepth: number = 4): Promise<CycleDetectionResult> {
    const startTime = performance.now();
    const detected: CycleRecord[] = [];
    const seenPaths = new Set<string>();

    // Adjacency map for transfers
    const adj = new Map<string, TransferEdge[]>();
    for (const tx of this.transfers) {
      if (!adj.has(tx.from)) adj.set(tx.from, []);
      adj.get(tx.from)!.push(tx);
    }

    // Directed cycle search with depth bound
    const dfs = (
      startNode: string,
      current: string,
      depth: number,
      pathNodes: string[],
      edgesUsed: TransferEdge[]
    ) => {
      if (depth > maxDepth) return;

      const outEdges = adj.get(current) || [];
      for (const edge of outEdges) {
        if (edge.to === startNode && depth >= 3) {
          // Closed directed cycle found: startNode -> ... -> current -> startNode
          const cycleNodes = [...pathNodes, startNode];
          const sortedCanonical = [...pathNodes].sort().join('|');

          if (!seenPaths.has(sortedCanonical)) {
            seenPaths.add(sortedCanonical);
            const cycleEdges = [...edgesUsed, edge];

            const timestamps = cycleEdges.map((e) => e.event_timestamp);
            const amounts = cycleEdges.map((e) => e.amount);

            const minT = Math.min(...timestamps);
            const maxT = Math.max(...timestamps);
            const duration = maxT - minT;

            const minAmt = Math.min(...amounts);
            const maxAmt = Math.max(...amounts);
            const volumeRetention = maxAmt > 0 ? parseFloat((minAmt / maxAmt).toFixed(3)) : 0;

            // Sequential timing check: did each edge happen sequentially or within the window?
            const isTemporallyValid = duration <= timeWindowSeconds;

            let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW_TOPOLOGICAL_ONLY' = 'LOW_TOPOLOGICAL_ONLY';
            if (isTemporallyValid && volumeRetention >= 0.8) {
              riskLevel = 'HIGH';
            } else if (isTemporallyValid) {
              riskLevel = 'MEDIUM';
            }

            detected.push({
              cycle_path: cycleNodes.join(' -> '),
              hops: cycleNodes,
              hop_count: depth,
              start_time: minT,
              end_time: maxT,
              duration_seconds: duration,
              min_amount: minAmt,
              max_amount: maxAmt,
              volume_retention: volumeRetention,
              temporally_valid: isTemporallyValid,
              risk_level: riskLevel,
            });
          }
        } else if (!pathNodes.includes(edge.to) && depth < maxDepth) {
          dfs(startNode, edge.to, depth + 1, [...pathNodes, edge.to], [...edgesUsed, edge]);
        }
      }
    };

    const walletIds = Array.from(this.wallets.keys());
    for (const wId of walletIds) {
      dfs(wId, wId, 1, [wId], []);
    }

    const latency = Math.max(1, Math.round(performance.now() - startTime));

    return {
      engine_mode: 'demo',
      time_window_seconds: timeWindowSeconds,
      max_depth: maxDepth,
      cycles_found: detected.length,
      cycles: detected,
      query_latency_ms: latency,
    };
  }

  public async investigateWallet(walletId: string, maxHops: number = 2): Promise<WalletInvestigation> {
    const startTime = performance.now();
    const target = this.wallets.get(walletId) || {
      id: walletId,
      network: 'unknown',
      label: 'External / Unindexed Wallet',
      creation_time: Math.floor(Date.now() / 1000),
      provenance: 'runtime_inferred',
      is_risk_seed: false,
    };

    // 1. Incoming & Outgoing transfers
    const transfers: WalletInvestigation['transfers'] = [];
    for (const tx of this.transfers) {
      if (tx.from === walletId) {
        transfers.push({
          from_id: tx.from,
          to_id: tx.to,
          amount: tx.amount,
          asset: tx.asset,
          event_timestamp: tx.event_timestamp,
          tx_id: tx.tx_id,
          direction: 'OUTGOING',
        });
      }
      if (tx.to === walletId) {
        transfers.push({
          from_id: tx.from,
          to_id: tx.to,
          amount: tx.amount,
          asset: tx.asset,
          event_timestamp: tx.event_timestamp,
          tx_id: tx.tx_id,
          direction: 'INCOMING',
        });
      }
    }

    // 2. Direct upstream funding sources
    const directFundingSources: WalletInvestigation['direct_funding_sources'] = [];
    const directFundingSourceIds = new Set<string>();
    for (const fe of this.fundingEdges) {
      if (fe.to === walletId) {
        directFundingSourceIds.add(fe.from);
        const fs = this.fundingSources.get(fe.from);
        directFundingSources.push({
          source_id: fe.from,
          category: fs?.category || 'UNKNOWN',
          label: fs?.label || fe.from,
          amount: fe.amount,
          funding_timestamp: fe.funding_timestamp,
          event_id: fe.event_id,
        });
      }
    }

    // 3. Shared funding peer wallets (2-hop via FundingSource)
    const sharedFundingWallets = new Set<string>();
    for (const fe of this.fundingEdges) {
      if (directFundingSourceIds.has(fe.from) && fe.to !== walletId) {
        sharedFundingWallets.add(fe.to);
      }
    }

    // 4. Controlling agents & delegation
    const controllingAgents: WalletInvestigation['controlling_agents'] = [];
    const controlledByAgents = new Set<string>();
    for (const ce of this.controlEdges) {
      if (ce.to === walletId) {
        controlledByAgents.add(ce.from);
        const ag = this.agents.get(ce.from);
        controllingAgents.push({
          agent_id: ce.from,
          display_name: ag?.display_name || ce.from,
          agent_type: ag?.agent_type || 'UNKNOWN',
        });
      }
    }

    // Check delegations from controlling agents
    for (const de of this.delegationEdges) {
      if (controlledByAgents.has(de.from)) {
        const delegee = this.agents.get(de.to);
        controllingAgents.push({
          agent_id: de.from,
          display_name: this.agents.get(de.from)?.display_name || de.from,
          agent_type: this.agents.get(de.from)?.agent_type || 'UNKNOWN',
          delegation_partner_id: de.to,
          delegation_type: de.delegation_type,
        });
      }
    }

    // 5. Smart Contract Interactions
    const contractInteractions: WalletInvestigation['contract_interactions'] = [];
    for (const ix of this.interactions) {
      if (ix.from === walletId) {
        const sc = this.contracts.get(ix.to);
        contractInteractions.push({
          contract_id: ix.to,
          protocol: sc?.protocol || 'Unknown Protocol',
          category: sc?.category || 'UNKNOWN',
          interaction_type: ix.interaction_type,
          interaction_timestamp: ix.interaction_timestamp,
        });
      }
    }

    // 6. Proximity to known-risk seeds (1-hop & 2-hop)
    const riskSeedConnections: WalletInvestigation['risk_seed_connections'] = [];
    const directNeighbors = new Set<string>();

    for (const tx of this.transfers) {
      if (tx.from === walletId) directNeighbors.add(tx.to);
      if (tx.to === walletId) directNeighbors.add(tx.from);
    }

    for (const nId of directNeighbors) {
      const neighbor = this.wallets.get(nId);
      if (neighbor?.is_risk_seed) {
        riskSeedConnections.push({
          entity_id: nId,
          entity_type: 'Wallet',
          hop_distance: 1,
          reason: `Direct transaction counterparty flagged as risk seed: ${neighbor.label}`,
        });
      }
    }

    if (maxHops >= 2) {
      for (const nId of directNeighbors) {
        for (const tx of this.transfers) {
          const hop2Id = tx.from === nId ? tx.to : tx.to === nId ? tx.from : null;
          if (hop2Id && hop2Id !== walletId && !directNeighbors.has(hop2Id)) {
            const hop2 = this.wallets.get(hop2Id);
            if (hop2?.is_risk_seed) {
              riskSeedConnections.push({
                entity_id: hop2Id,
                entity_type: 'Wallet',
                hop_distance: 2,
                reason: `2-hop connection to risk seed via ${nId}`,
              });
            }
          }
        }
      }
    }

    const latency = Math.max(1, Math.round(performance.now() - startTime));

    return {
      engine_mode: 'demo',
      target_wallet: target,
      transfers,
      direct_funding_sources: directFundingSources,
      shared_funding_peer_wallets: Array.from(sharedFundingWallets),
      controlling_agents: controllingAgents,
      contract_interactions: contractInteractions,
      risk_seed_connections: riskSeedConnections,
      query_latency_ms: latency,
    };
  }

  public async getRiskEvidence(walletId: string, candidate?: CandidateTransaction): Promise<RiskEvidence> {
    const startTime = performance.now();
    const investigation = await this.investigateWallet(walletId, 2);
    const cycleRes = await this.detectCycles(600, 4);

    const counterpartyId = candidate?.to_wallet;
    let commonFundingSources: string[] = [];
    if (counterpartyId) {
      const cpInvestigation = await this.investigateWallet(counterpartyId, 1);
      if (
        cpInvestigation.target_wallet.is_risk_seed &&
        !investigation.risk_seed_connections.some((r) => r.entity_id === counterpartyId)
      ) {
        investigation.risk_seed_connections.push({
          entity_id: counterpartyId,
          entity_type: 'Wallet',
          hop_distance: 1,
          reason: `Proposed transaction counterparty is a flagged risk seed: ${cpInvestigation.target_wallet.label}`,
        });
      }
      const targetFS = new Set(investigation.direct_funding_sources.map((s) => s.source_id));
      for (const fs of cpInvestigation.direct_funding_sources) {
        if (targetFS.has(fs.source_id)) {
          commonFundingSources.push(fs.source_id);
        }
      }
    }

    // Check if target wallet is in any detected cycles
    const relevantCycles = cycleRes.cycles.filter((c) => c.hops.includes(walletId));
    const cycleParticipants = new Set<string>();
    for (const c of relevantCycles) {
      for (const h of c.hops) {
        if (h !== walletId) cycleParticipants.add(h);
      }
    }

    const evidenceFlags: string[] = [];
    if (relevantCycles.some((c) => c.temporally_valid)) {
      evidenceFlags.push('RAPID_TEMPORAL_CYCLE_DETECTED');
    }
    if (commonFundingSources.length > 0) {
      evidenceFlags.push('COMMON_FUNDING_SOURCE_DETECTED');
    }
    if (investigation.risk_seed_connections.length > 0) {
      evidenceFlags.push('DIRECT_RISK_SEED_EXPOSURE');
    }
    if (investigation.controlling_agents.length > 0) {
      evidenceFlags.push('AUTONOMOUS_AGENT_CONTROLLED');
    }

    const outgoing = investigation.transfers.filter((t) => t.direction === 'OUTGOING');
    const incoming = investigation.transfers.filter((t) => t.direction === 'INCOMING');
    const totalVol = investigation.transfers.reduce((sum, t) => sum + t.amount, 0);

    const latency = Math.max(1, Math.round(performance.now() - startTime));

    return {
      engine_mode: 'demo',
      target_wallet_id: walletId,
      counterparty_id: counterpartyId,
      neighbor_wallets_count: investigation.transfers.length,
      outgoing_tx_count: outgoing.length,
      incoming_tx_count: incoming.length,
      total_transferred_volume: parseFloat(totalVol.toFixed(2)),
      shared_funding_sources_count: commonFundingSources.length,
      common_funding_sources: commonFundingSources,
      risk_seed_connections_count: investigation.risk_seed_connections.length,
      connected_risk_seeds: investigation.risk_seed_connections.map((r) => r.entity_id),
      controlling_agents_count: investigation.controlling_agents.length,
      delegated_agents_count: investigation.controlling_agents.filter((a) => a.delegation_partner_id).length,
      detected_cycle_count: relevantCycles.length,
      cycle_participant_wallets: Array.from(cycleParticipants),
      evidence_flags: evidenceFlags,
      query_latency_ms: latency,
    };
  }

  public async getGraphTopology(): Promise<GraphTopology> {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    for (const w of this.wallets.values()) {
      nodes.push({
        id: w.id,
        label: w.label || w.id,
        category: 'wallet',
        is_risk_seed: w.is_risk_seed,
        details: { network: w.network, creation_time: w.creation_time },
      });
    }

    for (const fs of this.fundingSources.values()) {
      nodes.push({
        id: fs.id,
        label: fs.label,
        category: 'funding_source',
        details: { category: fs.category, provenance: fs.provenance },
      });
    }

    for (const a of this.agents.values()) {
      nodes.push({
        id: a.id,
        label: a.display_name,
        category: 'agent',
        details: { type: a.agent_type, provenance: a.provenance },
      });
    }

    for (const sc of this.contracts.values()) {
      nodes.push({
        id: sc.id,
        label: sc.protocol,
        category: 'smart_contract',
        details: { network: sc.network, category: sc.category },
      });
    }

    for (const tx of this.transfers) {
      links.push({
        source: tx.from,
        target: tx.to,
        type: 'TRANSFERRED_TO',
        amount: tx.amount,
        asset: tx.asset,
        timestamp: tx.event_timestamp,
      });
    }

    for (const fe of this.fundingEdges) {
      links.push({
        source: fe.from,
        target: fe.to,
        type: 'FUNDED',
        amount: fe.amount,
        timestamp: fe.funding_timestamp,
      });
    }

    for (const ce of this.controlEdges) {
      links.push({
        source: ce.from,
        target: ce.to,
        type: 'CONTROLS',
        timestamp: ce.recorded_at,
      });
    }

    for (const de of this.delegationEdges) {
      links.push({
        source: de.from,
        target: de.to,
        type: 'DELEGATES_TO',
        timestamp: de.recorded_at,
      });
    }

    for (const ix of this.interactions) {
      links.push({
        source: ix.from,
        target: ix.to,
        type: 'INTERACTS_WITH',
        timestamp: ix.interaction_timestamp,
      });
    }

    return { nodes, links };
  }

  public async checkHealth(): Promise<ProviderHealth> {
    return {
      status: 'ONLINE',
      mode: 'demo',
      latency_ms: 1,
      message: 'Local deterministic synthetic graph provider is active and healthy.',
      details: {
        wallets: this.wallets.size,
        transfers: this.transfers.length,
        fundingSources: this.fundingSources.size,
        agents: this.agents.size,
      },
    };
  }
}
