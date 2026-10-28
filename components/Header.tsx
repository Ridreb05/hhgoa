'use client';

import React from 'react';
import {
  Shield,
  Layers,
  Search,
  Play,
  Activity,
  Cpu,
  Clock,
  Sparkles,
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
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'graph', label: 'Graph Explorer', icon: Layers },
    { id: 'investigate', label: 'Investigations', icon: Search },
    { id: 'simulator', label: 'Transaction Simulator', icon: Play },
    { id: 'status', label: 'System Status', icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#090d16]/95 backdrop-blur-md border-b border-card-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-950/40">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight font-mono">
                  GHOSTSHIELD
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider bg-slate-800 text-cyan-400 border border-slate-700">
                  TIGERGRAPH GSQL
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wide">
                Graph-Based Transaction Risk & Sybil Detection
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0f172a] p-1 rounded-xl border border-card-border text-xs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Telemetry Status Pills */}
          <div className="flex items-center gap-3">
            {/* Latency Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0f172a] border border-card-border text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] text-slate-400">Latency:</span>
              <span className="font-mono text-cyan-400 font-semibold text-xs">
                {queryLatencyMs}ms
              </span>
            </div>

            {/* Mode Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0f172a] border border-card-border">
              <span
                className={`w-2 h-2 rounded-full ${
                  engineMode === 'tigergraph' ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                {engineMode === 'tigergraph' ? 'TigerGraph Live' : 'Demo Mode'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-800 gap-1 scrollbar-none text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap font-medium text-xs ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
