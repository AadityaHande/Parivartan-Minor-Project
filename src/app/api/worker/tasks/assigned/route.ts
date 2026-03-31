import { NextRequest, NextResponse } from 'next/server';

import { getWorkerReports, handleApiError, serializableReports } from '@/app/api/worker/_utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { assignedReports } = await getWorkerReports(request);
    const tasks = assignedReports
      .filter((report) => report.status === 'Assigned' || report.status === 'In Progress')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ tasks: serializableReports(tasks) });
  } catch (error) {
    return handleApiError(error);
  }
}
