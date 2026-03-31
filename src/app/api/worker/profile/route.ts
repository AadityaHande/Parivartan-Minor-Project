import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/app/api/worker/_utils';
import { requireWorkerIdentity } from '@/lib/worker-api-server';
import { toSerializable, workerProfileUpdateSchema } from '@/lib/worker-api';
import { getFirebaseAdmin } from '@/firebase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const worker = await requireWorkerIdentity(request);
    return NextResponse.json({ worker: toSerializable(worker.profile || worker) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const worker = await requireWorkerIdentity(request);
    const body = workerProfileUpdateSchema.parse(await request.json());
    const { firestore } = await getFirebaseAdmin();

    await firestore.collection('users').doc(worker.uid).set(
      {
        ...body,
        role: 'worker',
        email: worker.email,
        id: worker.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const updated = await firestore.collection('users').doc(worker.uid).get();
    return NextResponse.json({ worker: toSerializable({ id: updated.id, ...updated.data() }) });
  } catch (error) {
    return handleApiError(error);
  }
}
