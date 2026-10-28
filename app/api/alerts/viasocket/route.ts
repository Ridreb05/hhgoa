import { NextRequest, NextResponse } from 'next/server';
import { defaultViaSocketNotifier } from '@/lib/integrations/viasocket';

export async function POST(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin;
    const body = await req.json().catch(() => ({}));

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
