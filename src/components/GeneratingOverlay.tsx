import { useEffect, useState, useMemo } from 'react';

interface Props {
  isVisible: boolean;
  totalSteps?: number;
  currentStep?: number;
  message?: string;
}

const PROGRESS_MESSAGES = [
  { threshold: 0, text: '🔍 Consultando diretrizes BNCC/Currículo Paulista...' },
  { threshold: 8, text: '📐 Alinhando habilidades ao Escopo e Sequência...' },
  { threshold: 16, text: '🧠 Estruturando enunciados pedagógicos...' },
  { threshold: 25, text: '✍️ Criando alternativas e distratores...' },
  { threshold: 35, text: '🎨 Desenhando figuras e elementos visuais...' },
  { threshold: 45, text: '📊 Calibrando nível de dificuldade...' },
  { threshold: 55, text: '🔬 Verificando coerência disciplinar...' },
  { threshold: 65, text: '📝 Analisando descritores BNCC...' },
  { threshold: 75, text: '📄 Formatando gabarito e justificativas...' },
  { threshold: 85, text: '✅ Finalizando seu material pedagógico...' },
  { threshold: 95, text: '🚀 Quase pronto! Últimos ajustes...' },
];

export default function GeneratingOverlay({ isVisible, totalSteps = 10, currentStep, message }: Props) {
  const [fakeProgress, setFakeProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) { setFakeProgress(0); return; }
    const interval = setInterval(() => {
      setFakeProgress(p => Math.min(p + Math.random() * 6 + 1.5, 92));
    }, 1200);
    return () => clearInterval(interval);
  }, [isVisible]);

  const progress = currentStep != null ? Math.min((currentStep / totalSteps) * 100, 100) : fakeProgress;

  const dynamicMessage = useMemo(() => {
    if (message) return message;
    const matched = [...PROGRESS_MESSAGES].reverse().find(m => progress >= m.threshold);
    return matched?.text || PROGRESS_MESSAGES[0].text;
  }, [message, progress]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-col items-center gap-6">
        {/* Logo icon with pulse + metallic spin */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-full border-2 border-transparent border-t-primary/60 border-r-purple-400/40 animate-spin" style={{ animationDuration: '2s' }} />
          <div className="absolute -inset-6 rounded-full border border-transparent border-b-primary/30 border-l-purple-300/20 animate-spin" style={{ animationDuration: '3.5s', animationDirection: 'reverse' }} />

          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] via-purple-700 to-slate-600 shadow-[0_8px_40px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center animate-pulse" style={{ animationDuration: '2s' }}>
            <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none">
              <path d="M24 38 L8 30 L8 16 L24 24 Z" fill="rgba(59,130,246,0.9)" />
              <path d="M24 38 L40 30 L40 16 L24 24 Z" fill="rgba(226,232,240,0.85)" />
              <circle cx="24" cy="20" r="8" fill="none" stroke="rgba(59,130,246,0.7)" strokeWidth="2" />
              <circle cx="24" cy="20" r="5" fill="none" stroke="rgba(226,232,240,0.5)" strokeWidth="1.5" />
              <circle cx="20" cy="12" r="1.2" fill="rgba(192,132,252,0.8)" />
              <circle cx="28" cy="10" r="1" fill="rgba(192,132,252,0.6)" />
              <circle cx="24" cy="8" r="0.8" fill="rgba(192,132,252,0.5)" />
            </svg>
          </div>
        </div>

        {/* Skeleton lines */}
        <div className="w-72 space-y-3">
          <div className="h-4 bg-muted rounded-full animate-pulse w-full" />
          <div className="h-4 bg-muted rounded-full animate-pulse w-5/6" style={{ animationDelay: '150ms' }} />
          <div className="h-4 bg-muted rounded-full animate-pulse w-4/6" style={{ animationDelay: '300ms' }} />
          <div className="h-3 bg-muted rounded-full animate-pulse w-3/6 mx-auto mt-4" style={{ animationDelay: '450ms' }} />
        </div>

        {/* Dynamic message */}
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground/80 transition-all duration-500">
            {dynamicMessage}
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.round(progress)}% • Sistema monitorado por Matheus Lima Piffer
          </p>
        </div>
      </div>
    </div>
  );
}
