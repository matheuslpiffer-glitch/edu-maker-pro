import DOMPurify from 'dompurify';

/**
 * Sanitize HTML coming from the database or AI responses before rendering
 * with dangerouslySetInnerHTML. Strips script tags, event handlers, and
 * other XSS vectors while preserving formatting markup we use in question
 * content, slides and previews.
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  const cleaned = String(input)
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  return DOMPurify.sanitize(cleaned, { USE_PROFILES: { html: true } });
}