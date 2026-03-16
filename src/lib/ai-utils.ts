/**
 * Strip markdown code fences from AI responses so only clean HTML remains.
 */
export function cleanHtml(raw: string): string {
  return raw
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Generic fetch-with-retry using exponential backoff.
 * Works with supabase.functions.invoke or plain fetch.
 */
export async function invokeWithRetry<T = any>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r => setTimeout(r, delay));
    return invokeWithRetry(fn, retries - 1, delay * 2);
  }
}
