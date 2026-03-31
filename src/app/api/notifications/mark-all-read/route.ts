import { NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const firebaseAdminApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
      })
    : getApps()[0];

const firestoreAdmin = getFirestore(firebaseAdminApp);

/**
 * PATCH /api/notifications/mark-all-read
 * Marks all unread notifications as read.
 */
export async function PATCH() {
  try {
    const snapshot = await firestoreAdmin
      .collection('notifications')
      .where('isRead', '==', false)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, updatedCount: 0 }, { status: 200 });
    }

    const batch = firestoreAdmin.batch();
    snapshot.docs.forEach((notificationDoc) => {
      batch.update(notificationDoc.ref, { isRead: true });
    });
    await batch.commit();

    return NextResponse.json(
      { success: true, updatedCount: snapshot.size },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      {
        error: 'Failed to mark all notifications as read',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
