import { NextRequest, NextResponse } from 'next/server';

import { getWorkerReports, handleApiError, workerSummary } from '@/app/api/worker/_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { assignedReports, openLowPriority } = await getWorkerReports(request);
    const summary = workerSummary(assignedReports);

    return NextResponse.json({
      assignedActive: assignedReports.filter((report) => report.status === 'Assigned' || report.status === 'In Progress').length,
      openLowPriority: openLowPriority.length,
      pendingBeforeUpload: assignedReports.filter((report) => report.status === 'Assigned' && !report.beforeWorkMediaUrl).length,
      ...summary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
