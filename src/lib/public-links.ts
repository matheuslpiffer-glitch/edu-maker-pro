const PUBLISHED_APP_ORIGIN = 'https://edu-maker-pro.lovable.app';

export function getPublicAppOrigin() {
  if (typeof window === 'undefined') return PUBLISHED_APP_ORIGIN;

  const { hostname, origin } = window.location;
  const isPreviewHost =
    hostname.includes('lovableproject.com') ||
    (hostname.endsWith('.lovable.app') && hostname !== 'edu-maker-pro.lovable.app');

  return isPreviewHost ? PUBLISHED_APP_ORIGIN : origin;
}

export function buildPublicAppUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicAppOrigin()}${normalizedPath}`;
}
