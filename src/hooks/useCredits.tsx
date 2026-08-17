import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

const FREE_LIMIT = 6;

export function useCredits() {
  const { user } = useAuth();
  const { isActive: hasActiveSub } = useSubscription();
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>('free');
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
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
      setPlanExpiresAt((data as any).plan_expires_at ?? null);
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
          setPlanExpiresAt(payload.new.plan_expires_at ?? null);
        }
      })
      .subscribe();

    const onRefresh = () => fetch();
    window.addEventListener('credits:refresh', onRefresh);
    return () => { supabase.removeChannel(channel); window.removeEventListener('credits:refresh', onRefresh); };
  }, [user, fetch]);

  // Honour plan_expires_at AND fall back to live subscription row in case
  // the profile mirror is briefly stale after a webhook.
  const expired = planExpiresAt ? new Date(planExpiresAt).getTime() < Date.now() : false;
  const isPro = (plan === 'pro' && !expired) || hasActiveSub;
  return { credits, plan, isPro, loading, freeLimit: FREE_LIMIT, refetch: fetch };
}

export function notifyCreditsChange() {
  window.dispatchEvent(new Event('credits:refresh'));
}