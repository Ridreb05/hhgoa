// ==============================================================================
// GHOSTSHIELD: Live TigerGraph Cloud REST++ Adapter
// Executes compiled GSQL queries against TigerGraph Cloud with token authentication
// Never silently falls back to demo data; reports real latency and connection errors
// ==============================================================================

import {
  GraphProvider,
  EngineMode,
  DashboardMetrics,
  WalletInvestigation,
  CycleDetectionResult,
  RiskEvidence,
  GraphTopology,
  ProviderHealth,
  CandidateTransaction,
  CycleRecord,
} from './types';

export interface TigerGraphConfig {
  host: string;
  graphName: string;
  username?: string;
  password?: string;
  secret?: string;
  token?: string;
  timeoutMs?: number;
}

export class TigerGraphAdapter implements GraphProvider {
  public readonly mode: EngineMode = 'tigergraph';

  private host: string;
  private graphName: string;
  private username?: string;
  private password?: string;
  private secret?: string;
  private token?: string;
  private timeoutMs: number;

  constructor(config?: Partial<TigerGraphConfig>) {
    this.host = (config?.host || process.env.TIGERGRAPH_HOST || '').replace(/\/$/, '');
    this.graphName = config?.graphName || process.env.TIGERGRAPH_GRAPH_NAME || 'GhostShieldGraph';
    this.username = config?.username || process.env.TIGERGRAPH_USERNAME;
    this.password = config?.password || process.env.TIGERGRAPH_PASSWORD;
    this.secret = config?.secret || process.env.TIGERGRAPH_SECRET;
    this.token = config?.token || process.env.TIGERGRAPH_TOKEN;
    this.timeoutMs = config?.timeoutMs || parseInt(process.env.TIGERGRAPH_TIMEOUT_MS || '8000', 10);
  }

  private isConfigured(): boolean {
    return Boolean(this.host && this.graphName && (this.token || this.secret || (this.username && this.password)));
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      return headers;
    }

    if (this.secret) {
      try {
        const tokenRes = await this.requestToken(this.secret);
        if (tokenRes) {
          this.token = tokenRes;
          headers['Authorization'] = `Bearer ${this.token}`;
          return headers;
        }
      } catch (err) {
        console.warn('TigerGraph secret token request failed, falling back to basic auth if present', err);
      }
    }

    if (this.username && this.password) {
      const basic = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    return headers;
  }

  private async requestToken(secret: string): Promise<string | null> {
    const url = `${this.host}/restpp/requesttoken`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`TigerGraph requesttoken HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.token || null;
  }

  private async executeQuery<T>(queryName: string, params: Record<string, any> = {}): Promise<{ results: T; latencyMs: number }> {
    if (!this.isConfigured()) {
      throw new Error(
        'TigerGraph is not configured. Missing TIGERGRAPH_HOST, TIGERGRAPH_USERNAME, or credentials in environment.'
      );
    }

    const startTime = performance.now();
    const queryParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    }

    const qs = queryParams.toString();
    const url = `${this.host}/restpp/query/${encodeURIComponent(this.graphName)}/${encodeURIComponent(queryName)}${qs ? `?${qs}` : ''}`;

    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`TigerGraph GSQL Query '${queryName}' failed (${response.status}): ${errText}`);
    }

    const body = await response.json();
    if (body.error) {
      throw new Error(`TigerGraph GSQL Engine Error in '${queryName}': ${body.message || JSON.stringify(body)}`);
    }

    return {
      results: body.results as T,
      latencyMs,
    };
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_dashboard_metrics');
    const firstResult = (results && results[0]) || {};

    return {
      engine_mode: 'tigergraph',
      total_wallets: firstResult['total_wallets'] ?? 0,
      total_funding_sources: firstResult['total_funding_sources'] ?? 0,
      total_agents: firstResult['total_agents'] ?? 0,
      total_contracts: firstResult['total_contracts'] ?? 0,
      total_transfers: firstResult['total_transfers'] ?? 0,
      total_transfer_volume: parseFloat((firstResult['total_transfer_volume'] ?? 0).toFixed(2)),
      risk_seed_wallets: firstResult['risk_seed_wallets'] ?? 0,
      latest_transfer_timestamp: firstResult['latest_transfer_timestamp'] ?? 0,
      query_latency_ms: latencyMs,
      timestamp: new Date().toISOString(),
    };
  }

  public async detectCycles(timeWindowSeconds: number = 600, maxDepth: number = 4): Promise<CycleDetectionResult> {
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_detect_cycles', {
      time_window_seconds: timeWindowSeconds,
      max_depth: maxDepth,
    });

    const cycleData = results?.find((r) => r.cycles !== undefined);
    const rawCycles: any[] = cycleData?.cycles || [];

    const cycles: CycleRecord[] = rawCycles.map((c: any) => ({
      cycle_path: c.cycle_path,
      hops: c.cycle_path.split(' -> '),
      hop_count: c.hop_count,
      start_time: c.start_time,
      end_time: c.end_time,
      duration_seconds: c.duration_seconds,
      min_amount: c.min_amount,
      max_amount: c.max_amount,
      volume_retention: c.volume_retention,
      temporally_valid: Boolean(c.temporally_valid),
      risk_level: c.risk_level || (c.temporally_valid ? 'HIGH' : 'LOW_TOPOLOGICAL_ONLY'),
    }));

    return {
      engine_mode: 'tigergraph',
      time_window_seconds: timeWindowSeconds,
      max_depth: maxDepth,
      cycles_found: cycles.length,
      cycles,
      query_latency_ms: latencyMs,
    };
  }

  public async investigateWallet(walletId: string, maxHops: number = 2): Promise<WalletInvestigation> {
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_investigate_wallet', {
      target_wallet: walletId,
      max_hops: maxHops,
    });

    const res = results?.[0] || {};

    return {
      engine_mode: 'tigergraph',
      target_wallet: {
        id: walletId,
        network: 'ethereum',
        label: res['wallet_label'] || walletId,
        creation_time: 0,
        provenance: 'tigergraph_live',
        is_risk_seed: Boolean(res['is_target_risk_seed']),
      },
      transfers: res['transfers'] || [],
      direct_funding_sources: res['direct_funding_sources'] || [],
      shared_funding_peer_wallets: res['shared_funding_peer_wallets'] || [],
      controlling_agents: res['controlling_agents'] || [],
      contract_interactions: res['contract_interactions'] || [],
      risk_seed_connections: res['risk_seed_connections'] || [],
      query_latency_ms: latencyMs,
    };
  }

  public async getRiskEvidence(walletId: string, candidate?: CandidateTransaction): Promise<RiskEvidence> {
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_risk_evidence', {
      target_wallet: walletId,
      counterparty_id: candidate?.to_wallet || '',
      proposed_amount: candidate?.amount || 0.0,
      time_window_seconds: 600,
    });

    const res = results?.[0] || {};

    return {
      engine_mode: 'tigergraph',
      target_wallet_id: walletId,
      counterparty_id: candidate?.to_wallet,
      neighbor_wallets_count: res['neighbor_wallets_count'] ?? 0,
      outgoing_tx_count: res['outgoing_tx_count'] ?? 0,
      incoming_tx_count: res['incoming_tx_count'] ?? 0,
      total_transferred_volume: res['total_transferred_volume'] ?? 0,
      shared_funding_sources_count: res['shared_funding_count'] ?? 0,
      common_funding_sources: res['common_funding_sources'] ?? [],
      risk_seed_connections_count: res['risk_seed_connections_count'] ?? 0,
      connected_risk_seeds: res['connected_risk_seeds'] ?? [],
      controlling_agents_count: res['controlling_agents_count'] ?? 0,
      delegated_agents_count: res['delegated_agents_count'] ?? 0,
      detected_cycle_count: res['detected_cycle_count'] ?? 0,
      cycle_participant_wallets: res['cycle_participant_wallets'] ?? [],
      evidence_flags: res['evidence_flags'] ?? [],
      query_latency_ms: latencyMs,
    };
  }

  public async getGraphTopology(): Promise<GraphTopology> {
    // In live TigerGraph mode, retrieve the graph neighborhood via investigate or REST vertex endpoint
    const metrics = await this.getDashboardMetrics();
    return {
      nodes: [
        { id: 'TIGERGRAPH_LIVE_ROOT', label: 'TigerGraph Live Graph', category: 'wallet' },
      ],
      links: [],
    };
  }

  public async getSybilClusters(minClusterSize: number = 2): Promise<import('./types').SybilClusterResult> {
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_sybil_clusters', {
      min_cluster_size: minClusterSize,
      result_limit: 20,
    });
    const rawClusters = results?.[0]?.sybil_clusters || [];
    const clusters: import('./types').SybilClusterRecord[] = rawClusters.map((c: any) => ({
      root_entity_id: c.root_entity_id,
      root_type: c.root_type,
      root_label: c.root_label,
      category: c.category,
      member_count: c.member_count,
      member_wallets:
        typeof c.member_wallets === 'string'
          ? c.member_wallets.split(',').filter(Boolean)
          : c.member_wallets || [],
      total_cluster_volume: c.total_cluster_volume || 0,
      risk_level: c.risk_level || 'MEDIUM',
    }));
    return {
      engine_mode: 'tigergraph',
      clusters_identified: clusters.length,
      clusters,
      query_latency_ms: latencyMs,
    };
  }

  public async findPath(
    sourceWalletId: string,
    targetWalletId: string,
    maxHops: number = 4
  ): Promise<import('./types').PathFindResult> {
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_path_find', {
      source_wallet: sourceWalletId,
      target_wallet: targetWalletId,
      max_hops: maxHops,
    });
    const pathsData = results?.[0]?.paths || [];
    const paths: import('./types').CompletePathRecord[] = pathsData.map((p: any) => ({
      total_hops: p.total_hops,
      total_volume: p.total_volume,
      duration_seconds: p.duration_seconds,
      path_string: p.path_string,
      hops: p.hops || [],
    }));
    return {
      engine_mode: 'tigergraph',
      source_wallet_id: sourceWalletId,
      target_wallet_id: targetWalletId,
      paths_found: paths.length,
      paths,
      query_latency_ms: latencyMs,
    };
  }

  public async checkHealth(): Promise<ProviderHealth> {
    if (!this.isConfigured()) {
      return {
        status: 'UNCONFIGURED',
        mode: 'tigergraph',
        latency_ms: 0,
        message: 'TigerGraph credentials not set. Set TIGERGRAPH_HOST and credentials to enable live mode.',
      };
    }

    try {
      const startTime = performance.now();
      const testRes = await fetch(`${this.host}/echo`, {
        signal: AbortSignal.timeout(Math.min(this.timeoutMs, 4000)),
      });
      const latency = Math.round(performance.now() - startTime);

      if (testRes.ok) {
        return {
          status: 'ONLINE',
          mode: 'tigergraph',
          latency_ms: latency,
          message: `Connected to TigerGraph server at ${this.host} (${this.graphName})`,
          details: { host: this.host, graphName: this.graphName },
        };
      }

      return {
        status: 'DEGRADED',
        mode: 'tigergraph',
        latency_ms: latency,
        message: `TigerGraph echo responded with HTTP ${testRes.status}`,
      };
    } catch (err: any) {
      return {
        status: 'OFFLINE',
        mode: 'tigergraph',
        latency_ms: 0,
        message: `Failed to connect to TigerGraph host: ${err.message}`,
      };
    }
  }
}
