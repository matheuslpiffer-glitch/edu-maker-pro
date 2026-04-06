const APP_VERSION_KEY = 'educreator_app_version';
const LAST_SYNC_KEY = 'educreator_last_sync';

// Build-time version stamp (changes on each deploy)
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || __BUILD_TIMESTAMP__;

declare const __BUILD_TIMESTAMP__: string;

/**
 * Checks if a new version is available and forces reload if needed.
 */
export function checkVersionAndUpdate() {
  const stored = localStorage.getItem(APP_VERSION_KEY);
  if (stored && stored !== APP_VERSION) {
    console.log(`[VersionSync] Nova versão detectada: ${stored} → ${APP_VERSION}. Limpando cache...`);
    // Clear stale caches
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    window.location.reload();
    return true;
  }
  localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
  return false;
}

/**
 * Force-refresh service worker if one exists.
 */
export async function forceServiceWorkerUpdate() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const reg of registrations) {
    await reg.update();
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
}

/**
 * Unregister service workers in preview/iframe contexts.
 */
export function guardServiceWorkerInPreview() {
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const isPreviewHost =
    window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com');

  if (isPreviewHost || isInIframe) {
    navigator.serviceWorker?.getRegistrations().then(regs =>
      regs.forEach(r => r.unregister())
    );
  }
}

/**
 * Record a sync timestamp.
 */
export function recordSync() {
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

export function getLastSync(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}
