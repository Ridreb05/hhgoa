// ==============================================================================
// GHOSTSHIELD: Shared TigerGraph client for operational scripts
// Handles .env.local, secret -> JWT exchange (Savanna + legacy), GSQL execution,
// batched REST++ upserts and installed-query calls.
// ==============================================================================

import * as fs from 'fs';
import * as path from 'path';

export function loadEnv(): void {
  const file = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [key, ...rest] = t.split('=');
    process.env[key.trim()] ??= rest.join('=').trim().replace(/^["']|["']$/g, '');
  }
}

loadEnv();

export const host = (process.env.TIGERGRAPH_HOST || '').replace(/\/$/, '');
export const graph = process.env.TIGERGRAPH_GRAPH_NAME || 'GhostShieldGraph';

if (!host || host.includes('your-cluster')) {
  console.error('TIGERGRAPH_HOST is not configured in .env.local');
  process.exit(1);
}

let cachedToken: { value: string; expires: number } | null = null;

export async function authHeader(): Promise<string> {
  if (process.env.TIGERGRAPH_TOKEN) return `Bearer ${process.env.TIGERGRAPH_TOKEN}`;
  const secret = process.env.TIGERGRAPH_SECRET;
  if (secret) {
    if (cachedToken && cachedToken.expires > Date.now() + 60_000) return `Bearer ${cachedToken.value}`;
    for (const p of ['/gsql/v1/tokens', '/restpp/requesttoken']) {
      const res = await fetch(`${host}${p}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, lifetime: '3600' }),
      });
      if (!res.ok) continue;
      const json: any = await res.json();
      if (json.token) {
        cachedToken = { value: json.token, expires: Date.now() + 3_500_000 };
        return `Bearer ${json.token}`;
      }
    }
    throw new Error('TigerGraph secret was rejected (check TIGERGRAPH_SECRET)');
  }
  const user = process.env.TIGERGRAPH_USERNAME || 'tigergraph';
  const pass = process.env.TIGERGRAPH_PASSWORD || '';
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

/** Runs GSQL text against the cluster. `graphScope` adds ?graph= for graph-scoped statements. */
export async function gsql(text: string, graphScope?: string, attempts = 4): Promise<string> {
  const url = `${host}/gsql/v1/statements${graphScope ? `?graph=${encodeURIComponent(graphScope)}` : ''}`;
  let lastError = '';
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: await authHeader(), 'Content-Type': 'text/plain' },
        body: text,
      });
      return await res.text();
    } catch (e: any) {
      lastError = `${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ''}`;
      await new Promise((r) => setTimeout(r, 3000 * i)); // workspace may be waking or DNS flapping
    }
  }
  throw new Error(`gsql request failed: ${lastError}`);
}

const csvField = (x: unknown) => {
  const t = String(x ?? '');
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** Runs loadCsv chunks with bounded concurrency (the proxy tolerates a few parallel requests). */
export async function loadCsvParallel(
  file: string,
  rows: unknown[][],
  { chunk = 250, width = 3, offset = 0, onProgress }: { chunk?: number; width?: number; offset?: number; onProgress?: (done: number, total: number) => void } = {}
): Promise<{ valid: number; invalid: number }> {
  const starts: number[] = [];
  for (let i = offset; i < rows.length; i += chunk) starts.push(i);
  let next = 0;
  let valid = 0;
  let invalid = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (next < starts.length) {
        const i = starts[next++];
        const r = await loadCsv(file, rows.slice(i, i + chunk), chunk);
        valid += r.valid;
        invalid += r.invalid;
        done++;
        if (onProgress && done % 20 === 0) onProgress(done, starts.length);
      }
    })
  );
  return { valid, invalid };
}

/** Streams rows through a GSQL loading job (`ghostshield_load`); retries transient proxy errors. */
export async function loadCsv(
  file: string,
  rows: unknown[][],
  chunk = 250,
  job = 'ghostshield_load',
  offset = 0
): Promise<{ valid: number; invalid: number }> {
  let valid = 0;
  let invalid = 0;
  for (let i = offset; i < rows.length; i += chunk) {
    const body = rows.slice(i, i + chunk).map((r) => r.map(csvField).join(',')).join('\n');
    const url = `${host}/restpp/ddl/${encodeURIComponent(graph)}?tag=${job}&filename=${file}&sep=${encodeURIComponent(',')}&eol=${encodeURIComponent('\n')}`;
    let lastError = '';
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: await authHeader(), 'Content-Type': 'text/plain' },
          body,
          signal: AbortSignal.timeout(30_000),
        });
        const json: any = await res.json().catch(() => ({}));
        if (res.ok && !json.error) {
          const file = json.results?.[0]?.statistics?.parsingStatistics?.fileLevel ?? {};
          valid += file.validLine ?? 0;
          invalid += Object.entries(file).reduce((n, [k, x]) => (k === 'validLine' ? n : n + (typeof x === 'number' ? x : 0)), 0);
          lastError = '';
          break;
        }
        lastError = `HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`;
        if (res.status < 500 && res.status !== 429) break;
      } catch (e: any) {
        lastError = `${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ''}`;
      }
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    if (lastError) throw new Error(`load ${file} rows ${i}-${i + chunk}: ${lastError}`);
  }
  return { valid, invalid };
}

export async function runQuery<T = any>(
  name: string,
  params: Record<string, string | number> = {},
  timeoutSec = 60
): Promise<{ results: T[]; ms: number }> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const t0 = performance.now();
  const res = await fetch(`${host}/restpp/query/${graph}/${name}${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: await authHeader(), 'GSQL-TIMEOUT': String(timeoutSec * 1000) },
    signal: AbortSignal.timeout((timeoutSec + 30) * 1000),
  });
  const body: any = await res.json();
  if (!res.ok || body.error) throw new Error(`${name} failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
  return { results: body.results, ms: Math.round(performance.now() - t0) };
}

/** Strips float-equality compiler warnings so admin output stays readable. */
export function quiet(out: string): string {
  return out
    .split('\n')
    .filter(
      (l) =>
        l.trim() &&
        !/epsilon|float\/double|such comparison|WARN-5|Warning in a transformed|it involves equality|where epsilon/i.test(l)
    )
    .join('\n');
}
