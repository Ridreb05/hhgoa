import { NextRequest, NextResponse } from 'next/server';
import { defaultRiskEngine } from '@/lib/risk/engine';

export async function GET() {
  const config = defaultRiskEngine.getConfig();
  return NextResponse.json({
    config,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = defaultRiskEngine.updateConfig(body);
    return NextResponse.json({
      success: true,
      message: 'Risk policy configuration updated successfully.',
      config: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update policy configuration' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const reset = defaultRiskEngine.resetConfig();
  return NextResponse.json({
    success: true,
    message: 'Risk policy configuration reset to default factory weights.',
    config: reset,
  });
}
