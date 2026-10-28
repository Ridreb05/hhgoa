import { NextRequest, NextResponse } from 'next/server';
import { getGraphProvider } from '@/lib/graph/provider';
import { EngineMode } from '@/lib/graph/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const source = searchParams.get('source');
    const target = searchParams.get('target');
    const maxHops = parseInt(searchParams.get('max_hops') || '4', 10);
    const modeParam = searchParams.get('mode') as EngineMode | null;

    if (!source || !target) {
      return NextResponse.json(
        { error: 'Both "source" and "target" query parameters are required' },
        { status: 400 }
      );
    }

    const provider = getGraphProvider(modeParam || undefined);
    const result = await provider.findPath(source, target, maxHops);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Path finding query failed' },
      { status: 500 }
    );
  }
}

