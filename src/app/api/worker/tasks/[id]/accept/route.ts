import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { getWorkerReport, handleApiError, handleNotFound, serializableReport, timestampNow, workerLog } from '@/app/api/worker/_utils';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { reportRef, report, worker, isAssigned, isOpenLowPriority } = await getWorkerReport(request, id);

    if (!isAssigned && !isOpenLowPriority) {
      return NextResponse.json({ error: 'Task is not available for this worker.' }, { status: 403 });
    }

    const acceptedAt = report.acceptedAt || timestampNow();

    await reportRef.update({
      assignedWorkerId: worker.uid,
      assignedContractor: worker.name,
      workerAssignmentStatus: 'Accepted',
      acceptedAt,
      selfAssigned: report.selfAssigned || isOpenLowPriority,
      status: 'Assigned',
      workflowStage: 'assigned_worker',
      actionLog: FieldValue.arrayUnion(workerLog('Assigned', worker.name, isOpenLowPriority ? 'Task self-assigned by worker.' : 'Task accepted by worker.')),
    });

    const updated = await reportRef.get();
    return NextResponse.json({ task: serializableReport({ ...(updated.data() as typeof report), id: updated.id }) });
  } catch (error) {
    return handleNotFound(error) || handleApiError(error);
  }
}
