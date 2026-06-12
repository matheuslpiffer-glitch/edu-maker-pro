import { Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/useCredits';

export default function CreditBadge({ className }: { className?: string }) {
  const { credits, isPro, loading, freeLimit } = useCredits();
  if (loading || credits === null) return null;

  if (isPro) {
    return (
      <div className={cn('inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 px-2.5 py-1 text-xs font-bold shadow-sm', className)}>
        <Sparkles size={12} /> PRO
      </div>
    );
  }

  const safe = Math.max(0, credits);
  const low = safe <= 2;
  return (
    <Link
      to="/planos"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors hover:opacity-80',
        low
          ? 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse'
          : 'bg-primary/10 text-primary border-primary/20',
        className
      )}
      title={low ? 'Seus créditos estão acabando — veja os planos' : 'Créditos do plano Free — veja os planos'}
    >
      {low ? <AlertTriangle size={12} /> : <Zap size={12} />}
      <span>{safe}/{freeLimit} créditos</span>
    </Link>
  );
}