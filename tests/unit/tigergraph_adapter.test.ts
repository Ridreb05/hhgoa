import { describe, it, expect, vi, afterEach } from 'vitest';
import { TigerGraphAdapter } from '../../lib/graph/tigergraph-adapter';

const HOST = 'https://example.i.tgcloud.io';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function adapter() {
  return new TigerGraphAdapter({ host: HOST, graphName: 'G', secret: 's3cret', timeoutMs: 2000 });
}

afterEach(() => vi.restoreAllMocks());

describe('TigerGraphAdapter', () => {
  it('exchanges the secret at the Savanna token endpoint and caches the JWT across calls', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith('/gsql/v1/tokens')) return json({ token: 'jwt-1' });
      return json({ error: false, results: [{ total_wallets: 5 }] });
    }));
    const a = adapter();
    await a.getDashboardMetrics();
    await a.getDashboardMetrics();
    expect(calls.filter((u) => u.endsWith('/gsql/v1/tokens')).length).toBe(1);
  });

  it('falls back to the legacy token endpoint when Savanna rejects the request', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith('/gsql/v1/tokens')) return json({ error: true }, 404);
      if (url.endsWith('/restpp/requesttoken')) return json({ token: 'legacy' });
      return json({ error: false, results: [{}] });
    }));
    await adapter().getDashboardMetrics();
    expect(calls.some((u) => u.endsWith('/restpp/requesttoken'))).toBe(true);
  });

  it('mints a new token and retries once when a query returns 401', async () => {
    let tokens = 0;
    let queries = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/gsql/v1/tokens')) return json({ token: `jwt-${++tokens}` });
      queries++;
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      return auth === 'Bearer jwt-2' ? json({ error: false, results: [{ total_wallets: 1 }] }) : json({ error: true }, 401);
    }));
    const m = await adapter().getDashboardMetrics();
    expect(m.total_wallets).toBe(1);
    expect(tokens).toBe(2);
    expect(queries).toBe(2);
  });

  it('parses in-engine path hops and sorts shortest, highest-volume first', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/gsql/v1/tokens')) return json({ token: 't' });
      return json({
        error: false,
        results: [
          { source_wallet_id: 'A', target_wallet_id: 'C' },
          {
            paths: [
              { total_hops: 2, total_volume: 5, duration_seconds: 10, path_string: 'A -> B -> C', hops: '1|A|B|2.5|ETH|100|t1;2|B|C|2.5|ETH|110|t2' },
              { total_hops: 1, total_volume: 1, duration_seconds: 0, path_string: 'A -> C', hops: '1|A|C|1|ETH|90|t0' },
            ],
          },
          { paths_found: 2 },
        ],
      });
    }));
    const r = await adapter().findPath('A', 'C', 3);
    expect(r.paths_found).toBe(2);
    expect(r.paths[0].total_hops).toBe(1);
    expect(r.paths[1].hops).toEqual([
      { hop_index: 1, from_id: 'A', to_id: 'B', amount: 2.5, asset: 'ETH', event_timestamp: 100, tx_id: 't1' },
      { hop_index: 2, from_id: 'B', to_id: 'C', amount: 2.5, asset: 'ETH', event_timestamp: 110, tx_id: 't2' },
    ]);
  });

  it('maps sybil clusters and risk propagation output', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/gsql/v1/tokens')) return json({ token: 't' });
      if (url.includes('ghostshield_risk_propagation')) {
        return json({ error: false, results: [{ seed_wallets: 2, tainted_wallets: 9, top_risk_wallets: [{ wallet_id: 'W', label: 'W', score: 0.123456, hop: 2 }] }] });
      }
      return json({ error: false, results: [{ sybil_clusters: [{ root_entity_id: 'r', root_type: 'Community', root_label: 'c', category: 'AGENT_CONTROLLED', member_count: 2, member_wallets: 'a,b,', total_cluster_volume: 1.234, risk_level: 'HIGH_COORDINATION' }] }, { total_clusters_identified: 7 }] });
    }));
    const a = adapter();
    const c = await a.getSybilClusters(2);
    expect(c.clusters_identified).toBe(7);
    expect(c.clusters[0].member_wallets).toEqual(['a', 'b']);
    const p = await a.getRiskPropagation();
    expect(p.top_risk_wallets[0].score).toBe(0.1235);
  });

  it('sends the dataset scope with every query that scans globally', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/gsql/v1/tokens')) return json({ token: 't' });
      seen.push(url);
      return json({ error: false, results: [{}] });
    }));
    const a = new TigerGraphAdapter({ host: HOST, graphName: 'G', secret: 's', timeoutMs: 2000, scope: 'elliptic' });
    await a.getDashboardMetrics();
    await a.detectCycles(600, 5);
    await a.getSybilClusters(2);
    await a.getRiskPropagation();
    await a.getGraphTopology();
    expect(seen.length).toBe(5);
    for (const u of seen) expect(u).toContain('scope=elliptic');
  });

  it('reports a health check against /api/ping', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      seen.push(url);
      return json({ error: false, message: 'pong' });
    }));
    const h = await adapter().checkHealth();
    expect(h.status).toBe('ONLINE');
    expect(seen[0]).toBe(`${HOST}/api/ping`);
  });
});
