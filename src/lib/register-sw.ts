/** Único ponto de registro do service worker (modo sem internet). */
export function registerAppServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const host = window.location.hostname;
  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const refused =
    !import.meta.env.PROD ||
    inIframe ||
    host.startsWith('id-preview--') || host.startsWith('preview--') ||
    host === 'lovableproject.com' || host.endsWith('.lovableproject.com') ||
    host === 'lovableproject-dev.com' || host.endsWith('.lovableproject-dev.com') ||
    host === 'beta.lovable.dev' || host.endsWith('.beta.lovable.dev') ||
    new URLSearchParams(window.location.search).get('sw') === 'off';

  if (refused) {
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.filter((r) => r.active?.scriptURL.endsWith('/sw.js')).forEach((r) => r.unregister()),
    );
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('SW', e));
  });
}
