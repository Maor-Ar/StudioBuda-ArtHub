import admin from 'firebase-admin';
import config from './environment.js';

// Initialize Firebase Admin SDK
// In Cloud Run, secrets might not be immediately available, so we handle errors gracefully
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
        // In production, log error but don't throw immediately
        // This allows the server to start and listen on port, then fail gracefully on requests
        console.error('⚠️  Firebase credentials are missing in production. Server will start but auth/db features will fail.');
        console.error('⚠️  Check Cloud Run secrets configuration: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
        // Initialize with dummy to prevent immediate crash
        admin.initializeApp({
          projectId: 'dummy-project',
        });
      }
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey,
          clientEmail: config.firebase.clientEmail,
        }),
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    const isDevelopment = config.server.nodeEnv === 'development';
    if (isDevelopment) {
      console.warn('⚠️  Firebase initialization failed. Some features may not work.');
      // Initialize with dummy to prevent crashes
      admin.initializeApp({
        projectId: 'dummy-project',
      });
    } else {
      // In production, log but don't throw - allow server to start
      console.error('⚠️  Firebase initialization failed in production. Server will start but features may not work.');
      console.error('⚠️  Error details:', error.message);
      // Initialize with dummy to prevent immediate crash
      try {
        admin.initializeApp({
          projectId: 'dummy-project',
        });
      } catch (initError) {
        // If even dummy init fails, log but continue
        console.error('⚠️  Could not initialize Firebase even with dummy credentials:', initError.message);
      }
    }
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

export default admin;

