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
    <div className="space-y-6 font-sans">
      {/* Search & Presets Card */}
      <div className="financial-panel p-5 space-y-4">
        <div>
          <h2 className="text-xs font-mono font-bold text-[#f4f5f7] uppercase tracking-wider flex items-center gap-2">
            <Route className="w-4 h-4 text-[#ff951f]" />
            <span>FORENSIC MULTI-HOP PATH TRACER</span>
          </h2>
          <p className="text-xs text-[#c9ced8] mt-1 font-sans">
            Bounded graph traversal reconstructing directed transaction hops, time deltas, and volume leakage between any two entities.
          </p>
        </div>

        {/* 1-Click Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-[#c9ced8] font-bold uppercase tracking-wider mr-1">PRESETS:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSourceWallet(p.source);
                setTargetWallet(p.target);
                handleSearch(p.source, p.target);
              }}
              className={`px-3 py-1 rounded-[40px] text-xs font-mono transition-all duration-[160ms] ease-out border ${
                sourceWallet === p.source && targetWallet === p.target
                  ? 'bg-[#ff951f] text-[#07090e] border-[#ff951f] font-bold'
                  : 'bg-[#10141c] text-[#c9ced8] hover:text-[#f4f5f7] border-[#303139]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider mb-1.5">
              Source Wallet Address
            </label>
            <input
              type="text"
              value={sourceWallet}
              onChange={(e) => setSourceWallet(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#07090e] border border-[#303139] rounded-[5px] px-3 py-2 text-xs text-[#f4f5f7] font-mono placeholder-[#c9ced8]/50 focus:outline-none focus:border-[#ff951f]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider mb-1.5">
              Target Entity Address
            </label>
            <input
              type="text"
              value={targetWallet}
              onChange={(e) => setTargetWallet(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#07090e] border border-[#303139] rounded-[5px] px-3 py-2 text-xs text-[#f4f5f7] font-mono placeholder-[#c9ced8]/50 focus:outline-none focus:border-[#ff951f]"
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider mb-1.5">
                Max Hops (2–5)
              </label>
              <select
                value={maxHops}
                onChange={(e) => setMaxHops(parseInt(e.target.value, 10))}
                className="w-full bg-[#07090e] border border-[#303139] rounded-[5px] px-3 py-2 text-xs text-[#f4f5f7] font-mono focus:outline-none focus:border-[#ff951f]"
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
              className="btn-financial-primary h-[36px]"
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
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#c9ced8] px-1 font-mono">
            <span>
              Paths: <strong className="text-[#edcd8c]">{pathResult.paths_found}</strong> valid path(s) between{' '}
              <code className="text-[#f4f5f7] bg-[#10141c] px-1 py-0.5 rounded-[4px] border border-[#303139]">{pathResult.source_wallet_id}</code> and{' '}
              <code className="text-[#f4f5f7] bg-[#10141c] px-1 py-0.5 rounded-[4px] border border-[#303139]">{pathResult.target_wallet_id}</code>
            </span>
            <span className="font-mono text-[11px] text-[#edcd8c]">
              Query Latency: {pathResult.query_latency_ms} ms ({pathResult.engine_mode.toUpperCase()})
            </span>
          </div>

          {pathResult.paths.length === 0 ? (
            <div className="financial-panel p-8 text-center text-[#c9ced8]">
              <Route className="w-6 h-6 text-[#303139] mx-auto mb-2" />
              <p className="text-xs font-mono font-bold text-[#f4f5f7]">NO DIRECTED PATH IDENTIFIED</p>
              <p className="text-xs text-[#c9ced8] mt-1 font-sans">
                No transfer sequence links these two entities within {maxHops} hops.
              </p>
            </div>
          ) : (
            pathResult.paths.map((p, pIdx) => (
              <div
                key={pIdx}
                className="financial-panel p-5 space-y-4"
              >
                {/* Path Header Stats */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#303139] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-[40px] text-[10px] font-mono font-bold bg-[#101522] text-[#edcd8c] border border-[#303139]">
                      PATH #{pIdx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#f4f5f7]">
                      {p.total_hops} Hop(s) • Total Volume: <strong className="text-[#edcd8c]">{p.total_volume} ETH</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-[#c9ced8] flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-[#ff951f]" />
                      Duration: <strong className="text-[#edcd8c]">{p.duration_seconds}s</strong>
                    </span>
                  </div>
                </div>

                {/* Path String Overview */}
                <p className="text-xs font-mono text-[#edcd8c] break-all bg-[#07090e] p-2.5 rounded-[4px] border border-[#303139]">
                  {p.path_string}
                </p>

                {/* Step-by-Step Waterfall Breadcrumbs */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider">
                    TRANSACTION SEQUENCE:
                  </span>

                  <div className="space-y-1.5">
                    {p.hops.map((hop) => (
                      <div
                        key={hop.hop_index}
                        className="bg-[#07090e] border border-[#303139] rounded-[4px] p-2.5 text-xs flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-[40px] bg-[#101522] text-[#edcd8c] font-bold text-[10px] flex items-center justify-center font-mono border border-[#303139]">
                            {hop.hop_index}
                          </span>

                          <div>
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <button
                                onClick={() => onSelectWallet && onSelectWallet(hop.from_id)}
                                className="text-[#f4f5f7] hover:text-[#ff951f] transition-all duration-[160ms] ease-out font-medium"
                              >
                                {hop.from_id}
                              </button>
                              <ArrowRight className="w-3 h-3 text-[#c9ced8]" />
                              <button
                                onClick={() => onSelectWallet && onSelectWallet(hop.to_id)}
                                className="text-[#f4f5f7] hover:text-[#ff951f] transition-all duration-[160ms] ease-out font-medium"
                              >
                                {hop.to_id}
                              </button>
                            </div>
                            <p className="text-[11px] text-[#c9ced8]/70 font-mono mt-0.5">
                              TxID: {hop.tx_id} • Timestamp: {hop.event_timestamp}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-[#edcd8c] text-xs">
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

