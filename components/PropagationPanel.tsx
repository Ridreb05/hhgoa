'use client';

import React, { useEffect, useState } from 'react';
import { RiskPropagationResult } from '@/lib/graph/types';

export function PropagationPanel() {
  const [data, setData] = useState<RiskPropagationResult | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetch('/api/propagation?limit=100')
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setData(j)))
      .catch((e) => setError(e.message));
  }, []);

  const all = data?.top_risk_wallets || [];
  const byHop = all.reduce<Record<number, number>>((m, w) => ({ ...m, [w.hop]: (m[w.hop] || 0) + 1 }), {});
  // one representative (highest score) per hop distance, so the panel shows decay instead of eight identical bars
  const shown = Object.keys(byHop)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((h) => all.filter((w) => w.hop === h).slice(0, h === 1 ? 2 : 3));
  const max = Math.max(0.0001, ...shown.map((w) => w.score));

  return (
    <div className="financial-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#f4f5f7]">
          Taint Propagation From Known-Risk Seeds
        </h2>
        {data && (
          <span className="text-[10px] font-mono text-[#c9ced8]">
            {data.seed_wallets} seeds · {data.tainted_wallets} wallets scored · {data.query_latency_ms}ms ({data.engine_mode})
          </span>
        )}
      </div>
      {data && (
        <p className="text-[10px] font-mono text-[#c9ced8]">
          Scored wallets by distance from a seed: {Object.entries(byHop).map(([h, n]) => `hop ${h}: ${n}`).join(' · ')}
        </p>
      )}
      {error && <p className="text-xs font-mono text-[#f43f5e]">{error}</p>}
      {!data && !error && <p className="text-xs font-mono text-[#c9ced8]">Running in-engine propagation query…</p>}
      <div className="space-y-1.5">
        {shown.map((w) => (
          <div key={w.wallet_id} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="relative h-5 bg-[#07090e] border border-[#303139] rounded-[3px] overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-[#ff951f]/30" style={{ width: `${(100 * w.score) / max}%` }} />
              <span className="absolute inset-0 px-2 flex items-center text-[10px] font-mono text-[#f4f5f7] truncate">
                {w.label || w.wallet_id} <span className="ml-2 text-[#c9ced8]">hop {w.hop}</span>
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#edcd8c] tabular-nums">{w.score.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
