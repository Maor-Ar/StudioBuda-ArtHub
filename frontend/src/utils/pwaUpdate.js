/**
 * PWA: prompt when a new service worker is ready; user taps → skipWaiting → reload.
 * Only runs on web when Service Worker API is available.
 */
import Toast from 'react-native-toast-message';

let updateToastShown = false;
let pendingReload = false;

function showUpdateToast(registration) {
  if (updateToastShown) return;
  updateToastShown = true;

  Toast.show({
    type: 'info',
    text1: 'גרסה חדשה זמינה',
    text2: 'לחצו כאן לעדכון האפליקציה',
    position: 'top',
    visibilityTime: 120000,
    autoHide: false,
    topOffset: 60,
    text1Style: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    text2Style: {
      fontSize: 14,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    onPress: () => {
      const waiting = registration.waiting;
      if (!waiting) return;
      pendingReload = true;
      waiting.postMessage({ type: 'SKIP_WAITING' });
    },
  });
}

function onNewWorkerInstalled(registration) {
  // Only show if an older version is already controlling the page (real update).
  if (navigator.serviceWorker.controller) {
    showUpdateToast(registration);
  }
}

/**
 * @param {ServiceWorkerRegistration} registration
 */
export function attachServiceWorkerUpdateFlow(registration) {
  if (typeof window === 'undefined' || !registration) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pendingReload) {
      window.location.reload();
    }
  });

  // Update already downloaded and waiting (e.g. user had tab in background).
  if (registration.waiting && navigator.serviceWorker.controller) {
    showUpdateToast(registration);
  }

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        onNewWorkerInstalled(registration);
      }
    });
  });
}
