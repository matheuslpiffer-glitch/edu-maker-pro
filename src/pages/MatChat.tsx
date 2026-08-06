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
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Fale com o Mat</h1>
            <p className="text-xs text-slate-500 font-medium">
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
      </header>

      <MatChatPanel key={resetKey} fullPage onRegisterReset={registerReset} />
    </div>
  );
}
