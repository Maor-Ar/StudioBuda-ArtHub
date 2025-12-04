import admin from 'firebase-admin';
import config from './environment.js';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

export default admin;

