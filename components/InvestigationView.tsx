'use client';

import React, { useState, useEffect } from 'react';
import { WalletInvestigation, RiskAssessment, RiskEvidence } from '@/lib/graph/types';
import { AIReportResult } from '@/lib/ai/report-generator';
import demoData from '@/data/demo/entities.json';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Bot,
  Landmark,
  FileText,
  Send,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface InvestigationViewProps {
  initialWalletId?: string;
}

export function InvestigationView({ initialWalletId }: InvestigationViewProps) {
  const [walletId, setWalletId] = useState<string>(initialWalletId || '0x71c...sus1');
  const [investigation, setInvestigation] = useState<WalletInvestigation | null>(null);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [aiReport, setAiReport] = useState<AIReportResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [alertStatus, setAlertStatus] = useState<any>(null);
  const [isAlertSending, setIsAlertSending] = useState<boolean>(false);

  const runInvestigation = async (targetId: string) => {
    setIsLoading(true);
    setAiReport(null);
    setAlertStatus(null);
    try {
      const res = await fetch(`/api/investigate?wallet_id=${encodeURIComponent(targetId)}`);
      if (!res.ok) throw new Error('Investigation request failed');
      const data = await res.json();
      setInvestigation(data.investigation);
      setAssessment(data.assessment);
    } catch (err) {
      console.error('Failed to run investigation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletId) {
      runInvestigation(walletId);
    }
  }, [walletId]);

  const handleGenerateAiReport = async () => {
    if (!assessment) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment }),
      });
      const data = await res.json();
      setAiReport(data);
    } catch (err) {
      console.error('AI Report generation failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDispatchAlert = async () => {
    if (!assessment) return;
    setIsAlertSending(true);
    try {
      const res = await fetch('/api/alerts/viasocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment }),
      });
      const data = await res.json();
      setAlertStatus(data);
    } catch (err) {
      console.error('viaSocket alert dispatch failed:', err);
    } finally {
      setIsAlertSending(false);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Target Wallet Selector Rail */}
      <div className="bg-[#0d121c] border border-[#1b2333] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TARGET:</span>
          <input
            type="text"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            placeholder="0x71c...sus1"
            className="w-full bg-[#080b11] border border-[#1b2333] px-2.5 py-1.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Quick select presets */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">PRESETS:</span>
          {demoData.vertices.wallets.slice(0, 5).map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setWalletId(w.id);
                runInvestigation(w.id);
              }}
              className={`px-2 py-1 text-[11px] font-mono border transition-colors ${
                walletId === w.id
                  ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/50 font-bold'
                  : 'bg-[#080b11] text-slate-400 hover:text-white border-[#1b2333]'
              }`}
            >
              {w.id}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2 border border-[#1b2333] bg-[#0d121c]">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span className="text-xs">EXECUTING GSQL BOUNDED MULTI-HOP TRAVERSAL...</span>
        </div>
      )}

      {!isLoading && assessment && investigation && (
        <div className="space-y-4">
          {/* Main Assessment Header Card */}
          <div className="bg-[#0d121c] border border-[#1b2333] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TARGET FORENSICS
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {assessment.investigation_id}
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-[#080b11] text-cyan-300 border border-[#1b2333]">
                    {assessment.engine_mode.toUpperCase()} ADAPTER
                  </span>
                </div>
                <h2 className="text-lg font-bold font-mono text-white select-all">
                  {assessment.target_wallet}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Label: <span className="text-slate-200">{investigation.target_wallet.label}</span> • Network:{' '}
                  <span className="text-slate-200 uppercase">{investigation.target_wallet.network}</span> • Provenance:{' '}
                  <span className="text-slate-400 font-mono">{investigation.target_wallet.provenance}</span>
                </p>
              </div>

              {/* Score Gauge & Action Badge */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    RISK SCORE
                  </p>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5 font-mono">
                    <span
                      className={`text-2xl font-bold ${
                        assessment.action === 'REJECT'
                          ? 'text-rose-400'
                          : assessment.action === 'REVIEW'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {assessment.score}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold">/ 100</span>
                  </div>
                </div>

                <div
                  className={`px-3 py-2 border flex flex-col items-center justify-center min-w-[110px] ${
                    assessment.action === 'REJECT'
                      ? 'bg-rose-950/20 border-rose-500/50 text-rose-300'
                      : assessment.action === 'REVIEW'
                      ? 'bg-amber-950/20 border-amber-500/50 text-amber-300'
                      : 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
                  }`}
                >
                  <span className="text-[9px] font-bold tracking-wider uppercase">DECISION</span>
                  <span className="text-sm font-bold tracking-wider">{assessment.action}</span>
                </div>
              </div>
            </div>

            {/* Explanation Summary */}
            <div className="mt-3 pt-3 border-t border-[#1b2333]">
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {assessment.explanation}
              </p>
            </div>
          </div>

          {/* Contributing Rules Breakdown */}
          <div className="bg-[#0d121c] border border-[#1b2333] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1b2333] pb-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>EVIDENCE ATTRIBUTION MATRIX</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {assessment.contributing_rules.filter(r => r.triggered).length} SIGNALS TRIGGERED
              </span>
            </div>

            <div className="space-y-1.5">
              {assessment.contributing_rules.map((rule) => (
                <div
                  key={rule.rule_id}
                  className={`p-2.5 border flex flex-wrap items-center justify-between gap-2 text-xs ${
                    rule.triggered
                      ? 'bg-rose-950/10 border-rose-900/40 text-slate-200'
                      : 'bg-[#080b11] border-[#1b2333] text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-2 flex-1 min-w-[240px]">
                    {rule.triggered ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-xs ${rule.triggered ? 'text-white' : 'text-slate-400'}`}>
                          {rule.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">[{rule.rule_id}]</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans leading-relaxed">{rule.explanation}</p>
                      {rule.evidence_snippet && (
                        <p className="text-[10px] font-mono text-amber-400/90 mt-1 bg-[#080b11] p-1 border border-[#1b2333]">
                          TRAVERSAL EVIDENCE: {rule.evidence_snippet}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={`font-bold text-xs ${
                        rule.triggered ? 'text-rose-400' : 'text-slate-600'
                      }`}
                    >
                      +{rule.points}
                    </span>
                    <span className="text-[10px] text-slate-600"> / {rule.max_points} PTS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Hop Evidence & Graph Relationships Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Transfers Neighborhood */}
            <div className="bg-[#0d121c] border border-[#1b2333] p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#1b2333] pb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  TRANSFER ACTIVITY ({investigation.transfers.length})
                </span>
                <Clock className="w-3 h-3 text-slate-500" />
              </div>

              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {investigation.transfers.map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-2 border border-[#1b2333] bg-[#080b11] text-[11px] flex items-center justify-between font-mono"
                  >
                    <div>
                      <span
                        className={`text-[9px] px-1 py-0.2 mr-1.5 font-bold border ${
                          tx.direction === 'OUTGOING'
                            ? 'border-amber-500/30 text-amber-300'
                            : 'border-cyan-500/30 text-cyan-300'
                        }`}
                      >
                        {tx.direction}
                      </span>
                      <span className="text-slate-300">
                        {tx.direction === 'OUTGOING' ? `→ ${tx.to_id}` : `← ${tx.from_id}`}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-semibold font-mono">
                      {tx.amount} {tx.asset}
                    </span>
                  </div>
                ))}
                {investigation.transfers.length === 0 && (
                  <p className="text-xs text-slate-600 italic p-2">Zero direct transfer edges detected.</p>
                )}
              </div>
            </div>

            {/* Funding Sources & Agent Control */}
            <div className="bg-[#0d121c] border border-[#1b2333] p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#1b2333] pb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  LIQUIDITY & DELEGATION ANCHORS
                </span>
                <Landmark className="w-3 h-3 text-indigo-400" />
              </div>

              <div className="space-y-1">
                {investigation.direct_funding_sources.map((fs, idx) => (
                  <div
                    key={idx}
                    className="p-2 border border-[#1b2333] bg-[#080b11] text-[11px] flex items-center justify-between font-mono"
                  >
                    <div>
                      <span className="text-[9px] px-1 py-0.2 mr-1.5 font-bold border border-indigo-500/30 text-indigo-300">
                        {fs.category.toUpperCase()}
                      </span>
                      <span className="text-slate-200">{fs.label}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">{fs.amount} ETH</span>
                  </div>
                ))}

                {investigation.controlling_agents.map((ag, idx) => (
                  <div
                    key={idx}
                    className="p-2 border border-[#1b2333] bg-[#080b11] text-[11px] flex items-center justify-between font-mono"
                  >
                    <div>
                      <span className="text-[9px] px-1 py-0.2 mr-1.5 font-bold border border-slate-600 text-slate-300">
                        {ag.agent_type.toUpperCase()}
                      </span>
                      <span className="text-slate-200">{ag.display_name}</span>
                    </div>
                    {ag.delegation_partner_id && (
                      <span className="text-[10px] text-amber-300">
                        DELEGATES → {ag.delegation_partner_id}
                      </span>
                    )}
                  </div>
                ))}

                {investigation.direct_funding_sources.length === 0 &&
                  investigation.controlling_agents.length === 0 && (
                    <p className="text-xs text-slate-600 italic p-2">Zero upstream funding sources or controlling agents.</p>
                  )}
              </div>
            </div>
          </div>

          {/* AI Investigation Report & viaSocket Alert Action Bar */}
          <div className="bg-[#0d121c] border border-[#1b2333] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2333] pb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI REPORT & WEBHOOK DISPATCH</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  AIGI narrative synthesis & viaSocket forensic webhook dispatcher
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAiReport}
                  disabled={isAiLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b2333] hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/40 disabled:opacity-50 text-xs font-bold transition-colors font-mono"
                >
                  <FileText className="w-3 h-3" />
                  <span>{isAiLoading ? 'GENERATING...' : 'SYNTHESIZE REPORT'}</span>
                </button>

                <button
                  onClick={handleDispatchAlert}
                  disabled={isAlertSending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b2333] hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/40 disabled:opacity-50 text-xs font-bold transition-colors font-mono"
                >
                  <Send className="w-3 h-3" />
                  <span>{isAlertSending ? 'DISPATCHING...' : 'VIASOCKET ALERT'}</span>
                </button>
              </div>
            </div>

            {/* Alert Status Result Pill */}
            {alertStatus && (
              <div
                className={`p-2.5 border text-xs flex items-center justify-between font-mono ${
                  alertStatus.status === 'DELIVERED'
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : alertStatus.status === 'UNCONFIGURED'
                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                    : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">[{alertStatus.status}]</span>
                  <span>{alertStatus.message}</span>
                </div>
                <span className="text-[10px] text-slate-500">{alertStatus.timestamp}</span>
              </div>
            )}

            {/* AI Report Card */}
            {aiReport && (
              <div className="bg-[#080b11] border border-[#1b2333] p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#1b2333] pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                      FORENSIC INTELLIGENCE DISPATCH
                    </span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#1b2333] text-cyan-300 border border-cyan-500/30">
                      PROVIDER: {aiReport.source.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{aiReport.generated_at}</span>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans text-xs">{aiReport.executive_summary}</p>

                {aiReport.detailed_findings.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Key Signals:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px] font-sans">
                      {aiReport.detailed_findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiReport.recommended_analyst_actions.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Action Recommendations:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px] font-sans">
                      {aiReport.recommended_analyst_actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 italic pt-2 border-t border-[#1b2333]">
                  {aiReport.disclaimer}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
