import { useState, useEffect, useCallback } from 'react';
import { Cloud, Check, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  className?: string;
}

export default function SaveStatusIndicator({ className }: Props) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const checkConnection = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('connected');
      } else {
        // Not logged in but supabase reachable
        setStatus('connected');
      }
    } catch {
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'connected' : 'connected');
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [checkConnection]);

  if (status === 'checking') {
    return (
      <div className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground animate-in fade-in duration-300', className)}>
        <Loader2 size={14} className="animate-spin" />
        <span>Verificando...</span>
      </div>
    );
  }

  if (status === 'disconnected') {
    return (
      <div className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-destructive animate-in fade-in duration-300', className)}>
        <CloudOff size={14} />
        <span>Desconectado</span>
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-primary animate-in fade-in duration-300', className)}>
      <Cloud size={14} />
      <Check size={12} />
      <span>Sincronizado</span>
    </div>
  );
}
