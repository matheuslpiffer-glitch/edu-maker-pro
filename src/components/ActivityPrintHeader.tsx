import { useInstitutionName } from '@/hooks/useInstitutionName';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { School, AlertCircle } from 'lucide-react';

interface Props {
  className?: string;
}

/**
 * Renders the standard print header with school name, student fields,
 * and an editable institution input (persisted in localStorage + Supabase).
 */
export default function ActivityPrintHeader({ className }: Props) {
  const { name, setName, remotePrompt, acceptRemote, dismissRemote } = useInstitutionName();

  return (
    <div className={className}>
      {/* Remote sync prompt */}
      {remotePrompt && (
        <div className="mb-3 p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-start gap-2 text-sm no-print">
          <AlertCircle size={16} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground">
              Versão mais recente encontrada: <strong>"{remotePrompt}"</strong>
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Deseja carregar a atividade da escola salva em outro dispositivo?
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="default" onClick={acceptRemote}>
                Sim, atualizar
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissRemote}>
                Manter atual
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Editable institution name (screen) */}
      <div className="flex items-center gap-2 mb-3 no-print">
        <School size={16} className="text-muted-foreground shrink-0" />
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome da Instituição (ex: Instituto Apex)"
          className="max-w-md text-sm"
        />
      </div>

      {/* Print-only header — padrão pedagógico */}
      <div className="hidden print:block edu-print-header" style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11pt',
        lineHeight: '1.15',
        textTransform: 'uppercase',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <strong style={{ fontSize: '14pt' }}>{name || 'ESCOLA'}</strong>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 16px',
          borderTop: '2px solid #000',
          borderBottom: '2px solid #000',
          padding: '6px 0',
        }}>
          <div><strong>NOME:</strong> ___________________________________________</div>
          <div><strong>DATA:</strong> ____/____/________</div>
          <div><strong>ANO/SÉRIE:</strong> _______________</div>
          <div><strong>PROFESSOR(A):</strong> ________________________________</div>
        </div>
      </div>
    </div>
  );
}
