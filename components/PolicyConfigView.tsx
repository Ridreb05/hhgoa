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
    <div className="space-y-4 font-mono">
      {/* Top Header */}
      <div className="financial-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold text-[#f4f5f7] uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#ff951f]" />
            <span>RISK ENGINE WEIGHT & THRESHOLD POLICY</span>
          </h2>
          <p className="text-[11px] text-[#c9ced8] mt-0.5 font-sans">
            Calibrate mathematical signal weights and threshold corridors governing graph-based transaction risk attribution.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={handleExportJSON}
            className="btn-financial-secondary px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5"
          >
            <Download className="w-3 h-3 text-[#edcd8c]" />
            <span>EXPORT JSON</span>
          </button>
          <button
            onClick={handleReset}
            className="btn-financial-secondary px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3 text-[#c9ced8]" />
            <span>RESET</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-financial-primary px-4 py-1.5 text-xs font-medium flex items-center gap-1.5"
          >
            <Save className="w-3 h-3" />
            <span>{isSaving ? 'SAVING...' : 'APPLY POLICY'}</span>
          </button>
        </div>
      </div>

      {savedMessage && (
        <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 font-mono rounded-[5px]">
          <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Main Grid: Sliders & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sliders Column (2 cols) */}
        <div className="lg:col-span-2 financial-panel p-4 space-y-4">
          <h3 className="text-xs font-bold text-[#f4f5f7] uppercase tracking-wider border-b border-[#303139] pb-2">
            SIGNAL WEIGHT ATTRIBUTIONS (MAX 100 PTS)
          </h3>

          {/* Slider 1: Cycle */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-medium text-[#c9ced8]">
                1. Rapid Circular Transfer Window (Default: 40 pts)
              </span>
              <span className="font-bold text-[#edcd8c] tabular-nums">
                {config.temporalCycleMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={config.temporalCycleMaxPoints}
              onChange={(e) => handleChange('temporalCycleMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#07090e] border border-[#303139] rounded appearance-none cursor-pointer accent-[#ff951f]"
            />
            <p className="text-[10px] text-[#c9ced8]/70 font-sans">
              Allocated when transfers form a closed directed loop within the temporal limit (600s).
            </p>
          </div>

          {/* Slider 2: Volume Retention */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-medium text-[#c9ced8]">
                2. Capital Conservation & Volume Retention (Default: 15 pts)
              </span>
              <span className="font-bold text-[#edcd8c] tabular-nums">
                {config.volumeRetentionMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={config.volumeRetentionMaxPoints}
              onChange={(e) => handleChange('volumeRetentionMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#07090e] border border-[#303139] rounded appearance-none cursor-pointer accent-[#ff951f]"
            />
            <p className="text-[10px] text-[#c9ced8]/70 font-sans">
              Allocated when capital conservation across the cycle exceeds 85%.
            </p>
          </div>

          {/* Slider 3: Shared Funding */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-medium text-[#c9ced8]">
                3. Shared Upstream Obfuscation Funding (Default: 20 pts)
              </span>
              <span className="font-bold text-[#edcd8c] tabular-nums">
                {config.sharedFundingMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="35"
              value={config.sharedFundingMaxPoints}
              onChange={(e) => handleChange('sharedFundingMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#07090e] border border-[#303139] rounded appearance-none cursor-pointer accent-[#ff951f]"
            />
            <p className="text-[10px] text-[#c9ced8]/70 font-sans">
              Allocated when counterparts share upstream liquidity from sanctioned mixers or bridges.
            </p>
          </div>

          {/* Slider 4: Risk Seed Exposure */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-medium text-[#c9ced8]">
                4. Proximity to Sanctions / Exploit Seed (Default: 45 pts)
              </span>
              <span className="font-bold text-[#edcd8c] tabular-nums">
                {config.riskSeedExposureMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={config.riskSeedExposureMaxPoints}
              onChange={(e) => handleChange('riskSeedExposureMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#07090e] border border-[#303139] rounded appearance-none cursor-pointer accent-[#ff951f]"
            />
            <p className="text-[10px] text-[#c9ced8]/70 font-sans">
              Allocated when direct transfer connects to an active threat intelligence seed.
            </p>
          </div>

          {/* Slider 5: Agent Delegation */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-medium text-[#c9ced8]">
                5. Multi-Tier Agent Delegation (Default: 10 pts)
              </span>
              <span className="font-bold text-[#edcd8c] tabular-nums">
                {config.agentDelegationMaxPoints} pts
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={config.agentDelegationMaxPoints}
              onChange={(e) => handleChange('agentDelegationMaxPoints', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#07090e] border border-[#303139] rounded appearance-none cursor-pointer accent-[#ff951f]"
            />
            <p className="text-[10px] text-[#c9ced8]/70 font-sans">
              Allocated when wallet execution authority is controlled via autonomous solver hierarchies.
            </p>
          </div>

          {/* Decision Thresholds Section */}
          <h3 className="text-xs font-bold text-[#f4f5f7] uppercase tracking-wider border-b border-[#303139] pb-2 pt-2">
            DECISION THRESHOLDS
          </h3>

          <div className="grid grid-cols-2 gap-4 font-mono">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#c9ced8]">Allow Cap (≤ Score)</span>
                <span className="font-bold text-[#edcd8c] tabular-nums">{config.allowThreshold}</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                value={config.allowThreshold}
                onChange={(e) => handleChange('allowThreshold', parseInt(e.target.value, 10))}
                className="w-full h-1 bg-[#07090e] border border-[#303139] rounded appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#c9ced8]">Reject Floor (≥ Score)</span>
                <span className="font-bold text-rose-400 tabular-nums">{config.rejectThreshold}</span>
              </div>
              <input
                type="range"
                min="50"
                max="85"
                value={config.rejectThreshold}
                onChange={(e) => handleChange('rejectThreshold', parseInt(e.target.value, 10))}
                className="w-full h-1 bg-[#07090e] border border-[#303139] rounded appearance-none cursor-pointer accent-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Live Simulation Preview Column (1 col) */}
        <div className="financial-panel p-4 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#f4f5f7] uppercase tracking-wider border-b border-[#303139] pb-2 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-[#ff951f]" />
              <span>LIVE POLICY PREVIEW</span>
            </h3>

            <div className="space-y-3 mt-3">
              {/* Scenario A Impact */}
              <div className="bg-[#07090e] border border-[#303139] rounded-[4px] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#f4f5f7]">Scenario A (Cycle + Mixer)</span>
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-bold border rounded-[2px] ${
                      scenarioADecision === 'REJECT'
                        ? 'bg-rose-950/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-950/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {scenarioADecision}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[#c9ced8] text-[10px] uppercase font-mono">SCORE:</span>
                  <span className="text-xl font-bold font-mono text-[#edcd8c] tabular-nums">
                    {simulatedScenarioAScore} / 100
                  </span>
                </div>
                <p className="text-[10px] text-[#c9ced8]/70 font-mono">
                  Cycle ({config.temporalCycleMaxPoints}) + Vol ({config.volumeRetentionMaxPoints}) + Mix ({config.sharedFundingMaxPoints}) + Agent ({config.agentDelegationMaxPoints})
                </p>
              </div>

              {/* Scenario B Impact */}
              <div className="bg-[#07090e] border border-[#303139] rounded-[4px] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#f4f5f7]">Scenario B (Clean Transfer)</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-950/20 text-emerald-300 border border-emerald-500/40 rounded-[2px]">
                    ALLOW
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[#c9ced8] text-[10px] uppercase font-mono">SCORE:</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                    {simulatedScenarioBScore} / 100
                  </span>
                </div>
                <p className="text-[10px] text-[#c9ced8]/70 font-sans">
                  Clean baseline remains allowable under current policy bounds.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#07090e] p-2.5 border border-[#303139] rounded-[4px] text-[10px] text-[#c9ced8] font-sans">
            <span className="font-bold text-[#f4f5f7]">Policy Note:</span> Adjustments propagate dynamically across both TigerGraph Cloud and Demo query paths.
          </div>
        </div>
      </div>
    </div>
  );
}

