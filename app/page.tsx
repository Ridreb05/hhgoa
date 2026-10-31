'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { OverviewView } from '@/components/OverviewView';
import { GraphExplorer } from '@/components/GraphExplorer';
import { InvestigationView } from '@/components/InvestigationView';
import { SimulatorView } from '@/components/SimulatorView';
import { PathTracerView } from '@/components/PathTracerView';
import { SybilClustersView } from '@/components/SybilClustersView';
import { PolicyConfigView } from '@/components/PolicyConfigView';
import { HistoryView } from '@/components/HistoryView';
import { StatusView } from '@/components/StatusView';
import { DashboardMetrics, EngineMode } from '@/lib/graph/types';
import demoData from '@/data/demo/entities.json';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [investigationWallet, setInvestigationWallet] = useState<string>('0x71c...sus1');
  const [simulatorScenario, setSimulatorScenario] = useState<string>('scenario-a');

  // Load metrics on start
  useEffect(() => {
    fetch('/api/metrics')
      .then((res) => res.json())
      .then((data: DashboardMetrics) => setMetrics(data))
      .catch((err) => console.error('Failed to load metrics:', err));
  }, []);

  const handleSelectScenario = (scenarioId: string) => {
    const sc = demoData.scenarios.find((s) => s.id === scenarioId);
    if (sc) {
      setInvestigationWallet(sc.target_wallet);
      setSimulatorScenario(sc.id);
      setActiveTab('investigate');
    }
  };

  const handleSelectNode = (nodeId: string) => {
    setInvestigationWallet(nodeId);
    setActiveTab('investigate');
  };

  return (
    <div className="min-h-screen bg-[#080b11] flex flex-col font-mono">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        engineMode={metrics?.engine_mode || 'demo'}
        queryLatencyMs={metrics?.query_latency_ms || 2}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewView
            metrics={metrics}
            onSelectScenario={handleSelectScenario}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'graph' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Heterogeneous Transaction Graph Topology
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interactive force-directed graph. Click any entity to inspect attributes or open full investigation.
                </p>
              </div>
            </div>
            <GraphExplorer onSelectNode={handleSelectNode} />
          </div>
        )}

        {activeTab === 'investigate' && (
          <InvestigationView initialWalletId={investigationWallet} />
        )}

        {activeTab === 'simulator' && (
          <SimulatorView initialScenarioId={simulatorScenario} />
        )}

        {activeTab === 'path' && (
          <PathTracerView onSelectWallet={handleSelectNode} />
        )}

        {activeTab === 'clusters' && (
          <SybilClustersView onSelectWallet={handleSelectNode} />
        )}

        {activeTab === 'policy' && (
          <PolicyConfigView />
        )}

        {activeTab === 'history' && (
          <HistoryView onSelectInvestigation={handleSelectNode} />
        )}

        {activeTab === 'status' && <StatusView />}
      </main>

      {/* Compact Grouped Footer */}
      <footer className="border-t border-[#303139] bg-[#10141c] text-xs font-sans mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[#c9ced8]">
            <div className="col-span-2 md:col-span-1 space-y-2">
              <span className="font-semibold text-[#f4f5f7] tracking-tight block text-sm">GHOSTSHIELD</span>
              <p className="text-[12px] leading-relaxed text-[#c9ced8]">
                TigerGraph GSQL transaction risk and Sybil detection platform for DeFi protocols and autonomous financial agents.
              </p>
            </div>

            <div className="space-y-1.5 text-[12px]">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#edcd8c] block">Detection Signals</span>
              <p>Temporal Cycles (&lt;600s)</p>
              <p>Capital Conservation (&gt;85%)</p>
              <p>Shared Liquidity Mixers</p>
              <p>Autonomous Agent Botnets</p>
            </div>

            <div className="space-y-1.5 text-[12px]">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#edcd8c] block">Graph Schema</span>
              <p>Wallet &amp; Contract Vertices</p>
              <p>Funding Source Anchors</p>
              <p>Directed Transfer Edges</p>
              <p>Multi-Hop Paths (k=2..5)</p>
            </div>

            <div className="space-y-1.5 text-[12px]">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#edcd8c] block">Integrations</span>
              <p>TigerGraph Cloud GSQL</p>
              <p>viaSocket Webhooks</p>
              <p>AI Grants India (AIGI)</p>
              <p>Deterministic Engine</p>
            </div>
          </div>

          <div className="border-t border-[#303139] mt-6 pt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#c9ced8]/70 font-mono">
            <div>
              <span>© {new Date().getFullYear()} GhostShield • TigerGraph GSQL Graph Data Science</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Deterministic Attribution (0–100)</span>
              <span>•</span>
              <span className="text-[#edcd8c]">5 Curated Fixtures · See BENCHMARK.md</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
