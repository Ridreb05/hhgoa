import { NextResponse } from 'next/server';
import { getGraphProvider } from '@/lib/graph/provider';
import { defaultViaSocketNotifier } from '@/lib/integrations/viasocket';

export async function GET() {
  const provider = getGraphProvider();
  const graphHealth = await provider.checkHealth();
  const viasocketConfigured = defaultViaSocketNotifier.isConfigured();
  const aiConfigured = Boolean(process.env.AIGI_API_KEY || process.env.OPENAI_API_KEY);

  return NextResponse.json({
    engine_mode: provider.mode,
    timestamp: new Date().toISOString(),
    services: {
      graph_provider: {
        mode: provider.mode,
        status: graphHealth.status,
        latency_ms: graphHealth.latency_ms,
        message: graphHealth.message,
      },
      ai_engine: {
        status: aiConfigured ? 'CONFIGURED' : 'STANDBY_TEMPLATE_MODE',
        provider: process.env.AIGI_API_KEY ? 'AIGI' : process.env.OPENAI_API_KEY ? 'OpenAI' : 'Deterministic Template Fallback',
        model: process.env.AIGI_MODEL || 'gpt-4o-mini',
      },
      viasocket_alerts: {
        status: viasocketConfigured ? 'CONFIGURED' : 'UNCONFIGURED',
        webhook_configured: viasocketConfigured,
      },
    },
  });
}
