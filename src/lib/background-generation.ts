/**
 * Background Generation Manager
 * Keeps async generation tasks alive even when the user navigates away.
 * Results are cached in memory and localStorage for persistence.
 */

type GenerationStatus = 'idle' | 'running' | 'done' | 'error';

interface GenerationEntry {
  status: GenerationStatus;
  result: any;
  error: string | null;
  errorStatus?: number | null;
  startedAt: number;
  promise?: Promise<any>;
}

const STORAGE_KEY = 'bg_generation_cache';
const FORM_STORAGE_KEY = 'bg_generation_forms';
const store = new Map<string, GenerationEntry>();

function loadFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries: Record<string, GenerationEntry> = JSON.parse(raw);
    for (const [key, entry] of Object.entries(entries)) {
      if (entry.status === 'done' || entry.status === 'error') {
        store.set(key, { ...entry, promise: undefined });
      }
    }
  } catch { /* ignore */ }
}

function saveToStorage(): void {
  try {
    const obj: Record<string, any> = {};
    store.forEach((entry, key) => {
      obj[key] = {
        status: entry.status,
        result: entry.result,
        error: entry.error,
        errorStatus: entry.errorStatus ?? null,
        startedAt: entry.startedAt,
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
}

loadFromStorage();

export function startGeneration(key: string, task: () => Promise<any>): void {
  const entry: GenerationEntry = {
    status: 'running',
    result: null,
    error: null,
    startedAt: Date.now(),
  };

  const promise = task()
    .then((result) => {
      entry.status = 'done';
      entry.result = result;
      saveToStorage();
      return result;
    })
    .catch(async (err) => {
      entry.status = 'error';
      try {
        const { getFunctionErrorDetails } = await import('./ai-utils');
        const details = await getFunctionErrorDetails(err, 'Erro desconhecido');
        entry.error = details.message || 'Erro desconhecido';
        entry.errorStatus = details.status ?? null;
      } catch {
        entry.error = err?.message || 'Erro desconhecido';
      }
      saveToStorage();
      throw err;
    });

  entry.promise = promise;
  store.set(key, entry);
  saveToStorage();
}

export function getGeneration(key: string): { status: GenerationStatus; result: any; error: string | null; errorStatus?: number | null } {
  const entry = store.get(key);
  if (!entry) return { status: 'idle', result: null, error: null, errorStatus: null };
  return { status: entry.status, result: entry.result, error: entry.error, errorStatus: entry.errorStatus ?? null };
}

export function clearGeneration(key: string): void {
  store.delete(key);
  saveToStorage();
}

export function isGenerating(key: string): boolean {
  return store.get(key)?.status === 'running';
}

/** Persist form state for a generation module so it survives unmount */
export function saveFormState(key: string, state: any): void {
  try {
    const all = JSON.parse(localStorage.getItem(FORM_STORAGE_KEY) || '{}');
    all[key] = state;
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

/** Restore form state for a generation module */
export function loadFormState<T = any>(key: string): T | null {
  try {
    const all = JSON.parse(localStorage.getItem(FORM_STORAGE_KEY) || '{}');
    return all[key] ?? null;
  } catch { return null; }
}

/** Clear form state when no longer needed */
export function clearFormState(key: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(FORM_STORAGE_KEY) || '{}');
    delete all[key];
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
