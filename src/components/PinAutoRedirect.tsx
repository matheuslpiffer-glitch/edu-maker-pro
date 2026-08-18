import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Reads ?pin= from the URL. If found, looks up the simulator/bank and redirects.
 * Renders nothing if no pin param is present.
 */
export default function PinAutoRedirect({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const pin = searchParams.get('pin');

  useEffect(() => {
    if (!pin || pin.length < 4) return;

    const lookup = async () => {
      setChecking(true);
      const upper = pin.toUpperCase();

      const { data } = await supabase.rpc('resolve_access_code', { code: upper });
      const match = Array.isArray(data) ? data[0] : data;

      if (match?.kind === 'simulador') { navigate(`/simulado/${match.id}`, { replace: true }); return; }
      if (match?.kind === 'atividade') { navigate(`/atividade/${match.id}`, { replace: true }); return; }

      setChecking(false);
    };

    lookup();
  }, [pin, navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
