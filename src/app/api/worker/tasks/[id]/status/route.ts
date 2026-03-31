import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { getWorkerReport, handleApiError, handleNotFound, serializableReport, timestampNow, workerLog } from '@/app/api/worker/_utils';
import { workerStatusUpdateSchema } from '@/lib/worker-api';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { reportRef, report, worker, isAssigned } = await getWorkerReport(request, id);
    if (!isAssigned) {
      return NextResponse.json({ error: 'Only the assigned worker can update task status.' }, { status: 403 });
    }

    const body = workerStatusUpdateSchema.parse(await request.json());
    const updatePayload: Record<string, unknown> = {
      status: body.status,
      workerAssignmentStatus: body.status === 'Rejected' ? 'Rejected' : 'Accepted',
      workflowStage:
        body.status === 'Assigned'
          ? 'assigned_worker'
          : body.status === 'In Progress'
            ? 'in_progress'
            : body.status === 'Resolved'
              ? 'completed'
              : 'pending_department',
      actionLog: FieldValue.arrayUnion(
        workerLog(body.status, worker.name, body.remarks || `Status updated to ${body.status}.`)
      ),
    };

    if (body.status === 'Resolved') {
      if (!report.afterWorkMediaUrl && !report.afterImageUrl) {
        return NextResponse.json({ error: 'After-work proof is required before resolving a task.' }, { status: 400 });
      }
      updatePayload.completedAt = timestampNow();
    }

    if (body.status === 'Rejected') {
      updatePayload.assignedWorkerId = null;
      updatePayload.assignedContractor = null;
      updatePayload.selfAssigned = false;
    }

    await reportRef.update(updatePayload);
    const updated = await reportRef.get();
    return NextResponse.json({ task: serializableReport({ ...(updated.data() as typeof report), id: updated.id }) });
  } catch (error) {
    return handleNotFound(error) || handleApiError(error);
  }
}
