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
    <div className="space-y-6 font-sans">
      {/* Target Wallet Selector Rail */}
      <div className="financial-panel p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <span className="text-[11px] font-mono text-[#edcd8c] font-bold uppercase tracking-wider">TARGET:</span>
          <input
            type="text"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            placeholder="0x71c...sus1"
            className="w-full bg-[#07090e] border border-[#303139] rounded-[5px] px-3 py-2 text-xs text-[#f4f5f7] placeholder-[#c9ced8]/50 font-mono focus:outline-none focus:border-[#ff951f]"
          />
        </div>

        {/* Quick select presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-[#c9ced8] font-bold uppercase tracking-wider mr-1">PRESETS:</span>
          {demoData.vertices.wallets.slice(0, 5).map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setWalletId(w.id);
                runInvestigation(w.id);
              }}
              className={`px-3 py-1 rounded-[40px] text-xs font-mono border transition-all duration-[160ms] ease-out ${
                walletId === w.id
                  ? 'bg-[#ff951f] text-[#07090e] border-[#ff951f] font-bold'
                  : 'bg-[#10141c] text-[#c9ced8] hover:text-[#f4f5f7] border-[#303139]'
              }`}
            >
              {w.id}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-[#c9ced8] gap-3 financial-panel">
          <RefreshCw className="w-4 h-4 animate-spin text-[#ff951f]" />
          <span className="text-xs font-mono">EXECUTING GSQL BOUNDED MULTI-HOP TRAVERSAL...</span>
        </div>
      )}

      {!isLoading && assessment && investigation && (
        <div className="space-y-6">
          {/* Main Assessment Header Card */}
          <div className="financial-panel p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider">
                    TARGET FORENSICS
                  </span>
                  <span className="text-[10px] font-mono text-[#c9ced8]/70">
                    ID: {assessment.investigation_id}
                  </span>
                  <span className="px-2 py-0.5 rounded-[40px] text-[10px] font-mono font-bold tracking-wider bg-[#101522] text-[#edcd8c] border border-[#303139]">
                    {assessment.engine_mode.toUpperCase()} ADAPTER
                  </span>
                </div>
                <h2 className="text-xl font-mono font-bold text-[#f4f5f7] select-all">
                  {assessment.target_wallet}
                </h2>
                <p className="text-xs text-[#c9ced8]">
                  Label: <span className="text-[#f4f5f7] font-medium">{investigation.target_wallet.label}</span> • Network:{' '}
                  <span className="text-[#f4f5f7] uppercase">{investigation.target_wallet.network}</span> • Provenance:{' '}
                  <span className="text-[#c9ced8] font-mono">{investigation.target_wallet.provenance}</span>
                </p>
              </div>

              {/* Score Gauge & Action Badge */}
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider">
                    RISK SCORE
                  </p>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5 font-mono">
                    <span
                      className={`text-4xl font-bold tabular-nums ${
                        assessment.action === 'REJECT'
                          ? 'text-[#f43f5e]'
                          : assessment.action === 'REVIEW'
                          ? 'text-[#ff951f]'
                          : 'text-[#edcd8c]'
                      }`}
                    >
                      {assessment.score}
                    </span>
                    <span className="text-xs text-[#c9ced8]/70 font-bold">/ 100</span>
                  </div>
                </div>

                <div
                  className={`px-4 py-2.5 rounded-[5px] border flex flex-col items-center justify-center min-w-[120px] ${
                    assessment.action === 'REJECT'
                      ? 'bg-[#101522] border-[#f43f5e]/60 text-[#f43f5e]'
                      : assessment.action === 'REVIEW'
                      ? 'bg-[#101522] border-[#ff951f]/60 text-[#ff951f]'
                      : 'bg-[#101522] border-[#34d399]/60 text-[#34d399]'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase">DECISION</span>
                  <span className="text-base font-mono font-bold tracking-wider">{assessment.action}</span>
                </div>
              </div>
            </div>

            {/* Explanation Summary */}
            <div className="mt-4 pt-4 border-t border-[#303139]">
              <p className="text-sm text-[#c9ced8] leading-[1.65] font-sans">
                {assessment.explanation}
              </p>
            </div>
          </div>

          {/* Contributing Rules Breakdown */}
          <div className="financial-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#303139] pb-3">
              <span className="text-xs font-mono font-bold text-[#f4f5f7] uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ff951f]" />
                <span>EVIDENCE ATTRIBUTION MATRIX</span>
              </span>
              <span className="text-xs font-mono text-[#edcd8c]">
                {assessment.contributing_rules.filter(r => r.triggered).length} SIGNALS TRIGGERED
              </span>
            </div>

            <div className="space-y-2">
              {assessment.contributing_rules.map((rule) => (
                <div
                  key={rule.rule_id}
                  className={`p-3.5 rounded-[5px] border flex flex-wrap items-center justify-between gap-3 text-xs ${
                    rule.triggered
                      ? 'bg-[#101522] border-[#f43f5e]/40 text-[#f4f5f7]'
                      : 'bg-[#10141c] border-[#303139] text-[#c9ced8]/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-[260px]">
                    {rule.triggered ? (
                      <ShieldAlert className="w-4 h-4 text-[#f43f5e] shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-[#303139] shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-xs ${rule.triggered ? 'text-[#f4f5f7]' : 'text-[#c9ced8]'}`}>
                          {rule.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#c9ced8]">[{rule.rule_id}]</span>
                      </div>
                      <p className="text-xs text-[#c9ced8] font-sans leading-relaxed">{rule.explanation}</p>
                      {rule.evidence_snippet && (
                        <p className="text-[11px] font-mono text-[#edcd8c] mt-1 bg-[#07090e] p-1.5 rounded-[4px] border border-[#303139]">
                          TRAVERSAL PATH: {rule.evidence_snippet}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={`font-bold text-sm ${
                        rule.triggered ? 'text-[#f43f5e]' : 'text-[#c9ced8]/50'
                      }`}
                    >
                      +{rule.points}
                    </span>
                    <span className="text-[11px] text-[#edcd8c] font-bold"> / {rule.max_points} PTS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Hop Evidence & Graph Relationships Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transfers Neighborhood */}
            <div className="financial-panel p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#303139] pb-2">
                <span className="text-xs font-mono font-bold text-[#f4f5f7] uppercase tracking-wider">
                  TRANSFER ACTIVITY ({investigation.transfers.length})
                </span>
                <Clock className="w-3.5 h-3.5 text-[#c9ced8]" />
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {investigation.transfers.map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-[4px] border border-[#303139] bg-[#07090e] text-xs flex items-center justify-between font-mono"
                  >
                    <div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-[40px] mr-2 font-bold border ${
                          tx.direction === 'OUTGOING'
                            ? 'border-[#ff951f]/40 text-[#ff951f] bg-[#ff951f]/10'
                            : 'border-[#edcd8c]/40 text-[#edcd8c] bg-[#edcd8c]/10'
                        }`}
                      >
                        {tx.direction}
                      </span>
                      <span className="text-[#f4f5f7]">
                        {tx.direction === 'OUTGOING' ? `→ ${tx.to_id}` : `← ${tx.from_id}`}
                      </span>
                    </div>
                    <span className="text-[#edcd8c] font-bold font-mono">
                      {tx.amount} {tx.asset}
                    </span>
                  </div>
                ))}
                {investigation.transfers.length === 0 && (
                  <p className="text-xs text-[#c9ced8] italic p-2">Zero direct transfer edges detected.</p>
                )}
              </div>
            </div>

            {/* Funding Sources & Agent Control */}
            <div className="financial-panel p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#303139] pb-2">
                <span className="text-xs font-mono font-bold text-[#f4f5f7] uppercase tracking-wider">
                  LIQUIDITY & DELEGATION ANCHORS
                </span>
                <Landmark className="w-3.5 h-3.5 text-[#ff951f]" />
              </div>

              <div className="space-y-1.5">
                {investigation.direct_funding_sources.map((fs, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-[4px] border border-[#303139] bg-[#07090e] text-xs flex items-center justify-between font-mono"
                  >
                    <div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-[40px] mr-2 font-bold border border-[#ff951f]/40 text-[#ff951f] bg-[#ff951f]/10">
                        {fs.category.toUpperCase()}
                      </span>
                      <span className="text-[#f4f5f7]">{fs.label}</span>
                    </div>
                    <span className="text-[#edcd8c] font-bold font-mono">{fs.amount} ETH</span>
                  </div>
                ))}

                {investigation.controlling_agents.map((ag, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-[4px] border border-[#303139] bg-[#07090e] text-xs flex items-center justify-between font-mono"
                  >
                    <div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-[40px] mr-2 font-bold border border-[#c9ced8]/40 text-[#c9ced8] bg-[#101522]">
                        {ag.agent_type.toUpperCase()}
                      </span>
                      <span className="text-[#f4f5f7]">{ag.display_name}</span>
                    </div>
                    {ag.delegation_partner_id && (
                      <span className="text-xs text-[#edcd8c]">
                        DELEGATES → {ag.delegation_partner_id}
                      </span>
                    )}
                  </div>
                ))}

                {investigation.direct_funding_sources.length === 0 &&
                  investigation.controlling_agents.length === 0 && (
                    <p className="text-xs text-[#c9ced8] italic p-2">Zero upstream funding sources or controlling agents.</p>
                  )}
              </div>
            </div>
          </div>

          {/* AI Investigation Report & viaSocket Alert Action Bar */}
          <div className="financial-panel p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#303139] pb-4">
              <div>
                <h3 className="text-sm font-sans font-semibold text-[#f4f5f7] tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ff951f]" />
                  <span>AI Investigation Narrative & Webhook Dispatch</span>
                </h3>
                <p className="text-xs text-[#c9ced8] mt-0.5">
                  Synthesize verified graph evidence into structured dossiers or dispatch automated webhook alerts.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateAiReport}
                  disabled={isAiLoading}
                  className="btn-financial-primary"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isAiLoading ? 'Synthesizing...' : 'Synthesize Report'}</span>
                </button>

                <button
                  onClick={handleDispatchAlert}
                  disabled={isAlertSending}
                  className="btn-financial-secondary"
                >
                  <Send className="w-3.5 h-3.5 text-[#ff951f]" />
                  <span>{isAlertSending ? 'Dispatching...' : 'Dispatch viaSocket'}</span>
                </button>
              </div>
            </div>

            {/* Alert Status Result Pill */}
            {alertStatus && (
              <div
                className={`p-3 rounded-[5px] border text-xs flex items-center justify-between font-mono ${
                  alertStatus.status === 'DELIVERED'
                    ? 'bg-[#101522] border-[#34d399]/40 text-[#34d399]'
                    : alertStatus.status === 'UNCONFIGURED'
                    ? 'bg-[#101522] border-[#ff951f]/40 text-[#ff951f]'
                    : 'bg-[#101522] border-[#f43f5e]/40 text-[#f43f5e]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">[{alertStatus.status}]</span>
                  <span>{alertStatus.message}</span>
                </div>
                <span className="text-[11px] text-[#c9ced8]">{alertStatus.timestamp}</span>
              </div>
            )}

            {/* AI Report Card */}
            {aiReport && (
              <div className="bg-[#07090e] border border-[#303139] rounded-[5px] p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#303139] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-semibold text-[#f4f5f7] uppercase text-[11px] tracking-wider">
                      FORENSIC INTELLIGENCE DOSSIER
                    </span>
                    <span className="px-2 py-0.5 rounded-[40px] text-[10px] font-mono font-bold bg-[#101522] text-[#edcd8c] border border-[#303139]">
                      PROVIDER: {aiReport.source.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#c9ced8]">{aiReport.generated_at}</span>
                </div>

                <p className="text-[#f4f5f7] leading-[1.65] font-sans text-xs sm:text-sm">{aiReport.executive_summary}</p>

                {aiReport.detailed_findings.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-mono font-bold text-[#edcd8c] uppercase">Key Graph Signals:</span>
                    <ul className="list-disc list-inside space-y-1 text-[#c9ced8] text-xs font-sans">
                      {aiReport.detailed_findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiReport.recommended_analyst_actions.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-mono font-bold text-[#edcd8c] uppercase">Recommended Analyst Actions:</span>
                    <ul className="list-disc list-inside space-y-1 text-[#c9ced8] text-xs font-sans">
                      {aiReport.recommended_analyst_actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[11px] text-[#c9ced8]/70 italic pt-3 border-t border-[#303139]">
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
