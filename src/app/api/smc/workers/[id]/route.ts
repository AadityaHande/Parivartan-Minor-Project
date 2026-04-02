import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/server';

function normalizeSegment(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const rawId = normalizeSegment(decodeURIComponent(params.id || ''));

    if (!rawId) {
      return NextResponse.json({ error: 'Worker identifier is required.' }, { status: 400 });
    }

    const { firestore } = await getFirebaseAdmin();

    const directDoc = await firestore.collection('users').doc(rawId).get();

    if (directDoc.exists && directDoc.data()?.role === 'worker') {
      await directDoc.ref.delete();
      return NextResponse.json({ success: true, deletedBy: 'docId' });
    }

    const byWorkerId = await firestore
      .collection('users')
      .where('employeeId', '==', rawId)
      .where('role', '==', 'worker')
      .limit(1)
      .get();

    if (!byWorkerId.empty) {
      await byWorkerId.docs[0].ref.delete();
      return NextResponse.json({ success: true, deletedBy: 'workerId' });
    }

    const byEmail = await firestore
      .collection('users')
      .where('email', '==', rawId)
      .where('role', '==', 'worker')
      .limit(1)
      .get();

    if (!byEmail.empty) {
      await byEmail.docs[0].ref.delete();
      return NextResponse.json({ success: true, deletedBy: 'email' });
    }

    return NextResponse.json({ error: 'Worker not found.' }, { status: 404 });
  } catch (error) {
    console.error('Failed to delete worker:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Worker deletion failed.' },
      { status: 500 }
    );
  }
}