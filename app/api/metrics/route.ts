import { NextRequest, NextResponse } from 'next/server';
import { getGraphProvider } from '@/lib/graph/provider';
import { EngineMode } from '@/lib/graph/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const modeParam = searchParams.get('mode') as EngineMode | null;
    const provider = getGraphProvider(modeParam || undefined);

    const metrics = await provider.getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}
