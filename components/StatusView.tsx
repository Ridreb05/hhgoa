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
                <span className="font-mono text-emerald-400 font-bold">
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

          <div className="text-[10px] text-slate-500 bg-[#0b1120] p-2 rounded border border-slate-800/80">
            Set <code className="text-cyan-400">TIGERGRAPH_HOST</code> in <code className="text-slate-400">.env</code> to connect live cluster.
          </div>
        </div>

        {/* 2. AI Grants India (AIGI) Narrative Engine Card */}
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-white text-sm">AI Grants India (AIGI)</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                  healthData?.services?.ai_engine?.status === 'CONFIGURED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {healthData?.services?.ai_engine?.status === 'CONFIGURED'
                  ? 'LIVE AIGI ROUTER'
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
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white text-sm">viaSocket Webhooks</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                  viasocketData?.webhook_configured
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {viasocketData?.webhook_configured ? 'CONNECTED' : 'UNCONFIGURED'}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Workflow URL:</span>
                <span className="font-mono text-slate-300 truncate max-w-[150px]">
                  {viasocketData?.webhook_url_masked || 'Not Configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Incident Auto-Fire:</span>
                <span className="text-red-400 font-semibold font-mono">Score ≥ 65 (REJECT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timeout Limit:</span>
                <span className="font-mono text-slate-200">4000 ms</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800 leading-relaxed">
              Dispatches structured JSON incident alerts directly to viaSocket inbound flows for automated notification in Slack, Discord, or SMS.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleTestViaSocket}
              disabled={isSendingTestAlert}
              className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingTestAlert ? 'Testing Dispatch...' : 'Dispatch Test Alert to viaSocket'}</span>
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

            <div className="text-[10px] text-slate-500 bg-[#0b1120] p-2 rounded border border-slate-800/80">
              Set <code className="text-purple-400">VIASOCKET_WEBHOOK_URL</code> in <code className="text-slate-400">.env</code>.
            </div>
          </div>
        </div>
      </div>

      {/* viaSocket Live Webhook Incident Log Table */}
      <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-card-border pb-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              viaSocket Alert Dispatch Telemetry Log
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Total Dispatched: {viasocketData?.total_logs || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="bg-[#111827] border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Log ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Wallet</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3 text-center">Delivery Status</th>
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {(viasocketData?.logs || []).map((l: any) => (
                <tr key={l.id} className="hover:bg-slate-850/50">
                  <td className="py-2.5 px-3 text-purple-300 font-semibold">{l.id}</td>
                  <td className="py-2.5 px-3 text-[10px] text-slate-400">
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{l.event}</td>
                  <td className="py-2.5 px-3 text-cyan-300">{l.walletId}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-red-400">
                    {l.riskScore}/100
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        l.status === 'DELIVERED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : l.status === 'UNCONFIGURED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {l.status} {l.httpStatus ? `(${l.httpStatus})` : ''}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[10px] text-slate-400 max-w-xs truncate">
                    {l.message}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleRetryAlert(l.id)}
                      disabled={retryingLogId === l.id}
                      className="px-2 py-0.5 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-[10px] font-medium transition-colors"
                    >
                      {retryingLogId === l.id ? 'Retrying...' : 'Resend'}
                    </button>
                  </td>
                </tr>
              ))}

              {(!viasocketData?.logs || viasocketData.logs.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                    No webhooks dispatched in this session yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Setup Guide & Demo Reset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Config Guide */}
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="uppercase text-xs tracking-wider">How to Configure Live Integrations</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed text-[11px]">
            <li>
              <strong className="text-slate-300">AI Grants India (AIGI):</strong> Add your API key as <code className="text-cyan-400">AIGI_API_KEY</code> and router base URL as <code className="text-cyan-400">AIGI_API_ENDPOINT</code> in <code className="text-slate-300">.env.local</code>.
            </li>
            <li>
              <strong className="text-slate-300">viaSocket Webhooks:</strong> Create a viaSocket workflow with a Webhook Trigger. Copy the endpoint URL and set <code className="text-purple-400">VIASOCKET_WEBHOOK_URL</code> in <code className="text-slate-300">.env.local</code>.
            </li>
            <li>
              <strong className="text-slate-300">TigerGraph Cloud:</strong> Set <code className="text-emerald-400">GHOSTSHIELD_ENGINE_MODE=tigergraph</code> with your cluster credentials.
            </li>
          </ol>
        </div>

        {/* Demo Reset Card */}
        <div className="bg-[#0f172a] border border-card-border rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Reset Synthetic Graph State</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Restores all in-memory entities, cyclic transfers, and funding sources back to the initial deterministic seed fixtures.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {resetMessage ? (
              <span className="text-xs text-emerald-400 font-medium">{resetMessage}</span>
            ) : (
              <span className="text-[11px] text-slate-500">Seed: Scenarios A–E</span>
            )}
            <button
              onClick={handleResetDemoData}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              Reset Graph State
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
