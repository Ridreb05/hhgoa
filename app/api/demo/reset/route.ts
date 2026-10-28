import { NextResponse } from 'next/server';
import { resetDemoProvider } from '@/lib/graph/provider';

export async function POST() {
  resetDemoProvider();
  return NextResponse.json({
    success: true,
    message: 'Demo dataset successfully reset to initial seed state.',
    timestamp: new Date().toISOString(),
  });
}
