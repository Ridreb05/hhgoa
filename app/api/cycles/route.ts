import { NextRequest, NextResponse } from 'next/server';
import { getGraphProvider } from '@/lib/graph/provider';
import { EngineMode } from '@/lib/graph/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const windowParam = parseInt(searchParams.get('window') || '600', 10);
    const depthParam = parseInt(searchParams.get('depth') || '4', 10);
    const modeParam = searchParams.get('mode') as EngineMode | null;

    const provider = getGraphProvider(modeParam || undefined);
    const cycleResult = await provider.detectCycles(windowParam, depthParam);

    return NextResponse.json(cycleResult);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Cycle detection failed' },
      { status: 500 }
    );
  }
}
