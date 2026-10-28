import { NextRequest, NextResponse } from 'next/server';
import { defaultViaSocketNotifier } from '@/lib/integrations/viasocket';

export async function GET() {
  const isConfigured = defaultViaSocketNotifier.isConfigured();
  const logs = defaultViaSocketNotifier.getLogs();

  return NextResponse.json({
    webhook_configured: isConfigured,
    webhook_url_masked: isConfigured
      ? `${defaultViaSocketNotifier.getWebhookUrl()?.substring(0, 32)}...`
      : 'Not Configured',
    total_logs: logs.length,
    logs,
  });
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin;
    const body = await req.json().catch(() => ({}));

    if (body.retry_id) {
      const result = await defaultViaSocketNotifier.retryAlert(body.retry_id);
      return NextResponse.json(result);
    }

    if (body.test === true || !body.assessment) {
      const result = await defaultViaSocketNotifier.sendTestAlert(origin);
      return NextResponse.json(result);
    }

    const result = await defaultViaSocketNotifier.sendAlert(body.assessment, origin);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'viaSocket alert failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  defaultViaSocketNotifier.clearLogs();
  return NextResponse.json({
    success: true,
    message: 'viaSocket delivery log history cleared.',
  });
}
