'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export function StatusView() {
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);
  const [testAlertResult, setTestAlertResult] = useState<any>(null);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to load health status:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleTestViaSocket = async () => {
    setIsSendingTestAlert(true);
    setTestAlertResult(null);
    try {
      const res = await fetch('/api/alerts/viasocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      const data = await res.json();
      setTestAlertResult(data);
    } catch (err: any) {
      setTestAlertResult({
        success: false,
        status: 'FAILED',
        message: err.message,
      });
    } finally {
      setIsSendingTestAlert(false);
    }
  };

  const handleResetDemoData = async () => {
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      setResetMessage(data.message);
      setTimeout(() => setResetMessage(null), 4000);
    } catch (err: any) {
      setResetMessage(`Failed to reset: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            System Infrastructure & Service Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status for TigerGraph Cloud, AI synthesis engine, and viaSocket alerts
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={isLoadingHealth}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. TigerGraph Cloud Status Card */}
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-white text-sm">TigerGraph Engine</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                  healthData?.services?.graph_provider?.status === 'ONLINE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : healthData?.services?.graph_provider?.status === 'UNCONFIGURED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {healthData?.services?.graph_provider?.status || 'CHECKING...'}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Mode:</span>
                <span className="font-mono text-cyan-300 uppercase font-semibold">
                  {healthData?.engine_mode || 'demo'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Graph:</span>
                <span className="font-mono text-slate-200">GhostShieldGraph</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Measured Latency:</span>
                <span className="font-mono text-emerald-400">
                  {healthData?.services?.graph_provider?.latency_ms !== undefined
                    ? `${healthData.services.graph_provider.latency_ms} ms`
                    : '--'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800 leading-relaxed">
              {healthData?.services?.graph_provider?.message ||
                'Local deterministic in-memory provider executing identical GSQL semantics.'}
            </p>
          </div>

          <div className="text-[10px] text-slate-500">
            To switch to live TigerGraph Cloud, configure <code className="text-cyan-400">TIGERGRAPH_HOST</code> in <code className="text-slate-400">.env</code>.
          </div>
        </div>

        {/* 2. AI Synthesis Engine */}
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-white text-sm">AI Narrative Engine</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                  healthData?.services?.ai_engine?.status === 'CONFIGURED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {healthData?.services?.ai_engine?.status || 'CHECKING...'}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Provider:</span>
                <span className="font-medium text-slate-200">
                  {healthData?.services?.ai_engine?.provider || 'Deterministic Template'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Model:</span>
                <span className="font-mono text-slate-200">
                  {healthData?.services?.ai_engine?.model || 'gpt-4o-mini'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fallback Protection:</span>
                <span className="text-emerald-400 font-medium">Zero-Hallucination Template</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800 leading-relaxed">
              Synthesizes structured TigerGraph evidence into human-readable forensic reports. Scoring remains 100% deterministic.
            </p>
          </div>

          <div className="text-[10px] text-slate-500">
            Set <code className="text-cyan-400">AIGI_API_KEY</code> or <code className="text-cyan-400">OPENAI_API_KEY</code> to enable live LLM generation.
          </div>
        </div>

        {/* 3. viaSocket Webhook Dispatcher */}
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white text-sm">viaSocket Webhook</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                  healthData?.services?.viasocket_alerts?.webhook_configured
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {healthData?.services?.viasocket_alerts?.status || 'UNCONFIGURED'}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Webhook Config:</span>
                <span className="font-mono text-slate-200">
                  {healthData?.services?.viasocket_alerts?.webhook_configured ? 'Configured' : 'Missing URL'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auto Trigger:</span>
                <span className="text-slate-200">Score ≥ 65 (REJECT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timeout Cap:</span>
                <span className="font-mono text-slate-200">4000 ms</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800 leading-relaxed">
              Dispatches incident webhooks to viaSocket workflow automation for Slack, Discord, or pager escalations.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleTestViaSocket}
              disabled={isSendingTestAlert}
              className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingTestAlert ? 'Testing Delivery...' : 'Send Test Ping to viaSocket'}</span>
            </button>

            {testAlertResult && (
              <div
                className={`p-2 rounded text-[11px] ${
                  testAlertResult.status === 'DELIVERED'
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    : testAlertResult.status === 'UNCONFIGURED'
                    ? 'bg-amber-950/40 border border-amber-500/40 text-amber-300'
                    : 'bg-red-950/40 border border-red-500/40 text-red-300'
                }`}
              >
                [{testAlertResult.status}] {testAlertResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Reset Card */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>Reset Demo Synthetic Graph Data</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Restores in-memory wallets, transfers, and funding sources back to initial deterministic seed fixtures
          </p>
        </div>

        <div className="flex items-center gap-3">
          {resetMessage && (
            <span className="text-xs text-emerald-400 font-medium">{resetMessage}</span>
          )}
          <button
            onClick={handleResetDemoData}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            Reset In-Memory Data
          </button>
        </div>
      </div>
    </div>
  );
}
