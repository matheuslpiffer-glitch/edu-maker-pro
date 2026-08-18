import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';

interface SimulatorVestibularesPanelProps {
  vestTab: 'publicas' | 'particulares';
  setVestTab: (tab: 'publicas' | 'particulares') => void;
  vestInstitution: string;
  setVestInstitution: (id: string) => void;
  vestFormatType: 'geral' | 'disciplina';
  setVestFormatType: (type: 'geral' | 'disciplina') => void;
  vestDiscipline: string;
  setVestDiscipline: (discipline: string) => void;
  arvorePublicos: { id: string; label: string }[];
  arvorePrivados: { id: string; label: string }[];
  subjectAreas: { name: string; icon: string }[];
  generating: boolean;
  onGenerate: (format: 'objetiva' | 'discursiva' | 'mista') => void;
  institutionName: string;
  setInstitutionName: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  setTechnicalDiscipline: (val: string) => void;
  setActiveEspecialidade: (val: string) => void;
  setExamModel: (val: string) => void;
  setActiveFormat: (val: string) => void;
  setSelectedSubjects: (val: string[]) => void;
}

const SimulatorVestibularesPanel = ({
  vestTab,
  setVestTab,
  vestInstitution,
  setVestInstitution,
  vestFormatType,
  setVestFormatType,
  vestDiscipline,
  setVestDiscipline,
  arvorePublicos,
  arvorePrivados,
  subjectAreas,
  generating,
  onGenerate,
  institutionName,
  setInstitutionName,
  title,
  setTitle,
  setTechnicalDiscipline,
  setActiveEspecialidade,
  setExamModel,
  setActiveFormat,
  setSelectedSubjects
}: SimulatorVestibularesPanelProps) => {
  return (
    <div className="space-y-6">
      {/* ══════ VESTIBULARES: Tabs + Dropdown ══════ */}
      <div className="space-y-5">
        {/* Tabs: Públicas / Particulares */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
          {([
            { id: 'publicas' as const, label: '🏛️ Universidades Públicas' },
            { id: 'particulares' as const, label: '🏆 Universidades Particulares' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => { 
                setVestTab(tab.id); 
                setVestInstitution(''); 
                setActiveEspecialidade(''); 
                setVestFormatType('geral'); 
                setVestDiscipline(''); 
              }}
              className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                vestTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdown: Selecione a Instituição */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-500">Selecione a Instituição</Label>
          <Select
            value={vestInstitution}
            onValueChange={(val) => {
              setVestInstitution(val);
              setActiveEspecialidade(val);
              const item = [...arvorePublicos, ...arvorePrivados].find(i => i.id === val);
              setTechnicalDiscipline(item?.label || '');
              setExamModel(vestTab === 'publicas' ? 'vest_publicos' : 'vest_privados');
            }}
          >
            <SelectTrigger className="bg-slate-50 border-slate-200 rounded-[20px]">
              <SelectValue placeholder="Escolha a banca examinadora..." />
            </SelectTrigger>
            <SelectContent>
              {(vestTab === 'publicas' ? arvorePublicos : arvorePrivados).map(inst => (
                <SelectItem key={inst.id} value={inst.id}>{inst.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Radio: Formato do Simulado */}
        {vestInstitution && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-in fade-in duration-300">
            <Label className="text-xs font-bold text-slate-700">📋 Qual o formato do simulado?</Label>
            <div className="flex flex-col gap-2">
              {([
                { id: 'geral' as const, label: 'Simulado Geral (Modelo da Banca)', desc: 'Todas as disciplinas misturadas no estilo da banca' },
                { id: 'disciplina' as const, label: 'Focado por Disciplina', desc: 'Questões de uma única disciplina' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { 
                    setVestFormatType(opt.id); 
                    if (opt.id === 'geral') setVestDiscipline(''); 
                    setActiveFormat(opt.id === 'geral' ? 'completa' : 'disciplina'); 
                  }}
                  className={`px-4 py-3 rounded-xl text-left border-2 transition-all ${
                    vestFormatType === opt.id
                      ? 'bg-indigo-50 border-indigo-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`text-xs font-bold block ${vestFormatType === opt.id ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.label}</span>
                  <span className={`text-[10px] block mt-0.5 ${vestFormatType === opt.id ? 'text-indigo-500' : 'text-slate-400'}`}>{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Conditional: Discipline selector */}
            {vestFormatType === 'disciplina' && (
              <div className="space-y-2 mt-2 animate-in fade-in duration-200">
                <Label className="text-xs font-semibold text-slate-500">Disciplina desejada</Label>
                <Select value={vestDiscipline} onValueChange={(val) => { setVestDiscipline(val); setSelectedSubjects([val]); }}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-[20px]">
                    <SelectValue placeholder="Selecione a disciplina..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectAreas.map(s => (
                      <SelectItem key={s.name} value={s.name}>{s.icon} {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configurações Finais (Cabeçalho) */}
      {vestInstitution && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Cabeçalho do Simulado</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500">Nome da Instituição</Label>
              <Input 
                value={institutionName} 
                onChange={e => setInstitutionName(e.target.value)} 
                placeholder="Escola Municipal..." 
                className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500">Título do Documento</Label>
              <Input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Simulado Vestibular 2026" 
                className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" 
              />
            </div>
          </div>
          
          <div className="pt-4">
            <Button
              onClick={() => onGenerate('objetiva')}
              disabled={generating || !vestInstitution}
              size="lg"
              className="w-full h-14 rounded-2xl text-white text-base font-black tracking-wide shadow-xl transition-all bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/30"
            >
              {generating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Zap className="h-5 w-5 mr-2" />}
              {generating ? 'GERANDO SIMULADO...' : 'GERAR SIMULADO VESTIBULAR'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulatorVestibularesPanel;

// Internal Input component to avoid additional imports if not needed, 
// but Simulators uses Input from @/components/ui/input
import { Input } from '@/components/ui/input';
