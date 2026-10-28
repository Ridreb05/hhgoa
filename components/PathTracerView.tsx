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
    <div className="space-y-4 font-mono">
      {/* Search & Presets Card */}
      <div className="bg-[#0d121c] border border-[#1b2333] p-4 space-y-3">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Route className="w-3.5 h-3.5 text-cyan-400" />
            <span>FORENSIC MULTI-HOP PATH TRACER</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
            Bounded graph traversal reconstructing directed transaction hops, time deltas, and volume leakage between any two entities.
          </p>
        </div>

        {/* 1-Click Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">PRESETS:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSourceWallet(p.source);
                setTargetWallet(p.target);
                handleSearch(p.source, p.target);
              }}
              className={`px-2 py-1 text-xs font-mono transition-colors border ${
                sourceWallet === p.source && targetWallet === p.target
                  ? 'bg-cyan-950/30 text-cyan-300 border-cyan-500/50 font-bold'
                  : 'bg-[#080b11] text-slate-400 hover:text-white border-[#1b2333]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Source Wallet Address
            </label>
            <input
              type="text"
              value={sourceWallet}
              onChange={(e) => setSourceWallet(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#080b11] border border-[#1b2333] px-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Target Entity Address
            </label>
            <input
              type="text"
              value={targetWallet}
              onChange={(e) => setTargetWallet(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#080b11] border border-[#1b2333] px-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Max Hops (2–5)
              </label>
              <select
                value={maxHops}
                onChange={(e) => setMaxHops(parseInt(e.target.value, 10))}
                className="w-full bg-[#080b11] border border-[#1b2333] px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
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
              className="px-4 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 h-[32px] border border-cyan-500/50"
            >
              {isSearching ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>TRACE PATH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discovered Paths Display */}
      {pathResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <span>
              Paths: <strong className="text-white">{pathResult.paths_found}</strong> valid path(s) between{' '}
              <code className="text-cyan-300">{pathResult.source_wallet_id}</code> and{' '}
              <code className="text-cyan-300">{pathResult.target_wallet_id}</code>
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              Query Latency: {pathResult.query_latency_ms} ms ({pathResult.engine_mode.toUpperCase()})
            </span>
          </div>

          {pathResult.paths.length === 0 ? (
            <div className="bg-[#0d121c] border border-[#1b2333] p-6 text-center text-slate-400">
              <Route className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300">NO DIRECTED PATH IDENTIFIED</p>
              <p className="text-[11px] text-slate-500 mt-1 font-sans">
                No transfer sequence links these two entities within {maxHops} hops.
              </p>
            </div>
          ) : (
            pathResult.paths.map((p, pIdx) => (
              <div
                key={pIdx}
                className="bg-[#0d121c] border border-[#1b2333] p-4 space-y-3"
              >
                {/* Path Header Stats */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2333] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#1b2333] text-cyan-300 border border-cyan-500/30">
                      PATH #{pIdx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {p.total_hops} Hop(s) • Total Volume: {p.total_volume} ETH
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Duration: <strong className="text-slate-200">{p.duration_seconds}s</strong>
                    </span>
                  </div>
                </div>

                {/* Path String Overview */}
                <p className="text-xs font-mono text-cyan-300/90 break-all bg-[#080b11] p-2 border border-[#1b2333]">
                  {p.path_string}
                </p>

                {/* Step-by-Step Waterfall Breadcrumbs */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    TRANSACTION SEQUENCE:
                  </span>

                  <div className="space-y-1">
                    {p.hops.map((hop) => (
                      <div
                        key={hop.hop_index}
                        className="bg-[#080b11] border border-[#1b2333] p-2 text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-4 h-4 bg-[#1b2333] text-cyan-300 font-bold text-[9px] flex items-center justify-center font-mono border border-cyan-500/30">
                            {hop.hop_index}
                          </span>

                          <div>
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <button
                                onClick={() => onSelectWallet && onSelectWallet(hop.from_id)}
                                className="text-slate-200 hover:text-cyan-400 transition-colors font-medium"
                              >
                                {hop.from_id}
                              </button>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <button
                                onClick={() => onSelectWallet && onSelectWallet(hop.to_id)}
                                className="text-slate-200 hover:text-cyan-400 transition-colors font-medium"
                              >
                                {hop.to_id}
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono">
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

