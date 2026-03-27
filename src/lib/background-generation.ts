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
  startedAt: number;
  promise?: Promise<any>;
}

const STORAGE_KEY = 'bg_generation_cache';
const store = new Map<string, GenerationEntry>();

function loadFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries: Record<string, GenerationEntry> = JSON.parse(raw);
    for (const [key, entry] of Object.entries(entries)) {
      // Only restore completed/error entries (running ones are dead after reload)
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
      obj[key] = { status: entry.status, result: entry.result, error: entry.error, startedAt: entry.startedAt };
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
    .catch((err) => {
      entry.status = 'error';
      entry.error = err?.message || 'Erro desconhecido';
      saveToStorage();
      throw err;
    });

  entry.promise = promise;
  store.set(key, entry);
  saveToStorage();
}

export function getGeneration(key: string): { status: GenerationStatus; result: any; error: string | null } {
  const entry = store.get(key);
  if (!entry) return { status: 'idle', result: null, error: null };
  return { status: entry.status, result: entry.result, error: entry.error };
}

export function clearGeneration(key: string): void {
  store.delete(key);
  saveToStorage();
}

export function isGenerating(key: string): boolean {
  return store.get(key)?.status === 'running';
}
