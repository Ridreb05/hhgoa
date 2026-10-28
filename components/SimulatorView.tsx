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
    <div className="space-y-4 font-mono">
      {/* 1-Click Scenario Preset Selector */}
      <div className="bg-[#0d121c] border border-[#1b2333] p-3.5">
        <div className="flex items-center gap-2 mb-2.5">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">
            GROUND TRUTH SCENARIO PRESETS
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {demoData.scenarios.map((sc) => {
            const isSelected = fromWallet === sc.target_wallet && toWallet === sc.counterparty;
            return (
              <button
                key={sc.id}
                onClick={() => loadScenario(sc)}
                className={`p-2.5 border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-500/60 text-white'
                    : 'bg-[#080b11] border-[#1b2333] text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <span
                    className={`text-[9px] font-bold px-1 py-0.2 border uppercase tracking-wider ${
                      sc.expected_classification === 'REJECT'
                        ? 'border-rose-500/40 text-rose-300 bg-rose-950/20'
                        : sc.expected_classification === 'REVIEW'
                        ? 'border-amber-500/40 text-amber-300 bg-amber-950/20'
                        : 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20'
                    }`}
                  >
                    {sc.expected_classification}
                  </span>
                  <p className="text-xs font-semibold mt-1.5 leading-snug line-clamp-1 font-mono">
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
      <div className="bg-[#0d121c] border border-[#1b2333] p-4">
        <h3 className="text-[11px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 text-cyan-400" />
          <span>TRANSACTION PRE-FLIGHT RISK SIMULATION</span>
        </h3>

        <form onSubmit={handleSimulate} className="space-y-3 font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Source Wallet Address
              </label>
              <input
                type="text"
                value={fromWallet}
                onChange={(e) => setFromWallet(e.target.value)}
                required
                className="w-full bg-[#080b11] border border-[#1b2333] px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Counterparty / Recipient Address
              </label>
              <input
                type="text"
                value={toWallet}
                onChange={(e) => setToWallet(e.target.value)}
                required
                className="w-full bg-[#080b11] border border-[#1b2333] px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Amount
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-[#080b11] border border-[#1b2333] px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Asset
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full bg-[#080b11] border border-[#1b2333] px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="ETH">ETH (Native)</option>
                <option value="USDC">USDC (ERC-20)</option>
                <option value="USDT">USDT (ERC-20)</option>
                <option value="DAI">DAI (Stablecoin)</option>
              </select>
            </div>

            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={dispatchAlert}
                  onChange={(e) => setDispatchAlert(e.target.checked)}
                  className="bg-[#080b11] border-[#1b2333] text-cyan-500 focus:ring-0"
                />
                <span className="text-[11px]">Dispatch viaSocket webhook if score ≥ 65</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 border border-cyan-500/50 disabled:opacity-50 text-white font-bold text-xs transition-colors"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>TRAVERSING GRAPH...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>SIMULATE TRANSACTION RISK</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Simulation Result */}
      {result && result.assessment && (
        <div className="bg-[#0d121c] border border-[#1b2333] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2333] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                SIMULATION OUTPUT
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                ({result.engine_mode.toUpperCase()} ADAPTER • {result.latency_ms} ms)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1 text-right font-mono">
                <span className="text-[10px] text-slate-500 font-bold">SCORE:</span>
                <span
                  className={`text-lg font-bold ${
                    result.assessment.action === 'REJECT'
                      ? 'text-rose-400'
                      : result.assessment.action === 'REVIEW'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {result.assessment.score}/100
                </span>
              </div>

              <div
                className={`px-2.5 py-1 border text-xs font-bold uppercase tracking-wider ${
                  result.assessment.action === 'REJECT'
                    ? 'bg-rose-950/20 border-rose-500/50 text-rose-300'
                    : result.assessment.action === 'REVIEW'
                    ? 'bg-amber-950/20 border-amber-500/50 text-amber-300'
                    : 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
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
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              EVIDENCE ATTRIBUTIONS:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.assessment.contributing_rules
                .filter((r: any) => r.triggered)
                .map((rule: any) => (
                  <div
                    key={rule.rule_id}
                    className="p-2 border border-rose-900/40 bg-rose-950/10 text-xs flex justify-between items-start font-mono"
                  >
                    <div>
                      <p className="font-semibold text-white text-[11px]">{rule.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{rule.explanation}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-400 ml-2 shrink-0">
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
                className={`p-2 border text-xs flex items-center justify-between font-mono ${
                  result.alert_dispatch.status === 'DELIVERED'
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : result.alert_dispatch.status === 'UNCONFIGURED'
                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                    : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    WEBHOOK: [{result.alert_dispatch.status}] {result.alert_dispatch.message}
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
