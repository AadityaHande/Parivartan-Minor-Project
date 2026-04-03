import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/server';
import { requireRequestIdentity, RequestAuthError } from '@/lib/server-auth';
import type { Report, ReportStatus } from '@/lib/types';
import { isGenuineResolvedReport, getRewardOffer, buildRewardNotificationText } from '@/lib/reward-utils';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireRequestIdentity(request, ['official', 'department_head']);

    const params = await context.params;
    const reportId = params.id?.trim();

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required.' }, { status: 400 });
    }

    const body = await request.json();
    const { newStatus, remarks, updatePayload } = body as {
      newStatus: ReportStatus;
      remarks?: string;
      updatePayload?: Record<string, unknown>;
    };

    if (!newStatus) {
      return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
    }

    const { firestore, auth: adminAuth } = await getFirebaseAdmin();

    // Execute atomically in a transaction
    const result = await firestore.runTransaction(async (transaction: any) => {
      const reportRef = firestore.collection('reports').doc(reportId);
      const reportDoc = await transaction.get(reportRef);

      if (!reportDoc.exists) {
        throw new Error('Report not found.');
      }

      const currentReport = reportDoc.data() as Report;
      const isBeingResolved = newStatus === 'Resolved' && currentReport.status !== 'Resolved';

      // Prepare the status update payload
      const statusUpdatePayload: Record<string, unknown> = {
        status: newStatus,
        ...updatePayload,
      };

      // Add action log entry
      const newLogEntry = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        actor: 'Official' as const,
        actorName: identity.profile?.name || 'SMC Officer',
        notes: remarks || `Status updated to ${newStatus}.`,
      };

      if (!Array.isArray(statusUpdatePayload.actionLog)) {
        statusUpdatePayload.actionLog = [];
      }
      (statusUpdatePayload.actionLog as typeof newLogEntry[]).push(newLogEntry);

      // Update report
      transaction.update(reportRef, statusUpdatePayload);

      // If report is being resolved, atomically increment user points
      if (isBeingResolved) {
        const userRef = firestore.collection('users').doc(currentReport.userId);
        transaction.update(userRef, { points: FieldValue.increment(10) });
      }

      return { isBeingResolved, reportUserId: currentReport.userId };
    });

    // After transaction succeeds, handle notifications and SMS asynchronously
    if (result.isBeingResolved) {
      // Query for reward offer (non-transactional, can be eventual)
      try {
        const resolvedReportsSnap = await firestore
          .collection('reports')
          .where('userId', '==', result.reportUserId)
          .where('status', '==', 'Resolved')
          .get();

        const resolvedReports = resolvedReportsSnap.docs.map((doc: any) => doc.data() as Report);
        const qualifiedCount = resolvedReports.filter((r: Report) => isGenuineResolvedReport(r)).length;
        const rewardOffer = getRewardOffer(qualifiedCount);

        if (rewardOffer) {
          const prizeMessage = buildRewardNotificationText(rewardOffer);

          // Create notification
          await firestore.collection('notifications').add({
            title: rewardOffer.title,
            description: `${prizeMessage} Tap the dashboard to claim it.`,
            createdAt: new Date().toISOString(),
            createdBy: identity.profile?.name || 'System',
            type: 'general',
            isRead: false,
            userId: result.reportUserId,
          });

          // Fetch user phone and send SMS asynchronously
          const userDoc = await firestore.collection('users').doc(result.reportUserId).get();
          const phoneNumber = userDoc.data()?.phoneNumber;

          if (phoneNumber) {
            // Queue SMS in background (fire-and-forget with logging)
            try {
              // Note: This would require a separate SMS queue or serverless function
              // For now, log the intent - in production, use a task queue like Cloud Tasks
              console.log(`[SMS Queue] Reward notification to ${phoneNumber}: ${prizeMessage}`);
            } catch (smsError) {
              console.error('Failed to queue reward SMS:', smsError);
            }
          }
        }
      } catch (rewardError) {
        // Log but don't fail the transaction - report was already resolved
        console.error('Failed to process reward offer:', rewardError);
      }
    }

    return NextResponse.json({ success: true, updated: true });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Report resolution failed.';
    console.error('Failed to resolve report:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
