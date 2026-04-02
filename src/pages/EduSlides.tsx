import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Plus, Trash2, Download, FileText, ChevronLeft, ChevronRight, Presentation, Edit3, MessageSquare, Play, Save, Users, BookOpen, Palette, CheckCircle2, ImageIcon } from 'lucide-react';
import SkillSearch from '@/components/SkillSearch';
import SlidePresenter from '@/components/SlidePresenter';
import AttendancePanel from '@/components/AttendancePanel';
import PdfToolbar from '@/components/PdfToolbar';

interface Slide {
  title: string;
  content: string[];
  speaker_notes: string;
  activity: string | null;
  htmlContent?: string;
}

type Formato = 'slides' | 'apostila';
type Tema = 'minimalista' | 'dark_mode' | 'corporativo' | 'criativo';

const TEMAS: { id: Tema; label: string; desc: string; preview: string; bg: string; text: string }[] = [
  { id: 'minimalista', label: 'Minimalista', desc: 'Limpo e elegante', preview: 'bg-white border-2 border-slate-200', bg: '#ffffff', text: '#1e293b' },
  { id: 'dark_mode', label: 'Dark Mode', desc: 'Escuro e moderno', preview: 'bg-slate-900 border-2 border-slate-700', bg: '#0f172a', text: '#f8fafc' },
  { id: 'corporativo', label: 'Corporativo', desc: 'Profissional e sério', preview: 'bg-blue-950 border-2 border-blue-800', bg: '#172554', text: '#e0f2fe' },
  { id: 'criativo', label: 'Criativo', desc: 'Vibrante e colorido', preview: 'bg-gradient-to-br from-fuchsia-600 to-violet-700 border-2 border-fuchsia-400', bg: '#86198f', text: '#fdf4ff' },
];

export default function EduSlides() {
  const { user } = useAuth();

  // Restore persisted state
  const stored = (() => {
    try { const r = localStorage.getItem('eduslides_state'); return r ? JSON.parse(r) : null; } catch { return null; }
  })();

  const [topic, setTopic] = useState(stored?.topic || '');
  const [grade, setGrade] = useState(stored?.grade || '');
  const [objective, setObjective] = useState(stored?.objective || '');
  const [skillCode, setSkillCode] = useState(stored?.skillCode || '');
  const [skillDescription, setSkillDescription] = useState(stored?.skillDescription || '');
  const [slides, setSlides] = useState<Slide[]>(stored?.slides || []);
  const [generating, setGenerating] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(stored?.meetingId || null);
  const [showAttendance, setShowAttendance] = useState(false);

  // New studio states
  const [formato, setFormato] = useState<Formato | ''>(stored?.formato || '');
  const [tema, setTema] = useState<Tema>(stored?.tema || 'minimalista');
  const [includeAiImages, setIncludeAiImages] = useState(stored?.includeAiImages ?? true);
  const [slideCount, setSlideCount] = useState(stored?.slideCount || 8);
  const [htmlSlides, setHtmlSlides] = useState<string[]>(stored?.htmlSlides || []);

  // Persist state
  useEffect(() => {
    const state = { topic, grade, objective, skillCode, skillDescription, slides, meetingId, formato, tema, includeAiImages, slideCount, htmlSlides };
    localStorage.setItem('eduslides_state', JSON.stringify(state));
  }, [topic, grade, objective, skillCode, skillDescription, slides, meetingId, formato, tema, includeAiImages, slideCount, htmlSlides]);

  // Recovery toast
  useEffect(() => {
    if (stored && (stored.slides?.length > 0 || stored.htmlSlides?.length > 0)) {
      const key = 'recovery_shown_eduslides';
      const last = localStorage.getItem(key);
      if (!last || Date.now() - Number(last) > 60000) {
        localStorage.setItem(key, String(Date.now()));
        toast({ title: '🔄 Sessão recuperada', description: 'Recuperamos sua última sessão do EduSlides!' });
      }
    }
  }, []);

  // Warn on exit
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (slides.length > 0 || htmlSlides.length > 0) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [slides, htmlSlides]);

  const generate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Informe o tema da aula', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-slides', {
        body: {
          topic, skillCode, skillDescription, grade, objective,
          formato, tema, includeAiImages,
          slideCount: formato === 'slides' ? slideCount : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (formato === 'slides' && data?.htmlSlides?.length) {
        setHtmlSlides(data.htmlSlides);
        setSlides([]);
        setActiveSlide(0);
        setMeetingId(null);
        toast({ title: `${data.htmlSlides.length} slides visuais gerados!` });
      } else if (data?.slides?.length) {
        setSlides(data.slides);
        setHtmlSlides([]);
        setActiveSlide(0);
        setMeetingId(null);
        toast({ title: `${data.slides.length} slides gerados com sucesso!` });
      }
    } catch (e: any) {
      toast({ title: 'Erro ao gerar slides', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const saveMeeting = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (meetingId) {
        const { error } = await supabase.from('meetings').update({
          topic, skill_code: skillCode, skill_description: skillDescription,
          grade, objective, slides: slides as any,
        }).eq('id', meetingId);
        if (error) throw error;
        toast({ title: 'Aula atualizada!' });
      } else {
        const { data, error } = await supabase.from('meetings').insert({
          user_id: user.id, topic, skill_code: skillCode,
          skill_description: skillDescription, grade, objective,
          slides: slides as any,
        }).select('id').single();
        if (error) throw error;
        setMeetingId(data.id);
        toast({ title: 'Aula salva com sucesso!' });
      }
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateSlide = (index: number, field: keyof Slide, value: any) => {
    setSlides(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addSlide = () => {
    const newSlide: Slide = { title: 'Novo Slide', content: ['Conteúdo aqui'], speaker_notes: '', activity: null };
    const newSlides = [...slides];
    newSlides.splice(activeSlide + 1, 0, newSlide);
    setSlides(newSlides);
    setActiveSlide(activeSlide + 1);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return;
    setSlides(prev => prev.filter((_, i) => i !== index));
    if (activeSlide >= slides.length - 1) setActiveSlide(Math.max(0, slides.length - 2));
  };

  const exportPptx = async () => {
    setExporting(true);
    try {
      const pptxgenjs = await import('pptxgenjs');
      const PptxGenJS = pptxgenjs.default;
      const pres = new PptxGenJS();
      pres.layout = 'LAYOUT_WIDE';
      slides.forEach((slide, i) => {
        const s = pres.addSlide();
        if (skillCode) {
          s.addText(`📋 ${skillCode}`, { x: 0.5, y: 0.1, w: '90%', h: 0.3, fontSize: 10, color: '666666', fontFace: 'Arial' });
        }
        s.addText(slide.title, { x: 0.5, y: skillCode ? 0.4 : 0.3, w: '90%', h: 0.8, fontSize: 28, bold: true, color: '1a7a5a', fontFace: 'Arial' });
        const bullets = slide.content.map(c => ({ text: c, options: { fontSize: 18, color: '333333', bullet: true, breakLine: true } }));
        s.addText(bullets as any, { x: 0.5, y: 1.3, w: '90%', h: 3.5, fontFace: 'Arial', valign: 'top' });
        if (slide.activity) {
          s.addText(`🎯 Atividade: ${slide.activity}`, { x: 0.5, y: 5.0, w: '90%', h: 1.0, fontSize: 14, color: '1a5276', italic: true, fontFace: 'Arial', fill: { color: 'EBF5FB' } } as any);
        }
        if (slide.speaker_notes) s.addNotes(slide.speaker_notes);
        s.addText(`${i + 1}/${slides.length}`, { x: '90%', y: '93%', w: 0.8, h: 0.3, fontSize: 10, color: '999999', align: 'right' });
      });
      await pres.writeFile({ fileName: `${topic || 'aula'}.pptx` });
      toast({ title: 'PPTX exportado com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao exportar', description: e.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    const el = document.getElementById('pdf-preview-container') || document.getElementById('slides-print-area');
    if (!el) return;
    setExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opts: any = {
        margin: [15, 10, 15, 10],
        filename: `${topic || 'aula'}.pdf`,
        pagebreak: { mode: ['css', 'legacy'] },
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: formato === 'slides' ? 'landscape' as const : 'portrait' as const },
      };
      await html2pdf().set(opts).from(el).save();
      toast({ title: 'PDF exportado com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao exportar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const current = slides[activeSlide];
  const hasVisualSlides = htmlSlides.length > 0;
  const hasClassicSlides = slides.length > 0;
  const hasContent = hasVisualSlides || hasClassicSlides;

  // ═══════════════════════════════════════
  // STUDIO FORM (no content yet)
  // ═══════════════════════════════════════
  if (!hasContent) {
    return (
      <div className="relative max-w-[1200px] mx-auto overflow-x-hidden bg-slate-50 min-h-screen -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
            <Presentation className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Estúdio de Apresentações</p>
            <h1 className="text-2xl font-bold text-foreground">EduSlides Pro</h1>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="space-y-6 max-w-3xl mx-auto">

            {/* Step 1: Format */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-fuchsia-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">1</div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Formato do Material</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { id: 'slides' as Formato, icon: Presentation, label: 'Apresentação Dinâmica (Slides)', desc: 'Slides visuais ricos com imagens IA, ideal para projeção em sala' },
                  { id: 'apostila' as Formato, icon: BookOpen, label: 'Apostila / Roteiro', desc: 'Material textual completo para impressão e estudo dirigido' },
                ] as const).map(f => {
                  const Icon = f.icon;
                  const isSelected = formato === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFormato(f.id)}
                      className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col gap-2 min-h-[120px] ${
                        isSelected
                          ? 'bg-fuchsia-50 border-fuchsia-600 shadow-md shadow-fuchsia-500/10'
                          : 'bg-slate-50 border-transparent hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-fuchsia-600" />}
                      <Icon className={`h-6 w-6 ${isSelected ? 'text-fuchsia-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold ${isSelected ? 'text-fuchsia-700' : 'text-slate-600'}`}>{f.label}</span>
                      <span className="text-[11px] text-slate-400 leading-tight">{f.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Visual Theme (slides only) */}
            {formato === 'slides' && (
              <>
                <div className="border-t border-slate-100" />
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Tema Visual</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TEMAS.map(t => {
                      const isSelected = tema === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTema(t.id)}
                          className={`p-3 rounded-2xl border-2 text-left transition-all ${
                            isSelected ? 'border-fuchsia-600 shadow-md' : 'border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className={`h-16 rounded-xl mb-2 ${t.preview}`} />
                          <span className={`text-xs font-bold ${isSelected ? 'text-fuchsia-700' : 'text-slate-600'}`}>{t.label}</span>
                          <p className="text-[10px] text-slate-400">{t.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Topic & Config */}
            <div className="border-t border-slate-100" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{formato === 'slides' ? 3 : 2}</div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Conteúdo da Aula</h3>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-500">Tema da Aula *</Label>
                <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ex: Equações do 2º grau, Revolução Francesa..." className="mt-1 bg-slate-50 border-slate-200 rounded-[20px]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-500">Série / Ano</Label>
                  <Input value={grade} onChange={e => setGrade(e.target.value)} placeholder="Ex: 9º Ano" className="mt-1 bg-slate-50 border-slate-200 rounded-[20px]" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500">Objetivo da Aula</Label>
                  <Input value={objective} onChange={e => setObjective(e.target.value)} placeholder="Ex: Resolver equações usando Bhaskara" className="mt-1 bg-slate-50 border-slate-200 rounded-[20px]" />
                </div>
              </div>

              {formato === 'slides' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500">Quantidade de Slides: {slideCount}</Label>
                    <Slider
                      value={[slideCount]}
                      onValueChange={v => setSlideCount(v[0])}
                      min={4}
                      max={15}
                      step={1}
                      className="py-2"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-fuchsia-50 border border-fuchsia-200">
                    <div className="flex-1 mr-4">
                      <Label className="text-sm font-bold text-fuchsia-700 cursor-pointer flex items-center gap-1">
                        <ImageIcon className="h-4 w-4" /> Imagens IA
                      </Label>
                      <p className="text-[10px] text-fuchsia-500 mt-0.5">Gerar ilustrações automáticas por slide</p>
                    </div>
                    <Switch
                      checked={includeAiImages}
                      onCheckedChange={setIncludeAiImages}
                      className="data-[state=checked]:bg-fuchsia-600"
                    />
                  </div>
                </div>
              )}

              <Tabs defaultValue="free">
                <TabsList className="w-full">
                  <TabsTrigger value="free" className="flex-1">Tópico Livre</TabsTrigger>
                  <TabsTrigger value="seduc" className="flex-1">Escopo SEDUC-SP</TabsTrigger>
                </TabsList>
                <TabsContent value="free">
                  <p className="text-sm text-muted-foreground py-2">A IA criará o material com base no tema e objetivo informados.</p>
                </TabsContent>
                <TabsContent value="seduc" className="pt-2">
                  <SkillSearch onSelectSkill={(skill) => {
                    setSkillCode(skill.code);
                    setSkillDescription(skill.description);
                    if (!grade) setGrade(skill.grade);
                    toast({ title: `Habilidade ${skill.code} selecionada` });
                  }} />
                </TabsContent>
              </Tabs>

              {skillCode && (
                <div className="text-sm bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-3">
                  <span className="font-mono font-bold text-fuchsia-700">{skillCode}</span>
                  <span className="text-muted-foreground ml-2">{skillDescription}</span>
                </div>
              )}

              <Button
                onClick={generate}
                disabled={generating || !topic.trim() || !formato}
                size="lg"
                className="w-full rounded-[20px] text-white shadow-lg transition-all bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-700 hover:to-violet-700 shadow-fuchsia-500/20"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {generating ? 'Gerando...' : formato === 'slides' ? `GERAR ${slideCount} SLIDES VISUAIS` : 'GERAR APOSTILA'}
              </Button>
            </div>

            {generating && (
              <div className="flex flex-col items-center gap-3 py-6 animate-pulse">
                <div className="relative">
                  <Palette className="h-12 w-12 text-fuchsia-500 animate-bounce" />
                  <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-1 animate-ping" />
                </div>
                <p className="text-sm font-medium text-slate-500 text-center">
                  {formato === 'slides' ? 'Desenhando slides visuais com IA...' : 'Construindo apostila...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // VISUAL SLIDES VIEWER (HTML-based)
  // ═══════════════════════════════════════
  if (hasVisualSlides) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 no-print">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center shadow-sm">
              <Presentation className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{topic}</h1>
              <p className="text-xs text-muted-foreground">{htmlSlides.length} slides visuais • Tema: {TEMAS.find(t => t.id === tema)?.label}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PdfToolbar filename={`slides-${topic || 'aula'}`} />
            <Button variant="ghost" size="sm" onClick={() => { setHtmlSlides([]); setFormato(''); }}>Nova Aula</Button>
          </div>
        </div>

        {/* Slide navigation */}
        <div className="flex items-center justify-center gap-4 no-print">
          <Button variant="outline" size="icon" disabled={activeSlide === 0} onClick={() => setActiveSlide(activeSlide - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground font-mono">{activeSlide + 1} / {htmlSlides.length}</span>
          <Button variant="outline" size="icon" disabled={activeSlide === htmlSlides.length - 1} onClick={() => setActiveSlide(activeSlide + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Current slide */}
        <div id="pdf-preview-container" className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: (htmlSlides[activeSlide] || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }}
          />
        </div>

        {/* Thumbnails */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-print">
          {htmlSlides.map((html, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`shrink-0 w-32 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                i === activeSlide ? 'border-fuchsia-600 shadow-md' : 'border-slate-200 hover:border-fuchsia-300'
              }`}
            >
              <div
                className="w-full h-full transform scale-[0.15] origin-top-left"
                style={{ width: '640px', height: '400px' }}
                dangerouslySetInnerHTML={{ __html: html.replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }}
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // CLASSIC EDITOR (apostila / legacy)
  // ═══════════════════════════════════════
  if (showAttendance && meetingId) {
    return <AttendancePanel meetingId={meetingId} topic={topic} onBack={() => setShowAttendance(false)} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Presentation className="h-6 w-6 text-fuchsia-600" /> EduSlides
          </h1>
          <p className="text-sm text-muted-foreground">
            {slides.length} slides • {topic}
            {skillCode && <span className="ml-2 font-mono text-fuchsia-600">📋 {skillCode}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={addSlide}><Plus className="h-4 w-4 mr-1" /> Slide</Button>
          <Button variant="outline" size="sm" onClick={() => setPresenting(true)}><Play className="h-4 w-4 mr-1" /> Apresentar</Button>
          <Button variant="outline" size="sm" onClick={saveMeeting} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {meetingId ? 'Atualizar' : 'Salvar'}
          </Button>
          {meetingId && (
            <Button variant="outline" size="sm" onClick={() => setShowAttendance(true)}><Users className="h-4 w-4 mr-1" /> Presenças</Button>
          )}
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
          <Button size="sm" onClick={exportPptx} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
            PPTX
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setSlides([]); setMeetingId(null); setFormato(''); }}>Nova Aula</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`w-full text-left p-3 rounded-lg border text-sm transition-colors relative group ${
                i === activeSlide ? 'border-fuchsia-600 bg-fuchsia-50 ring-1 ring-fuchsia-600' : 'border-border hover:border-fuchsia-300'
              }`}
            >
              <span className="text-xs font-mono text-muted-foreground">{i + 1}</span>
              <p className="font-medium truncate text-xs mt-0.5">{s.title}</p>
              {slides.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeSlide(i); }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </button>
          ))}
        </div>

        {current && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-fuchsia-50 to-violet-50 p-8 min-h-[320px] flex flex-col justify-center">
                {skillCode && <div className="text-xs font-mono text-muted-foreground mb-2">📋 {skillCode}</div>}
                <Input
                  value={current.title}
                  onChange={e => updateSlide(activeSlide, 'title', e.target.value)}
                  className="text-2xl font-bold border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto"
                />
                <div className="mt-4 space-y-2">
                  {current.content.map((c, ci) => (
                    <div key={ci} className="flex items-start gap-2">
                      <span className="text-fuchsia-600 mt-1">•</span>
                      <Input
                        value={c}
                        onChange={e => {
                          const newContent = [...current.content];
                          newContent[ci] = e.target.value;
                          updateSlide(activeSlide, 'content', newContent);
                        }}
                        className="border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto text-sm"
                      />
                      <button
                        onClick={() => updateSlide(activeSlide, 'content', current.content.filter((_, j) => j !== ci))}
                        className="text-muted-foreground hover:text-destructive shrink-0 mt-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => updateSlide(activeSlide, 'content', [...current.content, 'Novo item'])}>
                    <Plus className="h-3 w-3 mr-1" /> Item
                  </Button>
                </div>
                {current.activity && (
                  <div className="mt-4 p-3 bg-background/80 rounded-lg border border-fuchsia-200">
                    <Label className="text-xs text-fuchsia-600 flex items-center gap-1"><Edit3 className="h-3 w-3" /> Atividade</Label>
                    <Textarea
                      value={current.activity}
                      onChange={e => updateSlide(activeSlide, 'activity', e.target.value)}
                      className="mt-1 border-none bg-transparent shadow-none focus-visible:ring-0 px-0 min-h-[60px] text-sm"
                    />
                  </div>
                )}
              </div>
            </Card>

            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" disabled={activeSlide === 0} onClick={() => setActiveSlide(activeSlide - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{activeSlide + 1} / {slides.length}</span>
              <Button variant="outline" size="icon" disabled={activeSlide === slides.length - 1} onClick={() => setActiveSlide(activeSlide + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <Label className="text-sm flex items-center gap-1 mb-2"><MessageSquare className="h-4 w-4" /> Notas do Professor</Label>
                <Textarea
                  value={current.speaker_notes}
                  onChange={e => updateSlide(activeSlide, 'speaker_notes', e.target.value)}
                  placeholder="Orientações de fala para este slide..."
                  className="min-h-[80px]"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div id="slides-print-area" className="hidden print:block">
        {slides.map((s, i) => (
          <div key={i} style={{ pageBreakAfter: 'always', padding: '20mm 15mm', fontFamily: 'Arial, sans-serif' }}>
            {skillCode && <div style={{ fontSize: '9pt', color: '#666', marginBottom: '8px', fontFamily: 'monospace' }}>📋 {skillCode}</div>}
            <h2 style={{ color: '#86198f', fontSize: '22pt', marginBottom: '16px' }}>{s.title}</h2>
            <ul style={{ fontSize: '11pt', lineHeight: '2' }}>
              {s.content.map((c, ci) => <li key={ci}>{c}</li>)}
            </ul>
            {s.activity && (
              <div style={{ marginTop: '16px', padding: '10px', background: '#fdf4ff', border: '1px solid #d946ef', borderRadius: '8px', fontSize: '11pt' }}>
                <strong>🎯 Atividade:</strong> {s.activity}
              </div>
            )}
            {s.speaker_notes && (
              <div style={{ marginTop: '12px', padding: '10px', background: '#f9f9f9', borderLeft: '3px solid #a855f7', fontSize: '10pt', color: '#666' }}>
                <strong>📝 Notas:</strong> {s.speaker_notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {presenting && (
        <SlidePresenter slides={slides} skillCode={skillCode} startIndex={activeSlide} onClose={() => setPresenting(false)} />
      )}
    </div>
  );
}
