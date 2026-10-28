'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, Save, RotateCcw, Download, Check, AlertCircle, Play } from 'lucide-react';

export function PolicyConfigView() {
  const [config, setConfig] = useState<any>({
    temporalCycleMaxPoints: 40,
    volumeRetentionMaxPoints: 15,
    sharedFundingMaxPoints: 20,
    riskSeedExposureMaxPoints: 45,
    agentDelegationMaxPoints: 10,
    allowThreshold: 34,
    reviewThreshold: 64,
    rejectThreshold: 65,
  });

  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/policy')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) setConfig(data.config);
      })
      .catch(console.error);
  }, []);

  const handleChange = (key: string, value: number) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSavedMessage('Policy configuration saved and activated across all risk queries.');
        setTimeout(() => setSavedMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save policy:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/policy', { method: 'DELETE' });
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setSavedMessage('Policy reset to default factory weights.');
        setTimeout(() => setSavedMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to reset policy:', err);
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghostshield_policy_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Live Simulated Preview Scores based on active slider weights
  const simulatedScenarioAScore = Math.min(
    100,
    config.temporalCycleMaxPoints +
      config.volumeRetentionMaxPoints +
      config.sharedFundingMaxPoints +
      config.agentDelegationMaxPoints
  );
  const simulatedScenarioBScore = 17; // Clean baseline
  const scenarioADecision =
    simulatedScenarioAScore >= config.rejectThreshold
      ? 'REJECT'
      : simulatedScenarioAScore >= config.allowThreshold + 1
      ? 'REVIEW'
      : 'ALLOW';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Risk Policy Engine Customizer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fine-tune mathematical signal weights and threshold corridors for simulated transaction authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Policy JSON</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Apply & Save Policy'}</span>
          </button>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Main Grid: Sliders & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders Column (2 cols) */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-card-border rounded-xl p-5 space-y-6">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-card-border pb-2">
            Signal Weight Allocations (Max 100 points total)
          </h3>

          {/* Slider 1: Cycle */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-200">
                1. Rapid Circular Transfer Window (Default: 40 pts)
              </span>
              <span className="font-mono font-bold text-cyan-400">
                {config.temporalCycleMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={config.temporalCycleMaxPoints}
              onChange={(e) => handleChange('temporalCycleMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-[10px] text-slate-500">
              Allocated when transfers form a closed directed loop within the temporal limit (600s).
            </p>
          </div>

          {/* Slider 2: Volume Retention */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-200">
                2. Capital Conservation & Volume Retention (Default: 15 pts)
              </span>
              <span className="font-mono font-bold text-cyan-400">
                {config.volumeRetentionMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={config.volumeRetentionMaxPoints}
              onChange={(e) => handleChange('volumeRetentionMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-[10px] text-slate-500">
              Allocated when capital conservation across the cycle exceeds 85%.
            </p>
          </div>

          {/* Slider 3: Shared Funding */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-200">
                3. Shared Upstream Mixer / Obfuscation Funding (Default: 20 pts)
              </span>
              <span className="font-mono font-bold text-cyan-400">
                {config.sharedFundingMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="35"
              value={config.sharedFundingMaxPoints}
              onChange={(e) => handleChange('sharedFundingMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-[10px] text-slate-500">
              Allocated when counterparts share upstream liquidity from sanctioned mixers or bridges.
            </p>
          </div>

          {/* Slider 4: Risk Seed Exposure */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-200">
                4. Proximity to Known Exploit / Sanctions Seed (Default: 45 pts)
              </span>
              <span className="font-mono font-bold text-cyan-400">
                {config.riskSeedExposureMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={config.riskSeedExposureMaxPoints}
              onChange={(e) => handleChange('riskSeedExposureMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-[10px] text-slate-500">
              Allocated when direct transfer connects to an active threat intelligence seed.
            </p>
          </div>

          {/* Slider 5: Agent Delegation */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-200">
                5. Multi-Tier Autonomous Agent Delegation (Default: 10 pts)
              </span>
              <span className="font-mono font-bold text-cyan-400">
                {config.agentDelegationMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={config.agentDelegationMaxPoints}
              onChange={(e) => handleChange('agentDelegationMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-[10px] text-slate-500">
              Allocated when wallet execution authority is controlled via autonomous solver hierarchies.
            </p>
          </div>

          {/* Decision Thresholds Section */}
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-card-border pb-2 pt-2">
            Authorization Decision Thresholds
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Allow Cap (≤ Score)</span>
                <span className="font-mono font-bold text-emerald-400">{config.allowThreshold}</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                value={config.allowThreshold}
                onChange={(e) => handleChange('allowThreshold', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Reject Floor (≥ Score)</span>
                <span className="font-mono font-bold text-red-400">{config.rejectThreshold}</span>
              </div>
              <input
                type="range"
                min="50"
                max="85"
                value={config.rejectThreshold}
                onChange={(e) => handleChange('rejectThreshold', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>
          </div>
        </div>

        {/* Live Simulation Preview Column (1 col) */}
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-card-border pb-2 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Policy Impact Preview</span>
            </h3>

            <div className="space-y-4 mt-4">
              {/* Scenario A Impact */}
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Scenario A (Cycle + Mixer)</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      scenarioADecision === 'REJECT'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {scenarioADecision}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400">Simulated Score:</span>
                  <span className="text-xl font-bold font-mono text-red-400">
                    {simulatedScenarioAScore} / 100
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Calculated from: Cycle ({config.temporalCycleMaxPoints}) + Retention ({config.volumeRetentionMaxPoints}) + Mixer ({config.sharedFundingMaxPoints}) + Agent ({config.agentDelegationMaxPoints})
                </p>
              </div>

              {/* Scenario B Impact */}
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Scenario B (Normal Transfer)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ALLOW
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400">Simulated Score:</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {simulatedScenarioBScore} / 100
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Clean baseline retains allowable status under configured thresholds.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0b1120] p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Policy Auditing Note:</span> Modifications saved here immediately take effect across both TigerGraph Cloud and Demo query paths.
          </div>
        </div>
      </div>
    </div>
  );
}
