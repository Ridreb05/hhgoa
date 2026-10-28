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
    <div className="min-h-screen bg-[#090d16] flex flex-col font-sans">
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

      {/* Application Footer */}
      <footer className="border-t border-card-border bg-[#090d16] py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400 font-mono">GHOSTSHIELD</span>
            <span>•</span>
            <span>TigerGraph GSQL Engine & Graph Data Science</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Deterministic Risk Policy (0–100)</span>
            <span>•</span>
            <span>Simulated Gatekeeper Decisions (ALLOW / REVIEW / REJECT)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
