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
    <div className="space-y-6">
      {/* Wallet Search Bar & Quick Entity Selectors */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            placeholder="Enter target wallet address (e.g. 0x71c...sus1)"
            className="w-full bg-[#1e293b]/70 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Quick select presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500">Presets:</span>
          {demoData.vertices.wallets.slice(0, 5).map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setWalletId(w.id);
                runInvestigation(w.id);
              }}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                walletId === w.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {w.id}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-sm">Executing Bounded GSQL Multi-Hop Traversal...</span>
        </div>
      )}

      {!isLoading && assessment && investigation && (
        <div className="space-y-6">
          {/* Main Assessment Header Card */}
          <div className="bg-[#0f172a] border border-card-border rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Target Investigation
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {assessment.investigation_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    {assessment.engine_mode.toUpperCase()} MODE
                  </span>
                </div>
                <h2 className="text-xl font-bold font-mono text-white select-all">
                  {assessment.target_wallet}
                </h2>
                <p className="text-xs text-slate-400">
                  Label: <span className="text-slate-200 font-medium">{investigation.target_wallet.label}</span> • Network:{' '}
                  <span className="text-slate-200 uppercase">{investigation.target_wallet.network}</span> • Provenance:{' '}
                  <span className="text-slate-300 font-mono">{investigation.target_wallet.provenance}</span>
                </p>
              </div>

              {/* Score Gauge & Action Badge */}
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Deterministic Risk Score
                  </p>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5">
                    <span
                      className={`text-3xl font-extrabold ${
                        assessment.action === 'REJECT'
                          ? 'text-red-400'
                          : assessment.action === 'REVIEW'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {assessment.score}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">/ 100</span>
                  </div>
                </div>

                <div
                  className={`px-4 py-2.5 rounded-xl border flex flex-col items-center justify-center min-w-[120px] ${
                    assessment.action === 'REJECT'
                      ? 'bg-red-950/40 border-red-500/50 text-red-300'
                      : assessment.action === 'REVIEW'
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                      : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  }`}
                >
                  <span className="text-[10px] font-semibold tracking-wider uppercase">Recommendation</span>
                  <span className="text-base font-extrabold tracking-wide">{assessment.action}</span>
                </div>
              </div>
            </div>

            {/* Explanation Summary */}
            <div className="mt-4 pt-4 border-t border-card-border">
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {assessment.explanation}
              </p>
            </div>
          </div>

          {/* Contributing Rules Breakdown */}
          <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Contributing Risk Rule Attribution</span>
            </h3>

            <div className="space-y-2.5">
              {assessment.contributing_rules.map((rule) => (
                <div
                  key={rule.rule_id}
                  className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 text-xs ${
                    rule.triggered
                      ? 'bg-red-950/20 border-red-900/50 text-slate-200'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-[240px]">
                    {rule.triggered ? (
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${rule.triggered ? 'text-white' : 'text-slate-400'}`}>
                          {rule.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">[{rule.rule_id}]</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{rule.explanation}</p>
                      {rule.evidence_snippet && (
                        <p className="text-[10px] font-mono text-amber-300/80 mt-1">
                          Evidence Path: {rule.evidence_snippet}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-xs ${
                        rule.triggered ? 'text-red-400' : 'text-slate-500'
                      }`}
                    >
                      +{rule.points}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono"> / {rule.max_points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Hop Evidence & Graph Relationships Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Transfers Neighborhood */}
            <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-between">
                <span>P2P Transfer Activity ({investigation.transfers.length})</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {investigation.transfers.map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] flex items-center justify-between font-mono"
                  >
                    <div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold mr-2 ${
                          tx.direction === 'OUTGOING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}
                      >
                        {tx.direction}
                      </span>
                      <span className="text-slate-300">
                        {tx.direction === 'OUTGOING' ? `→ ${tx.to_id}` : `← ${tx.from_id}`}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-semibold">
                      {tx.amount} {tx.asset}
                    </span>
                  </div>
                ))}
                {investigation.transfers.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No transfers found for this address.</p>
                )}
              </div>
            </div>

            {/* Funding Sources & Agent Control */}
            <div className="bg-[#0f172a] border border-card-border rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Liquidity Origins & Controlling Agents</span>
                <Landmark className="w-3.5 h-3.5 text-purple-400" />
              </h4>

              <div className="space-y-2">
                {investigation.direct_funding_sources.map((fs, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-purple-950/20 border border-purple-900/40 text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 mr-2">
                        {fs.category}
                      </span>
                      <span className="text-slate-200 font-medium">{fs.label}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">{fs.amount} ETH</span>
                  </div>
                ))}

                {investigation.controlling_agents.map((ag, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-pink-950/20 border border-pink-900/40 text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-pink-500/20 text-pink-300 mr-2">
                        {ag.agent_type}
                      </span>
                      <span className="text-slate-200 font-medium">{ag.display_name}</span>
                    </div>
                    {ag.delegation_partner_id && (
                      <span className="text-[10px] font-mono text-amber-300">
                        Delegates → {ag.delegation_partner_id}
                      </span>
                    )}
                  </div>
                ))}

                {investigation.direct_funding_sources.length === 0 &&
                  investigation.controlling_agents.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No upstream funding or agents linked.</p>
                  )}
              </div>
            </div>
          </div>

          {/* AI Investigation Report & viaSocket Alert Action Bar */}
          <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border pb-3">
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>AI Investigation Synthesis & Dispatch</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Synthesizes verified TigerGraph evidence into natural language; dispatches webhook alerts
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAiReport}
                  disabled={isAiLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isAiLoading ? 'Synthesizing...' : 'Generate Narrative Report'}</span>
                </button>

                <button
                  onClick={handleDispatchAlert}
                  disabled={isAlertSending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAlertSending ? 'Dispatching...' : 'Dispatch viaSocket Alert'}</span>
                </button>
              </div>
            </div>

            {/* Alert Status Result Pill */}
            {alertStatus && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                  alertStatus.status === 'DELIVERED'
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    : alertStatus.status === 'UNCONFIGURED'
                    ? 'bg-amber-950/40 border border-amber-500/40 text-amber-300'
                    : 'bg-red-950/40 border border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider">[{alertStatus.status}]</span>
                  <span>{alertStatus.message}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">{alertStatus.timestamp}</span>
              </div>
            )}

            {/* AI Report Card */}
            {aiReport && (
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white uppercase text-[10px] tracking-wider">
                      Executive Summary
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      SOURCE: {aiReport.source.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{aiReport.generated_at}</span>
                </div>

                <p className="text-slate-200 leading-relaxed font-sans">{aiReport.executive_summary}</p>

                {aiReport.detailed_findings.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Key Findings:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                      {aiReport.detailed_findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiReport.recommended_analyst_actions.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Recommended Actions:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                      {aiReport.recommended_analyst_actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 italic pt-2 border-t border-slate-800/80">
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
