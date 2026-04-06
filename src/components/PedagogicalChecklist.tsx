import { useState } from 'react';
import { CheckCircle2, Circle, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { PEDAGOGICAL_CHECKLIST, type AuditItem } from '@/lib/rgf-format';
import { cn } from '@/lib/utils';

interface Props {
  /** The generated content text for auto-checks */
  contentText?: string;
  /** Called when teacher approves the checklist */
  onApprove: () => void;
  /** Extra class */
  className?: string;
}

export default function PedagogicalChecklist({ contentText = '', onApprove, className }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    PEDAGOGICAL_CHECKLIST.forEach(item => {
      initial[item.id] = item.autoCheck ? item.autoCheck(contentText) : false;
    });
    return initial;
  });

  const allChecked = PEDAGOGICAL_CHECKLIST.every(i => checked[i.id]);
  const checkedCount = PEDAGOGICAL_CHECKLIST.filter(i => checked[i.id]).length;

  const toggle = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck size={18} className="text-primary" />
          Auditoria Pedagógica — Checklist
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Confirme cada item antes de finalizar o material.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {PEDAGOGICAL_CHECKLIST.map((item: AuditItem) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={cn(
              'flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors text-sm',
              checked[item.id]
                ? 'bg-primary/5 text-foreground'
                : 'hover:bg-muted/50 text-muted-foreground'
            )}
          >
            {checked[item.id] ? (
              <CheckCircle2 size={18} className="text-primary shrink-0" />
            ) : (
              <Circle size={18} className="text-muted-foreground/40 shrink-0" />
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {checkedCount}/{PEDAGOGICAL_CHECKLIST.length} itens verificados
        </span>
        {!allChecked && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle size={12} /> Pendente
          </span>
        )}
        <Button size="sm" disabled={!allChecked} onClick={onApprove}>
          ✅ Aprovar e Finalizar
        </Button>
      </CardFooter>
    </Card>
  );
}
