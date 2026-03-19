const PUBLISHED_APP_ORIGIN = 'https://edu-maker-pro.lovable.app';

const CUSTOM_DOMAINS = [
  'educreatorpro.com',
  'www.educreatorpro.com',
];

export function getPublicAppOrigin() {
  if (typeof window === 'undefined') return PUBLISHED_APP_ORIGIN;

  const { hostname, origin } = window.location;

  // If running on the custom domain (with or without www), use the current origin
  if (CUSTOM_DOMAINS.includes(hostname)) return origin;

  const isPreviewHost =
    hostname.includes('lovableproject.com') ||
    (hostname.endsWith('.lovable.app') && hostname !== 'edu-maker-pro.lovable.app');

  return isPreviewHost ? PUBLISHED_APP_ORIGIN : origin;
}

export function buildPublicAppUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicAppOrigin()}${normalizedPath}`;
}
