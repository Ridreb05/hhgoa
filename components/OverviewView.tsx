'use client';

import React from 'react';
import { DashboardMetrics } from '@/lib/graph/types';
import demoData from '@/data/demo/entities.json';
import {
  Wallet,
  ArrowRightLeft,
  Bot,
  Landmark,
  ShieldAlert,
  Coins,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Play,
} from 'lucide-react';

interface OverviewViewProps {
  metrics: DashboardMetrics | null;
  onSelectScenario: (scenarioId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export function OverviewView({ metrics, onSelectScenario, onNavigateTab }: OverviewViewProps) {
  return (
    <div className="space-y-6">
      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Wallets</span>
            <Wallet className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              {metrics ? metrics.total_wallets : '--'}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Indexed Accounts</p>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Transfers</span>
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              {metrics ? metrics.total_transfers : '--'}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">P2P Transfers</p>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Volume</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              {metrics ? `${metrics.total_transfer_volume} ETH` : '--'}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Traversed Volume</p>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Funding</span>
            <Landmark className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              {metrics ? metrics.total_funding_sources : '--'}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Mixers & Exchanges</p>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Agents</span>
            <Bot className="w-4 h-4 text-pink-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              {metrics ? metrics.total_agents : '--'}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Autonomous Solvers</p>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Risk Seeds</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-red-400">
              {metrics ? metrics.risk_seed_wallets : '--'}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">Sanction / Exploit Seeds</p>
          </div>
        </div>
      </div>

      {/* Engine & Latency Banner */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">
                Active Graph Engine: {metrics?.engine_mode === 'tigergraph' ? 'TigerGraph Cloud (Live)' : 'Synthetic Deterministic Graph (Demo)'}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                  metrics?.engine_mode === 'tigergraph'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {metrics?.engine_mode === 'tigergraph' ? 'GSQL REST++ LIVE' : 'DEMO MODE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-hop graph traversal and bounded cyclic temporal analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Query Latency</p>
              <p className="font-mono font-semibold text-cyan-400">
                {metrics ? `${metrics.query_latency_ms} ms` : '--'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('status')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <span>Engine Settings</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 5 Scenario Presets Showcase */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Test Scenarios & Ground Truth Benchmarks
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any scenario to immediately load the multi-hop investigation or candidate simulation
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('simulator')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Open Transaction Simulator</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {demoData.scenarios.map((sc) => {
            const isReject = sc.expected_classification === 'REJECT';
            const isReview = sc.expected_classification === 'REVIEW';

            return (
              <div
                key={sc.id}
                className="bg-[#0f172a] border border-card-border hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                        isReject
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : isReview
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {sc.expected_classification}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Target: {sc.target_wallet}
                    </span>
                  </div>

                  <h4 className="font-semibold text-white text-xs mt-2.5 group-hover:text-cyan-300 transition-colors">
                    {sc.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                    {sc.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Expected: {sc.expected_classification === 'REJECT' ? 'Score ≥ 75' : 'Score ≤ 34'}
                  </span>
                  <button
                    onClick={() => onSelectScenario(sc.id)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
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
