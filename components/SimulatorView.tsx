'use client';

import React, { useState } from 'react';
import { CandidateTransaction, RiskAssessment } from '@/lib/graph/types';
import demoData from '@/data/demo/entities.json';
import {
  Play,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
  Send,
  Sliders,
  CheckCircle,
} from 'lucide-react';

interface SimulatorViewProps {
  initialScenarioId?: string;
}

export function SimulatorView({ initialScenarioId }: SimulatorViewProps) {
  const initialScenario = demoData.scenarios.find((s) => s.id === initialScenarioId) || demoData.scenarios[0];

  const [fromWallet, setFromWallet] = useState<string>(initialScenario.target_wallet);
  const [toWallet, setToWallet] = useState<string>(initialScenario.counterparty || '');
  const [amount, setAmount] = useState<string>('10.0');
  const [asset, setAsset] = useState<string>('ETH');
  const [dispatchAlert, setDispatchAlert] = useState<boolean>(true);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const loadScenario = (scenario: typeof demoData.scenarios[0]) => {
    setFromWallet(scenario.target_wallet);
    setToWallet(scenario.counterparty || '');
    setAmount('10.0');
    setResult(null);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWallet || !toWallet) return;

    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_wallet: fromWallet,
          to_wallet: toWallet,
          amount: parseFloat(amount),
          asset,
          dispatch_alert: dispatchAlert,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1-Click Scenario Preset Selector */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            1-Click Ground Truth Scenario Presets
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {demoData.scenarios.map((sc) => {
            const isSelected = fromWallet === sc.target_wallet && toWallet === sc.counterparty;
            return (
              <button
                key={sc.id}
                onClick={() => loadScenario(sc)}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/60 text-white'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      sc.expected_classification === 'REJECT'
                        ? 'bg-red-500/20 text-red-300'
                        : sc.expected_classification === 'REVIEW'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {sc.expected_classification}
                  </span>
                  <p className="text-xs font-semibold mt-1.5 leading-snug line-clamp-1">
                    {sc.name.split(':')[0]}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-2 truncate">
                  {sc.target_wallet}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Candidate Transaction Form */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-5">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Play className="w-4 h-4 text-cyan-400" />
          <span>Candidate Transaction Evaluation Form</span>
        </h3>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Source Wallet Address
              </label>
              <input
                type="text"
                value={fromWallet}
                onChange={(e) => setFromWallet(e.target.value)}
                required
                className="w-full bg-[#1e293b]/70 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Counterparty / Recipient Address
              </label>
              <input
                type="text"
                value={toWallet}
                onChange={(e) => setToWallet(e.target.value)}
                required
                className="w-full bg-[#1e293b]/70 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Proposed Transfer Amount
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-[#1e293b]/70 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Asset Symbol
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full bg-[#1e293b]/70 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ETH">ETH (Native)</option>
                <option value="USDC">USDC (ERC-20)</option>
                <option value="USDT">USDT (ERC-20)</option>
                <option value="DAI">DAI (Stablecoin)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={dispatchAlert}
                  onChange={(e) => setDispatchAlert(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Dispatch viaSocket alert if score ≥ 65</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSimulating}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs transition-colors shadow-lg shadow-cyan-950/50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Traversing Graph...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Pre-Flight Risk Simulation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Simulation Result */}
      {result && result.assessment && (
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Simulation Decision Output
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({result.engine_mode.toUpperCase()} MODE • {result.latency_ms} ms)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1 text-right">
                <span className="text-xs text-slate-400">Risk Score:</span>
                <span
                  className={`text-xl font-black font-mono ${
                    result.assessment.action === 'REJECT'
                      ? 'text-red-400'
                      : result.assessment.action === 'REVIEW'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {result.assessment.score}/100
                </span>
              </div>

              <div
                className={`px-3 py-1 rounded-lg border text-xs font-extrabold uppercase tracking-wide ${
                  result.assessment.action === 'REJECT'
                    ? 'bg-red-950/40 border-red-500/50 text-red-300'
                    : result.assessment.action === 'REVIEW'
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                    : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                }`}
              >
                {result.assessment.action}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {result.assessment.explanation}
          </p>

          {/* Triggered Rules Pill List */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Rule Triggers:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.assessment.contributing_rules
                .filter((r: any) => r.triggered)
                .map((rule: any) => (
                  <div
                    key={rule.rule_id}
                    className="p-2.5 rounded bg-red-950/20 border border-red-900/50 text-xs flex justify-between items-start"
                  >
                    <div>
                      <p className="font-semibold text-white">{rule.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{rule.explanation}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-red-400 ml-2">
                      +{rule.points}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* viaSocket Alert Result */}
          {result.alert_dispatch && (
            <div className="pt-2">
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                  result.alert_dispatch.status === 'DELIVERED'
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    : result.alert_dispatch.status === 'UNCONFIGURED'
                    ? 'bg-amber-950/40 border border-amber-500/40 text-amber-300'
                    : 'bg-red-950/40 border border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 shrink-0" />
                  <span>
                    viaSocket Alert: [{result.alert_dispatch.status}] {result.alert_dispatch.message}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
