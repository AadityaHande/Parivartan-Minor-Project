// src/firebase/server.ts
import 'server-only';
import { cert, initializeApp, getApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

// This is a temporary solution for service account credentials.
// In a real production environment, you should use environment variables
// or another secure method to store these credentials.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : {
      projectId: firebaseConfig.projectId,
      // You would typically not hard-code a private key.
      // This is a placeholder.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

let adminApp: App;

const hasPlaceholderCredentials =
  String(serviceAccount.clientEmail || '').includes('your-client-email') ||
  String(serviceAccount.privateKey || '').includes('YOUR_PRIVATE_KEY_HERE');

if (!getApps().length) {
  const hasExplicitCredentials =
    !!serviceAccount.projectId &&
    !!serviceAccount.clientEmail &&
    !!serviceAccount.privateKey &&
    !hasPlaceholderCredentials;

  adminApp = initializeApp(
    hasExplicitCredentials
      ? {
          credential: cert({
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKey: serviceAccount.privateKey,
          }),
        }
      : {
          // Fall back to the hosting/runtime identity when explicit credentials are not set.
        }
  );
} else {
  adminApp = getApp();
}

const auth = getAuth(adminApp);
const firestore = getFirestore(adminApp);

export async function getFirebaseAdmin() {
  return { auth, firestore, app: adminApp };
}
