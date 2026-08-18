import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Zap, Wrench, ListChecks, Clock } from 'lucide-react';
import { SENAI_EIXOS } from '@/pages/Simulators';

interface SimulatorTecnicosPanelProps {
  tecnicoInstitution: string;
  setTecnicoInstitution: (id: string) => void;
  tecnicoMode: '' | 'completo' | 'por_area';
  setTecnicoMode: (mode: '' | 'completo' | 'por_area') => void;
  isSenaiMode: boolean;
  senaiEixo: string;
  setSenaiEixo: (eixo: string) => void;
  senaiTopic: string;
  setSenaiTopic: (topic: string) => void;
  senaiVestibulinho: boolean;
  setSenaiVestibulinho: (val: boolean) => void;
  senaiTimerSeconds: number;
  institutionName: string;
  setInstitutionName: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  generating: boolean;
  onGenerate: () => void;
  startSenaiTimer: () => void;
}

const SimulatorTecnicosPanel = ({
  tecnicoInstitution,
  setTecnicoInstitution,
  tecnicoMode,
  setTecnicoMode,
  isSenaiMode,
  senaiEixo,
  setSenaiEixo,
  senaiTopic,
  setSenaiTopic,
  senaiVestibulinho,
  setSenaiVestibulinho,
  senaiTimerSeconds,
  institutionName,
  setInstitutionName,
  title,
  setTitle,
  generating,
  onGenerate,
  startSenaiTimer
}: SimulatorTecnicosPanelProps) => {
  return (
    <>
      {/* Opções de Modelo para Técnicos (não-SENAI) */}
      {!isSenaiMode && tecnicoInstitution && (
        <>
          <div className="border-t border-emerald-100 mb-6" />
          <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Modelo de Simulado</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opção A: Vestibulinho Completo */}
              <button
                onClick={() => setTecnicoMode('completo')}
                className={`relative p-5 rounded-[20px] border-2 text-left transition-all duration-200 flex flex-col gap-3 min-h-[120px] ${
                  tecnicoMode === 'completo'
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-500 shadow-lg shadow-emerald-500/15'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                {tecnicoMode === 'completo' && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-emerald-600" />}
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tecnicoMode === 'completo' ? 'bg-emerald-600' : 'bg-emerald-100'}`}>
                  <Zap className={`h-5 w-5 ${tecnicoMode === 'completo' ? 'text-white' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <span className={`text-sm font-black block ${tecnicoMode === 'completo' ? 'text-emerald-800' : 'text-slate-700'}`}>Vestibulinho Completo</span>
                  <span className={`text-[11px] block mt-0.5 ${tecnicoMode === 'completo' ? 'text-emerald-600' : 'text-slate-400'}`}>50 questões mistas — Padrão Oficial</span>
                </div>
              </button>
              {/* Opção B: Simulado por Área */}
              <button
                onClick={() => setTecnicoMode('por_area')}
                className={`relative p-5 rounded-[20px] border-2 text-left transition-all duration-200 flex flex-col gap-3 min-h-[120px] ${
                  tecnicoMode === 'por_area'
                    ? 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-500 shadow-lg shadow-teal-500/15'
                    : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-md'
                }`}
              >
                {tecnicoMode === 'por_area' && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-teal-600" />}
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tecnicoMode === 'por_area' ? 'bg-teal-600' : 'bg-teal-100'}`}>
                  <ListChecks className={`h-5 w-5 ${tecnicoMode === 'por_area' ? 'text-white' : 'text-teal-600'}`} />
                </div>
                <div>
                  <span className={`text-sm font-black block ${tecnicoMode === 'por_area' ? 'text-teal-800' : 'text-slate-700'}`}>Simulado por Área</span>
                  <span className={`text-[11px] block mt-0.5 ${tecnicoMode === 'por_area' ? 'text-teal-600' : 'text-slate-400'}`}>Escolha disciplinas e quantidade</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hero Técnico */}
      {isSenaiMode && (
        <div className="bg-[#0a1f3d] rounded-[3.5rem] p-8 sm:p-10 text-white relative overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-white/10 text-white/90 border-white/20 text-[10px] uppercase tracking-widest font-bold">
                ⚙️ Padrão Industrial
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              Simulado Técnico<br />Industrial Avançado
            </h2>
            <p className="text-sm text-slate-300 mt-3 max-w-md leading-relaxed">
              Questões técnicas com verificação automática de normas de segurança (NR-12, NR-35). Matriz Regional SP. Inclui Relatório de Manutenção e OS.
            </p>
            {senaiTimerSeconds > 0 && (
              <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 w-fit">
                <Clock className="h-4 w-4 text-yellow-300" />
                <span className="text-yellow-200 font-mono font-bold text-sm">
                  {Math.floor(senaiTimerSeconds / 60)}:{String(senaiTimerSeconds % 60).padStart(2, '0')}
                </span>
                <span className="text-slate-400 text-xs">restantes</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isSenaiMode && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-[#0a1f3d] text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Selecione o Eixo Técnico</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SENAI_EIXOS.map(eixo => {
              const isActive = senaiEixo === eixo.id;
              return (
                <button
                  key={eixo.id}
                  onClick={() => setSenaiEixo(eixo.id)}
                  className={`px-4 py-3 rounded-2xl text-sm font-bold border-2 transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#0a1f3d] text-white border-[#0a1f3d] shadow-md shadow-blue-900/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <span>{eixo.icon}</span>
                  <span className="text-xs">{eixo.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isSenaiMode && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-[#0a1f3d] text-white flex items-center justify-center text-xs font-bold shadow-sm">3</div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Tema Específico (Opcional)</h3>
          </div>
          <Input
            value={senaiTopic}
            onChange={e => setSenaiTopic(e.target.value)}
            placeholder="Ex: Engrenagens cilíndricas, Relação de transmissão, Circuitos em série..."
            className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-blue-500/20"
          />
        </div>
      )}

      {isSenaiMode && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <input
            type="checkbox"
            checked={senaiVestibulinho}
            onChange={e => setSenaiVestibulinho(e.target.checked)}
            className="h-5 w-5 rounded accent-[#0a1f3d]"
          />
          <div>
            <p className="text-sm font-bold text-slate-700">Modo Vestibulinho Técnico Industrial (60 questões)</p>
            <p className="text-xs text-slate-500">20 Português + 20 Matemática + 20 Ciências aplicadas ao contexto técnico • Cronômetro de 120 min</p>
          </div>
        </div>
      )}

      {isSenaiMode && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500">Nome da Instituição</Label>
              <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Instituição Técnico — Unidade" className="bg-slate-50 border-slate-200 rounded-[20px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500">Título do Simulado</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Avaliação de Desempenho Técnico" className="bg-slate-50 border-slate-200 rounded-[20px]" />
            </div>
          </div>

          <Button
            onClick={() => { onGenerate(); if (senaiVestibulinho) startSenaiTimer(); }}
            disabled={generating}
            size="lg"
            className="w-full h-14 rounded-2xl text-white text-base font-black tracking-wide shadow-xl transition-all bg-gradient-to-r from-[#0a1f3d] to-[#1a3a6b] hover:from-[#0d2a52] hover:to-[#1f4580] shadow-blue-900/30"
          >
            {generating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Wrench className="h-5 w-5 mr-2" />}
            {generating ? 'GERANDO SIMULADO TÉCNICO...' : senaiVestibulinho ? '⚙️ GERAR VESTIBULINHO TÉCNICO (60Q)' : '⚙️ GERAR SIMULADO PADRÃO INDUSTRIAL'}
          </Button>
        </>
      )}
    </>
  );
};

export default SimulatorTecnicosPanel;
