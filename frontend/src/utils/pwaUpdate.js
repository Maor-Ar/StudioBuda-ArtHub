/**
 * PWA: prompt when a new service worker is ready; user taps → skipWaiting → reload.
 * Also polls /build-id.txt with a cache-busting query so GitHub Pages/Fastly
 * max-age=600 cannot hide a new deploy behind a cached /sw.js.
 */
import Toast from 'react-native-toast-message';

let updateToastShown = false;
let pendingReload = false;
let pendingRegistration = null;
let toastRetryTimer = null;

function showUpdateToast(registration) {
  if (registration) {
    pendingRegistration = registration;
  } else if (!pendingRegistration?.waiting) {
    // Deploy detected via build-id.txt without a waiting worker — reload on tap.
    pendingRegistration = { waiting: null, forceReload: true };
  }
  if (updateToastShown) return;

  const tryShow = () => {
    if (updateToastShown || !pendingRegistration) return;

    updateToastShown = true;
    if (toastRetryTimer) {
      clearTimeout(toastRetryTimer);
      toastRetryTimer = null;
    }

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
        const waiting = pendingRegistration?.waiting;
        if (waiting) {
          pendingReload = true;
          waiting.postMessage({ type: 'SKIP_WAITING' });
          return;
        }
        // build-id mismatch (or waiting worker already gone): hard reload.
        window.location.reload();
      },
    });
  };

  toastRetryTimer = setTimeout(tryShow, 1200);
}

function onNewWorkerInstalled(registration) {
  if (navigator.serviceWorker.controller) {
    showUpdateToast(registration);
  }
}

async function probeRemoteBuildId(localBuildId) {
  if (!localBuildId || typeof fetch === 'undefined') return;

  try {
    // Query string forces a CDN miss; cache:'no-store' skips the browser HTTP cache.
    const res = await fetch(`/build-id.txt?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return;
    const remoteId = (await res.text()).trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    if (remoteId && remoteId !== localBuildId) {
      console.log(`[PWA] New deploy detected (${localBuildId} → ${remoteId})`);
      showUpdateToast(null);
    }
  } catch {
    // Offline / first paint — ignore.
  }
}

/**
 * @param {ServiceWorkerRegistration} registration
 * @param {{ buildId?: string }} [options]
 */
export function attachServiceWorkerUpdateFlow(registration, options = {}) {
  if (typeof window === 'undefined' || !registration) return;

  const localBuildId = String(options.buildId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pendingReload) {
      window.location.reload();
    }
  });

  if (registration.waiting && navigator.serviceWorker.controller) {
    showUpdateToast(registration);
  }

  if (registration.installing) {
    const installing = registration.installing;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') {
        onNewWorkerInstalled(registration);
      }
    });
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

  const checkForUpdates = () => {
    registration.update().catch(() => {});
    probeRemoteBuildId(localBuildId);
  };

  checkForUpdates();

  window.addEventListener('focus', checkForUpdates);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates();
    }
  });
}
