import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const FREE_LIMIT = 10;

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setCredits(null); setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('credits, plan, plan_expires_at')
      .eq('id', user.id)
      .maybeSingle();
    if (data) {
      setCredits((data as any).credits ?? 0);
      setPlan((data as any).plan ?? 'free');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('profile-credits-' + user.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload: any) => {
        if (payload.new) {
          setCredits(payload.new.credits ?? 0);
          setPlan(payload.new.plan ?? 'free');
        }
      })
      .subscribe();

    const onRefresh = () => fetch();
    window.addEventListener('credits:refresh', onRefresh);
    return () => { supabase.removeChannel(channel); window.removeEventListener('credits:refresh', onRefresh); };
  }, [user, fetch]);

  const isPro = plan === 'pro';
  return { credits, plan, isPro, loading, freeLimit: FREE_LIMIT, refetch: fetch };
}

export function notifyCreditsChange() {
  window.dispatchEvent(new Event('credits:refresh'));
}