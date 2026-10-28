'use client';

import React from 'react';
import {
  Shield,
  Layers,
  Search,
  Play,
  Activity,
  Clock,
  Route,
  Users,
  Sliders,
  FileText,
} from 'lucide-react';
import { EngineMode } from '@/lib/graph/types';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  engineMode: EngineMode;
  queryLatencyMs?: number;
}

export function Header({
  activeTab,
  onTabChange,
  engineMode,
  queryLatencyMs = 2,
}: HeaderProps) {
  const tabs = [
    { id: 'overview', label: 'OVERVIEW', icon: Layers },
    { id: 'graph', label: 'GRAPH', icon: Layers },
    { id: 'investigate', label: 'INVESTIGATE', icon: Search },
    { id: 'simulator', label: 'SIMULATOR', icon: Play },
    { id: 'path', label: 'PATH TRACER', icon: Route },
    { id: 'clusters', label: 'SYBIL CLUSTERS', icon: Users },
    { id: 'policy', label: 'POLICY ENGINE', icon: Sliders },
    { id: 'history', label: 'AUDIT LOGS', icon: FileText },
    { id: 'status', label: 'SYSTEM', icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#080b11] border-b border-[#1b2333]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-[#1b2333] bg-[#0d121c] flex items-center justify-center text-sky-400">
              <Shield className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-slate-100 text-sm tracking-tight">
                GHOSTSHIELD
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:inline">
                TIGERGRAPH GSQL CORE
              </span>
            </div>
          </div>

          {/* Segmented Desktop Navigation */}
          <nav className="hidden lg:flex items-center h-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`h-full px-3 text-[11px] font-mono font-medium tracking-wider flex items-center gap-1.5 transition-colors border-b-2 ${
                    isActive
                      ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Telemetry Block */}
          <div className="flex items-center gap-2.5 font-mono text-[11px]">
            {/* Latency Probe */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-[#0d121c] border border-[#1b2333]">
              <span className="text-slate-500 text-[10px]">RTT</span>
              <span className="text-sky-400 font-semibold tabular-nums">{queryLatencyMs}ms</span>
            </div>

            {/* Engine Mode Status */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d121c] border border-[#1b2333]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  engineMode === 'tigergraph' ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
              />
              <span className="text-slate-200 text-[10px] font-bold uppercase tracking-wider">
                {engineMode === 'tigergraph' ? 'TG-CLOUD' : 'DEMO'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden overflow-x-auto py-1 border-t border-[#1b2333] gap-1 scrollbar-none text-[11px] font-mono">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-2.5 py-1 whitespace-nowrap rounded ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-300 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
