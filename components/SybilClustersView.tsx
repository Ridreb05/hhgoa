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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Sybil Syndicate & Shared Funding Clusters</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            TigerGraph algorithmic clustering grouping wallets sharing high-degree upstream liquidity origins or common agent controllers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Type */}
          <div className="flex items-center gap-1 bg-[#1e293b]/80 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('funding')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'funding'
                  ? 'bg-purple-500/20 text-purple-300 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Funding Origins
            </button>
            <button
              onClick={() => setFilterType('agent')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'agent'
                  ? 'bg-pink-500/20 text-pink-300 font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Agent Botnets
            </button>
          </div>

          {/* Min Size Select */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Min Size:</span>
            <select
              value={minSize}
              onChange={(e) => setMinSize(parseInt(e.target.value, 10))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value={2}>≥ 2 Wallets</option>
              <option value={3}>≥ 3 Wallets</option>
              <option value={4}>≥ 4 Wallets</option>
            </select>
          </div>

          <button
            onClick={() => fetchClusters(minSize)}
            disabled={isLoading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="Refresh Clusters"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-sm">Clustering Relational Communities in TigerGraph...</span>
        </div>
      )}

      {/* Clusters Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClusters.map((cluster, idx) => {
            const isCritical = cluster.risk_level === 'CRITICAL';
            const isCoordination = cluster.risk_level === 'HIGH_COORDINATION';

            return (
              <div
                key={idx}
                className="bg-[#0f172a] border border-card-border hover:border-slate-700 rounded-xl p-5 space-y-4 shadow-lg transition-all"
              >
                {/* Cluster Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg border ${
                        cluster.root_type === 'FundingSource'
                          ? 'bg-purple-950/40 border-purple-800 text-purple-400'
                          : 'bg-pink-950/40 border-pink-800 text-pink-400'
                      }`}
                    >
                      {cluster.root_type === 'FundingSource' ? (
                        <Landmark className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
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
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Root ID: {cluster.root_entity_id}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                      isCritical
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : isCoordination
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {cluster.risk_level}
                  </span>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-xs bg-[#0b1120] p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Cluster Size:</span>
                    <p className="font-mono font-bold text-white text-sm">
                      {cluster.member_count} Wallets
                    </p>
                  </div>
                  {cluster.total_cluster_volume > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Total Inflow Volume:</span>
                      <p className="font-mono font-bold text-emerald-400 text-sm">
                        {cluster.total_cluster_volume} ETH
                      </p>
                    </div>
                  )}
                </div>

                {/* Member Wallets List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Linked Member Wallets:
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {cluster.member_wallets.map((walletId, wIdx) => (
                      <div
                        key={wIdx}
                        className="bg-[#111827] border border-slate-800 rounded p-2 text-xs flex items-center justify-between font-mono"
                      >
                        <span className="text-slate-300 truncate max-w-[240px]">
                          {walletId}
                        </span>
                        <button
                          onClick={() => onSelectWallet(walletId)}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
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

