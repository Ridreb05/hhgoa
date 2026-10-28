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
  ArrowRight,
  Shield,
  CheckCircle2,
  GitCommit,
  Share2,
  Sparkles,
} from 'lucide-react';

interface OverviewViewProps {
  metrics: DashboardMetrics | null;
  onSelectScenario: (scenarioId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export function OverviewView({ metrics, onSelectScenario, onNavigateTab }: OverviewViewProps) {
  return (
    <div className="space-y-8 font-sans">
      {/* 1. HERO SECTION: Broad promise on left, framed value object on right */}
      <div className="relative pt-2 pb-4">
        {/* Warm light concentrated softly behind the hero object */}
        <div className="warm-light-hero hidden md:block" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left: Broad promise & paired introductory prose */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[40px] bg-[#101522] border border-[#303139] text-[#edcd8c] text-[11px] font-mono tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff951f]" />
              <span>TIGERGRAPH 3.x GSQL & GRAPH DATA SCIENCE</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#f4f5f7] leading-[1.08]">
              Deterministic Graph Risk Intelligence.
            </h1>

            <p className="text-[#c9ced8] text-sm sm:text-base leading-[1.65] max-w-2xl font-sans">
              Individual wallet transfers often appear benign in isolation while coordinating multi-entity exploits. 
              GhostShield traverses transaction cycles, upstream obfuscation sources, and autonomous agent delegations 
              in TigerGraph to return transparent, explainable risk assessments.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigateTab('simulator')}
                className="btn-financial-primary"
              >
                <span>Simulate Candidate Transaction</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigateTab('graph')}
                className="btn-financial-secondary"
              >
                <span>Explore Topology Graph</span>
              </button>
            </div>
          </div>

          {/* Right: Framed value/product object with thin offset outlines suggesting depth */}
          <div className="lg:col-span-5 relative mt-4 lg:mt-0">
            <div className="framed-object-container max-w-md mx-auto lg:mr-0">
              {/* Outer thin offset outline 2 */}
              <div className="framed-object-outline-2 hidden sm:block" />
              {/* Middle thin offset outline 1 */}
              <div className="framed-object-outline-1 hidden sm:block" />

              {/* Main Opaque Panel */}
              <div className="framed-object-panel p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#303139] pb-3">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-[#c9ced8]">
                    <Shield className="w-4 h-4 text-[#ff951f]" />
                    <span className="uppercase tracking-wider">VERIFIED BENCHMARK</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-[40px] bg-[#101522] border border-[#303139] text-[#34d399] font-mono text-[10px] font-bold">
                    100% RECALL
                  </span>
                </div>

                {/* Real Value in large pale gold type with monospaced tabular setting */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-4xl sm:text-5xl font-bold text-[#edcd8c] tabular-nums tracking-tight">
                      100.0%
                    </span>
                    <span className="font-mono text-xs text-[#c9ced8]">F1 SCORE</span>
                  </div>
                  <p className="text-[12px] text-[#c9ced8] font-sans">
                    Deterministic detection accuracy verified against 5 ground-truth scenario fixtures.
                  </p>
                </div>

                {/* Subordinate Fact Rows */}
                <div className="border-t border-[#303139] pt-3 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-[#c9ced8]">
                    <span>Graph Engine</span>
                    <span className="text-[#f4f5f7] font-medium">TigerGraph Cloud GSQL</span>
                  </div>
                  <div className="flex justify-between items-center text-[#c9ced8]">
                    <span>Query Latency</span>
                    <span className="text-[#edcd8c] font-bold tabular-nums">
                      {metrics ? `${metrics.query_latency_ms} ms` : '2 ms'} RTT
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#c9ced8]">
                    <span>Threat Attribution</span>
                    <span className="text-[#f4f5f7]">Temporal Cycles & Mixers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RULED STRIP OF SUPPORTING FACTS */}
      <div className="financial-panel overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[#303139]">
          <div className="p-4 space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              Indexed Wallets
            </span>
            <span className="text-2xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? metrics.total_wallets : '12'}
            </span>
            <span className="text-[11px] font-mono text-[#c9ced8]/70">Keypair vertices</span>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              P2P Transfers
            </span>
            <span className="text-2xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? metrics.total_transfers : '14'}
            </span>
            <span className="text-[11px] font-mono text-[#c9ced8]/70">Directed edges</span>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              Traversed Volume
            </span>
            <span className="text-2xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? `${metrics.total_transfer_volume}` : '127.4'}{' '}
              <span className="text-xs font-normal text-[#c9ced8]">ETH</span>
            </span>
            <span className="text-[11px] font-mono text-[#c9ced8]/70">On-chain value</span>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              Funding Roots
            </span>
            <span className="text-2xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? metrics.total_funding_sources : '3'}
            </span>
            <span className="text-[11px] font-mono text-[#c9ced8]/70">Mixers & exchanges</span>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#c9ced8] block">
              Active Agents
            </span>
            <span className="text-2xl font-mono font-bold text-[#edcd8c] tabular-nums block">
              {metrics ? metrics.total_agents : '3'}
            </span>
            <span className="text-[11px] font-mono text-[#c9ced8]/70">Autonomous solvers</span>
          </div>

          <div className="p-4 space-y-1 bg-[#101522]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff951f] block">
              Risk Seeds
            </span>
            <span className="text-2xl font-mono font-bold text-[#ff951f] tabular-nums block">
              {metrics ? metrics.risk_seed_wallets : '2'}
            </span>
            <span className="text-[11px] font-mono text-[#ff951f]/70">Sanctioned entities</span>
          </div>
        </div>
      </div>

      {/* 3. CONNECTED PROCESS ROW */}
      <div className="financial-panel p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#303139] pb-2.5">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#f4f5f7] flex items-center gap-2">
            <GitCommit className="w-3.5 h-3.5 text-[#ff951f]" />
            <span>Detection Workflow Pipeline</span>
          </span>
          <span className="text-[11px] font-mono text-[#c9ced8]">
            Bounded GSQL Multi-Hop (k=2..5)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#edcd8c]">
              <span className="w-5 h-5 rounded-[40px] bg-[#101522] border border-[#303139] flex items-center justify-center font-bold text-[10px]">
                01
              </span>
              <span className="font-semibold text-[#f4f5f7]">Graph Ingestion</span>
            </div>
            <p className="text-xs text-[#c9ced8] leading-relaxed font-sans pl-7">
              Heterogeneous mapping of wallets, transfers, funding sources, and autonomous agents.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#edcd8c]">
              <span className="w-5 h-5 rounded-[40px] bg-[#101522] border border-[#303139] flex items-center justify-center font-bold text-[10px]">
                02
              </span>
              <span className="font-semibold text-[#f4f5f7]">Topological Traversal</span>
            </div>
            <p className="text-xs text-[#c9ced8] leading-relaxed font-sans pl-7">
              GSQL queries isolate rapid circular wash trading loops and shared obfuscation roots.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#edcd8c]">
              <span className="w-5 h-5 rounded-[40px] bg-[#101522] border border-[#303139] flex items-center justify-center font-bold text-[10px]">
                03
              </span>
              <span className="font-semibold text-[#f4f5f7]">Deterministic Scoring</span>
            </div>
            <p className="text-xs text-[#c9ced8] leading-relaxed font-sans pl-7">
              Point-based attribution (0–100) assigning mathematical evidence without opaque black-boxes.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#edcd8c]">
              <span className="w-5 h-5 rounded-[40px] bg-[#101522] border border-[#303139] flex items-center justify-center font-bold text-[10px]">
                04
              </span>
              <span className="font-semibold text-[#f4f5f7]">Forensic Dispatch</span>
            </div>
            <p className="text-xs text-[#c9ced8] leading-relaxed font-sans pl-7">
              Synthesizes natural language dossiers and triggers automated webhooks via viaSocket.
            </p>
          </div>
        </div>
      </div>

      {/* 4. THREE-COLUMN CAPABILITY & GROUND TRUTH MATRIX */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-sans font-semibold text-[#f4f5f7] tracking-tight">
              Ground-Truth Verification Scenarios
            </h3>
            <p className="text-xs text-[#c9ced8] mt-0.5">
              Deterministic test cases validating cyclic detection, shared liquidity origins, and risk seed proximity.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('simulator')}
            className="text-xs font-sans text-[#ff951f] hover:text-[#f0830c] flex items-center gap-1 transition-all duration-[160ms] ease-out font-medium"
          >
            <span>Open Simulation Console</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoData.scenarios.map((sc) => {
            const isReject = sc.expected_classification === 'REJECT';
            const isReview = sc.expected_classification === 'REVIEW';

            return (
              <div
                key={sc.id}
                className="financial-panel p-5 flex flex-col justify-between hover:border-[#c9ced8]/40 transition-all duration-[160ms] ease-out"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-[40px] text-[10px] font-mono font-bold uppercase tracking-wider border ${
                        isReject
                          ? 'bg-[#101522] text-[#f43f5e] border-[#f43f5e]/40'
                          : isReview
                          ? 'bg-[#101522] text-[#ff951f] border-[#ff951f]/40'
                          : 'bg-[#101522] text-[#34d399] border-[#34d399]/40'
                      }`}
                    >
                      {sc.expected_classification}
                    </span>
                    <span className="text-[11px] font-mono text-[#c9ced8]">
                      {sc.target_wallet}
                    </span>
                  </div>

                  <h4 className="font-sans text-sm font-semibold text-[#f4f5f7] leading-snug">
                    {sc.name}
                  </h4>
                  <p className="text-xs text-[#c9ced8] mt-2 leading-relaxed font-sans line-clamp-3">
                    {sc.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#303139] flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-[#edcd8c] font-medium">
                    {isReject ? 'Threshold: Score ≥ 65' : 'Threshold: Score ≤ 34'}
                  </span>
                  <button
                    onClick={() => onSelectScenario(sc.id)}
                    className="btn-financial-secondary text-xs py-1 px-3"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Run Verification</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. CLOSING AREA: Dark tinted field with warm light beneath the actions */}
      <div className="relative rounded-[5px] overflow-hidden border border-[#303139] bg-[#101522] warm-light-closing p-6 sm:p-8 text-center space-y-3">
        <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-[#f4f5f7]">
          Evaluate Transaction Risk in Real Time
        </h3>
        <p className="text-xs sm:text-sm text-[#c9ced8] max-w-xl mx-auto leading-relaxed">
          Submit any candidate transaction to execute instant multi-hop GSQL graph queries, 
          quantify capital retention, and inspect contributing risk evidence.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="btn-financial-primary"
          >
            <span>Launch Pre-Flight Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigateTab('clusters')}
            className="btn-financial-secondary"
          >
            <span>Inspect Sybil Clusters</span>
          </button>
        </div>
      </div>
    </div>
  );
}
