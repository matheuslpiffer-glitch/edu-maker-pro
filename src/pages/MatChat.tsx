import { useCallback, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import MatChatPanel, { MatAvatar } from '@/components/MatChatPanel';

export default function MatChat() {
  const resetRef = useRef<(() => void) | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const registerReset = useCallback((reset: () => void) => {
    resetRef.current = reset;
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-0 bg-white">
      <header className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <MatAvatar size="lg" />
          <div className="flex flex-col justify-center h-[52px]">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">MAT</h1>
            <p className="text-[10px] text-slate-500 font-medium leading-tight">
              Copiloto de IA Pedagógica
            </p>
          </div>
        </div>
        <div className="flex-1 max-w-xs mx-4">
          <select 
            className="w-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all"
            defaultValue="Anos Finais"
          >
            <option>Educação Infantil</option>
            <option>Anos Iniciais</option>
            <option>Anos Finais</option>
            <option>Ensino Médio / EJA / Técnico</option>
          </select>
        </div>
        <button
          onClick={() => { resetRef.current?.(); setResetKey(k => k + 1); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors text-xs font-semibold"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Nova conversa
        </button>
      </header>

      <MatChatPanel key={resetKey} fullPage onRegisterReset={registerReset} />
    </div>
  );
}
