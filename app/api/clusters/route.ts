import { NextRequest, NextResponse } from 'next/server';
import { getGraphProvider } from '@/lib/graph/provider';
import { EngineMode } from '@/lib/graph/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const minSize = parseInt(searchParams.get('min_size') || '2', 10);
    const modeParam = searchParams.get('mode') as EngineMode | null;

    const provider = getGraphProvider(modeParam || undefined);
    const result = await provider.getSybilClusters(minSize);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to detect Sybil clusters' },
      { status: 500 }
    );
  }
}
