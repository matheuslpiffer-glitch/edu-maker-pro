import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Brain, Sparkles, Palette, FileDown, Save, Accessibility, Gem, CalendarDays, BookOpen } from 'lucide-react';
import { ALL_DEFAULT_SUBJECTS } from '@/lib/subjects-data';
import { SERIES_CATEGORIAS } from '@/lib/series-data';
import MindMapVisual from '@/components/mindmap/MindMapVisual';
import MindMapQuestions from '@/components/mindmap/MindMapQuestions';
 import StudySchedule from '@/components/mindmap/StudySchedule';
 import TeacherGuide from '@/components/mindmap/TeacherGuide';
 import GeradorInfograficoProcesso from '@/components/mindmap/GeradorInfograficoProcesso';
 import type { MindMapData, MindMapQuestion } from '@/components/mindmap/MindMapVisual';
import type { StudyDay } from '@/components/mindmap/StudySchedule';
 import { startGeneration, getGeneration, clearGeneration } from '@/lib/background-generation';
 import { useInstitutionName } from '@/hooks/useInstitutionName';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getAutoMode(grade: string): string {
  const iniciais = ['ano_1', 'ano_2', 'ano_3', 'ano_4', 'ano_5', 'bercario', 'maternal_1', 'maternal_2'];
  const finais = ['ano_6', 'ano_7', 'ano_8', 'ano_9'];
  if (iniciais.includes(grade)) return 'infantil';
  if (finais.includes(grade)) return 'fundamental';
  return 'medio';
}

const MODES = [
  { id: 'infantil', label: '🌈 Explorador Mirim', tag: 'Anos Iniciais', desc: 'Circular/nuvem, emojis grandes, cores pastéis, frases curtas' },
  { id: 'fundamental', label: '🔗 Conexão Analítica', tag: 'Fundamental II', desc: 'Ramificado, conectores lógicos, boxes com gatilhos mentais' },
  { id: 'medio', label: '🎓 Síntese Acadêmica', tag: 'Ensino Médio', desc: 'Denso, hierárquico, definições técnicas, interconexões' },
];

const GEN_KEY = 'mindmap';

export default function MindMapGenerator() {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const fullContentRef = useRef<HTMLDivElement>(null);
  const { name: institutionName } = useInstitutionName();

  const [theme, setTheme] = useState('');
  const [mode, setMode] = useState('medio');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [aee, setAee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapData, setMapData] = useState<MindMapData | null>(null);
  const [questions, setQuestions] = useState<MindMapQuestion[]>([]);
  const [schedule, setSchedule] = useState<StudyDay[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Auto-refresh on focus: sync institution name from Supabase
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('institution_name, updated_at')
          .eq('id', user.id)
          .single();
        if (data?.institution_name) {
          const current = localStorage.getItem('educreator_institution_name') || '';
          const remote = data.institution_name as string;
          if (remote && remote !== current) {
            localStorage.setItem('educreator_institution_name', remote);
            window.dispatchEvent(new StorageEvent('storage', { key: 'educreator_institution_name', newValue: remote }));
          }
        }
      } catch { /* silent */ }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Restore background generation result on mount
  useEffect(() => {
    const bg = getGeneration(GEN_KEY);
    if (bg.status === 'running') {
      setLoading(true);
      const interval = setInterval(() => {
        const current = getGeneration(GEN_KEY);
        if (current.status === 'done') {
          setMapData(current.result);
          setLoading(false);
          clearGeneration(GEN_KEY);
          toast({ title: 'Infográfico gerado com sucesso! 🧠' });
          clearInterval(interval);
        } else if (current.status === 'error') {
          setLoading(false);
          toast({ title: 'Erro ao gerar', description: current.error || '', variant: 'destructive' });
          clearGeneration(GEN_KEY);
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    } else if (bg.status === 'done') {
      setMapData(bg.result);
      clearGeneration(GEN_KEY);
      toast({ title: 'Infográfico gerado com sucesso! 🧠' });
    } else if (bg.status === 'error') {
      toast({ title: 'Erro ao gerar', description: bg.error || '', variant: 'destructive' });
      clearGeneration(GEN_KEY);
    }
  }, []);

  const handleGradeChange = (val: string) => {
    setGrade(val);
    setMode(getAutoMode(val));
  };

  const generate = async () => {
    if (!theme.trim()) { toast({ title: 'Informe o tema central', variant: 'destructive' }); return; }
    if (!grade) { toast({ title: 'Selecione a série/ano', variant: 'destructive' }); return; }
    setLoading(true);
    setQuestions([]);
    setSchedule([]);

    const currentTheme = theme.trim();
    const currentMode = mode;
    const currentSubject = subject;
    const currentGrade = grade;
    const currentAee = aee;

    startGeneration(GEN_KEY, async () => {
      const { data, error } = await supabase.functions.invoke('generate-mind-map', {
        body: { theme: currentTheme, mode: currentMode, subject: currentSubject, grade: currentGrade, aee: currentAee },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    });

    const interval = setInterval(() => {
      const current = getGeneration(GEN_KEY);
      if (current.status === 'done') {
        setMapData(current.result);
        setLoading(false);
        clearGeneration(GEN_KEY);
        toast({ title: 'Infográfico gerado com sucesso! 🧠' });
        clearInterval(interval);
      } else if (current.status === 'error') {
        setLoading(false);
        toast({ title: 'Erro ao gerar', description: current.error || '', variant: 'destructive' });
        clearGeneration(GEN_KEY);
        clearInterval(interval);
      }
    }, 500);
  };

  const generateQuestions = async () => {
    if (!mapData) return;
    setGeneratingQuestions(true);
    try {
      const branchSummary = mapData.branches.map(b =>
        `${b.label}: ${b.summary}${b.children?.length ? ' (' + b.children.map(c => c.label).join(', ') + ')' : ''}`
      ).join('\n');

      const prompt = `Analise o infográfico pedagógico sobre "${mapData.center.label}" com os seguintes tópicos:\n${branchSummary}\n\nGere exatamente 5 perguntas de análise e interpretação que exijam que o aluno observe as conexões visuais do infográfico.`;

      const { data, error } = await supabase.functions.invoke('generate-mind-map', {
        body: { theme: mapData.center.label, mode: 'questions', subject, grade, aee, questionPrompt: prompt },
      });
      if (error) throw error;
      if (data?.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions.map((q: any, i: number) => ({
          number: i + 1,
          question: q.question || q,
          answer: q.answer || '',
        })));
        toast({ title: 'Questões de análise geradas! 💎' });
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (e: any) {
      toast({ title: 'Erro ao gerar questões', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const generateSchedule = async () => {
    if (!mapData) return;
    setGeneratingSchedule(true);
    try {
      const branchLabels = mapData.branches.map(b => b.label).join(', ');
      const hasQuestions = questions.length > 0;

      const schedulePrompt = `Crie um cronograma de estudo semanal (Segunda a Sexta) para um aluno que está estudando o tema "${mapData.center.label}" usando um infográfico pedagógico com os seguintes tópicos: ${branchLabels}.${hasQuestions ? ' O aluno também tem questões de interpretação do infográfico para resolver.' : ''}

Cada dia deve ter uma missão objetiva e prática, e um tempo sugerido realista (10 a 30 minutos).
Adapte o nível para: ${grade || 'Ensino Médio'}${subject ? `, disciplina: ${subject}` : ''}.

TUDO EM MAIÚSCULAS.`;

      const { data, error } = await supabase.functions.invoke('generate-mind-map', {
        body: { theme: mapData.center.label, mode: 'schedule', subject, grade, aee, questionPrompt: schedulePrompt },
      });
      if (error) throw error;
      if (data?.schedule && Array.isArray(data.schedule)) {
        setSchedule(data.schedule.map((s: any) => ({
          day: s.day || '',
          mission: s.mission || '',
          time: s.time || '',
        })));
        toast({ title: 'Cronograma semanal gerado! 📅' });
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (e: any) {
      toast({ title: 'Erro ao gerar cronograma', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const exportImage = async () => {
    if (!mapRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(mapRef.current, { scale: 3, useCORS: true, backgroundColor: '#FFFFFF' });
      const link = document.createElement('a');
      link.download = `infografico-${theme.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'PNG exportado em alta definição! 📸' });
    } catch (e: any) {
      toast({ title: 'Erro na exportação', description: e.message, variant: 'destructive' });
    }
  };

  const exportPdf = async () => {
    if (!mapRef.current) return;
    try {
      const { generatePdfFromElement } = await import('@/lib/pdf-utils');
      await generatePdfFromElement(mapRef.current, `infografico-${theme.replace(/\s+/g, '-')}`, { orientation: 'landscape' });
      toast({ title: 'PDF exportado! 📄' });
    } catch (e: any) {
      toast({ title: 'Erro na exportação', description: e.message, variant: 'destructive' });
    }
  };

  const exportFullPdf = async () => {
    if (!fullContentRef.current) return;
    try {
      const { generatePdfFromElement } = await import('@/lib/pdf-utils');
      await generatePdfFromElement(fullContentRef.current, `pacote-completo-${theme.replace(/\s+/g, '-')}`, { orientation: 'portrait' });
      toast({ title: 'PDF completo exportado! 📄' });
    } catch (e: any) {
      toast({ title: 'Erro na exportação', description: e.message, variant: 'destructive' });
    }
  };

  const saveToLibrary = async () => {
    if (!mapData) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login para salvar');
      const payload = {
        ...mapData,
        _meta: {
          questions, schedule, mode, aee, grade, subject, institutionName,
          savedAt: new Date().toISOString(),
        },
      };
      const { error } = await supabase.from('question_banks').insert({
        user_id: user.id,
        subject: subject || 'Mapa Mental',
        topic: theme,
        grade: grade,
        purpose: 'multidisciplinar',
        question_type: 'mind-map',
        institution_name: institutionName || '',
        questions: payload as any,
      });
      if (error) throw error;
      toast({ title: 'Infográfico salvo na Biblioteca! 📚' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedMode = MODES.find(m => m.id === mode);
  const hasFullContent = questions.length > 0 || schedule.length > 0;

   return (
     <div className="space-y-6 pb-12">
       <div className="text-center space-y-2">
         <div className="flex items-center justify-center gap-2">
           <Brain className="h-8 w-8 text-primary" />
           <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
             Infográfico Pedagógico Maker
           </h1>
         </div>
         <p className="text-muted-foreground">Dra. IA · Neuroeducação & Design Instrucional Visual</p>
       </div>

       <Tabs defaultValue="mindmap" className="w-full">
         <div className="flex justify-center mb-6 no-print">
           <TabsList className="grid w-full max-w-md grid-cols-2">
             <TabsTrigger value="mindmap">Mapa Mental</TabsTrigger>
             <TabsTrigger value="infographic">Infográfico Passo a Passo</TabsTrigger>
           </TabsList>
         </div>

         <TabsContent value="mindmap" className="space-y-6">
           <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5" /> Painel de Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tema Central *</Label>
              <Input placeholder="Ex: Revolução Industrial" value={theme} onChange={e => setTheme(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Série/Ano *</Label>
              <Select value={grade} onValueChange={handleGradeChange}>
                <SelectTrigger><SelectValue placeholder="Selecione a série..." /></SelectTrigger>
                <SelectContent>
                  {SERIES_CATEGORIAS.map(cat => (
                    <div key={cat.label}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat.label}</div>
                      {cat.series.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disciplina (opcional)</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ALL_DEFAULT_SUBJECTS.map(s => (
                    <SelectItem key={s.name} value={s.name}>{s.icon} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo Visual</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <Accessibility className="h-5 w-5 text-blue-400" />
              <div>
                <Label className="text-sm font-semibold">Adaptação para Educação Especial (AEE)</Label>
                <p className="text-xs text-muted-foreground">Alto contraste, tipografia para dislexia, ícones ampliados, pistas visuais</p>
              </div>
            </div>
            <Switch checked={aee} onCheckedChange={setAee} />
          </div>

          {selectedMode && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Palette className="h-4 w-4" />
              <span>Estilo: <strong>{selectedMode.label}</strong> — {selectedMode.desc}</span>
            </div>
          )}

          <Button onClick={generate} disabled={loading} className="w-full md:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            {loading ? 'Gerando Infográfico...' : 'Gerar Infográfico com IA'}
           </Button>
         </CardContent>
       </Card>

       {mapData && (
        <>
          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" size="sm" onClick={exportImage}>
              <Download className="h-4 w-4 mr-1" /> PNG HD
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileDown className="h-4 w-4 mr-1" /> PDF Infográfico
            </Button>
            {hasFullContent && (
              <Button variant="outline" size="sm" onClick={exportFullPdf}>
                <FileDown className="h-4 w-4 mr-1" /> 📦 PDF Completo
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={saveToLibrary} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar na Biblioteca
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={generateQuestions}
              disabled={generatingQuestions}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              {generatingQuestions ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Gem className="h-4 w-4 mr-1" />}
              💎 Gerar Questões de Análise
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={generateSchedule}
              disabled={generatingSchedule}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {generatingSchedule ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarDays className="h-4 w-4 mr-1" />}
              📅 Gerar Cronograma Semanal
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowGuide(v => !v)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              📄 {showGuide ? 'Ocultar' : 'Gerar'} Guia do Professor
            </Button>
          </div>

          {/* Full content wrapper for unified PDF export */}
          <div ref={fullContentRef}>
            <div
              ref={mapRef}
              className="rounded-2xl p-8 md:p-12 overflow-auto"
              style={{
                background: '#FFFFFF',
                minHeight: 560,
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              }}
            >
              <MindMapVisual data={mapData} mode={mode} aee={aee} institutionName={institutionName} />
            </div>

            {/* Interpretation questions section */}
            {questions.length > 0 && (
              <div className="rounded-2xl overflow-hidden mt-4" style={{ border: '1px solid #E5E7EB' }}>
                <MindMapQuestions
                  questions={questions}
                  institutionName={institutionName}
                  theme={theme}
                />
                <div className="bg-white text-black p-8 max-w-[210mm] mx-auto border-t-2 border-dashed" style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '10pt',
                }}>
                  <p className="font-bold uppercase text-xs mb-3">📋 GABARITO — QUESTÕES DE ANÁLISE DO INFOGRÁFICO</p>
                  <div className="space-y-2">
                    {questions.map(q => (
                      <div key={q.number} style={{ breakInside: 'avoid' }}>
                        <p style={{ fontWeight: 700, fontSize: '10pt', textTransform: 'uppercase' }}>
                          {q.number}. {q.answer || 'RESPOSTA ABERTA — A CRITÉRIO DO PROFESSOR.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Study schedule section */}
            {schedule.length > 0 && (
              <div className="rounded-2xl overflow-hidden mt-4" style={{ border: '1px solid #E5E7EB' }}>
                <StudySchedule
                  schedule={schedule}
                  institutionName={institutionName}
                  theme={theme}
                />
              </div>
            )}

            {/* Teacher guide section */}
            {showGuide && (
              <div className="rounded-2xl overflow-hidden mt-4" style={{ border: '1px solid #E5E7EB' }}>
                <TeacherGuide
                  theme={theme}
                  subject={subject}
                  grade={grade}
                  mode={mode}
                  institutionName={institutionName}
                  hasQuestions={questions.length > 0}
                  hasSchedule={schedule.length > 0}
                />
              </div>
            )}
          </div>
         </>
       )}
         </TabsContent>

         <TabsContent value="infographic">
           <GeradorInfograficoProcesso />
         </TabsContent>
       </Tabs>

       <p className="text-center text-xs text-muted-foreground">
        Infográfico Pedagógico Maker · Neuroeducação & Visual Thinking por Matheus Lima Piffer
      </p>
    </div>
  );
}
