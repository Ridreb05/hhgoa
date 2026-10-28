'use client';

import React, { useState, useEffect } from 'react';
import { SybilClusterResult, SybilClusterRecord } from '@/lib/graph/types';
import {
  Users,
  ShieldAlert,
  Bot,
  Landmark,
  Coins,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Eye,
} from 'lucide-react';

interface SybilClustersViewProps {
  onSelectWallet: (walletId: string) => void;
}

export function SybilClustersView({ onSelectWallet }: SybilClustersViewProps) {
  const [minSize, setMinSize] = useState<number>(2);
  const [clustersResult, setClustersResult] = useState<SybilClusterResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchClusters = async (size: number = minSize) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/clusters?min_size=${size}`);
      if (!res.ok) throw new Error('Clusters request failed');
      const data = await res.json();
      setClustersResult(data);
    } catch (err) {
      console.error('Failed to load Sybil clusters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters(minSize);
  }, [minSize]);

  const filteredClusters = (clustersResult?.clusters || []).filter((c) => {
    if (filterType === 'all') return true;
    if (filterType === 'funding') return c.root_type === 'FundingSource';
    if (filterType === 'agent') return c.root_type === 'Agent';
    return true;
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Header & Controls */}
      <div className="bg-[#0d121c] border border-[#1b2333] p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>SYBIL SYNDICATE & SHARED ORIGIN CLUSTERS</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
            GSQL relational community detection clustering wallets sharing high-degree upstream liquidity origins or common agent controllers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Type */}
          <div className="flex items-center border border-[#1b2333] bg-[#080b11] text-[11px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-1 border-r border-[#1b2333] transition-colors ${
                filterType === 'all'
                  ? 'bg-[#1e293b] text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterType('funding')}
              className={`px-2 py-1 border-r border-[#1b2333] transition-colors ${
                filterType === 'funding'
                  ? 'bg-[#1e293b] text-indigo-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              FUNDING ORIGINS
            </button>
            <button
              onClick={() => setFilterType('agent')}
              className={`px-2 py-1 transition-colors ${
                filterType === 'agent'
                  ? 'bg-[#1e293b] text-slate-200 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              AGENT BOTNETS
            </button>
          </div>

          {/* Min Size Select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 border border-[#1b2333] bg-[#080b11] px-2 py-1">
            <span className="text-[10px] text-slate-500 uppercase">MIN:</span>
            <select
              value={minSize}
              onChange={(e) => setMinSize(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value={2} className="bg-[#080b11]">≥ 2 Wallets</option>
              <option value={3} className="bg-[#080b11]">≥ 3 Wallets</option>
              <option value={4} className="bg-[#080b11]">≥ 4 Wallets</option>
            </select>
          </div>

          <button
            onClick={() => fetchClusters(minSize)}
            disabled={isLoading}
            className="p-1.5 bg-[#080b11] hover:bg-[#1e293b] text-slate-300 border border-[#1b2333]"
            title="Refresh Clusters"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2 border border-[#1b2333] bg-[#0d121c]">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span className="text-xs">EXECUTING GSQL SYBIL CLUSTERING QUERY...</span>
        </div>
      )}

      {/* Clusters Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredClusters.map((cluster, idx) => {
            const isCritical = cluster.risk_level === 'CRITICAL';
            const isCoordination = cluster.risk_level === 'HIGH_COORDINATION';

            return (
              <div
                key={idx}
                className="bg-[#0d121c] border border-[#1b2333] p-4 space-y-3"
              >
                {/* Cluster Card Header */}
                <div className="flex items-start justify-between gap-3 border-b border-[#1b2333] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 border ${
                        cluster.root_type === 'FundingSource'
                          ? 'border-indigo-500/40 text-indigo-300 bg-indigo-950/20'
                          : 'border-slate-600 text-slate-300 bg-slate-900/40'
                      }`}
                    >
                      {cluster.root_type === 'FundingSource' ? (
                        <Landmark className="w-3.5 h-3.5" />
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {cluster.root_label}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">
                          [{cluster.category}]
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        ROOT: {cluster.root_entity_id}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                      isCritical
                        ? 'bg-rose-950/20 text-rose-300 border-rose-500/40'
                        : isCoordination
                        ? 'bg-amber-950/20 text-amber-300 border-amber-500/40'
                        : 'bg-[#1b2333] text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {cluster.risk_level}
                  </span>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-xs bg-[#080b11] p-2 border border-[#1b2333]">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase">CLUSTER SIZE:</span>
                    <p className="font-mono font-bold text-white text-xs">
                      {cluster.member_count} WALLETS
                    </p>
                  </div>
                  {cluster.total_cluster_volume > 0 && (
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase">INFLOW VOLUME:</span>
                      <p className="font-mono font-bold text-emerald-400 text-xs">
                        {cluster.total_cluster_volume} ETH
                      </p>
                    </div>
                  )}
                </div>

                {/* Member Wallets List */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    MEMBER VERTICES ({cluster.member_wallets.length}):
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {cluster.member_wallets.map((walletId, wIdx) => (
                      <div
                        key={wIdx}
                        className="bg-[#080b11] border border-[#1b2333] p-1.5 text-xs flex items-center justify-between font-mono"
                      >
                        <span className="text-slate-300 truncate max-w-[240px]">
                          {walletId}
                        </span>
                        <button
                          onClick={() => onSelectWallet(walletId)}
                          className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 px-1.5 py-0.2 border border-cyan-500/30 transition-colors"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span>INSPECT</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

