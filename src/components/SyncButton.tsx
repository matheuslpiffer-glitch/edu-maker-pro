import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { forceServiceWorkerUpdate, recordSync } from '@/lib/version-sync';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export default function SyncButton({ className }: Props) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Force SW update
      await forceServiceWorkerUpdate();

      // Clear runtime caches
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }

      recordSync();

      toast({
        title: '✅ Sincronizado!',
        description: 'Cache limpo e dados atualizados com sucesso.',
      });

      // Reload after short delay so toast is visible
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast({
        title: 'Erro ao sincronizar',
        description: 'Tente novamente em alguns segundos.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSync}
      disabled={syncing}
      className={cn('gap-1.5 text-xs', className)}
      title="Sincronizar Agora"
    >
      <RefreshCw size={14} className={cn(syncing && 'animate-spin')} />
      <span className="hidden sm:inline">Sincronizar</span>
    </Button>
  );
}
