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
      <header className="flex flex-col border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4">
          <div className="flex items-center gap-4">
            <MatAvatar size="lg" />
            <div className="flex flex-col justify-center">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Fale com o Mat</h1>
              <p className="text-xs text-slate-500 font-medium leading-tight">
                Consultor pedagógico digital do EduCreator Pro
              </p>
            </div>
          </div>
          <button
            onClick={() => { resetRef.current?.(); setResetKey(k => k + 1); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors text-xs font-semibold"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Nova conversa
          </button>
        </div>
        
        {/* Context Selectors */}
        <div className="flex flex-wrap items-center gap-3 px-4 sm:px-8 pb-4">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
            <span className="text-[10px] uppercase font-black text-slate-400">Etapa</span>
            <select 
              className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              defaultValue="Anos Finais"
            >
              <option>Educação Infantil</option>
              <option>Anos Iniciais</option>
              <option>Anos Finais</option>
              <option>Ensino Médio</option>
              <option>EJA / Técnico</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
            <span className="text-[10px] uppercase font-black text-slate-400">Foco</span>
            <select 
              className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              defaultValue="Plano de Aula"
            >
              <option>Plano de Aula</option>
              <option>Prova / Avaliação</option>
              <option>Acessibilidade (PEI)</option>
              <option>Gestão / ATPC</option>
              <option>Eletivas / Projetos</option>
            </select>
          </div>
        </div>
      </header>

      <MatChatPanel key={resetKey} fullPage onRegisterReset={registerReset} />
    </div>
  );
}
