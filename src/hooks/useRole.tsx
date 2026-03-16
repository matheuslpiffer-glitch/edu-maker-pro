import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'super_admin' | 'admin' | 'user' | null;

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase.rpc('get_my_role');
      if (!error && data) {
        setRole(data as AppRole);
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const isSuperAdmin = role === 'super_admin';

  return { role, isSuperAdmin, loading };
}
