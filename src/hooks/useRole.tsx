import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'super_admin' | 'admin' | 'user' | 'student' | null;

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_my_role');
    if (!error && data) {
      setRole(data as AppRole);
    } else {
      setRole(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const isSuperAdmin = role === 'super_admin';
  const isTeacher = role === 'user' || role === 'admin' || role === 'super_admin';
  const isStudent = role === 'student';
  const hasRole = role !== null;

  return { role, isSuperAdmin, isTeacher, isStudent, hasRole, loading, refetchRole: fetchRole };
}
