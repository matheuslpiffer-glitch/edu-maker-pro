const PUBLISHED_APP_ORIGIN = 'https://edu-maker-pro.lovable.app';
const CANONICAL_ORIGIN = 'https://www.educreatorpro.com';

const CUSTOM_DOMAINS = [
  'educreatorpro.com',
  'www.educreatorpro.com',
];

export function getPublicAppOrigin() {
  if (typeof window === 'undefined') return CANONICAL_ORIGIN;

  const { hostname, origin } = window.location;

  // Always prefer canonical www domain for public links
  if (CUSTOM_DOMAINS.includes(hostname)) return CANONICAL_ORIGIN;

  const isPreviewHost =
    hostname.includes('lovableproject.com') ||
    (hostname.endsWith('.lovable.app') && hostname !== 'edu-maker-pro.lovable.app');

  // In production lovable.app or preview → use canonical custom domain
  return isPreviewHost ? CANONICAL_ORIGIN : (hostname === 'edu-maker-pro.lovable.app' ? CANONICAL_ORIGIN : origin);
}

export function buildPublicAppUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicAppOrigin()}${normalizedPath}`;
}

/**
 * Build a QR Code URL that includes the PIN as a query parameter
 * so the student is auto-directed without typing the PIN.
 */
export function buildPinUrl(pin: string) {
  return `${CANONICAL_ORIGIN}/?pin=${encodeURIComponent(pin)}`;
}
