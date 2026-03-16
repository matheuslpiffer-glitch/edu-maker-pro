import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, Sparkles, Globe, Brain, BarChart3, Trash2, Eye,
  Shield, AlertTriangle, TrendingUp, Star, Crown, Zap,
  ChevronDown, ChevronUp, FileDown, Share2, Save, Printer
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PisaFeedbackPanel, { type FeedbackResult } from '@/components/PisaFeedbackPanel';
import PisaPedagogicalHighlights from '@/components/PisaPedagogicalHighlights';
import PisaPrintPreview from '@/components/PisaPrintPreview';
import { exportToPDF } from '@/lib/export';

// --- Types ---
interface PisaOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

interface PisaQuestion {
  type: 'multiple-choice' | 'constructed-response' | 'data-analysis' | 'interactive-scenario';
  scenario: string;
  content: string;
  options?: PisaOption[];
  modelAnswer: string;
  skill21: string;
  dataTable?: string;
}

interface PisaSimulator {
  id: string;
  title: string;
  proficiency_level: number;
  competency: string;
  questions: PisaQuestion[];
  student_results: any[];
  created_at: string;
}

// --- Constants ---
const COMPETENCIES = [
  { value: 'letramento_matematico', label: 'Letramento Matemático', icon: '📐' },
  { value: 'letramento_leitura', label: 'Letramento em Leitura', icon: '📖' },
  { value: 'letramento_cientifico', label: 'Letramento Científico', icon: '🔬' },
  { value: 'letramento_financeiro', label: 'Letramento Financeiro', icon: '💰' },
  { value: 'pensamento_critico', label: 'Pensamento Crítico e Criativo', icon: '🧠' },
];

const ELITE_OPTIONS = [
  { value: 'elite_mat', label: 'Elite — Matemática: Modelagem e Geometria Avançada', competency: 'letramento_matematico' },
  { value: 'elite_leitura', label: 'Elite — Leitura: Reflexão Crítica e Análise de Viés', competency: 'letramento_leitura' },
  { value: 'elite_ciencias', label: 'Elite — Ciências: Design Experimental e Evidências Globais', competency: 'letramento_cientifico' },
  { value: 'elite_global', label: 'Elite — Global: Pensamento Criativo e Problemas Sociais', competency: 'pensamento_critico' },
];

const LEVELS = [
  { value: 1, label: 'Nível 1', desc: 'Tarefas simples e diretas', icon: AlertTriangle, colorClass: 'bg-destructive/15 text-destructive border-destructive/30' },
  { value: 2, label: 'Nível 2', desc: 'Interpretação básica', icon: AlertTriangle, colorClass: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 3, label: 'Nível 3', desc: 'Procedimentos sequenciais', icon: TrendingUp, colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 4, label: 'Nível 4', desc: 'Raciocínio complexo', icon: Zap, colorClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 5, label: 'Nível 5', desc: 'Modelagem avançada', icon: Star, colorClass: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { value: 6, label: 'Nível 6', desc: 'Conceituação e generalização', icon: Crown, colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
];

const LEVEL_CATEGORIES = [
  { label: 'Apoio', levels: [1, 2], colorClass: 'bg-destructive/10 border-destructive/20', textClass: 'text-destructive' },
  { label: 'Intermediário', levels: [3, 4], colorClass: 'bg-yellow-50 border-yellow-200', textClass: 'text-yellow-700' },
  { label: 'Elite', levels: [5, 6], colorClass: 'bg-indigo-50 border-indigo-200', textClass: 'text-indigo-700' },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'multiple-choice': { label: 'Múltipla Escolha', color: 'bg-blue-100 text-blue-800' },
  'constructed-response': { label: 'Resposta Construída', color: 'bg-cyan-100 text-cyan-800' },
  'data-analysis': { label: 'Análise de Dados', color: 'bg-amber-100 text-amber-800' },
  'interactive-scenario': { label: 'Cenário Interativo', color: 'bg-purple-100 text-purple-800' },
};

// --- Proficiency Level Table (Desktop) ---
function ProficiencyTable({ simulators }: { simulators: PisaSimulator[] }) {
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  const getSimsByLevel = (lvl: number) => simulators.filter(s => s.proficiency_level === lvl);

  return (
    <div className="space-y-2">
      {LEVELS.map(lvl => {
        const sims = getSimsByLevel(lvl.value);
        const Icon = lvl.icon;
        const isExpanded = expandedLevel === lvl.value;
        return (
          <div key={lvl.value}>
            <button
              onClick={() => setExpandedLevel(isExpanded ? null : lvl.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${lvl.colorClass} hover:opacity-90`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <div className="flex-1 text-left">
                <span className="font-semibold text-sm">{lvl.label}</span>
                <span className="text-xs ml-2 opacity-75">— {lvl.desc}</span>
              </div>
              <Badge variant="outline" className="text-xs">{sims.length} simulados</Badge>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {isExpanded && (
              <div className="ml-8 mt-2 space-y-1 mb-2">
                {sims.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Nenhum simulado neste nível.</p>
                ) : sims.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-sm py-1">
                    <span className="truncate flex-1">{s.title}</span>
                    <Badge variant="outline" className="text-xs">{(s.questions || []).length}q</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Proficiency Horizontal Bar Chart (Mobile) ---
function ProficiencyBarChart({ simulators }: { simulators: PisaSimulator[] }) {
  const maxCount = Math.max(1, ...LEVELS.map(l => simulators.filter(s => s.proficiency_level === l.value).length));
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {LEVELS.map(lvl => {
        const count = simulators.filter(s => s.proficiency_level === lvl.value).length;
        const pct = (count / maxCount) * 100;
        const Icon = lvl.icon;
        const sims = simulators.filter(s => s.proficiency_level === lvl.value);
        const isExpanded = expandedLevel === lvl.value;
        return (
          <div key={lvl.value}>
            <button
              className="w-full text-left"
              onClick={() => setExpandedLevel(isExpanded ? null : lvl.value)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium flex-1">{lvl.label}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    lvl.value <= 2 ? 'bg-destructive/70' : lvl.value <= 4 ? 'bg-yellow-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
            </button>
            {isExpanded && sims.length > 0 && (
              <div className="ml-6 mt-1 space-y-1 mb-1">
                {sims.map(s => (
                  <p key={s.id} className="text-xs text-muted-foreground truncate">• {s.title}</p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Main Component ---
export default function PisaSimulators() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('3');
  const [competency, setCompetency] = useState('letramento_matematico');
  const [questionCount, setQuestionCount] = useState('5');
  const [generating, setGenerating] = useState(false);
  const [previewSim, setPreviewSim] = useState<PisaSimulator | null>(null);
  const [tab, setTab] = useState('generate');
  const [mode, setMode] = useState<'standard' | 'elite'>('standard');
  const [eliteOption, setEliteOption] = useState(ELITE_OPTIONS[0].value);
  const [eliteDrawerOpen, setEliteDrawerOpen] = useState(false);
  const [collectedErrors, setCollectedErrors] = useState<string[]>([]);
  const [pdfSim, setPdfSim] = useState<PisaSimulator | null>(null);
  const pdfRef = React.useRef<HTMLDivElement>(null);

  // Save-to-history dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveClassName, setSaveClassName] = useState('');
  const [saveBimester, setSaveBimester] = useState('1');
  const [saveInstitution, setSaveInstitution] = useState('');
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null);

  const { data: simulators = [], isLoading } = useQuery({
    queryKey: ['pisa-simulators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pisa_simulators')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        questions: Array.isArray(s.questions) ? s.questions : [],
        student_results: Array.isArray(s.student_results) ? s.student_results : [],
      })) as PisaSimulator[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pisa_simulators').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pisa-simulators'] });
      toast({ title: 'Simulado excluído' });
    },
  });

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast({ title: 'Informe um título', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const isElite = mode === 'elite';
      const eliteComp = ELITE_OPTIONS.find(e => e.value === eliteOption);
      const finalCompetency = isElite ? (eliteComp?.competency || competency) : competency;
      const finalLevel = isElite ? 5 : Number(level); // Elite = levels 5-6 only

      const { data, error } = await supabase.functions.invoke('generate-pisa-questions', {
        body: {
          proficiencyLevel: finalLevel,
          competency: finalCompetency,
          questionCount: Number(questionCount),
          eliteMode: isElite,
          eliteCategory: isElite ? eliteComp?.label : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const questions: PisaQuestion[] = data.questions || [];
      const { error: insertError } = await supabase.from('pisa_simulators').insert({
        user_id: user!.id,
        title: title.trim(),
        proficiency_level: finalLevel,
        competency: finalCompetency,
        questions: questions as any,
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['pisa-simulators'] });
      toast({ title: `Simulado ${isElite ? 'Elite ' : ''}gerado com ${questions.length} questões!` });
      setTitle('');
      setTab('history');
      if (isMobile) setEliteDrawerOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao gerar', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  // Skill stats for dashboard
  const skillStats = simulators.flatMap(s =>
    (s.questions || []).map(q => q.skill21)
  ).reduce((acc, skill) => {
    if (!skill) return acc;
    acc[skill] = (acc[skill] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedSkills = Object.entries(skillStats).sort((a, b) => b[1] - a[1]);

  const handleFeedbackReceived = (fb: FeedbackResult) => {
    if (fb.main_error && !collectedErrors.includes(fb.main_error)) {
      setCollectedErrors(prev => [...prev, fb.main_error]);
    }
  };

  const handleExportPDF = async (sim: PisaSimulator) => {
    setPdfSim(sim);
    // Wait for render then export
    setTimeout(async () => {
      if (pdfRef.current) {
        await exportToPDF(pdfRef.current, sim.title || 'simulado-pisa');
        setPdfSim(null);
      }
    }, 500);
  };

  const handleShare = (sim: PisaSimulator) => {
    const url = `${window.location.origin}/pisa-aluno/${sim.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link copiado!', description: 'Envie para os alunos responderem online.' });
    }).catch(() => {
      toast({ title: 'Link do simulado', description: url });
    });
  };

  const openSaveDialog = (simId: string) => {
    setPendingSaveId(simId);
    setSaveDialogOpen(true);
  };

  const handleSaveToHistory = async () => {
    if (!pendingSaveId) return;
    try {
      const { error } = await supabase.from('pisa_simulators').update({
        class_name: saveClassName.trim(),
        bimester: Number(saveBimester),
        institution_name: saveInstitution.trim(),
      }).eq('id', pendingSaveId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['pisa-simulators'] });
      toast({ title: 'Simulado salvo no histórico!', description: `Turma: ${saveClassName || '—'} | Bimestre: ${saveBimester}` });
      setSaveDialogOpen(false);
      setSaveClassName('');
      setSaveBimester('1');
      setSaveInstitution('');
      setPendingSaveId(null);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  const GenerateFormContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Título do Simulado</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Simulado PISA - Matemática Nível 3" className="min-h-[44px]" />
      </div>

      {/* Mode selector */}
      <div className="space-y-2">
        <Label>Modo</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === 'standard' ? 'default' : 'outline'}
            onClick={() => setMode('standard')}
            className="w-full"
          >
            <Globe className="h-4 w-4 mr-2" /> Padrão
          </Button>
          <Button
            type="button"
            variant={mode === 'elite' ? 'default' : 'outline'}
            onClick={() => setMode('elite')}
            className="w-full"
          >
            <Crown className="h-4 w-4 mr-2" /> Simulado de Elite
          </Button>
        </div>
      </div>

      {mode === 'elite' ? (
        <div className="space-y-2">
          <Label>Categoria Elite</Label>
          <Select value={eliteOption} onValueChange={setEliteOption}>
            <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ELITE_OPTIONS.map(e => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            <Crown className="h-3 w-3 inline mr-1" />
            Apenas questões de alta complexidade (Níveis 5-6 OCDE). Prioriza respostas construídas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Competência</Label>
            <Select value={competency} onValueChange={setCompetency}>
              <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPETENCIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nível de Proficiência OCDE</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map(l => (
                  <SelectItem key={l.value} value={String(l.value)}>{l.label} — {l.desc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Nº de Questões</Label>
        <Select value={questionCount} onValueChange={setQuestionCount}>
          <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[3, 5, 8, 10].map(n => (
              <SelectItem key={n} value={String(n)}>{n} questões</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : mode === 'elite' ? <Crown className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {generating ? 'Gerando com IA...' : mode === 'elite' ? 'Gerar Simulado Elite' : 'Gerar Simulado PISA'}
      </Button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-8 w-8 text-primary" />
          Simulados PISA
        </h1>
        <p className="text-muted-foreground mt-1">
          Avaliações baseadas nos níveis de proficiência da OCDE com questões do mundo real.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate">Gerar</TabsTrigger>
          <TabsTrigger value="elite">Elite</TabsTrigger>
          <TabsTrigger value="history">Simulados</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Gerador de Questões PISA com IA
              </CardTitle>
              <CardDescription>Configure o nível OCDE, a competência e a quantidade de questões.</CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateFormContent />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ELITE TAB */}
        <TabsContent value="elite" className="space-y-4 mt-4">
          {isMobile ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Simulado de Elite
                </CardTitle>
                <CardDescription>Questões de alta complexidade (Níveis 5-6 OCDE).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título do Simulado</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Elite - Matemática Avançada" className="min-h-[44px]" />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria Elite</Label>
                    <Select value={eliteOption} onValueChange={setEliteOption}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ELITE_OPTIONS.map(e => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nº de Questões</Label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[3, 5, 8, 10].map(n => (
                          <SelectItem key={n} value={String(n)}>{n} questões</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Crown className="h-3 w-3 inline mr-1" />
                    Prioriza respostas construídas (dissertativas) com campo de texto expansível.
                  </p>
                  <Button
                    onClick={() => { setMode('elite'); handleGenerate(); }}
                    disabled={generating}
                    className="w-full"
                    size="lg"
                  >
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
                    {generating ? 'Gerando...' : 'Gerar Simulado Elite'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Simulado de Elite — Alta Complexidade OCDE
                </CardTitle>
                <CardDescription>
                  Questões exclusivas de Níveis 5 e 6. Prioriza respostas construídas onde o aluno deve explicar o raciocínio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Elite - Ciências" className="min-h-[44px]" />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria Elite</Label>
                    <Select value={eliteOption} onValueChange={setEliteOption}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ELITE_OPTIONS.map(e => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nº de Questões</Label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[3, 5, 8, 10].map(n => (
                          <SelectItem key={n} value={String(n)}>{n} questões</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={() => { setMode('elite'); handleGenerate(); }}
                  disabled={generating}
                  className="w-full"
                  size="lg"
                >
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
                  {generating ? 'Gerando com IA...' : 'Gerar Simulado Elite'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : simulators.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum simulado PISA criado ainda.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {simulators.map(sim => {
                const lvl = LEVELS.find(l => l.value === sim.proficiency_level);
                return (
                  <Card key={sim.id}>
                    <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{sim.title}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge className={lvl?.colorClass || ''}>
                            {lvl && <lvl.icon className="h-3 w-3 mr-1" />}
                            Nível {sim.proficiency_level}
                          </Badge>
                          <Badge variant="secondary">{COMPETENCIES.find(c => c.value === sim.competency)?.label || sim.competency}</Badge>
                          <Badge variant="outline">{(sim.questions || []).length} questões</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(sim.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPreviewSim(sim)}>
                          <Eye className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Ver</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExportPDF(sim)}>
                          <FileDown className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">PDF</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleShare(sim)}>
                          <Share2 className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Enviar</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openSaveDialog(sim.id)}>
                          <Save className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Salvar</span>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(sim.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {/* Pedagogical Highlights */}
          <PisaPedagogicalHighlights mainErrors={collectedErrors} />
          {/* Proficiency Level Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Proficiência por Nível PISA
              </CardTitle>
              <CardDescription>
                Clique em cada nível para ver os simulados associados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category legend */}
              <div className="flex flex-wrap gap-2 mb-4">
                {LEVEL_CATEGORIES.map(cat => (
                  <Badge key={cat.label} variant="outline" className={`${cat.colorClass} ${cat.textClass}`}>
                    {cat.label} (Níveis {cat.levels.join('-')})
                  </Badge>
                ))}
              </div>
              {isMobile ? (
                <ProficiencyBarChart simulators={simulators} />
              ) : (
                <ProficiencyTable simulators={simulators} />
              )}
            </CardContent>
          </Card>

          {/* Skills dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Habilidades do Século XXI
              </CardTitle>
              <CardDescription>Habilidades mais avaliadas nos seus simulados.</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedSkills.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Gere simulados para ver estatísticas.</p>
              ) : (
                <div className="space-y-3">
                  {sortedSkills.map(([skill, count]) => (
                    <div key={skill} className="flex items-center gap-3">
                      <Brain className="h-4 w-4 text-primary shrink-0" />
                      <span className="flex-1 text-sm font-medium truncate">{skill}</span>
                      <div className="w-24 sm:w-48 bg-muted rounded-full h-3">
                        <div
                          className="bg-primary rounded-full h-3 transition-all"
                          style={{ width: `${Math.min(100, (count / Math.max(...Object.values(skillStats))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competency summary table */}
          <Card>
            <CardHeader><CardTitle>Resumo por Competência</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[500px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4">Competência</th>
                        <th className="text-center py-2 px-2">Simulados</th>
                        <th className="text-center py-2 px-2">Questões</th>
                        <th className="text-center py-2 px-2">Nível Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPETENCIES.map(c => {
                        const filtered = simulators.filter(s => s.competency === c.value);
                        const totalQ = filtered.reduce((sum, s) => sum + (s.questions || []).length, 0);
                        const avgLevel = filtered.length > 0
                          ? (filtered.reduce((sum, s) => sum + s.proficiency_level, 0) / filtered.length).toFixed(1)
                          : '—';
                        return (
                          <tr key={c.value} className="border-b last:border-0">
                            <td className="py-2 pr-4">{c.icon} {c.label}</td>
                            <td className="text-center py-2 px-2">{filtered.length}</td>
                            <td className="text-center py-2 px-2">{totalQ}</td>
                            <td className="text-center py-2 px-2">{avgLevel}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewSim} onOpenChange={() => setPreviewSim(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewSim?.title}</DialogTitle>
          </DialogHeader>
          {previewSim && (
            <div className="space-y-6 mt-2">
              <div className="flex flex-wrap gap-2">
                <Badge>Nível {previewSim.proficiency_level}</Badge>
                <Badge variant="secondary">{COMPETENCIES.find(c => c.value === previewSim.competency)?.label}</Badge>
              </div>
              {(previewSim.questions || []).map((q, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">Questão {i + 1}</span>
                      <Badge className={TYPE_LABELS[q.type]?.color || ''}>{TYPE_LABELS[q.type]?.label || q.type}</Badge>
                      <Badge variant="outline" className="text-xs"><Brain className="h-3 w-3 mr-1" />{q.skill21}</Badge>
                    </div>
                    {q.scenario && (
                      <div className="bg-muted/50 p-3 rounded-lg text-sm italic">{q.scenario}</div>
                    )}
                    {q.dataTable && (
                      <ScrollArea className="w-full">
                        <pre className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap min-w-[300px]">{q.dataTable}</pre>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    )}
                    <p className="text-sm leading-relaxed">{q.content}</p>
                    {q.options && q.options.length > 0 && (
                      <div className="space-y-1 ml-2">
                        {q.options.map(opt => (
                          <div key={opt.letter} className={`text-sm flex gap-2 ${opt.isCorrect ? 'font-semibold text-cyan-700' : ''}`}>
                            <span>({opt.letter})</span>
                            <span>{opt.text}</span>
                            {opt.isCorrect && <Badge className="bg-cyan-100 text-cyan-800 text-[10px] h-5">Correta</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                    {(q.type === 'constructed-response' || q.type === 'interactive-scenario') && (
                      <PisaFeedbackPanel
                        questionContent={q.content}
                        scenario={q.scenario}
                        modelAnswer={q.modelAnswer}
                        skill21={q.skill21}
                        questionIndex={i}
                        onFeedbackReceived={handleFeedbackReceived}
                      />
                    )}
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-primary">Ver Resposta Modelo</summary>
                      <p className="mt-2 text-muted-foreground leading-relaxed">{q.modelAnswer}</p>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden PDF Preview for export */}
      {pdfSim && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PisaPrintPreview
            ref={pdfRef}
            title={pdfSim.title}
            proficiencyLevel={pdfSim.proficiency_level}
            competency={pdfSim.competency}
            questions={pdfSim.questions}
            showAnswerKey={true}
          />
        </div>
      )}

      {/* Save to History Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              Salvar no Histórico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nome da Instituição</Label>
              <Input value={saveInstitution} onChange={e => setSaveInstitution(e.target.value)} placeholder="Ex: Escola William Silva" className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label>Turma</Label>
              <Input value={saveClassName} onChange={e => setSaveClassName(e.target.value)} placeholder="Ex: 9º Ano A" className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label>Bimestre</Label>
              <Select value={saveBimester} onValueChange={setSaveBimester}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4].map(b => (
                    <SelectItem key={b} value={String(b)}>{b}º Bimestre</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveToHistory} className="w-full" size="lg">
              <Save className="mr-2 h-4 w-4" />
              Confirmar e Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
