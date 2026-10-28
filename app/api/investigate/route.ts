import { NextRequest, NextResponse } from 'next/server';
import { getGraphProvider } from '@/lib/graph/provider';
import { defaultRiskEngine } from '@/lib/risk/engine';
import { defaultHistoryStore } from '@/lib/history/store';
import { EngineMode } from '@/lib/graph/types';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const walletId = searchParams.get('wallet_id');
    const modeParam = searchParams.get('mode') as EngineMode | null;

    if (!walletId) {
      return NextResponse.json({ error: 'wallet_id query parameter is required' }, { status: 400 });
    }

    const provider = getGraphProvider(modeParam || undefined);
    const investigation = await provider.investigateWallet(walletId, 2);
    const evidence = await provider.getRiskEvidence(walletId);
    const cycleRes = await provider.detectCycles(600, 4);

    const assessment = defaultRiskEngine.evaluate(evidence, cycleRes.cycles);
    defaultHistoryStore.add(assessment);

    return NextResponse.json({
      investigation,
      evidence,
      assessment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Investigation failed' },
      { status: 500 }
    );
  }
}
