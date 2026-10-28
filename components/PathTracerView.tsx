'use client';

import React, { useState } from 'react';
import { PathFindResult, CompletePathRecord } from '@/lib/graph/types';
import demoData from '@/data/demo/entities.json';
import {
  Route,
  ArrowRight,
  Clock,
  Coins,
  ShieldAlert,
  Search,
  RefreshCw,
  ExternalLink,
  Layers,
  ChevronRight,
  Hash,
  CheckCircle2,
} from 'lucide-react';

interface PathTracerViewProps {
  onSelectWallet?: (walletId: string) => void;
}

export function PathTracerView({ onSelectWallet }: PathTracerViewProps) {
  const [sourceWallet, setSourceWallet] = useState<string>('0x71c...sus1');
  const [targetWallet, setTargetWallet] = useState<string>('0x93e...sus3');
  const [maxHops, setMaxHops] = useState<number>(4);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [pathResult, setPathResult] = useState<PathFindResult | null>(null);

  const presets = [
    {
      label: 'Suspect Cycle Segment (Alpha → Gamma)',
      source: '0x71c...sus1',
      target: '0x93e...sus3',
    },
    {
      label: 'Compromised Treasury → Exploit Seed',
      source: '0x66f...target4',
      target: '0x999...seed_exploit',
    },
    {
      label: 'Alice → Clean Liquidity Pool',
      source: '0x11a...norm1',
      target: '0xbbb...clean_lp',
    },
    {
      label: 'Airdrop Claimer → Clean Pool',
      source: '0x44d...airdrop1',
      target: '0xbbb...clean_lp',
    },
  ];

  const handleSearch = async (s: string = sourceWallet, t: string = targetWallet) => {
    if (!s || !t) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/path?source=${encodeURIComponent(s)}&target=${encodeURIComponent(t)}&max_hops=${maxHops}`
      );
      if (!res.ok) throw new Error('Path search failed');
      const data = await res.json();
      setPathResult(data);
    } catch (err) {
      console.error('Path search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Presets Card */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Route className="w-4 h-4 text-cyan-400" />
            <span>Forensic Multi-Hop Path Tracer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Bounded graph traversal reconstructing directed transaction hops, time deltas, and volume leakage between any two entities.
          </p>
        </div>

        {/* 1-Click Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium">Quick Traces:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSourceWallet(p.source);
                setTargetWallet(p.target);
                handleSearch(p.source, p.target);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors border ${
                sourceWallet === p.source && targetWallet === p.target
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Source Wallet Address
            </label>
            <input
              type="text"
              value={sourceWallet}
              onChange={(e) => setSourceWallet(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#1e293b]/70 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Target Entity Address
            </label>
            <input
              type="text"
              value={targetWallet}
              onChange={(e) => setTargetWallet(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#1e293b]/70 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Max Hops (2–5)
              </label>
              <select
                value={maxHops}
                onChange={(e) => setMaxHops(parseInt(e.target.value, 10))}
                className="w-full bg-[#1e293b]/70 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={2}>2 Hops</option>
                <option value={3}>3 Hops</option>
                <option value={4}>4 Hops</option>
                <option value={5}>5 Hops</option>
              </select>
            </div>

            <button
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 h-[36px]"
            >
              {isSearching ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Trace Path</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discovered Paths Display */}
      {pathResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Found <strong className="text-white">{pathResult.paths_found}</strong> valid path(s) between{' '}
              <code className="text-cyan-300">{pathResult.source_wallet_id}</code> and{' '}
              <code className="text-cyan-300">{pathResult.target_wallet_id}</code>
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Query Latency: {pathResult.query_latency_ms} ms ({pathResult.engine_mode.toUpperCase()})
            </span>
          </div>

          {pathResult.paths.length === 0 ? (
            <div className="bg-[#0f172a] border border-card-border rounded-xl p-8 text-center text-slate-400">
              <Route className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No Directed Path Identified</p>
              <p className="text-xs text-slate-500 mt-1">
                No transfer sequence links these two entities within {maxHops} hops.
              </p>
            </div>
          ) : (
            pathResult.paths.map((p, pIdx) => (
              <div
                key={pIdx}
                className="bg-[#0f172a] border border-card-border rounded-xl p-5 space-y-4 shadow-lg"
              >
                {/* Path Header Stats */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      PATH #{pIdx + 1}
                    </span>
                    <span className="text-xs font-mono font-semibold text-white">
                      {p.total_hops} Hop(s) • Total Volume: {p.total_volume} ETH
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Duration: <strong className="text-slate-200">{p.duration_seconds}s</strong>
                    </span>
                  </div>
                </div>

                {/* Path String Overview */}
                <p className="text-xs font-mono text-cyan-300/90 break-all bg-[#0b1120] p-2.5 rounded-lg border border-slate-800">
                  {p.path_string}
                </p>

                {/* Step-by-Step Waterfall Breadcrumbs */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Step-by-Step Transaction Sequence:
                  </span>

                  <div className="space-y-2">
                    {p.hops.map((hop) => (
                      <div
                        key={hop.hop_index}
                        className="bg-[#111827] border border-slate-800 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] flex items-center justify-center font-mono">
                            {hop.hop_index}
                          </span>

                          <div>
                            <div className="flex items-center gap-2 font-mono">
                              <button
                                onClick={() => onSelectWallet && onSelectWallet(hop.from_id)}
                                className="text-slate-200 hover:text-cyan-400 transition-colors font-medium"
                              >
                                {hop.from_id}
                              </button>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                              <button
                                onClick={() => onSelectWallet && onSelectWallet(hop.to_id)}
                                className="text-slate-200 hover:text-cyan-400 transition-colors font-medium"
                              >
                                {hop.to_id}
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              TxID: {hop.tx_id} • Timestamp: {hop.event_timestamp}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            {hop.amount} {hop.asset}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

