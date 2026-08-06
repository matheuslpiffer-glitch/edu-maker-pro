import { lazy as reactLazy, type ComponentType } from "react";

const RELOAD_KEY = "educreator_chunk_reloaded_at";

/**
 * React.lazy with recovery for stale deploy chunks.
 * When a dynamic import fails (old hashed asset no longer on the CDN),
 * clear caches/service workers and hard-reload once.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return reactLazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // Retry once in case of a transient network failure
      try {
        return await factory();
      } catch {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 15000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          try {
            if ("caches" in window) {
              const names = await caches.keys();
              await Promise.all(names.map((n) => caches.delete(n)));
            }
            const regs = await navigator.serviceWorker?.getRegistrations?.();
            await Promise.all((regs || []).map((r) => r.unregister()));
          } catch {
            /* ignore */
          }
          window.location.reload();
          // Keep Suspense pending while the page reloads
          return new Promise<never>(() => {});
        }
        throw err;
      }
    }
  });
}
