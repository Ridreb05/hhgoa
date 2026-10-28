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
    <div className="space-y-4 font-mono">
      {/* Top Header & Actions */}
      <div className="financial-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold text-[#f4f5f7] uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[#ff951f]" />
            <span>AUDIT TRAIL & COMPLIANCE LOG</span>
          </h2>
          <p className="text-[11px] text-[#c9ced8] mt-0.5 font-sans">
            Immutable session log recording all simulated and evaluated wallet transactions with compliance export.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a
            href="/api/history?format=csv"
            className="btn-financial-secondary px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#edcd8c]" />
            <span>CSV</span>
          </a>
          <a
            href="/api/history?format=json"
            className="btn-financial-secondary px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#edcd8c]" />
            <span>JSON</span>
          </a>
          <button
            onClick={handleClear}
            className="rounded-[40px] px-3.5 py-1.5 text-xs font-mono font-medium flex items-center gap-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 financial-panel p-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-[#c9ced8]/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by wallet, counterparty, or ID..."
            className="w-full bg-[#07090e] border border-[#303139] rounded-[4px] px-3 py-1.5 text-xs text-[#f4f5f7] placeholder-[#c9ced8]/40 font-mono focus:outline-none focus:border-[#ff951f]"
          />
        </div>

        <div className="flex items-center bg-[#07090e] border border-[#303139] rounded-[40px] p-0.5">
          <button
            onClick={() => setFilterAction('all')}
            className={`px-3 py-1 rounded-[40px] text-xs transition-colors ${
              filterAction === 'all'
                ? 'bg-[#10141c] text-[#edcd8c] font-bold border border-[#303139]'
                : 'text-[#c9ced8] hover:text-[#f4f5f7]'
            }`}
          >
            ALL ({records.length})
          </button>
          <button
            onClick={() => setFilterAction('REJECT')}
            className={`px-3 py-1 rounded-[40px] text-xs transition-colors ${
              filterAction === 'REJECT'
                ? 'bg-rose-950/30 text-rose-300 font-bold border border-rose-500/40'
                : 'text-[#c9ced8] hover:text-[#f4f5f7]'
            }`}
          >
            REJECTED
          </button>
          <button
            onClick={() => setFilterAction('REVIEW')}
            className={`px-3 py-1 rounded-[40px] text-xs transition-colors ${
              filterAction === 'REVIEW'
                ? 'bg-amber-950/30 text-amber-300 font-bold border border-amber-500/40'
                : 'text-[#c9ced8] hover:text-[#f4f5f7]'
            }`}
          >
            REVIEW
          </button>
          <button
            onClick={() => setFilterAction('ALLOW')}
            className={`px-3 py-1 rounded-[40px] text-xs transition-colors ${
              filterAction === 'ALLOW'
                ? 'bg-emerald-950/30 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-[#c9ced8] hover:text-[#f4f5f7]'
            }`}
          >
            ALLOWED
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="financial-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#c9ced8] border-collapse">
            <thead>
              <tr className="bg-[#07090e] border-b border-[#303139] text-[10px] font-bold uppercase tracking-wider text-[#c9ced8]/70">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">TARGET</th>
                <th className="py-2.5 px-3">COUNTERPARTY</th>
                <th className="py-2.5 px-3 text-center">SCORE</th>
                <th className="py-2.5 px-3 text-center">DECISION</th>
                <th className="py-2.5 px-3">PRIMARY SIGNALS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303139]">
              {filteredRecords.map((r) => {
                const isReject = r.action === 'REJECT';
                const isReview = r.action === 'REVIEW';

                return (
                  <tr key={r.id} className="hover:bg-[#101522] transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#edcd8c] font-medium">
                      {r.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-[#c9ced8]/60">
                      {new Date(r.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#f4f5f7]">
                      {r.target_wallet}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#c9ced8]">
                      {r.counterparty || '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span
                        className={`tabular-nums ${
                          isReject ? 'text-rose-400' : isReview ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {r.score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isReject
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isReview
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#c9ced8] max-w-xs truncate font-mono">
                      {r.primary_evidence}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectInvestigation(r.target_wallet)}
                        className="btn-financial-secondary rounded-[40px] inline-flex items-center gap-1 px-3 py-1 text-[11px] font-mono font-medium"
                      >
                        <Eye className="w-3 h-3 text-[#edcd8c]" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#c9ced8]/60 italic font-sans">
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

