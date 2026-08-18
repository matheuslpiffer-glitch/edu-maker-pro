import React from 'react';
import { CheckCircle2, Loader2, Sparkles, PenTool, Zap, BookText, GraduationCap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DNAModel { value: string; label: string; icon: any; }
interface DNACategory { id: string; title: string; color: string; models: DNAModel[]; }

interface SimulatorPadraoPanelProps {
  examModel: string;
  setExamModel: (model: string) => void;
  activeDnaCategories: DNACategory[];
  modelConfig: any;
  selectedFormat: string;
  setSelectedFormat: (format: string) => void;
  selectedSubjects: string[];
  setSelectedSubjects: (subjects: string[] | ((prev: string[]) => string[])) => void;
  showSerieStep: boolean;
  activeSerie: string;
  setActiveSerie: (serie: string) => void;
  setGrade: (grade: string) => void;
  SERIE_GRADE_MAP: Record<string, string>;
  SERIES_CATEGORIAS: any[];
  SUBJECT_AREAS: any[];
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
  provaFormat: string;
  isAula: boolean;
  generateQuestions: (format?: 'objetiva' | 'discursiva' | 'mista') => Promise<void>;
}

const SimulatorPadraoPanel: React.FC<SimulatorPadraoPanelProps> = ({
  examModel,
  setExamModel,
  activeDnaCategories,
  modelConfig,
  selectedFormat,
  setSelectedFormat,
  selectedSubjects,
  setSelectedSubjects,
  showSerieStep,
  activeSerie,
  setActiveSerie,
  setGrade,
  SERIE_GRADE_MAP,
  SERIES_CATEGORIAS,
  SUBJECT_AREAS,
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
  provaFormat,
  isAula,
  generateQuestions,
}) => {
  return (
    <div className="space-y-6">
      {/* ══════ PASSO 1: DNA / Público-Alvo ══════ */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">1</div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
            Selecione o DNA / Público-Alvo
          </h3>
        </div>

        <div className="space-y-5">
          {activeDnaCategories.map(cat => (
            <div key={cat.id}>
              <p className={`text-[11px] font-black uppercase tracking-[0.15em] mb-2.5 ${cat.color}`}>{cat.title}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {cat.models.map(model => {
                  const ModelIcon = model.icon;
                  const isSelected = examModel === model.value;
                  return (
                    <button
                      key={model.value}
                      onClick={() => setExamModel(model.value)}
                      className={`relative min-h-[80px] p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-600 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-50 border-transparent hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="absolute top-2.5 right-2.5 h-5 w-5 text-indigo-600" />
                      )}
                      <ModelIcon className={`h-5 w-5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>
                        {model.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {modelConfig && (
        <div className="space-y-4">
          <div className="border-t border-slate-100" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-fuchsia-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Estrutura Específica da {modelConfig.label}
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
          {selectedSubjects.length > 0 && (
            <p className="text-xs text-indigo-500 font-medium">✅ {selectedSubjects.length} disciplina(s) selecionada(s) automaticamente</p>
          )}
        </div>
      )}

      {/* ══════ PASSO: Seletor de Disciplina (dropdown elegante) ══════ */}
      {(() => {
        const stepDisc = modelConfig ? (showSerieStep ? 4 : 3) : (showSerieStep ? 3 : 2);
        const hasAutoSubjects = modelConfig && selectedSubjects.length > 0;
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="border-t border-slate-100" />
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{hasAutoSubjects ? '✓' : stepDisc}</div>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Disciplina</h3>
            </div>
            {hasAutoSubjects ? (
              <p className="text-xs text-indigo-500 font-medium">✅ {selectedSubjects.length} disciplina(s) selecionada(s) automaticamente</p>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Selecione a Disciplina</Label>
                <Select
                  value={selectedSubjects[0] || ''}
                  onValueChange={(val) => setSelectedSubjects([val])}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12 text-sm focus:ring-4 focus:ring-violet-500/20">
                    <SelectValue placeholder="Selecione a disciplina..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_AREAS.map(s => (
                      <SelectItem key={s.name} value={s.name}>{s.icon} {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSubjects.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                    ⚠️ Selecione uma disciplina para continuar.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════ PASSO: Série Escolar (condicional — simulado && !obmep) ══════ */}
      {showSerieStep && (
        <div className="space-y-4">
          <div className="border-t border-slate-100" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{modelConfig ? 3 : 2}</div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Série / Ano Escolar</h3>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">Selecione a Série / Ano</Label>
            <Select value={activeSerie} onValueChange={(val) => { setActiveSerie(val); setGrade(SERIE_GRADE_MAP[val] || ''); }}>
              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12 text-sm focus:ring-4 focus:ring-indigo-500/20">
                <SelectValue placeholder="Selecione a série..." />
              </SelectTrigger>
              <SelectContent>
                {SERIES_CATEGORIAS.map(cat => (
                  <React.Fragment key={cat.label}>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">{cat.label}</div>
                    {cat.series.map(s => (
                      <SelectItem key={s.id} value={s.id} className="pl-4 text-xs font-medium">{s.label}</SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ══════ PASSO FINAL: Configurações Finais ══════ */}
      <div className="space-y-4">
        <div className="border-t border-slate-100" />
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
            {(() => {
              let finalStep = 2;
              if (modelConfig) finalStep++;
              if (showSerieStep) finalStep++;
              return finalStep;
            })()}
          </div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Configurações Finais</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">Nome da Instituição</Label>
            <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Escola Municipal..." className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">Título do Documento</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={isAula ? 'Apostila de Biologia' : `Simulado`} className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500">Tema Específico (Opcional)</Label>
            <Input value={specificTopic} onChange={e => setSpecificTopic(e.target.value)} placeholder="Ex: Mitose e Meiose..." className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" />
          </div>
        </div>

        {showSerieStep && activeSerie && (
          <p className="text-xs text-indigo-600 font-medium">
            📚 Série selecionada: {SERIE_GRADE_MAP[activeSerie] || activeSerie}
          </p>
        )}

        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">📖 Material de Apoio (RAG)</h4>
          <textarea
            value={customMaterial}
            onChange={e => setCustomMaterial(e.target.value)}
            placeholder="Cole aqui o conteúdo da sua apostila, texto-base ou material de referência..."
            className="w-full min-h-[80px] p-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 resize-y focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          />
          {customMaterial.trim() && (
            <p className="text-xs text-cyan-600 font-medium">✅ Material carregado ({customMaterial.length} caracteres)</p>
          )}
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
          <div className="flex-1 mr-4">
            <Label className="text-sm font-bold text-indigo-700 cursor-pointer">Incluir Figuras / Ilustrações</Label>
            <p className="text-[10px] text-indigo-500 mt-0.5">(A IA irá gerar ou buscar pictogramas e imagens didáticas. Altamente recomendado para Infantil e Fund 1)</p>
          </div>
          <Switch
            checked={includeImages}
            onCheckedChange={setIncludeImages}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold text-slate-500">🌡️ Termómetro de Bloom</Label>
          <input type="range" min={1} max={4} step={1} value={bloomLevel} onChange={e => setBloomLevel(+e.target.value)} className="w-full accent-indigo-600" />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span className={bloomLevel === 1 ? 'text-cyan-600 font-bold' : ''}>Fácil</span>
            <span className={bloomLevel === 2 ? 'text-amber-600 font-bold' : ''}>Médio</span>
            <span className={bloomLevel === 3 ? 'text-red-600 font-bold' : ''}>Difícil</span>
            <span className={bloomLevel === 4 ? 'text-purple-600 font-bold' : ''}>Hacker</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2 text-center">
            <Label className="text-cyan-600 font-semibold text-xs">🟢 Fácil</Label>
            <Input type="number" min={0} max={15} value={easyCount} onChange={e => setEasyCount(+e.target.value)} className="text-center bg-slate-50 border-slate-200 rounded-2xl" />
          </div>
          <div className="space-y-2 text-center">
            <Label className="text-amber-600 font-semibold text-xs">🟡 Médio</Label>
            <Input type="number" min={0} max={15} value={mediumCount} onChange={e => setMediumCount(+e.target.value)} className="text-center bg-slate-50 border-slate-200 rounded-2xl" />
          </div>
          <div className="space-y-2 text-center">
            <Label className="text-red-600 font-semibold text-xs">🔴 Difícil</Label>
            <Input type="number" min={0} max={15} value={hardCount} onChange={e => setHardCount(+e.target.value)} className="text-center bg-slate-50 border-slate-200 rounded-2xl" />
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">Total: {totalQuestions} questões</p>
      </div>

      <div className="border-t border-slate-100 pt-4" />
      <div className="flex flex-col gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:pb-0 sm:pt-0 sm:mx-0 sm:px-0 z-20">
        {isAula ? (
          <Button
            onClick={() => generateQuestions()}
            disabled={generating || (selectedSubjects.length === 0 && !specificTopic)}
            size="lg"
            className="w-full rounded-[20px] text-white shadow-lg transition-all bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-cyan-500/20"
          >
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookText className="h-4 w-4 mr-2" />}
            {generating ? 'Gerando material...' : 'GERAR MATERIAL'}
          </Button>
        ) : (
          <>
            {selectedSubjects.length === 0 && (
              <p className="text-xs text-amber-600 font-semibold text-center animate-pulse">⚠️ Selecione ao menos uma disciplina acima para habilitar a geração.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button onClick={() => generateQuestions('objetiva')} disabled={generating || totalQuestions === 0 || selectedSubjects.length === 0} size="lg" className="w-full rounded-[20px] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20 transition-all">
                {generating && provaFormat === 'objetiva' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {generating && provaFormat === 'objetiva' ? 'Gerando...' : `OBJETIVA`}
              </Button>
              <Button onClick={() => generateQuestions('discursiva')} disabled={generating || totalQuestions === 0 || selectedSubjects.length === 0} size="lg" variant="outline" className="w-full rounded-[20px] border-slate-200 hover:bg-slate-50 transition-all">
                {generating && provaFormat === 'discursiva' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenTool className="h-4 w-4 mr-2" />}
                {generating && provaFormat === 'discursiva' ? 'Gerando...' : `DISCURSIVA`}
              </Button>
              <Button onClick={() => generateQuestions('mista')} disabled={generating || totalQuestions === 0 || selectedSubjects.length === 0} size="lg" variant="secondary" className="w-full rounded-[20px] transition-all">
                {generating && provaFormat === 'mista' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                {generating && provaFormat === 'mista' ? 'Gerando...' : `MISTA`}
              </Button>
            </div>
          </>
        )}
      </div>

      {generating && (
        <div className="mt-4 flex flex-col items-center gap-3 py-6 animate-pulse">
          <div className="relative">
            <GraduationCap className="h-12 w-12 text-indigo-500 animate-bounce" />
            <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-1 animate-ping" />
          </div>
          <p className="text-sm font-medium text-slate-500 text-center">Gerando conteúdo de elite...</p>
        </div>
      )}
    </div>
  );
};

export default SimulatorPadraoPanel;
