'use client';

import React, { useState } from 'react';
import { DashboardMetrics } from '@/lib/graph/types';
import demoData from '@/data/demo/entities.json';
import { PropagationPanel } from '@/components/PropagationPanel';
import {
  Cpu,
  Clock,
  Play,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Search,
  Filter,
  Eye,
  GitBranch,
} from 'lucide-react';

interface OverviewViewProps {
  metrics: DashboardMetrics | null;
  onSelectScenario: (scenarioId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export function OverviewView({ metrics, onSelectScenario, onNavigateTab }: OverviewViewProps) {
  const [quickWallet, setQuickWallet] = useState<string>('0x71c6bf5e2a3b1a8d00921471b045112sus1');

  const handleQuickInvestigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickWallet.trim()) {
      onNavigateTab('investigate');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. OPERATIONAL COMMAND HEADER & TARGET LOOKUP */}
      <div className="financial-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff951f]" />
            <h1 className="text-sm font-semibold tracking-tight text-[#f4f5f7] uppercase font-mono">
              GhostShield Graph Forensics Console
            </h1>
            <span className="text-[11px] font-mono text-[#edcd8c] bg-[#07090e] px-2 py-0.5 border border-[#303139] rounded">
              TigerGraph GSQL
            </span>
          </div>
          <p className="text-xs text-[#c9ced8] font-sans">
            Deterministic graph traversal isolating circular transfers, shared obfuscation funding, and autonomous agent hierarchies.
          </p>
        </div>

        {/* Direct Target Investigation Input */}
        <form onSubmit={handleQuickInvestigate} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-3.5 h-3.5 text-[#c9ced8]/60 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={quickWallet}
              onChange={(e) => setQuickWallet(e.target.value)}
              placeholder="Target wallet address..."
              className="w-full bg-[#07090e] border border-[#303139] rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-[#f4f5f7] font-mono placeholder-[#c9ced8]/40 focus:outline-none focus:border-[#ff951f]"
            />
          </div>
          <button
            type="submit"
            className="btn-financial-primary shrink-0"
          >
            <span>Triage</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* 2. LIVE GRAPH TELEMETRY INSTRUMENT STRIP */}
      <div className="financial-panel overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[#303139]">
          <div className="p-3.5 space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              Indexed Wallets
            </span>
            <span className="text-xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? metrics.total_wallets : '12'}
            </span>
            <span className="text-[10px] font-mono text-[#c9ced8]/70">Keypair vertices</span>
          </div>

          <div className="p-3.5 space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              P2P Transfers
            </span>
            <span className="text-xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? metrics.total_transfers : '14'}
            </span>
            <span className="text-[10px] font-mono text-[#c9ced8]/70">Directed edges</span>
          </div>

          <div className="p-3.5 space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              Traversed Volume
            </span>
            <span className="text-xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? `${metrics.total_transfer_volume}` : '127.4'}{' '}
              <span className="text-xs font-normal text-[#c9ced8]">ETH</span>
            </span>
            <span className="text-[10px] font-mono text-[#c9ced8]/70">On-chain value</span>
          </div>

          <div className="p-3.5 space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              Funding Origins
            </span>
            <span className="text-xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? metrics.total_funding_sources : '3'}
            </span>
            <span className="text-[10px] font-mono text-[#c9ced8]/70">Mixers & CEX roots</span>
          </div>

          <div className="p-3.5 space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              Active Agents
            </span>
            <span className="text-xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? metrics.total_agents : '3'}
            </span>
            <span className="text-[10px] font-mono text-[#c9ced8]/70">Autonomous solvers</span>
          </div>

          <div className="p-3.5 space-y-0.5 bg-[#07090e]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff951f] block">
              Flagged Risk Seeds
            </span>
            <span className="text-xl font-mono font-bold text-[#ff951f] tabular-nums block">
              {metrics ? metrics.risk_seed_wallets : '2'}
            </span>
            <span className="text-[10px] font-mono text-[#ff951f]/80">Sanctioned entities</span>
          </div>
        </div>
      </div>

      <PropagationPanel />

      {/* 3. CORE OPERATIONAL GRID (BENCHMARK SUITE + ACTIVE THREAT REGISTER) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Ground-Truth Scenario Benchmark Suite (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#f4f5f7]">
                Ground-Truth Scenario Suite
              </h2>
              <span className="px-2 py-0.5 rounded-[40px] bg-[#07090e] border border-[#303139] text-[#edcd8c] font-mono text-[10px] font-bold">
                5 CURATED SCENARIOS
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('simulator')}
              className="text-xs font-mono text-[#ff951f] hover:underline flex items-center gap-1"
            >
              <span>Simulator</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {demoData.scenarios.map((sc) => {
              const isReject = sc.expected_classification === 'REJECT';
              const isReview = sc.expected_classification === 'REVIEW';

              return (
                <div
                  key={sc.id}
                  className="financial-panel p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#c9ced8]/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          isReject
                            ? 'bg-rose-950/30 text-rose-300 border-rose-500/40'
                            : isReview
                            ? 'bg-amber-950/30 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-950/30 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {sc.expected_classification}
                      </span>
                      <span className="text-xs font-mono font-medium text-[#f4f5f7] truncate">
                        {sc.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#c9ced8] font-sans line-clamp-1">
                      {sc.description}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-[#c9ced8]/70">
                      <span>Target: {sc.target_wallet}</span>
                      <span>•</span>
                      <span className="text-[#edcd8c]">
                        {isReject ? 'Score ≥ 65' : isReview ? 'Score 35–64' : 'Score ≤ 34'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectScenario(sc.id)}
                      className="btn-financial-secondary py-1 px-3 text-xs"
                    >
                      <Play className="w-2.5 h-2.5 fill-current text-[#edcd8c]" />
                      <span>Run Test</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Graph Threat Register & Topological Parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#f4f5f7] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#ff951f]" />
              <span>Suspect Threat Register</span>
            </h2>
            <button
              onClick={() => onNavigateTab('graph')}
              className="text-xs font-mono text-[#ff951f] hover:underline flex items-center gap-1"
            >
              <span>Explore Graph</span>
              <Layers className="w-3 h-3" />
            </button>
          </div>

          <div className="financial-panel p-4 space-y-3 font-mono">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-[#07090e] border border-[#303139] rounded text-xs">
                <div>
                  <span className="text-[#f4f5f7] font-semibold block text-[11px]">0x71c...sus1</span>
                  <span className="text-[10px] text-rose-400">Rapid Circular Wash Cycle (k=3)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-rose-400 tabular-nums">85 / 100</span>
                  <span className="text-[9px] uppercase tracking-wider block text-rose-400/80">REJECT</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#07090e] border border-[#303139] rounded text-xs">
                <div>
                  <span className="text-[#f4f5f7] font-semibold block text-[11px]">0x82d...sus2</span>
                  <span className="text-[10px] text-rose-400">Mixer Liquidity & Loop Counterparty</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-rose-400 tabular-nums">85 / 100</span>
                  <span className="text-[9px] uppercase tracking-wider block text-rose-400/80">REJECT</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#07090e] border border-[#303139] rounded text-xs">
                <div>
                  <span className="text-[#f4f5f7] font-semibold block text-[11px]">0xd4f...seed1</span>
                  <span className="text-[10px] text-amber-400">Direct Sanctions Seed Proximity</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-amber-400 tabular-nums">60 / 100</span>
                  <span className="text-[9px] uppercase tracking-wider block text-amber-400/80">REVIEW</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#07090e] border border-[#303139] rounded text-xs">
                <div>
                  <span className="text-[#f4f5f7] font-semibold block text-[11px]">0x10a...alice</span>
                  <span className="text-[10px] text-emerald-400">Ordinary Benign P2P Liquidity</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">17 / 100</span>
                  <span className="text-[9px] uppercase tracking-wider block text-emerald-400/80">ALLOW</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#303139] pt-3 space-y-1.5 text-[11px] text-[#c9ced8]">
              <div className="flex justify-between">
                <span>Traversal Depth Corridor:</span>
                <span className="text-[#edcd8c]">k = 2 to 5 hops</span>
              </div>
              <div className="flex justify-between">
                <span>Cycle Time Window:</span>
                <span className="text-[#edcd8c]">Δt ≤ 600 seconds</span>
              </div>
              <div className="flex justify-between">
                <span>Conservation Floor:</span>
                <span className="text-[#edcd8c]">Volume &ge; 85%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
