import React from 'react';
import { CheckCircle2, Loader2, Sparkles, Award } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SimulatorConcursoPanelProps {
  examModel: string;
  setExamModel: (model: string) => void;
  modelConfig: any;
  selectedFormat: string;
  setSelectedFormat: (format: string) => void;
  selectedSubjects: string[];
  setSelectedSubjects: (subjects: string[] | ((prev: string[]) => string[])) => void;
  institutionName: string;
  setInstitutionName: (name: string) => void;
  title: string;
  setTitle: (title: string) => void;
  specificTopic: string;
  setSpecificTopic: (topic: string) => void;
  customMaterial: string;
  setCustomMaterial: (material: string) => void;
  includeImages: boolean;
  setIncludeImages: (include: boolean) => void;
  bloomLevel: number;
  setBloomLevel: (level: number) => void;
  easyCount: number;
  setEasyCount: (count: number) => void;
  mediumCount: number;
  setMediumCount: (count: number) => void;
  hardCount: number;
  setHardCount: (count: number) => void;
  totalQuestions: number;
  generating: boolean;
  generateQuestions: (format?: 'objetiva' | 'discursiva' | 'mista') => Promise<void>;
  SUBJECT_AREAS: any[];
}

const SimulatorConcursoPanel: React.FC<SimulatorConcursoPanelProps> = ({
  examModel,
  setExamModel,
  modelConfig,
  selectedFormat,
  setSelectedFormat,
  selectedSubjects,
  setSelectedSubjects,
  institutionName,
  setInstitutionName,
  title,
  setTitle,
  specificTopic,
  setSpecificTopic,
  customMaterial,
  setCustomMaterial,
  includeImages,
  setIncludeImages,
  bloomLevel,
  setBloomLevel,
  easyCount,
  setEasyCount,
  mediumCount,
  setMediumCount,
  hardCount,
  setHardCount,
  totalQuestions,
  generating,
  generateQuestions,
  SUBJECT_AREAS,
}) => {
  return (
    <div className="space-y-6">
      {/* ══════ PASSO 1: Estrutura do Concurso ══════ */}
      {modelConfig && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">1</div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Nível do Concurso
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modelConfig.formats.map((fmt: any) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'border-indigo-600' : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base">{fmt.icon}</span>
                      <span className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{fmt.label}</span>
                    </div>
                    {fmt.subjects.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{fmt.subjects.join(' · ')}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════ PASSO 2: Disciplinas ══════ */}
      <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
        <div className="border-t border-slate-100" />
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Disciplinas Adicionais</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUBJECT_AREAS.map(s => {
            const isSelected = selectedSubjects.includes(s.name);
            return (
              <button
                key={s.name}
                onClick={() => {
                  setSelectedSubjects(prev => 
                    prev.includes(s.name) ? prev.filter(x => x !== s.name) : [...prev, s.name]
                  );
                }}
                className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 ${
                  isSelected 
                    ? 'bg-violet-50 border-violet-300 text-violet-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{s.icon}</span>
                <span className="truncate">{s.name}</span>
                {isSelected && <CheckCircle2 className="h-3 w-3 ml-auto text-violet-600" />}
              </button>
            );
          })}
        </div>
        {selectedSubjects.length === 0 && (
          <p className="text-xs text-amber-600 font-medium">⚠️ Selecione as disciplinas para o concurso.</p>
        )}
      </div>

      {/* ══════ PASSO FINAL: Configurações Finais ══════ */}
      <div className="space-y-4">
        <div className="border-t border-slate-100" />
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">3</div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Configurações Finais</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">Banca / Instituição</Label>
            <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Ex: VUNESP, FGV, FCC..." className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">Título do Simulado</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Simulado Concurso Público" className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">Cargo / Área Específica</Label>
            <Input value={specificTopic} onChange={e => setSpecificTopic(e.target.value)} placeholder="Ex: Professor de Matemática..." className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">📖 Conteúdo Programático / Edital (RAG)</h4>
          <textarea
            value={customMaterial}
            onChange={e => setCustomMaterial(e.target.value)}
            placeholder="Cole aqui o conteúdo do edital ou tópicos específicos para a IA seguir..."
            className="w-full min-h-[80px] p-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 resize-y focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
          <div className="flex-1 mr-4">
            <Label className="text-sm font-bold text-indigo-700 cursor-pointer">Incluir Figuras / Ilustrações</Label>
            <p className="text-[10px] text-indigo-500 mt-0.5">(A IA irá gerar ou buscar pictogramas e imagens didáticas quando pertinente)</p>
          </div>
          <Switch
            checked={includeImages}
            onCheckedChange={setIncludeImages}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold text-slate-500">🌡️ Nível de Dificuldade (Bloom)</Label>
          <input type="range" min={1} max={4} step={1} value={bloomLevel} onChange={e => setBloomLevel(+e.target.value)} className="w-full accent-indigo-600" />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span className={bloomLevel === 1 ? 'text-cyan-600 font-bold' : ''}>Fundamental</span>
            <span className={bloomLevel === 2 ? 'text-amber-600 font-bold' : ''}>Médio</span>
            <span className={bloomLevel === 3 ? 'text-red-600 font-bold' : ''}>Superior</span>
            <span className={bloomLevel === 4 ? 'text-purple-600 font-bold' : ''}>Magistratura/Elite</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2 text-center">
            <Label className="text-cyan-600 font-semibold text-xs">🟢 Fácil</Label>
            <Input type="number" min={0} max={20} value={easyCount} onChange={e => setEasyCount(+e.target.value)} className="text-center bg-slate-50 border-slate-200 rounded-2xl" />
          </div>
          <div className="space-y-2 text-center">
            <Label className="text-amber-600 font-semibold text-xs">🟡 Médio</Label>
            <Input type="number" min={0} max={20} value={mediumCount} onChange={e => setMediumCount(+e.target.value)} className="text-center bg-slate-50 border-slate-200 rounded-2xl" />
          </div>
          <div className="space-y-2 text-center">
            <Label className="text-red-600 font-semibold text-xs">🔴 Difícil</Label>
            <Input type="number" min={0} max={20} value={hardCount} onChange={e => setHardCount(+e.target.value)} className="text-center bg-slate-50 border-slate-200 rounded-2xl" />
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">Total: {totalQuestions} questões</p>
      </div>

      <div className="border-t border-slate-100 pt-4" />
      <div className="flex flex-col gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:pb-0 sm:pt-0 sm:mx-0 sm:px-0 z-20">
        {selectedSubjects.length === 0 && (
          <p className="text-xs text-amber-600 font-semibold text-center animate-pulse">⚠️ Selecione ao menos uma disciplina para habilitar a geração.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button 
            onClick={() => generateQuestions('objetiva')} 
            disabled={generating || totalQuestions === 0 || selectedSubjects.length === 0} 
            size="lg" 
            className="w-full rounded-[20px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all"
          >
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Award className="h-4 w-4 mr-2" />}
            {generating ? 'Gerando...' : 'GERAR OBJETIVAS'}
          </Button>
          <Button 
            onClick={() => generateQuestions('discursiva')} 
            disabled={generating || totalQuestions === 0 || selectedSubjects.length === 0} 
            variant="outline"
            size="lg" 
            className="w-full rounded-[20px] border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-all"
          >
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />}
            {generating ? 'Gerando...' : 'GERAR DISCURSIVAS'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SimulatorConcursoPanel;
