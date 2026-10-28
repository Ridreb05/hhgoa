'use client';

import React, { useState, useEffect } from 'react';
import { AuditRecord } from '@/lib/history/store';
import {
  FileText,
  Download,
  Trash2,
  Search,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Eye,
} from 'lucide-react';

interface HistoryViewProps {
  onSelectInvestigation: (walletId: string) => void;
}

export function HistoryView({ onSelectInvestigation }: HistoryViewProps) {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClear = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.target_wallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.counterparty && r.counterparty.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = filterAction === 'all' || r.action === filterAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Forensic Investigation Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable session log recording all simulated and evaluated wallet transactions with compliance export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/history?format=csv"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <a
            href="/api/history?format=json"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </a>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] border border-card-border rounded-xl p-3.5 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by wallet, counterparty, or investigation ID..."
            className="w-full bg-[#1e293b]/70 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#1e293b]/70 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setFilterAction('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterAction === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({records.length})
          </button>
          <button
            onClick={() => setFilterAction('REJECT')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterAction === 'REJECT'
                ? 'bg-red-500/20 text-red-300 font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setFilterAction('REVIEW')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterAction === 'REVIEW'
                ? 'bg-amber-500/20 text-amber-300 font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Review
          </button>
          <button
            onClick={() => setFilterAction('ALLOW')}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterAction === 'ALLOW'
                ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Allowed
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="bg-[#111827] border-b border-card-border text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Investigation ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Counterparty</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Decision</th>
                <th className="py-3 px-4">Primary Signals</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRecords.map((r) => {
                const isReject = r.action === 'REJECT';
                const isReview = r.action === 'REVIEW';

                return (
                  <tr key={r.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-cyan-300 font-medium">
                      {r.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {new Date(r.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {r.target_wallet}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {r.counterparty || '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span
                        className={
                          isReject ? 'text-red-400' : isReview ? 'text-amber-400' : 'text-emerald-400'
                        }
                      >
                        {r.score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isReject
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : isReview
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs truncate font-mono">
                      {r.primary_evidence}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectInvestigation(r.target_wallet)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 rounded text-[11px] font-medium transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                    No investigations match current query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
