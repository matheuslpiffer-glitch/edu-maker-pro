import { useEffect, useState } from 'react';
import { Check, CloudUpload } from 'lucide-react';
import { DRAFT_DIRTY_EVENT, DRAFT_SAVED_EVENT } from '@/hooks/useAutoSaveDraft';

type Status = 'idle' | 'saving' | 'saved';

interface Props {
  /** Prefixo das chaves de rascunho a observar (ex.: 'simulators:geral'). */
  scope?: string;
  className?: string;
}

export function DraftSavedIndicator({ scope, className = '' }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const matches = (e: Event) => {
      const key = (e as CustomEvent<{ storageKey?: string }>).detail?.storageKey || '';
      return !scope || key.includes(scope);
    };
    const onDirty = (e: Event) => { if (matches(e)) setStatus('saving'); };
    const onSaved = (e: Event) => {
      if (!matches(e)) return;
      setStatus('saved');
      setSavedAt(new Date());
    };
    window.addEventListener(DRAFT_DIRTY_EVENT, onDirty);
    window.addEventListener(DRAFT_SAVED_EVENT, onSaved);
    return () => {
      window.removeEventListener(DRAFT_DIRTY_EVENT, onDirty);
      window.removeEventListener(DRAFT_SAVED_EVENT, onSaved);
    };
  }, [scope]);

  if (status === 'idle') return null;

  const saving = status === 'saving';
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="draft-saved-indicator"
      className={`no-print inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border ${
        saving
          ? 'text-muted-foreground border-border bg-muted/40'
          : 'text-emerald-700 border-emerald-200 bg-emerald-50'
      } ${className}`}
    >
      {saving ? <CloudUpload size={13} className="animate-pulse" /> : <Check size={13} />}
      {saving
        ? 'Salvando rascunho...'
        : `Rascunho salvo${savedAt ? ` às ${savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
    </span>
  );
}

export default DraftSavedIndicator;