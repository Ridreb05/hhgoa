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
  Repeat,
  Check,
  HelpCircle,
} from 'lucide-react';

export function StatusView() {
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);

  // AIGI Test State
  const [aiTestResult, setAiTestResult] = useState<any>(null);
  const [isTestingAI, setIsTestingAI] = useState<boolean>(false);

  // viaSocket State
  const [viasocketData, setViasocketData] = useState<any>(null);
  const [testAlertResult, setTestAlertResult] = useState<any>(null);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState<boolean>(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Demo Reset State
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

  const fetchViaSocketLogs = async () => {
    try {
      const res = await fetch('/api/alerts/viasocket');
      const data = await res.json();
      setViasocketData(data);
    } catch (err) {
      console.error('Failed to load viaSocket logs:', err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchViaSocketLogs();
  }, []);

  const handleTestAI = async () => {
    setIsTestingAI(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/ai/report');
      const data = await res.json();
      setAiTestResult(data);
    } catch (err: any) {
      setAiTestResult({
        connected: false,
        message: `Network error: ${err.message}`,
      });
    } finally {
      setIsTestingAI(false);
    }
  };

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
      fetchViaSocketLogs();
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

  const handleRetryAlert = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      await fetch('/api/alerts/viasocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retry_id: logId }),
      });
      fetchViaSocketLogs();
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setRetryingLogId(null);
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
            System Infrastructure & Integration Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status for TigerGraph Cloud, AI Grants India (AIGI) model routing, and viaSocket incident webhooks
          </p>
        </div>
        <button
          onClick={() => {
            fetchHealth();
            fetchViaSocketLogs();
          }}
          disabled={isLoadingHealth}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
          <span>Refresh All Services</span>
        </button>
      </div>

      {/* Services Grid (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. TigerGraph Cloud Status Card */}
        <div className="bg-[#0d121c] border border-[#1b2333] p-4 flex flex-col justify-between space-y-3 font-mono">
          <div>
            <div className="flex items-center justify-between border-b border-[#1b2333] pb-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">TigerGraph Engine</span>
              </div>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-bold tracking-wider uppercase border ${
                  healthData?.services?.graph_provider?.status === 'ONLINE'
                    ? 'bg-emerald-950/20 text-emerald-300 border-emerald-500/30'
                    : healthData?.services?.graph_provider?.status === 'UNCONFIGURED'
                    ? 'bg-amber-950/20 text-amber-300 border-amber-500/30'
                    : 'bg-rose-950/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {healthData?.services?.graph_provider?.status || 'CHECKING...'}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mode:</span>
                <span className="font-mono text-cyan-300 uppercase font-bold">
                  {healthData?.engine_mode || 'demo'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Graph:</span>
                <span className="font-mono text-slate-300">GhostShieldGraph</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Latency:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {healthData?.services?.graph_provider?.latency_ms !== undefined
                    ? `${healthData.services.graph_provider.latency_ms} ms`
                    : '--'}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-[#1b2333] leading-relaxed font-sans">
              {healthData?.services?.graph_provider?.message ||
                'Local deterministic in-memory provider executing identical GSQL semantics.'}
            </p>
          </div>

          <div className="text-[10px] text-slate-500 bg-[#080b11] p-1.5 border border-[#1b2333]">
            Set <code className="text-cyan-400">TIGERGRAPH_HOST</code> in <code className="text-slate-400">.env</code> to connect live cluster.
          </div>
        </div>

        {/* 2. AI Grants India (AIGI) Narrative Engine Card */}
        <div className="bg-[#0d121c] border border-[#1b2333] p-4 flex flex-col justify-between space-y-3 font-mono">
          <div>
            <div className="flex items-center justify-between border-b border-[#1b2333] pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">AI Grants India</span>
              </div>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-bold tracking-wider uppercase border ${
                  healthData?.services?.ai_engine?.status === 'CONFIGURED'
                    ? 'bg-emerald-950/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-[#1b2333] text-cyan-300 border-cyan-500/30'
                }`}
              >
                {healthData?.services?.ai_engine?.status === 'CONFIGURED'
                  ? 'LIVE ROUTER'
                  : 'STANDBY TEMPLATE'}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Router Provider:</span>
                <span className="font-medium text-slate-200">
                  {healthData?.services?.ai_engine?.provider || 'AI Grants India'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Model:</span>
                <span className="font-mono text-cyan-300">
                  {healthData?.services?.ai_engine?.model || 'openai/gpt-4o-mini'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fallback Protection:</span>
                <span className="text-emerald-400 font-medium">Deterministic Rule Engine</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800 leading-relaxed">
              Produces structured natural language dossiers strictly cited from verified TigerGraph topological paths.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleTestAI}
              disabled={isTestingAI}
              className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTestingAI ? 'Pinging AIGI Endpoint...' : 'Test AIGI Model Connection'}</span>
            </button>

            {aiTestResult && (
              <div
                className={`p-2 rounded text-[11px] ${
                  aiTestResult.connected
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    : 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-300'
                }`}
              >
                <div className="flex justify-between">
                  <span>{aiTestResult.message}</span>
                  {aiTestResult.latency_ms > 0 && (
                    <span className="font-mono font-bold">{aiTestResult.latency_ms} ms</span>
                  )}
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-500 bg-[#0b1120] p-2 rounded border border-slate-800/80">
              Set <code className="text-cyan-400">AIGI_API_KEY</code> to enable live LLM synthesis.
            </div>
          </div>
        </div>

        {/* 3. viaSocket Webhook Dispatcher Card */}
        <div className="bg-[#0d121c] border border-[#1b2333] p-4 flex flex-col justify-between space-y-3 font-mono">
          <div>
            <div className="flex items-center justify-between border-b border-[#1b2333] pb-2">
              <div className="flex items-center gap-1.5">
                <Send className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">viaSocket Webhook</span>
              </div>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-bold tracking-wider uppercase border ${
                  viasocketData?.webhook_configured
                    ? 'bg-emerald-950/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-950/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {viasocketData?.webhook_configured ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">URL:</span>
                <span className="font-mono text-slate-300 truncate max-w-[150px]">
                  {viasocketData?.webhook_url_masked || 'Not Configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auto-Fire:</span>
                <span className="text-rose-400 font-bold font-mono">Score ≥ 65 (REJECT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timeout:</span>
                <span className="font-mono text-slate-300">4000 ms</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-[#1b2333] leading-relaxed font-sans">
              Dispatches structured JSON incident alerts directly to viaSocket inbound flows for automated notification in Slack, Discord, or SMS.
            </p>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={handleTestViaSocket}
              disabled={isSendingTestAlert}
              className="w-full py-1.5 px-3 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-indigo-500/40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingTestAlert ? 'DISPATCHING...' : 'DISPATCH TEST ALERT'}</span>
            </button>

            {testAlertResult && (
              <div
                className={`p-1.5 border text-[10px] font-mono ${
                  testAlertResult.status === 'DELIVERED'
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : testAlertResult.status === 'UNCONFIGURED'
                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                    : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                }`}
              >
                [{testAlertResult.status}] {testAlertResult.message}
              </div>
            )}

            <div className="text-[10px] text-slate-500 bg-[#080b11] p-1.5 border border-[#1b2333]">
              Set <code className="text-indigo-400">VIASOCKET_WEBHOOK_URL</code> in <code className="text-slate-400">.env</code>.
            </div>
          </div>
        </div>
      </div>

      {/* viaSocket Live Webhook Incident Log Table */}
      <div className="bg-[#0d121c] border border-[#1b2333] p-4 space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-[#1b2333] pb-2">
          <div className="flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              VIASOCKET DISPATCH TELEMETRY
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            DISPATCHES: {viasocketData?.total_logs || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="bg-[#080b11] border-b border-[#1b2333] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2 px-3">LOG ID</th>
                <th className="py-2 px-3">TIMESTAMP</th>
                <th className="py-2 px-3">EVENT</th>
                <th className="py-2 px-3">WALLET</th>
                <th className="py-2 px-3 text-center">SCORE</th>
                <th className="py-2 px-3 text-center">STATUS</th>
                <th className="py-2 px-3">DETAILS</th>
                <th className="py-2 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2333] font-mono text-[11px]">
              {(viasocketData?.logs || []).map((l: any) => (
                <tr key={l.id} className="hover:bg-[#111827]">
                  <td className="py-2 px-3 text-indigo-300 font-semibold">{l.id}</td>
                  <td className="py-2 px-3 text-[10px] text-slate-400">
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3 text-slate-300">{l.event}</td>
                  <td className="py-2 px-3 text-cyan-300">{l.walletId}</td>
                  <td className="py-2 px-3 text-center font-bold text-rose-400">
                    {l.riskScore}/100
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border ${
                        l.status === 'DELIVERED'
                          ? 'bg-emerald-950/20 text-emerald-300 border-emerald-500/40'
                          : l.status === 'UNCONFIGURED'
                          ? 'bg-amber-950/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-950/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {l.status} {l.httpStatus ? `(${l.httpStatus})` : ''}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[10px] text-slate-400 max-w-xs truncate font-mono">
                    {l.message}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => handleRetryAlert(l.id)}
                      disabled={retryingLogId === l.id}
                      className="px-2 py-0.5 bg-[#080b11] hover:bg-[#1e293b] text-indigo-300 border border-indigo-500/30 text-[10px] font-bold transition-colors"
                    >
                      {retryingLogId === l.id ? '...' : 'RESEND'}
                    </button>
                  </td>
                </tr>
              ))}

              {(!viasocketData?.logs || viasocketData.logs.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-600 italic">
                    No webhooks dispatched in this session yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Setup Guide & Demo Reset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
        {/* Quick Config Guide */}
        <div className="bg-[#0d121c] border border-[#1b2333] p-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-white font-bold uppercase tracking-wider border-b border-[#1b2333] pb-2">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">CONFIGURATION KEYS</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] font-sans leading-relaxed">
            <li>
              <strong className="text-slate-300">AI Grants India (AIGI):</strong> Add your API key as <code className="text-cyan-400 font-mono">AIGI_API_KEY</code> and router base URL as <code className="text-cyan-400 font-mono">AIGI_API_ENDPOINT</code> in <code className="text-slate-300 font-mono">.env.local</code>.
            </li>
            <li>
              <strong className="text-slate-300">viaSocket Webhooks:</strong> Create a viaSocket workflow with a Webhook Trigger. Copy the endpoint URL and set <code className="text-indigo-400 font-mono">VIASOCKET_WEBHOOK_URL</code> in <code className="text-slate-300 font-mono">.env.local</code>.
            </li>
            <li>
              <strong className="text-slate-300">TigerGraph Cloud:</strong> Set <code className="text-emerald-400 font-mono">GHOSTSHIELD_ENGINE_MODE=tigergraph</code> with your cluster credentials.
            </li>
          </ol>
        </div>

        {/* Demo Reset Card */}
        <div className="bg-[#0d121c] border border-[#1b2333] p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-white font-bold uppercase tracking-wider border-b border-[#1b2333] pb-2">
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px]">RESET GRAPH FIXTURES</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-sans leading-relaxed">
              Restores in-memory vertices, cyclic transfers, and funding sources back to the initial deterministic seed fixtures.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1b2333]">
            {resetMessage ? (
              <span className="text-xs text-emerald-400 font-medium font-mono">{resetMessage}</span>
            ) : (
              <span className="text-[10px] text-slate-500 font-mono">SEED: SCENARIOS A–E</span>
            )}
            <button
              onClick={handleResetDemoData}
              className="px-3 py-1.5 bg-[#080b11] hover:bg-[#1e293b] text-slate-200 border border-[#1b2333] text-xs font-bold transition-colors font-mono"
            >
              RESET FIXTURES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
