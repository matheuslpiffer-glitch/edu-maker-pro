import { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Download, Save, BookOpen, Lightbulb, Target, GraduationCap, Accessibility, Wrench, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SUBJECT_CATEGORIES } from '@/lib/subjects-data';
import { SERIES_CATEGORIAS } from '@/lib/series-data';
import { generatePdfFromElement } from '@/lib/pdf-utils';

interface LessonPlan {
  title: string;
  theme: string;
  subject: string;
  grade: string;
  duration: string;
  objective: {
    general: string;
    specific: string[];
    bnccSkills: string[];
  };
  methodology: {
    approach: string;
    strategies: string[];
  };
  development: {
    step: number;
    title: string;
    duration: string;
    description: string;
    resources: string[];
  }[];
  caseStudy: {
    title: string;
    situation: string;
    questions: string[];
    expectedOutcome: string;
  };
  assessment: {
    formative: string[];
    summative: string;
    rubric: { criteria: string; excellent: string; good: string; developing: string }[];
  };
  tecnoMaker?: {
    title: string;
    materials: string[];
    estimatedTime: string;
    steps: string[];
    lowTechAlternative: string;
  };
  aeeAdaptations?: {
    sensoryActivities: string[];
    simplifiedInstructions: string;
    supportMaterials: string[];
  };
}

const allSubjects = SUBJECT_CATEGORIES.flatMap(c => c.subjects);

export default function HubPlanejamento() {
  // Restore persisted state
  const stored = (() => {
    try { const r = localStorage.getItem('hub360_state'); return r ? JSON.parse(r) : null; } catch { return null; }
  })();

  const [theme, setTheme] = useState(stored?.theme || '');
  const [grade, setGrade] = useState(stored?.grade || '');
  const [subject, setSubject] = useState(stored?.subject || '');
  const [aee, setAee] = useState(stored?.aee || false);
  const [tecnoMaker, setTecnoMaker] = useState(stored?.tecnoMaker || false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(stored?.plan || null);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    objective: true, methodology: true, development: true, caseStudy: true, assessment: true, tecnoMaker: true, aee: true
  });
  const planRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Persist state
  useEffect(() => {
    const state = { theme, grade, subject, aee, tecnoMaker, plan };
    localStorage.setItem('hub360_state', JSON.stringify(state));
  }, [theme, grade, subject, aee, tecnoMaker, plan]);

  // Recovery toast
  useEffect(() => {
    if (stored?.plan) {
      const key = 'recovery_shown_hub360';
      const last = localStorage.getItem(key);
      if (!last || Date.now() - Number(last) > 60000) {
        localStorage.setItem(key, String(Date.now()));
        toast({ title: '🔄 Sessão recuperada', description: 'Recuperamos seu último plano de aula!' });
      }
    }
  }, []);

  // Warn on exit
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (plan) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [plan]);

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const generate = async () => {
    if (!theme.trim()) { toast({ title: 'Digite um tema', variant: 'destructive' }); return; }
    setLoading(true);
    setPlan(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lesson-plan', {
        body: { theme: theme.trim(), grade, subject, aee, tecnoMaker }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data.plan);
      toast({ title: '✅ Plano de aula gerado!' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !plan) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('question_banks').insert({
        user_id: user.id,
        subject: plan.subject || 'Interdisciplinar',
        topic: plan.theme,
        grade: plan.grade || '',
        purpose: 'plano-de-aula',
        question_type: 'lesson-plan',
        questions: plan as any,
        institution_name: '',
      });
      if (error) throw error;
      toast({ title: '✅ Salvo na Biblioteca!' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!planRef.current) return;
    await generatePdfFromElement(planRef.current, `plano-${plan?.theme || 'aula'}.pdf`, { margins: [30, 20, 20, 30] });
    toast({ title: '📄 PDF exportado!' });
  };

  const SectionHeader = ({ icon: Icon, title, sectionKey }: { icon: any; title: string; sectionKey: string }) => (
    <button onClick={() => toggleSection(sectionKey)} className="flex items-center gap-2 w-full text-left group">
      <Icon size={18} className="text-primary shrink-0" />
      <h3 className="text-base font-bold text-foreground flex-1">{title}</h3>
      {expandedSections[sectionKey] ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-black text-foreground flex items-center justify-center gap-3">
          <Sparkles className="text-primary" /> Hub de Planejamento 360º
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Digite qualquer tema e receba um Plano de Aula completo com Objetivos BNCC, Metodologia, Desenvolvimento, Estudo de Caso e Avaliação.
        </p>
      </div>

      {/* Search Bar */}
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Ex: O Ciclo da Água, Inteligência Artificial na Arte, Números Romanos..."
                value={theme}
                onChange={e => setTheme(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && generate()}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button onClick={generate} disabled={loading || !theme.trim()} className="h-12 px-6 gap-2 shrink-0">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? 'Gerando...' : 'Gerar Plano'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Grade */}
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue placeholder="Série/Ano" /></SelectTrigger>
              <SelectContent>
                {SERIES_CATEGORIAS.map(cat => (
                  <div key={cat.label}>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground">{cat.label}</div>
                    {cat.series.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>

            {/* Subject */}
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Interdisciplinar">🌐 Interdisciplinar</SelectItem>
                {SUBJECT_CATEGORIES.map(cat => (
                  <div key={cat.label}>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground">{cat.label}</div>
                    {cat.subjects.map(s => (
                      <SelectItem key={s.name} value={s.name}>{s.icon} {s.name}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>

            {/* AEE Toggle */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <Accessibility size={16} className="text-blue-500 shrink-0" />
              <span className="text-xs font-medium text-foreground flex-1">Modo AEE</span>
              <Switch checked={aee} onCheckedChange={setAee} />
            </div>

            {/* Tecno-Maker Toggle */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <Wrench size={16} className="text-orange-500 shrink-0" />
              <span className="text-xs font-medium text-foreground flex-1">Tecno-Maker</span>
              <Switch checked={tecnoMaker} onCheckedChange={setTecnoMaker} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">A Dra. IA está elaborando seu plano de aula completo...</p>
        </div>
      )}

      {/* Result */}
      {plan && (
        <>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar na Biblioteca'}
            </Button>
            <Button onClick={handleExportPdf} variant="outline" className="gap-2">
              <Download size={16} /> Exportar PDF
            </Button>
          </div>

          <div ref={planRef} className="space-y-4">
            {/* Title card */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl md:text-2xl">{plan.title}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">{plan.subject}</Badge>
                  <Badge variant="outline">{plan.grade}</Badge>
                  <Badge variant="outline">⏱ {plan.duration}</Badge>
                  {aee && <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">♿ AEE</Badge>}
                  {tecnoMaker && <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">🔧 Maker</Badge>}
                </div>
              </CardHeader>
            </Card>

            {/* Objectives */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <SectionHeader icon={Target} title="Objetivos" sectionKey="objective" />
                {expandedSections.objective && (
                  <div className="pl-7 space-y-2">
                    <p className="text-sm"><strong>Geral:</strong> {plan.objective.general}</p>
                    <div>
                      <p className="text-sm font-semibold mb-1">Específicos:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {(plan?.objective?.specific || []).map((s, i) => <li key={`${s}-${i}`} className="text-sm text-muted-foreground">{s}</li>)}
                      </ul>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(plan?.objective?.bnccSkills || []).map((sk, i) => <Badge key={`${sk}-${i}`} variant="outline" className="text-xs">{sk}</Badge>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Methodology */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <SectionHeader icon={Lightbulb} title="Metodologia" sectionKey="methodology" />
                {expandedSections.methodology && (
                  <div className="pl-7 space-y-2">
                    <p className="text-sm"><strong>Abordagem:</strong> {plan.methodology.approach}</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {(plan?.methodology?.strategies || []).map((s, i) => <li key={`${s}-${i}`} className="text-sm text-muted-foreground">{s}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Development */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <SectionHeader icon={BookOpen} title="Desenvolvimento" sectionKey="development" />
                {expandedSections.development && (
                  <div className="pl-7 space-y-4">
                    {(plan?.development || []).map((step, i) => (
                      <div key={step.step} className="border-l-2 border-primary/30 pl-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Etapa {step.step}</Badge>
                          <span className="font-semibold text-sm">{step.title}</span>
                          <span className="text-xs text-muted-foreground">({step.duration})</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {step.resources?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(step.resources || []).map((r, j) => <Badge key={`${r}-${j}`} variant="outline" className="text-[10px]">{r}</Badge>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Case Study */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <SectionHeader icon={Search} title="Estudo de Caso" sectionKey="caseStudy" />
                {expandedSections.caseStudy && (
                  <div className="pl-7 space-y-2">
                    <p className="text-sm font-semibold">{plan.caseStudy.title}</p>
                    <p className="text-sm text-muted-foreground">{plan.caseStudy.situation}</p>
                    <div>
                      <p className="text-sm font-semibold mb-1">Perguntas provocativas:</p>
                      <ul className="list-decimal pl-5 space-y-1">
                        {(plan?.caseStudy?.questions || []).map((q, i) => <li key={`${q}-${i}`} className="text-sm text-muted-foreground">{q}</li>)}
                      </ul>
                    </div>
                    <p className="text-sm"><strong>Resultado esperado:</strong> {plan.caseStudy.expectedOutcome}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assessment */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <SectionHeader icon={GraduationCap} title="Avaliação" sectionKey="assessment" />
                {expandedSections.assessment && (
                  <div className="pl-7 space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-1">Avaliação Formativa:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {(plan?.assessment?.formative || []).map((f, i) => <li key={`${f}-${i}`} className="text-sm text-muted-foreground">{f}</li>)}
                      </ul>
                    </div>
                    <p className="text-sm"><strong>Avaliação Somativa:</strong> {plan.assessment.summative}</p>
                    {plan.assessment.rubric?.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-border rounded">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="p-2 text-left border-b border-border">Critério</th>
                              <th className="p-2 text-left border-b border-border">Excelente</th>
                              <th className="p-2 text-left border-b border-border">Bom</th>
                              <th className="p-2 text-left border-b border-border">Em Desenvolvimento</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(plan?.assessment?.rubric || []).map((r, i) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="p-2 font-medium">{r.criteria}</td>
                                <td className="p-2 text-muted-foreground">{r.excellent}</td>
                                <td className="p-2 text-muted-foreground">{r.good}</td>
                                <td className="p-2 text-muted-foreground">{r.developing}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tecno-Maker */}
            {plan?.tecnoMaker && (
              <Card className="border-orange-500/20">
                <CardContent className="p-4 space-y-3">
                  <SectionHeader icon={Wrench} title="🔧 Atividade Tecno-Maker" sectionKey="tecnoMaker" />
                  {expandedSections.tecnoMaker && (
                    <div className="pl-7 space-y-2">
                      <p className="text-sm font-semibold">{plan.tecnoMaker.title}</p>
                      <p className="text-xs text-muted-foreground">⏱ Tempo estimado: {plan.tecnoMaker.estimatedTime}</p>
                      <div>
                        <p className="text-sm font-semibold mb-1">Materiais:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(plan.tecnoMaker.materials || []).map((m, i) => <Badge key={`${m}-${i}`} variant="outline" className="text-xs">{m}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1">Passo a passo:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                          {(plan.tecnoMaker.steps || []).map((s, i) => <li key={`${s}-${i}`} className="text-sm text-muted-foreground">{s}</li>)}
                        </ol>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 mt-2">
                        <p className="text-xs font-semibold mb-1">💡 Alternativa Low-Tech:</p>
                        <p className="text-xs text-muted-foreground">{plan.tecnoMaker.lowTechAlternative}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AEE Adaptations */}
            {plan?.aeeAdaptations && (
              <Card className="border-blue-500/20">
                <CardContent className="p-4 space-y-3">
                  <SectionHeader icon={Accessibility} title="♿ Adaptações AEE" sectionKey="aee" />
                  {expandedSections.aee && (
                    <div className="pl-7 space-y-2">
                      <div>
                        <p className="text-sm font-semibold mb-1">Atividades Sensoriais:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {(plan.aeeAdaptations.sensoryActivities || []).map((a, i) => <li key={`${a}-${i}`} className="text-sm text-muted-foreground">{a}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1">Instruções Simplificadas:</p>
                        <p className="text-sm text-muted-foreground">{plan.aeeAdaptations.simplifiedInstructions}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1">Materiais de Apoio:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(plan.aeeAdaptations.supportMaterials || []).map((m, i) => <Badge key={`${m}-${i}`} variant="outline" className="text-xs">{m}</Badge>)}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
