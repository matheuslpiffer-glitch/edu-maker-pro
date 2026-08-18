import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function ShortLinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) { setError(true); return; }
    const upper = code.toUpperCase();

    (async () => {
      const { data } = await supabase.rpc('resolve_access_code', { code: upper });
      const match = Array.isArray(data) ? data[0] : data;

      if (match?.kind === 'simulador') { navigate(`/simulado/${match.id}`, { replace: true }); return; }
      if (match?.kind === 'atividade') { navigate(`/atividade/${match.id}`, { replace: true }); return; }

      setError(true);
    })();
  }, [code, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold">😕 Código não encontrado</p>
          <p className="text-muted-foreground">O código <strong className="font-mono">{code?.toUpperCase()}</strong> não corresponde a nenhum simulado.</p>
          <p className="text-xs text-muted-foreground italic">EduCreator Pro | Tecnologia de Elite por Matheus Lima Piffer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
