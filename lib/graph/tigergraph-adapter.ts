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
  /** Provenance prefix restricting global scans (several datasets can share one graph). "" = everything. */
  scope?: string;
}

export class TigerGraphAdapter implements GraphProvider {
  public readonly mode: EngineMode = 'tigergraph';

  private host: string;
  private graphName: string;
  private username?: string;
  private password?: string;
  private secret?: string;
  private token?: string; // static token from config/env, never refreshed
  private jwt?: { value: string; expires: number };
  private timeoutMs: number;
  private scope: string;

  constructor(config?: Partial<TigerGraphConfig>) {
    this.host = (config?.host || process.env.TIGERGRAPH_HOST || '').replace(/\/$/, '');
    this.graphName = config?.graphName || process.env.TIGERGRAPH_GRAPH_NAME || 'GhostShieldGraph';
    this.username = config?.username || process.env.TIGERGRAPH_USERNAME;
    this.password = config?.password || process.env.TIGERGRAPH_PASSWORD;
    this.secret = config?.secret || process.env.TIGERGRAPH_SECRET;
    this.token = config?.token || process.env.TIGERGRAPH_TOKEN;
    this.scope = config?.scope ?? process.env.GHOSTSHIELD_SCOPE ?? '';
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
        if (!this.jwt || this.jwt.expires < Date.now() + 60_000) {
          const value = await this.requestToken(this.secret);
          if (value) this.jwt = { value, expires: Date.now() + 55 * 60_000 };
        }
        if (this.jwt) {
          headers['Authorization'] = `Bearer ${this.jwt.value}`;
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
    // Savanna (4.x) issues tokens at /gsql/v1/tokens; legacy clusters use /restpp/requesttoken.
    const endpoints = [`${this.host}/gsql/v1/tokens`, `${this.host}/restpp/requesttoken`];
    let lastStatus = 0;
    for (const url of endpoints) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, lifetime: '3600' }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) return data.token;
      }
      lastStatus = res.status;
    }
    throw new Error(`TigerGraph token request HTTP ${lastStatus}`);
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

    const call = async () =>
      fetch(url, { method: 'GET', headers: await this.getAuthHeaders(), signal: AbortSignal.timeout(this.timeoutMs) });

    let response = await call();
    // 401: token expired or revoked. 403: no token was sent because minting failed (e.g. workspace waking from suspend).
    if ((response.status === 401 || response.status === 403) && this.secret) {
      this.jwt = undefined; // mint a new one and retry once
      response = await call();
    }

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
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_dashboard_metrics', { scope: this.scope });
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
      result_limit: 200,
      scope: this.scope,
    });

    const cycleData = Object.assign({}, ...(results || []));
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
      cycles_found: cycleData?.total_cycles_found ?? cycles.length,
      cycles,
      query_latency_ms: latencyMs,
    };
  }

  public async investigateWallet(walletId: string, maxHops: number = 2): Promise<WalletInvestigation> {
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_investigate_wallet', {
      target_wallet: walletId,
      max_hops: maxHops,
    });

    const res: Record<string, any> = Object.assign({}, ...(results || []));

    return {
      engine_mode: 'tigergraph',
      target_wallet: {
        id: walletId,
        network: res['network'] || 'ethereum',
        label: res['wallet_label'] || walletId,
        creation_time: res['creation_time'] ?? 0,
        provenance: res['provenance'] || 'tigergraph_live',
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

    const res: Record<string, any> = Object.assign({}, ...(results || []));

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

  public async getGraphTopology(centerId?: string): Promise<GraphTopology> {
    const { results } = await this.executeQuery<any[]>('ghostshield_topology', centerId ? { center_id: centerId, hops: 2, scope: this.scope } : { scope: this.scope });
    const out: Record<string, any> = Object.assign({}, ...(results || []));

    const nodes: GraphTopology['nodes'] = [];
    for (const v of out.wallets || []) {
      nodes.push({
        id: v.v_id,
        label: v.attributes.label || v.v_id,
        category: 'wallet',
        is_risk_seed: Boolean(v.attributes.is_risk_seed),
        risk_score: v.attributes.risk_score || 0,
        community_id: v.attributes.community_id || undefined,
        details: { network: v.attributes.network, creation_time: v.attributes.creation_time },
      });
    }
    for (const v of out.funding_sources || []) {
      nodes.push({ id: v.v_id, label: v.attributes.label || v.v_id, category: 'funding_source', details: { category: v.attributes.category, provenance: v.attributes.provenance } });
    }
    for (const v of out.agents || []) {
      nodes.push({ id: v.v_id, label: v.attributes.display_name || v.v_id, category: 'agent', details: { type: v.attributes.agent_type, provenance: v.attributes.provenance } });
    }
    for (const v of out.contracts || []) {
      nodes.push({ id: v.v_id, label: v.attributes.protocol || v.v_id, category: 'smart_contract', details: { network: v.attributes.network, category: v.attributes.category } });
    }

    const links: GraphTopology['links'] = (out.edges || []).map((e: any) => ({
      source: e.from_id,
      target: e.to_id,
      type: e.e_type,
      amount: e.attributes?.amount,
      asset: e.attributes?.asset,
      timestamp: e.attributes?.event_timestamp ?? e.attributes?.funding_timestamp,
    }));

    return { nodes, links };
  }

  public async getSybilClusters(minClusterSize: number = 5): Promise<import('./types').SybilClusterResult> {
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_sybil_clusters', {
      min_cluster_size: minClusterSize,
      result_limit: 50,
      scope: this.scope,
    });
    const out: Record<string, any> = Object.assign({}, ...(results || []));
    const clusters: import('./types').SybilClusterRecord[] = (out.sybil_clusters || []).map((c: any) => ({
      root_entity_id: c.root_entity_id,
      root_type: c.root_type,
      root_label: c.root_type === 'Community' ? `Coordinated cluster ${String(c.root_entity_id).slice(0, 6)}…${String(c.root_entity_id).slice(-4)}` : c.root_label,
      category: c.category,
      member_count: c.member_count,
      member_wallets: typeof c.member_wallets === 'string' ? c.member_wallets.split(',').filter(Boolean) : c.member_wallets || [],
      total_cluster_volume: parseFloat((c.total_cluster_volume || 0).toFixed(2)),
      risk_level: c.risk_level || 'MEDIUM',
    }));
    return {
      engine_mode: 'tigergraph',
      clusters_identified: out.total_clusters_identified ?? clusters.length,
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
    const out: Record<string, any> = Object.assign({}, ...(results || []));
    const paths: import('./types').CompletePathRecord[] = (out.paths || [])
      .map((p: any) => ({
        total_hops: p.total_hops,
        total_volume: parseFloat((p.total_volume || 0).toFixed(3)),
        duration_seconds: p.duration_seconds,
        path_string: p.path_string,
        hops: String(p.hops || '')
          .split(';')
          .filter(Boolean)
          .map((h) => {
            const [idx, from, to, amount, asset, ts, txId] = h.split('|');
            return {
              hop_index: Number(idx),
              from_id: from,
              to_id: to,
              amount: Number(amount),
              asset,
              event_timestamp: Number(ts),
              tx_id: txId,
            };
          }),
      }))
      .sort((a: any, b: any) => a.total_hops - b.total_hops || b.total_volume - a.total_volume)
      .slice(0, 5);
    return {
      engine_mode: 'tigergraph',
      source_wallet_id: sourceWalletId,
      target_wallet_id: targetWalletId,
      paths_found: out.paths_found ?? paths.length,
      paths,
      query_latency_ms: latencyMs,
    };
  }

  public async getRiskPropagation(maxHops: number = 4, limit: number = 25): Promise<import('./types').RiskPropagationResult> {
    const { results, latencyMs } = await this.executeQuery<any[]>('ghostshield_risk_propagation', {
      max_hops: maxHops,
      result_limit: limit,
      scope: this.scope,
    });
    const out: Record<string, any> = Object.assign({}, ...(results || []));
    return {
      engine_mode: 'tigergraph',
      seed_wallets: out.seed_wallets ?? 0,
      tainted_wallets: out.tainted_wallets ?? 0,
      top_risk_wallets: (out.top_risk_wallets || []).map((w: any) => ({
        wallet_id: w.wallet_id,
        label: w.label,
        score: parseFloat(Number(w.score).toFixed(4)),
        hop: w.hop,
      })),
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
      const testRes = await fetch(`${this.host}/api/ping`, {
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
        message: `TigerGraph ping responded with HTTP ${testRes.status}`,
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
