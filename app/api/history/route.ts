import { NextRequest, NextResponse } from 'next/server';
import { defaultHistoryStore } from '@/lib/history/store';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const format = searchParams.get('format');

  if (format === 'csv') {
    const csvData = defaultHistoryStore.exportCSV();
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ghostshield_audit_history_${Date.now()}.csv"`,
      },
    });
  }

  if (format === 'json') {
    const jsonData = defaultHistoryStore.exportJSON();
    return new NextResponse(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ghostshield_audit_history_${Date.now()}.json"`,
      },
    });
  }

  const records = defaultHistoryStore.list();
  return NextResponse.json({
    total_records: records.length,
    records,
  });
}

export async function DELETE() {
  defaultHistoryStore.clear();
  return NextResponse.json({
    success: true,
    message: 'Investigation history successfully reset.',
  });
}
