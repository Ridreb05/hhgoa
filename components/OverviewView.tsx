'use client';

import React from 'react';
import { DashboardMetrics } from '@/lib/graph/types';
import demoData from '@/data/demo/entities.json';
import {
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  Play,
  Activity,
  Layers,
} from 'lucide-react';

interface OverviewViewProps {
  metrics: DashboardMetrics | null;
  onSelectScenario: (scenarioId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export function OverviewView({ metrics, onSelectScenario, onNavigateTab }: OverviewViewProps) {
  return (
    <div className="space-y-5">
      {/* 1. Unified Telemetry Metric Rail (Replaces 6 identical floating cards) */}
      <div className="bg-[#0d121c] border border-[#1b2333] rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[#1b2333]">
          <div className="p-3.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Indexed Wallets
            </span>
            <span className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-1 block">
              {metrics ? metrics.total_wallets : '--'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Keypair vertices</span>
          </div>

          <div className="p-3.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              P2P Transfers
            </span>
            <span className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-1 block">
              {metrics ? metrics.total_transfers : '--'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Directed edges</span>
          </div>

          <div className="p-3.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Traversed Volume
            </span>
            <span className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-1 block">
              {metrics ? `${metrics.total_transfer_volume}` : '--'} <span className="text-xs font-normal text-slate-400">ETH</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">On-chain value</span>
          </div>

          <div className="p-3.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Funding Roots
            </span>
            <span className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-1 block">
              {metrics ? metrics.total_funding_sources : '--'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Mixers & exchanges</span>
          </div>

          <div className="p-3.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Active Agents
            </span>
            <span className="text-xl font-mono font-bold text-slate-100 tabular-nums mt-1 block">
              {metrics ? metrics.total_agents : '--'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Autonomous solvers</span>
          </div>

          <div className="p-3.5 bg-rose-950/10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block">
              Risk Seeds
            </span>
            <span className="text-xl font-mono font-bold text-rose-400 tabular-nums mt-1 block">
              {metrics ? metrics.risk_seed_wallets : '--'}
            </span>
            <span className="text-[10px] font-mono text-rose-400/70">Sanctioned entities</span>
          </div>
        </div>
      </div>

      {/* 2. Compact Infrastructure Status Bar */}
      <div className="bg-[#0d121c] border border-[#1b2333] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-slate-200 font-medium">
              ENGINE: {metrics?.engine_mode === 'tigergraph' ? 'TIGERGRAPH CLOUD (REST++)' : 'SYNTHETIC GRAPH SIMULATOR (DEMO)'}
            </span>
          </div>
          <span className="text-slate-600 font-mono hidden sm:inline">|</span>
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            Graph: <span className="text-slate-200">GhostShieldGraph</span>
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="text-slate-400">
            RTT: <strong className="text-sky-400 font-semibold">{metrics ? `${metrics.query_latency_ms}ms` : '--'}</strong>
          </span>
          <button
            onClick={() => onNavigateTab('status')}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <span>Telemetry</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Benchmark Ground Truth Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Verification Test Scenarios
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Deterministic test cases validating cyclic detection, shared origins, and risk seed proximity.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('simulator')}
            className="text-[11px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
          >
            <span>Open Simulator</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {demoData.scenarios.map((sc) => {
            const isReject = sc.expected_classification === 'REJECT';
            const isReview = sc.expected_classification === 'REVIEW';

            return (
              <div
                key={sc.id}
                className="bg-[#0d121c] border border-[#1b2333] hover:border-slate-700 rounded-lg p-4 flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        isReject
                          ? 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                          : isReview
                          ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                          : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                      }`}
                    >
                      {sc.expected_classification}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {sc.target_wallet}
                    </span>
                  </div>

                  <h4 className="font-mono text-xs font-semibold text-slate-200 leading-snug">
                    {sc.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans line-clamp-3">
                    {sc.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1b2333] flex items-center justify-between text-xs font-mono">
                  <span className="text-[10px] text-slate-500">
                    {isReject ? 'Score ≥ 75' : 'Score ≤ 34'}
                  </span>
                  <button
                    onClick={() => onSelectScenario(sc.id)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-[11px] font-medium transition-colors"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Run Test</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
