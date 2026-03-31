import { NextRequest, NextResponse } from 'next/server';

import { getWorkerReports, handleApiError, serializableReports, workerSummary } from '@/app/api/worker/_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { assignedReports } = await getWorkerReports(request);
    const summary = workerSummary(assignedReports);
    const recent = assignedReports
      .filter((report) => report.status === 'Resolved' || report.status === 'Rejected')
      .sort((a, b) => new Date(b.completedAt || b.timestamp).getTime() - new Date(a.completedAt || a.timestamp).getTime())
      .slice(0, 5);

    return NextResponse.json({
      summary,
      recent: serializableReports(recent),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
