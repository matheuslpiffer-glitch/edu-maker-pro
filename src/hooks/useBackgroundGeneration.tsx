import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getGeneration, isGenerating as checkIsGenerating } from '@/lib/background-generation';

/**
 * Maps generation keys to the sidebar route they belong to.
 */
const KEY_TO_ROUTE: Record<string, string> = {
  mindmap: '/mapas-mentais',
  edustudio: '/edustudio',
  alta_performance: '/alta-performance',
};

interface BackgroundGenerationContextValue {
  /** Set of generation keys currently running */
  activeKeys: Set<string>;
  /** Check if a specific route has an active generation */
  isRouteGenerating: (route: string) => boolean;
  /** Force a re-check of all keys */
  refresh: () => void;
}

const BackgroundGenerationContext = createContext<BackgroundGenerationContextValue>({
  activeKeys: new Set(),
  isRouteGenerating: () => false,
  refresh: () => {},
});

const ALL_KEYS = Object.keys(KEY_TO_ROUTE);

export function BackgroundGenerationProvider({ children }: { children: ReactNode }) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    const running = new Set<string>();
    for (const key of ALL_KEYS) {
      if (checkIsGenerating(key)) running.add(key);
    }
    setActiveKeys(running);
  }, []);

  // Poll every 2s to detect status changes from the imperative store
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const isRouteGenerating = useCallback(
    (route: string) => {
      for (const [key, r] of Object.entries(KEY_TO_ROUTE)) {
        if (r === route && activeKeys.has(key)) return true;
      }
      return false;
    },
    [activeKeys],
  );

  return (
    <BackgroundGenerationContext.Provider value={{ activeKeys, isRouteGenerating, refresh }}>
      {children}
    </BackgroundGenerationContext.Provider>
  );
}

export function useBackgroundGeneration() {
  return useContext(BackgroundGenerationContext);
}
