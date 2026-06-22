import * as React from 'react';
import { ToastAction } from '@/components/ui/toast';
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

const PAYWALL_TITLE = '🔒 Créditos esgotados';
const PAYWALL_DESCRIPTION =
  'Seus créditos do plano grátis acabaram. Assine o Pro para continuar usando.';

/**
 * Show a friendly toast for any AI edge-function error.
 * - Status 402 (or "créditos esgotados") → paywall message, NEVER a technical/processing error.
 * - Otherwise → normal destructive toast with extracted message.
 *
 * Accepts either a raw thrown error (FunctionsHttpError, Error, etc.) or an
 * already-normalized { message, status } shape (e.g. from background generation).
 */
export async function showAiErrorToast(
  error: unknown,
  toast: (opts: any) => void,
  fallbackTitle = 'Erro ao gerar conteúdo',
) {
  let message = '';
  let status: number | undefined;

  if (error && typeof error === 'object' && 'message' in (error as any) && !((error as any) instanceof Error)) {
    const obj = error as any;
    message = String(obj.message ?? '');
    status = typeof obj.status === 'number' ? obj.status : undefined;
  } else {
    const details = await getFunctionErrorDetails(error, fallbackTitle);
    message = details.message;
    status = details.status;
  }

  if (isAiCreditsError(message, status) || /créditos.*(acabaram|esgotad|insuficientes)/i.test(message)) {
    toast({
      title: PAYWALL_TITLE,
      description: PAYWALL_DESCRIPTION,
      variant: 'destructive',
      duration: 8000,
      action: React.createElement(
        ToastAction,
        {
          altText: 'Ver planos',
          onClick: () => {
            try { window.location.assign('/planos'); } catch { /* noop */ }
          },
          className: 'bg-white text-slate-900 hover:bg-slate-100 font-bold',
        },
        'Assine o Pro',
      ),
    });
    return { handled: true, status: 402 as const };
  }

  if (isAiRateLimitError(message, status)) {
    toast({
      title: 'Limite de requisições excedido',
      description: 'Aguarde alguns segundos e tente novamente.',
      variant: 'destructive',
    });
    return { handled: true, status: 429 as const };
  }

  toast({
    title: fallbackTitle,
    description: message || 'Tente novamente em instantes.',
    variant: 'destructive',
  });
  return { handled: true, status };
}
