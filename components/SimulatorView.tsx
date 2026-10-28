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
    <div className="space-y-6 font-sans">
      {/* 1-Click Scenario Preset Selector */}
      <div className="financial-panel p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#ff951f]" />
          <h3 className="text-xs font-mono font-bold text-[#f4f5f7] uppercase tracking-wider">
            GROUND TRUTH SCENARIO PRESETS
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {demoData.scenarios.map((sc) => {
            const isSelected = fromWallet === sc.target_wallet && toWallet === sc.counterparty;
            return (
              <button
                key={sc.id}
                onClick={() => loadScenario(sc)}
                className={`p-3 rounded-[5px] border text-left transition-all duration-[160ms] ease-out flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#101522] border-[#ff951f] text-[#f4f5f7]'
                    : 'bg-[#07090e] border-[#303139] text-[#c9ced8] hover:text-[#f4f5f7] hover:border-[#c9ced8]/50'
                }`}
              >
                <div>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-[40px] border uppercase tracking-wider ${
                      sc.expected_classification === 'REJECT'
                        ? 'border-[#f43f5e]/40 text-[#f43f5e] bg-[#101522]'
                        : sc.expected_classification === 'REVIEW'
                        ? 'border-[#ff951f]/40 text-[#ff951f] bg-[#101522]'
                        : 'border-[#34d399]/40 text-[#34d399] bg-[#101522]'
                    }`}
                  >
                    {sc.expected_classification}
                  </span>
                  <p className="text-xs font-semibold mt-2 leading-snug line-clamp-1 font-sans">
                    {sc.name.split(':')[0]}
                  </p>
                </div>
                <p className="text-[11px] text-[#edcd8c] font-mono mt-2 truncate">
                  {sc.target_wallet}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Candidate Transaction Form */}
      <div className="financial-panel p-6 space-y-4">
        <h3 className="text-xs font-mono font-bold text-[#f4f5f7] uppercase tracking-wider flex items-center gap-2 border-b border-[#303139] pb-3">
          <Play className="w-4 h-4 text-[#ff951f]" />
          <span>TRANSACTION PRE-FLIGHT RISK SIMULATION</span>
        </h3>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider mb-1.5">
                Source Wallet Address
              </label>
              <input
                type="text"
                value={fromWallet}
                onChange={(e) => setFromWallet(e.target.value)}
                required
                className="w-full bg-[#07090e] border border-[#303139] rounded-[5px] px-3 py-2 text-xs text-[#f4f5f7] font-mono placeholder-[#c9ced8]/50 focus:outline-none focus:border-[#ff951f]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider mb-1.5">
                Counterparty / Recipient Address
              </label>
              <input
                type="text"
                value={toWallet}
                onChange={(e) => setToWallet(e.target.value)}
                required
                className="w-full bg-[#07090e] border border-[#303139] rounded-[5px] px-3 py-2 text-xs text-[#f4f5f7] font-mono placeholder-[#c9ced8]/50 focus:outline-none focus:border-[#ff951f]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider mb-1.5">
                Transfer Amount
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-[#07090e] border border-[#303139] rounded-[5px] px-3 py-2 text-xs text-[#f4f5f7] font-mono focus:outline-none focus:border-[#ff951f]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-[#c9ced8] uppercase tracking-wider mb-1.5">
                Asset
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full bg-[#07090e] border border-[#303139] rounded-[5px] px-3 py-2 text-xs text-[#f4f5f7] font-mono focus:outline-none focus:border-[#ff951f]"
              >
                <option value="ETH">ETH (Native)</option>
                <option value="USDC">USDC (ERC-20)</option>
                <option value="USDT">USDT (ERC-20)</option>
                <option value="DAI">DAI (Stablecoin)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#c9ced8]">
                <input
                  type="checkbox"
                  checked={dispatchAlert}
                  onChange={(e) => setDispatchAlert(e.target.checked)}
                  className="rounded-[3px] bg-[#07090e] border-[#303139] text-[#ff951f] focus:ring-0"
                />
                <span className="text-xs">Dispatch viaSocket webhook if score ≥ 65</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSimulating}
              className="btn-financial-primary"
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
        <div className="financial-panel p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#303139] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#f4f5f7] uppercase tracking-wider">
                SIMULATION OUTPUT
              </span>
              <span className="text-[11px] font-mono text-[#c9ced8]">
                ({result.engine_mode.toUpperCase()} ADAPTER • {result.latency_ms} ms)
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-1 text-right font-mono">
                <span className="text-[11px] text-[#c9ced8] font-bold">SCORE:</span>
                <span className="text-2xl font-bold text-[#edcd8c] tabular-nums">
                  {result.assessment.score}/100
                </span>
              </div>

              <div
                className={`px-3 py-1.5 rounded-[5px] border text-xs font-mono font-bold uppercase tracking-wider ${
                  result.assessment.action === 'REJECT'
                    ? 'bg-[#101522] border-[#f43f5e]/50 text-[#f43f5e]'
                    : result.assessment.action === 'REVIEW'
                    ? 'bg-[#101522] border-[#ff951f]/50 text-[#ff951f]'
                    : 'bg-[#101522] border-[#34d399]/50 text-[#34d399]'
                }`}
              >
                {result.assessment.action}
              </div>
            </div>
          </div>

          <p className="text-sm text-[#c9ced8] leading-[1.65] font-sans">
            {result.assessment.explanation}
          </p>

          {/* Triggered Rules List */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono font-bold text-[#edcd8c] uppercase tracking-wider">
              EVIDENCE ATTRIBUTIONS:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.assessment.contributing_rules
                .filter((r: any) => r.triggered)
                .map((rule: any) => (
                  <div
                    key={rule.rule_id}
                    className="p-3 border border-[#303139] bg-[#07090e] rounded-[5px] text-xs flex justify-between items-start font-sans"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#f4f5f7] text-xs">{rule.name}</p>
                      <p className="text-[11px] text-[#c9ced8] leading-snug">{rule.explanation}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#edcd8c] ml-3 shrink-0">
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
                className={`p-3 rounded-[5px] border text-xs flex items-center justify-between font-mono ${
                  result.alert_dispatch.status === 'DELIVERED'
                    ? 'bg-[#101522] border-[#34d399]/40 text-[#34d399]'
                    : result.alert_dispatch.status === 'UNCONFIGURED'
                    ? 'bg-[#101522] border-[#ff951f]/40 text-[#ff951f]'
                    : 'bg-[#101522] border-[#f43f5e]/40 text-[#f43f5e]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 shrink-0 text-[#ff951f]" />
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
