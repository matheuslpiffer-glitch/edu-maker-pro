import { useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

const RECOVERY_FLAG_PREFIX = 'recovery_shown_';

/**
 * Persists a state object to localStorage, restores on mount,
 * warns on beforeunload if dirty, and shows a recovery toast.
 */
export function useLocalPersistence<T extends Record<string, any>>(
  key: string,
  state: T,
  restoreCallback: (saved: Partial<T>) => void,
  options?: { warnOnExit?: boolean }
) {
  const initialized = useRef(false);
  const dirty = useRef(false);

  // Restore on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const hasContent = Object.values(parsed).some(v =>
          Array.isArray(v) ? v.length > 0 : v !== null && v !== '' && v !== undefined
        );
        if (hasContent) {
          restoreCallback(parsed);
          const recoveryKey = RECOVERY_FLAG_PREFIX + key;
          const lastShown = localStorage.getItem(recoveryKey);
          const now = Date.now();
          if (!lastShown || now - Number(lastShown) > 60000) {
            localStorage.setItem(recoveryKey, String(now));
            setTimeout(() => {
              toast({ title: '🔄 Sessão recuperada', description: 'Recuperamos sua última sessão de trabalho automaticamente!' });
            }, 500);
          }
        }
      }
    } catch { /* ignore */ }
    initialized.current = true;
  }, []);

  // Save on state change
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
      dirty.current = true;
    } catch { /* storage full */ }
  }, [key, ...Object.values(state)]);

  // beforeunload warning
  useEffect(() => {
    if (options?.warnOnExit === false) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [options?.warnOnExit]);

  const markClean = useCallback(() => { dirty.current = false; }, []);
  const clearStorage = useCallback(() => {
    localStorage.removeItem(key);
    dirty.current = false;
  }, [key]);

  return { markClean, clearStorage };
}
