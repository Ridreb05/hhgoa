import { NextRequest, NextResponse } from 'next/server';
import { getGraphProvider } from '@/lib/graph/provider';
import { defaultRiskEngine } from '@/lib/risk/engine';
import { defaultViaSocketNotifier } from '@/lib/integrations/viasocket';
import { defaultHistoryStore } from '@/lib/history/store';
import { CandidateTransaction, EngineMode } from '@/lib/graph/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from_wallet, to_wallet, amount, asset = 'ETH', mode, dispatch_alert = true } = body;

    if (!from_wallet || !to_wallet) {
      return NextResponse.json(
        { error: 'Both from_wallet and to_wallet are required' },
        { status: 400 }
      );
    }

    const candidate: CandidateTransaction = {
      from_wallet,
      to_wallet,
      amount: parseFloat(amount) || 0.0,
      asset,
      proposed_timestamp: Math.floor(Date.now() / 1000),
    };

    const provider = getGraphProvider((mode as EngineMode) || undefined);
    const startTime = performance.now();

    // 1. Fetch risk evidence and cycles
    const evidence = await provider.getRiskEvidence(from_wallet, candidate);
    const cycleRes = await provider.detectCycles(600, 4);

    // 2. Deterministic evaluation
    const assessment = defaultRiskEngine.evaluate(evidence, cycleRes.cycles, candidate);
    assessment.latency_ms = Math.round(performance.now() - startTime);
    defaultHistoryStore.add(assessment);

    // 3. Dispatch alert to viaSocket if high risk (non-blocking)
    let alertResult = null;
    if (dispatch_alert && assessment.action === 'REJECT') {
      try {
        const origin = req.nextUrl.origin;
        alertResult = await defaultViaSocketNotifier.sendAlert(assessment, origin);
      } catch (alertErr) {
        console.warn('viaSocket dispatch error:', alertErr);
      }
    }

    return NextResponse.json({
      candidate,
      assessment,
      alert_dispatch: alertResult,
      engine_mode: provider.mode,
      latency_ms: assessment.latency_ms,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Simulation failed' },
      { status: 500 }
    );
  }
}
