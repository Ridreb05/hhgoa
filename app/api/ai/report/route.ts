import { NextRequest, NextResponse } from 'next/server';
import { defaultAIReportGenerator } from '@/lib/ai/report-generator';
import { RiskAssessment } from '@/lib/graph/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const assessment: RiskAssessment = body.assessment;

    if (!assessment || typeof assessment.score !== 'number') {
      return NextResponse.json(
        { error: 'Valid RiskAssessment object is required in request body' },
        { status: 400 }
      );
    }

    const report = await defaultAIReportGenerator.generateReport(assessment);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'AI Report generation failed' },
      { status: 500 }
    );
  }
}
