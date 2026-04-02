import { useState, useEffect } from 'react';
import { Cloud, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export default function SaveStatusIndicator({ className }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShow(true);
      setTimeout(() => setShow(false), 3000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  return (
    <div className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 animate-in fade-in duration-300', className)}>
      <Cloud size={14} className="animate-pulse" />
      <Check size={12} />
      <span>Alterações salvas</span>
    </div>
  );
}
