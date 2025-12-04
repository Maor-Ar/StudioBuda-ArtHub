import admin from 'firebase-admin';
import config from './environment.js';

if (!admin.apps.length) {
  try {
    // Check if Firebase config is available
    if (!config.firebase.projectId || !config.firebase.privateKey || !config.firebase.clientEmail) {
      const isDevelopment = config.server.nodeEnv === 'development';
      if (isDevelopment) {
        console.warn('⚠️  Firebase not configured. Database and auth features will not work.');
        // Initialize with dummy credentials to prevent crashes
        admin.initializeApp({
          projectId: 'dummy-project',
        });
      } else {
        throw new Error('Firebase credentials are required');
      }
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey,
          clientEmail: config.firebase.clientEmail,
        }),
      });
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    const isDevelopment = config.server.nodeEnv === 'development';
    if (isDevelopment) {
      console.warn('⚠️  Firebase initialization failed. Some features may not work.');
    } else {
      throw error;
    }
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

export default admin;

