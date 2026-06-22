import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

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

export async function getFunctionErrorDetails(
  error: unknown,
  fallbackMessage = 'Erro ao processar a solicitação.'
): Promise<{ message: string; status?: number }> {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;
    const raw = await error.context.text();

    try {
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        status,
        message: parsed?.error || parsed?.message || raw || fallbackMessage,
      };
    } catch {
      return { status, message: raw || fallbackMessage };
    }
  }

  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return { message: error.message || fallbackMessage };
  }

  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      return {
        message: parsed?.error || parsed?.message || error.message || fallbackMessage,
      };
    } catch {
      return { message: error.message || fallbackMessage };
    }
  }

  return { message: fallbackMessage };
}

export function isAiCreditsError(message: string, status?: number) {
  const normalized = message.toLowerCase();
  return status === 402 || normalized.includes('créditos insuficientes') || normalized.includes('not enough credits');
}

export function isAiRateLimitError(message: string, status?: number) {
  const normalized = message.toLowerCase();
  return status === 429 || normalized.includes('limite de requisições') || normalized.includes('rate limit');
}
