import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  inMemoryPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { firebaseConfig } from './firebase';
import { STORAGE_KEYS } from '../utils/constants';

let app;
let auth;
let initPromise = null;

function getOrCreateApp() {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

async function readRememberMe() {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
  if (v === '0' || v === 'false') {
    return false;
  }
  // Default: remember (stay signed in for a long time when using durable persistence)
  return true;
}

/**
 * Tears down the Firebase app so the next `ensureFirebase` can `initializeAuth`
 * with a different persistence (e.g. after "Remember me" change at login or logout).
 */
export async function resetFirebaseClient() {
  if (initPromise) {
    try {
      await initPromise;
    } catch {
      // ignore
    }
  }
  try {
    if (app) {
      await deleteApp(app);
    } else if (getApps().length > 0) {
      await deleteApp(getApp());
    }
  } catch (e) {
    console.warn('[firebaseAuth] deleteApp failed (safe to continue):', e?.message);
  } finally {
    app = null;
    auth = null;
    initPromise = null;
  }
}

/**
 * Single Firebase App + Auth for the client.
 * - Remember me: durable persistence (RN: AsyncStorage; web: local) → refresh tokens survive restarts
 *   so users can stay signed in for weeks.
 * - No remember: in-memory (native) or session (web) → not signed in after quit / new session
 */
export async function ensureFirebase() {
  if (app && auth) {
    return { app, auth };
  }
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    const createdApp = getOrCreateApp();
    const remember = await readRememberMe();
    let createdAuth;

    if (Platform.OS === 'web') {
      const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
      try {
        createdAuth = initializeAuth(createdApp, { persistence });
      } catch (e) {
        if (e?.code === 'auth/already-initialized') {
          createdAuth = getAuth(createdApp);
        } else {
          throw e;
        }
      }
    } else {
      const persistence = remember
        ? getReactNativePersistence(AsyncStorage)
        : inMemoryPersistence;
      try {
        createdAuth = initializeAuth(createdApp, { persistence });
      } catch (e) {
        if (e?.code === 'auth/already-initialized') {
          createdAuth = getAuth(createdApp);
        } else {
          throw e;
        }
      }
    }

    app = createdApp;
    auth = createdAuth;
    return { app, auth };
  })();

  return initPromise;
}

/**
 * @returns {Promise<import('firebase/auth').Auth>}
 */
export async function getFirebaseAuth() {
  const { auth: a } = await ensureFirebase();
  return a;
}
