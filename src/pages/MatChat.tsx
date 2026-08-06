import { useCallback, useRef, useState } from 'react';
import { RotateCcw, Headphones } from 'lucide-react';
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
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Pergunte ao Mat</h1>
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
        
        {/* Context Selectors & AutoPlay Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 pb-4">
          <div className="flex flex-wrap items-center gap-3">
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

          <button
            id="autoplay-toggle"
            className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm"
            onClick={() => {
              const chatPanel = document.querySelector('[data-chat-panel]');
              if (chatPanel) {
                const event = new CustomEvent('toggleAutoPlay');
                chatPanel.dispatchEvent(event);
              }
            }}
          >
            <Headphones className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Auto-Leitura</span>
            <div className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 data-[state=inactive]:bg-slate-200 data-[state=active]:bg-blue-600">
              <span className="pointer-events-none block h-3 w-3 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=inactive]:translate-x-0 data-[state=active]:translate-x-4" />
            </div>
          </button>
        </div>
      </header>

      <MatChatPanel key={resetKey} fullPage onRegisterReset={registerReset} />
    </div>
  );
}
