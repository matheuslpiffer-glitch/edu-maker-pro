import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBroadcastSync } from '@/hooks/useBroadcastSync';

const LS_KEY = 'educreator_institution_name';

/**
 * Persists institution name in localStorage AND profiles table.
 * Cross-device sync via Supabase. Cross-tab sync via BroadcastChannel.
 */
export function useInstitutionName() {
  const { user } = useAuth();
  const [name, setNameState] = useState(() => localStorage.getItem(LS_KEY) || '');
  const [loading, setLoading] = useState(true);
  const [remotePrompt, setRemotePrompt] = useState<string | null>(null);

  // Cross-tab sync
  const handleRemoteTabUpdate = useCallback((value: string) => {
    setNameState(value);
    localStorage.setItem(LS_KEY, value);
  }, []);

  useBroadcastSync('institution_name', name, handleRemoteTabUpdate);

  // Sync from Supabase on mount
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('institution_name, updated_at')
          .eq('id', user.id)
          .single();

        if (data?.institution_name) {
          const local = localStorage.getItem(LS_KEY) || '';
          const remoteVal = (data as any).institution_name as string;

          if (remoteVal && remoteVal !== local && local) {
            setRemotePrompt(remoteVal);
          } else if (remoteVal && !local) {
            setNameState(remoteVal);
            localStorage.setItem(LS_KEY, remoteVal);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [user]);

  const setName = useCallback(async (val: string) => {
    setNameState(val);
    localStorage.setItem(LS_KEY, val);

    if (user) {
      await supabase
        .from('profiles')
        .update({ institution_name: val, updated_at: new Date().toISOString() } as any)
        .eq('id', user.id);
    }
  }, [user]);

  const acceptRemote = useCallback(() => {
    if (remotePrompt) {
      setNameState(remotePrompt);
      localStorage.setItem(LS_KEY, remotePrompt);
      setRemotePrompt(null);
    }
  }, [remotePrompt]);

  const dismissRemote = useCallback(() => {
    setRemotePrompt(null);
  }, []);

  return { name, setName, loading, remotePrompt, acceptRemote, dismissRemote };
}
