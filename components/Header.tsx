'use client';

import React from 'react';
import Image from 'next/image';
import {
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
    <header className="sticky top-0 z-40 bg-[#07090e] border-b border-[#303139]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[5px] border border-[#303139] bg-[#10141c] flex items-center justify-center shadow-sm">
              <Image src="/brand/ghostshield-mark.svg" alt="GhostShield" width={17} height={19} unoptimized priority />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-sans font-semibold text-[#f4f5f7] text-sm tracking-tight">
                GHOSTSHIELD
              </span>
              <span className="text-[10px] font-mono text-[#c9ced8] uppercase tracking-widest hidden sm:inline">
                TIGERGRAPH GSQL ENGINE
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
                  className={`h-full px-3 text-[11px] font-sans font-medium tracking-wide flex items-center gap-1.5 transition-all duration-[160ms] ease-out border-b-2 ${
                    isActive
                      ? 'border-[#ff951f] text-[#ff951f] bg-[#ff951f]/10'
                      : 'border-transparent text-[#c9ced8] hover:text-[#f4f5f7] hover:bg-[#10141c]'
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
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] bg-[#10141c] border border-[#303139]">
              <span className="text-[#c9ced8] text-[10px] uppercase">RTT</span>
              <span className="text-[#edcd8c] font-bold tabular-nums">{queryLatencyMs}ms</span>
            </div>

            {/* Engine Mode Status */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-[5px] bg-[#10141c] border border-[#303139]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  engineMode === 'tigergraph' ? 'bg-[#34d399]' : 'bg-[#ff951f]'
                }`}
              />
              <span className="text-[#f4f5f7] text-[10px] font-bold uppercase tracking-wider">
                {engineMode === 'tigergraph' ? 'TG-CLOUD' : 'DEMO'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden overflow-x-auto py-1 border-t border-[#303139] gap-1 scrollbar-none text-[11px] font-sans">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-2.5 py-1 whitespace-nowrap rounded-[40px] transition-all duration-[160ms] ease-out ${
                  isActive
                    ? 'bg-[#ff951f] text-[#07090e] font-semibold'
                    : 'text-[#c9ced8] hover:text-[#f4f5f7]'
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
