import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Dices, Cloud, Route, Bug, Wrench, CheckCircle2, Scissors, Download } from 'lucide-react';
import PdfToolbar from '@/components/PdfToolbar';

const STORAGE_KEY = 'eduFlow_extra_activity';

const ACTIVITY_TYPES = [
  { id: 'nuvem_palavras', label: 'Nuvem de Palavras', icon: Cloud, desc: 'Termos-chave em destaque visual para fixação' },
  { id: 'labirinto_decisao', label: 'Labirinto de Decisão', icon: Route, desc: 'Caminhos com escolhas técnicas certas e erradas' },
  { id: 'caca_erros', label: 'Detetive de Falhas', icon: Bug, desc: 'Encontre os 3 erros ocultos em um procedimento técnico' },
  { id: 'cruzadinha_termos', label: 'Cruzadinha de Termos', icon: Wrench, desc: 'Termos técnicos com dicas contextualizadas' },
  { id: 'stop_industrial', label: 'Stop Industrial', icon: Wrench, desc: 'Tabela com Componente, Ferramenta, Norma NR e Ação' },
];

const DISCIPLINE_MAP: Record<string, { defaultType: string; label: string }> = {
  logistica: { defaultType: 'labirinto_decisao', label: 'Logística — Simulador de Rota' },
  administracao: { defaultType: 'nuvem_palavras', label: 'Administração — Fluxograma de Processos' },
  desenvolvimento: { defaultType: 'caca_erros', label: 'Desenvolvimento — Caça-Bugs no Código' },
  solda: { defaultType: 'cruzadinha_termos', label: 'Solda — Identificação de Ferramentas' },
  mecanica: { defaultType: 'cruzadinha_termos', label: 'Mecânica — Identificação de Ferramentas' },
  eletroeletronica: { defaultType: 'caca_erros', label: 'Eletroeletrônica — Diagnóstico de Circuitos' },
  refrigeracao: { defaultType: 'labirinto_decisao', label: 'Refrigeração — Rota de Manutenção' },
  construcao_civil: { defaultType: 'cruzadinha_termos', label: 'Construção Civil — Termos de Obra' },
};

const DISCIPLINES = Object.entries(DISCIPLINE_MAP).map(([id, v]) => ({ id, label: v.label }));

interface ActivityResult {
  content: string;
  options?: any[];
}

export default function ExtraActivity() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [discipline, setDiscipline] = useState('logistica');
  const [activityType, setActivityType] = useState('labirinto_decisao');
  const [topic, setTopic] = useState('');
  const [halfA4, setHalfA4] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ActivityResult[]>([]);

  // Auto-select activity type based on discipline
  useEffect(() => {
    const mapped = DISCIPLINE_MAP[discipline];
    if (mapped) setActivityType(mapped.defaultType);
  }, [discipline]);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.result?.length) {
          setResult(saved.result);
          setDiscipline(saved.discipline || 'logistica');
          setActivityType(saved.activityType || 'labirinto_decisao');
          setTopic(saved.topic || '');
          toast({ title: '🔄 Atividade extra recuperada', description: 'Sua última atividade lúdica foi restaurada.' });
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Persist to separate key
  useEffect(() => {
    if (result.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ result, discipline, activityType, topic }));
      } catch { /* ignore */ }
    }
  }, [result, discipline, activityType, topic]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Informe o tema da atividade.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setResult([]);
    try {
      const typeLabel = ACTIVITY_TYPES.find(a => a.id === activityType)?.label || activityType;
      const discLabel = DISCIPLINE_MAP[discipline]?.label || discipline;

      const { data, error } = await supabase.functions.invoke('generate-simulator-questions', {
        body: {
          isJogos: true,
          gameType: activityType,
          specificTopic: topic,
          customMaterial: `Disciplina Técnica: ${discLabel}. Gere uma atividade do tipo "${typeLabel}" focada no ensino técnico SENAI. ${halfA4 ? 'IMPORTANTE: A atividade deve caber em MEIA FOLHA A4 (metade superior). Inclua linhas de corte pontilhadas ao redor. Layout compacto.' : ''}`,
          serie: 'tecnico',
          includeImages: false,
          count: activityType === 'nuvem_palavras' ? 15 : 8,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.questions) {
        setResult(data.questions);
        toast({ title: '🎲 Atividade extra gerada com sucesso!' });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao gerar atividade', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const clearActivity = useCallback(() => {
    setResult([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: 'Atividade limpa.' });
  }, [toast]);

  return (
    <div className="relative max-w-[1600px] mx-auto overflow-x-hidden bg-slate-50 min-h-screen -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 no-print">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Dices className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Ensino Técnico SENAI</p>
          <h1 className="text-2xl font-bold text-slate-900">Atividades Extra Lúdicas</h1>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-4 sm:p-6 no-print">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Config */}
          <div className="w-full xl:w-[560px] xl:shrink-0 space-y-6">

            {/* Step 1: Discipline */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">1</div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Disciplina Técnica</h3>
              </div>
              <Select value={discipline} onValueChange={setDiscipline}>
                <SelectTrigger className="bg-slate-50 border-slate-200 rounded-[20px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINES.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Activity Type */}
            <div className="border-t border-slate-100" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Tipo de Atividade</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACTIVITY_TYPES.map(a => {
                  const Icon = a.icon;
                  const isSelected = activityType === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setActivityType(a.id)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col gap-2 min-h-[90px] ${
                        isSelected
                          ? 'bg-amber-50 border-amber-500 shadow-md shadow-amber-500/10'
                          : 'bg-slate-50 border-transparent hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="absolute top-2.5 right-2.5 h-5 w-5 text-amber-600" />}
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-amber-700' : 'text-slate-600'}`}>{a.label}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{a.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Topic */}
            <div className="border-t border-slate-100" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Tema</h3>
              </div>
              <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Ex: Cálculo de cubagem, Leitura de diagramas elétricos..."
                className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-amber-500/20"
              />

              <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex-1 mr-4">
                  <Label className="text-sm font-bold text-amber-700 cursor-pointer">Layout Meia Folha A4</Label>
                  <p className="text-[10px] text-amber-500 mt-0.5">Inclui linhas de corte pontilhadas para aplicação rápida em sala</p>
                </div>
                <Switch
                  checked={halfA4}
                  onCheckedChange={setHalfA4}
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                size="lg"
                className="w-full rounded-[20px] text-white shadow-lg transition-all bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20"
              >
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {generating ? 'Gerando atividade...' : '🎲 GERAR ATIVIDADE EXTRA'}
              </Button>
            </div>

            {generating && (
              <div className="mt-4 flex flex-col items-center gap-3 py-6 animate-pulse">
                <div className="relative">
                  <Dices className="h-12 w-12 text-amber-500 animate-bounce" />
                  <Sparkles className="h-5 w-5 text-orange-500 absolute -top-1 -right-1 animate-ping" />
                </div>
                <p className="text-sm font-medium text-slate-500 text-center">Montando atividade lúdica técnica...</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {result.length > 0 && (
            <div className="flex-1 min-w-0">
              <Card className="sticky top-4">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Dices className="h-5 w-5 text-amber-500" />
                      Atividade Gerada
                      <Badge variant="outline" className="text-[10px]">
                        {halfA4 ? 'Meia A4' : 'A4 Inteira'}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <PdfToolbar filename={`atividade-extra-${topic || 'tecnica'}`} />
                      <Button variant="ghost" size="sm" onClick={clearActivity} className="text-xs text-slate-400">Limpar</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    id="pdf-preview-container"
                    className={`bg-white rounded-xl border border-dashed border-slate-300 ${halfA4 ? 'max-h-[530px]' : ''}`}
                    style={halfA4 ? { borderStyle: 'dashed', borderWidth: 2, borderColor: '#94a3b8', padding: '20px' } : { padding: '24px' }}
                  >
                    {halfA4 && (
                      <div className="flex items-center gap-1 mb-3 text-[9px] text-slate-400 font-mono uppercase tracking-wider">
                        <Scissors className="h-3 w-3" /> Linha de corte — recorte aqui
                      </div>
                    )}
                    <div className="text-center mb-4">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">EDUFLOW INDUSTRIAL | ATIVIDADE EXTRA</p>
                      <h2 className="text-base font-bold text-slate-800 mt-1">{ACTIVITY_TYPES.find(a => a.id === activityType)?.label}</h2>
                      <p className="text-xs text-slate-500">{topic} • {DISCIPLINE_MAP[discipline]?.label}</p>
                    </div>
                    <div className="space-y-3">
                      {result.map((q, i) => (
                        <div key={i} className="border rounded-xl p-3 bg-white print-no-break">
                          <div
                            className="prose prose-sm max-w-none text-sm"
                            dangerouslySetInnerHTML={{
                              __html: (q.content || '')
                                .replace(/```html\s*/gi, '')
                                .replace(/```\s*/g, '')
                                .trim(),
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {halfA4 && (
                      <div className="flex items-center gap-1 mt-4 text-[9px] text-slate-400 font-mono uppercase tracking-wider border-t border-dashed border-slate-300 pt-2">
                        <Scissors className="h-3 w-3" /> Linha de corte — recorte aqui
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
