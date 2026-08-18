import React from 'react';
import { Trophy, CheckCircle2 } from 'lucide-react';

interface SimulatorObmepPanelProps {
  selectedFormat: string;
  setSelectedFormat: (format: string) => void;
  generating: boolean;
  onGenerate: (format: 'objetiva' | 'discursiva' | 'mista') => Promise<void>;
}

const OBMEP_FORMATS = [
  { id: 'obmep_n1_f1', label: 'Nível 1 — Fase 1 (20 objetivas)', icon: '🥉' },
  { id: 'obmep_n1_f2', label: 'Nível 1 — Fase 2 (6 discursivas)', icon: '🥉' },
  { id: 'obmep_n2_f1', label: 'Nível 2 — Fase 1 (20 objetivas)', icon: '🥈' },
  { id: 'obmep_n2_f2', label: 'Nível 2 — Fase 2 (6 discursivas)', icon: '🥈' },
  { id: 'obmep_n3_f1', label: 'Nível 3 — Fase 1 (20 objetivas)', icon: '🥇' },
  { id: 'obmep_n3_f2', label: 'Nível 3 — Fase 2 (6 discursivas)', icon: '🥇' },
];

const SimulatorObmepPanel = ({
  selectedFormat,
  setSelectedFormat,
  generating,
  onGenerate,
}: SimulatorObmepPanelProps) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Hero OBMEP */}
      <div className="relative overflow-hidden p-6 rounded-[32px] bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white shadow-xl shadow-amber-500/20">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-6 w-6 text-amber-200" />
            <h2 className="text-xl font-black tracking-tight">Olimpíada de Matemática (OBMEP)</h2>
          </div>
          <p className="text-amber-100 text-sm font-medium max-w-md leading-relaxed">
            Gere simulados oficiais da OBMEP com questões de raciocínio lógico avançado e resoluções comentadas.
          </p>
        </div>
        <Trophy className="absolute -bottom-6 -right-6 h-32 w-32 text-white/10 rotate-12" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
            1
          </div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
            Selecione o Nível e a Fase
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {OBMEP_FORMATS.map((fmt) => {
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-amber-50 border-amber-500 shadow-md shadow-amber-500/10'
                    : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
                }`}
              >
                <div
                  className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'border-amber-600' : 'border-slate-300'
                  }`}
                >
                  {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{fmt.icon}</span>
                    <span
                      className={`text-sm font-bold ${
                        isSelected ? 'text-amber-900' : 'text-slate-700'
                      }`}
                    >
                      {fmt.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onGenerate('objetiva')}
        disabled={generating || !selectedFormat}
        className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 group"
      >
        <Trophy className="h-5 w-5 group-hover:rotate-12 transition-transform" />
        Gerar Prova Olímpica
      </button>
    </div>
  );
};

export default SimulatorObmepPanel;
