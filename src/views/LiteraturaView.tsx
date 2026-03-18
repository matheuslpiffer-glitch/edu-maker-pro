import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, ArrowLeft, BookOpen, GraduationCap, Brain, Globe, Library, Download, Printer, Eye, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SimQuestion, SavedSimulator } from './types';

const LITERATURA_MODELS = [
  { value: 'lit_vestibular', label: 'Foco Vestibular', icon: GraduationCap },
  { value: 'lit_capitulos', label: 'Resumo por Capítulos', icon: BookOpen },
  { value: 'lit_personagens', label: 'Análise de Personagens', icon: Brain },
  { value: 'lit_contexto', label: 'Contexto Histórico', icon: Globe },
];

export default function LiteraturaView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [examModel, setExamModel] = useState('lit_vestibular');
  const [litObraName, setLitObraName] = useState('');
  const [litAutorName, setLitAutorName] = useState('');
  const [title, setTitle] = useState('');
  const [institutionName, setInstitutionName] = useState('');

  const [questions, setQuestions] = useState<SimQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [history, setHistory] = useState<SavedSimulator[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState('create');

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('simulators')
      .select('*')
      .eq('exam_type', 'literatura')
      .order('created_at', { ascending: false });
    setHistory((data as unknown as SavedSimulator[]) || []);
    setLoadingHistory(false);
  };

  const generateDossie = async () => {
    if (!litObraName.trim()) {
      toast({ title: 'Informe o nome da obra literária.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setQuestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-simulator-questions', {
        body: {
          isLiteratura: true,
          litObraName: litObraName.trim(),
          litAutorName: litAutorName.trim(),
          litModel: examModel,
        },
      });
      if (error) throw error;
      const parsed = Array.isArray(data) ? data : data?.questions || [];
      setQuestions(parsed);
      setActiveTab('preview');
      toast({ title: '📚 Dossiê literário gerado!' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar dossiê', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || questions.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        title: title || `Dossiê: ${litObraName}`,
        exam_type: 'literatura',
        subject_area: 'Literatura',
        grade: 'Ensino Médio',
        questions: questions as any,
        skill_codes: [] as string[],
      };
      if (savedId) {
        await supabase.from('simulators').update(payload).eq('id', savedId);
      } else {
        const { data } = await supabase.from('simulators').insert(payload).select('id').single();
        if (data) setSavedId(data.id);
      }
      toast({ title: 'Dossiê salvo!' });
      loadHistory();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('simulators').delete().eq('id', id);
    toast({ title: 'Dossiê removido.' });
    loadHistory();
  };

  const handleLoad = (sim: SavedSimulator) => {
    setTitle(sim.title);
    setQuestions(sim.questions);
    setSavedId(sim.id);
    setActiveTab('preview');
    toast({ title: 'Dossiê carregado.' });
  };

  const handlePDF = async () => {
    const container = printContainerRef.current;
    if (!container) return;
    toast({ title: 'Gerando PDF...' });
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${title || 'dossie-literario'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      } as any).from(container).save();
      toast({ title: 'PDF gerado!' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-lg">
              <Library size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dossiê Literário</h1>
              <p className="text-xs text-muted-foreground">Resumos estruturados, análise de personagens e contexto histórico</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-4 sm:p-6 no-print">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-slate-100 rounded-xl">
            <TabsTrigger value="create" className="rounded-lg">Criar Dossiê</TabsTrigger>
            <TabsTrigger value="preview" disabled={questions.length === 0} className="rounded-lg">Pré-visualização</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg">Histórico ({history.length})</TabsTrigger>
          </TabsList>

          {/* CREATE TAB */}
          <TabsContent value="create">
            <div className="space-y-6 max-w-2xl">
              {/* Step 1: Modelo */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">1</div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Formato do Dossiê</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {LITERATURA_MODELS.map(model => {
                    const isSelected = examModel === model.value;
                    const Icon = model.icon;
                    return (
                      <button
                        key={model.value}
                        onClick={() => setExamModel(model.value)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                        }`}
                      >
                        <Icon size={14} />
                        {model.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Dados da Obra */}
              <div className="border-t border-slate-100" />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Dados da Obra Literária</h3>
                </div>
                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-amber-700">Título da Obra *</Label>
                    <Input
                      value={litObraName}
                      onChange={e => setLitObraName(e.target.value)}
                      placeholder="Ex: Dom Casmurro, O Cortiço..."
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-amber-700">Autor</Label>
                    <Input
                      value={litAutorName}
                      onChange={e => setLitAutorName(e.target.value)}
                      placeholder="Ex: Machado de Assis..."
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Config */}
              <div className="border-t border-slate-100" />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Configurações</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500">Nome da Instituição</Label>
                    <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Escola Municipal..." className="bg-slate-50 border-slate-200 rounded-[20px]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500">Título do Documento</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`Dossiê: ${litObraName || 'Obra'}`} className="bg-slate-50 border-slate-200 rounded-[20px]" />
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateDossie}
                disabled={generating || !litObraName.trim()}
                size="lg"
                className="w-full rounded-[20px] bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white shadow-lg shadow-amber-500/20 transition-all"
              >
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Library className="h-4 w-4 mr-2" />}
                {generating ? 'Gerando dossiê...' : 'GERAR DOSSIÊ LITERÁRIO'}
              </Button>

              {generating && (
                <div className="flex flex-col items-center gap-3 py-6 animate-pulse">
                  <Library className="h-12 w-12 text-amber-500 animate-bounce" />
                  <p className="text-sm font-medium text-slate-500 text-center">Analisando obra literária...</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* PREVIEW TAB */}
          <TabsContent value="preview">
            <div className="space-y-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4 flex-wrap">
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer size={16} className="mr-2" />Imprimir
                  </Button>
                  <Button size="sm" onClick={handlePDF} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Download size={16} className="mr-2" />Baixar PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Salvar
                  </Button>
                </CardContent>
              </Card>

              {questions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Gere um dossiê para ver a pré-visualização.</p>
                </div>
              ) : (
                <div className="flex justify-center bg-muted/30 py-4 sm:py-8 rounded-lg overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <div ref={printContainerRef} className="bg-white shadow-2xl border min-w-[794px] p-8" style={{ width: '794px' }}>
                    <div className="text-center mb-6">
                      {institutionName && <p className="text-sm text-slate-500 mb-1">{institutionName}</p>}
                      <h2 className="text-xl font-bold">{title || `Dossiê Literário: ${litObraName}`}</h2>
                      {litAutorName && <p className="text-sm text-slate-400 mt-1">Autor: {litAutorName}</p>}
                    </div>
                    {questions.map((q, i) => (
                      <div key={i} className="mb-6 pb-4 border-b border-slate-100 last:border-0">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge variant="outline" className="shrink-0 text-xs">{String(i + 1).padStart(2, '0')}</Badge>
                          {q.skillCode && <span className="text-xs text-muted-foreground font-mono">[{q.skillCode}]</span>}
                        </div>
                        <div className="prose prose-sm max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: (q.content || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle className="text-lg">Dossiês Salvos</CardTitle></CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum dossiê salvo ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map(sim => (
                      <div key={sim.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{sim.title}</p>
                          <span className="text-xs text-muted-foreground">{(sim.questions as any[])?.length || 0} seções</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleLoad(sim)}><Eye size={16} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(sim.id)} className="text-destructive"><Trash2 size={16} /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Print-only */}
      <div className="print-only">
        {questions.length > 0 && (
          <div className="p-8">
            <div className="text-center mb-6">
              {institutionName && <p className="text-sm text-slate-500 mb-1">{institutionName}</p>}
              <h2 className="text-xl font-bold">{title || `Dossiê Literário: ${litObraName}`}</h2>
              {litAutorName && <p className="text-sm text-slate-400 mt-1">Autor: {litAutorName}</p>}
            </div>
            {questions.map((q, i) => (
              <div key={i} className="mb-6 pb-4 border-b border-slate-100 last:border-0">
                <Badge variant="outline" className="text-xs mb-2">{String(i + 1).padStart(2, '0')}</Badge>
                <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: (q.content || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
