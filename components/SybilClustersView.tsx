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
    if (filterType === 'funding') return c.root_type === 'FundingSource' || (c.root_type === 'Community' && /FUNDING|MIXER/.test(c.category));
    if (filterType === 'agent') return c.root_type === 'Agent' || (c.root_type === 'Community' && /AGENT/.test(c.category));
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Controls */}
      <div className="financial-panel p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-mono font-bold text-[#f4f5f7] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ff951f]" />
            <span>SYBIL SYNDICATE & SHARED ORIGIN CLUSTERS</span>
          </h2>
          <p className="text-xs text-[#c9ced8] mt-1 font-sans">
            In-engine GSQL community detection (connected components) linking wallets by shared low-fan-out agent control or coordinated funding bursts. Exchange crowds and large legitimate bot fleets are pruned as hubs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Type */}
          <div className="flex items-center border border-[#303139] bg-[#07090e] rounded-[40px] p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-[40px] transition-all duration-[160ms] ease-out ${
                filterType === 'all'
                  ? 'bg-[#ff951f] text-[#07090e] font-bold'
                  : 'text-[#c9ced8] hover:text-[#f4f5f7]'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterType('funding')}
              className={`px-3 py-1 rounded-[40px] transition-all duration-[160ms] ease-out ${
                filterType === 'funding'
                  ? 'bg-[#ff951f] text-[#07090e] font-bold'
                  : 'text-[#c9ced8] hover:text-[#f4f5f7]'
              }`}
            >
              LIQUIDITY ORIGINS
            </button>
            <button
              onClick={() => setFilterType('agent')}
              className={`px-3 py-1 rounded-[40px] transition-all duration-[160ms] ease-out ${
                filterType === 'agent'
                  ? 'bg-[#ff951f] text-[#07090e] font-bold'
                  : 'text-[#c9ced8] hover:text-[#f4f5f7]'
              }`}
            >
              AGENT BOTNETS
            </button>
          </div>

          {/* Min Size Select */}
          <div className="flex items-center gap-1.5 text-xs text-[#c9ced8] border border-[#303139] bg-[#07090e] px-2.5 py-1 rounded-[40px] font-mono">
            <span className="text-[10px] text-[#edcd8c] uppercase font-bold">MIN:</span>
            <select
              value={minSize}
              onChange={(e) => setMinSize(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs text-[#f4f5f7] focus:outline-none"
            >
              <option value={2} className="bg-[#10141c]">≥ 2 Wallets</option>
              <option value={3} className="bg-[#10141c]">≥ 3 Wallets</option>
              <option value={4} className="bg-[#10141c]">≥ 4 Wallets</option>
            </select>
          </div>

          <button
            onClick={() => fetchClusters(minSize)}
            disabled={isLoading}
            className="p-1.5 bg-[#07090e] hover:bg-[#10141c] text-[#c9ced8] hover:text-[#f4f5f7] border border-[#303139] rounded-[40px] transition-all duration-[160ms] ease-out"
            title="Refresh Clusters"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-[#c9ced8] gap-3 financial-panel">
          <RefreshCw className="w-4 h-4 animate-spin text-[#ff951f]" />
          <span className="text-xs font-mono">EXECUTING GSQL SYBIL CLUSTERING QUERY...</span>
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
                className="financial-panel p-5 space-y-4 hover:border-[#c9ced8]/40 transition-all duration-[160ms] ease-out"
              >
                {/* Cluster Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#303139] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-[5px] border ${
                        cluster.root_type === 'FundingSource'
                          ? 'border-[#ff951f]/40 text-[#ff951f] bg-[#ff951f]/10'
                          : 'border-[#303139] text-[#c9ced8] bg-[#101522]'
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
                        <span className="text-sm font-semibold text-[#f4f5f7]">
                          {cluster.root_label}
                        </span>
                        <span className="text-[10px] font-mono text-[#edcd8c] uppercase font-bold">
                          [{cluster.category}]
                        </span>
                      </div>
                      <p className="text-xs text-[#c9ced8] font-mono mt-0.5">
                        ROOT: {cluster.root_entity_id.length > 24 ? `${cluster.root_entity_id.slice(0, 10)}…${cluster.root_entity_id.slice(-6)}` : cluster.root_entity_id}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-[40px] text-[10px] font-mono font-bold uppercase tracking-wider border ${
                      isCritical
                        ? 'bg-[#101522] text-[#f43f5e] border-[#f43f5e]/40'
                        : isCoordination
                        ? 'bg-[#101522] text-[#ff951f] border-[#ff951f]/40'
                        : 'bg-[#101522] text-[#34d399] border-[#34d399]/40'
                    }`}
                  >
                    {cluster.risk_level}
                  </span>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-xs bg-[#07090e] p-3 rounded-[4px] border border-[#303139]">
                  <div>
                    <span className="text-[10px] font-mono text-[#c9ced8] uppercase block">CLUSTER SIZE:</span>
                    <p className="font-mono font-bold text-[#edcd8c] text-sm tabular-nums mt-0.5">
                      {cluster.member_count} WALLETS
                    </p>
                  </div>
                  {cluster.total_cluster_volume > 0 && (
                    <div>
                      <span className="text-[10px] font-mono text-[#c9ced8] uppercase block">INFLOW VOLUME:</span>
                      <p className="font-mono font-bold text-[#edcd8c] text-sm tabular-nums mt-0.5">
                        {cluster.total_cluster_volume} ETH
                      </p>
                    </div>
                  )}
                </div>

                {/* Member Wallets List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider">
                    MEMBER VERTICES ({cluster.member_wallets.length}):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {cluster.member_wallets.map((walletId, wIdx) => (
                      <div
                        key={wIdx}
                        className="bg-[#07090e] border border-[#303139] rounded-[4px] p-2 text-xs flex items-center justify-between font-mono"
                      >
                        <span className="text-[#f4f5f7] truncate max-w-[240px]">
                          {walletId}
                        </span>
                        <button
                          onClick={() => onSelectWallet(walletId)}
                          className="flex items-center gap-1 text-[11px] text-[#ff951f] hover:text-[#f0830c] px-2 py-0.5 rounded-[40px] border border-[#ff951f]/40 transition-all duration-[160ms] ease-out font-sans font-medium"
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

