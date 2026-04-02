import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/server';

/**
 * PATCH /api/notifications/mark-all-read
 * Marks all unread notifications as read.
 */
export async function PATCH() {
  try {
    const { firestore } = await getFirebaseAdmin();
    const snapshot = await firestore
      .collection('notifications')
      .where('isRead', '==', false)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, updatedCount: 0 }, { status: 200 });
    }

    const batch = firestore.batch();
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
