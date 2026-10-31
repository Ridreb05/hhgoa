import { NextRequest, NextResponse } from 'next/server';
import { getGraphProvider } from '@/lib/graph/provider';
import { EngineMode } from '@/lib/graph/types';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const maxHops = parseInt(params.get('max_hops') || '4', 10);
    const limit = parseInt(params.get('limit') || '25', 10);
    const provider = getGraphProvider((params.get('mode') as EngineMode | null) || undefined);
    return NextResponse.json(await provider.getRiskPropagation(maxHops, limit));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Risk propagation failed' }, { status: 500 });
  }
}
