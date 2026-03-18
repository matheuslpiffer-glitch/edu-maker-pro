import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSavedQuestionsBank } from '@/hooks/useSavedQuestionsBank';
import {
  Loader2, Sparkles, Accessibility, Brain, Shapes, Zap, RefreshCw,
  BookMarked, CheckCircle2, Eye, Save, FileDown, MessageCircle,
  Users, Hand, Ear, Wand2, ImageIcon, Type, Image,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/* ── Profiles ── */
const AEE_PROFILES = [
  { value: 'aee_tea', label: 'TEA (Autismo)', icon: Shapes, color: 'amber' },
  { value: 'aee_tdah', label: 'TDAH', icon: Zap, color: 'rose' },
  { value: 'aee_intelectual', label: 'DI (Def. Intelectual)', icon: Brain, color: 'violet' },
  { value: 'aee_visual', label: 'Deficiência Visual', icon: Eye, color: 'sky' },
  { value: 'aee_dm', label: 'DM (Def. Múltipla)', icon: Users, color: 'emerald' },
  { value: 'aee_tod', label: 'TOD', icon: Hand, color: 'orange' },
  { value: 'aee_auditiva', label: 'Deficiência Auditiva', icon: Ear, color: 'indigo' },
];

const AEE_MODES = [
  { id: 'gerar_novas' as const, label: 'Gerar Novas Questões', icon: Sparkles, desc: 'Crie questões adaptadas do zero' },
  { id: 'adaptar_antigas' as const, label: 'Adaptar Prova Existente', icon: RefreshCw, desc: 'Traduza provas convencionais para formato inclusivo' },
  { id: 'texto_resumo' as const, label: 'Apostila / Roteiro Visual', icon: BookMarked, desc: 'Gere materiais visuais e roteiros simplificados' },
];

const SUBJECTS = [
  'Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Arte', 'Educação Física', 'Inglês', 'Ensino Religioso',
];

function cleanHtml(raw: string): string {
  return raw
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .trim();
}

async function fetchAeeWithRetry(payload: Record<string, unknown>, retries = 2, delay = 1200): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-simulator-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    let parsed: any = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
    if (!response.ok) {
      const errorMessage = parsed?.error || raw ||
        (response.status === 429 ? 'Limite de requisições excedido.' :
         response.status === 402 ? 'Créditos insuficientes.' :
         `Erro ${response.status} ao gerar conteúdo AEE.`);
      const error = new Error(errorMessage) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return parsed;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    const retriable = !status || status >= 500 || status === 429;
    if (!retriable || retries <= 0) throw error;
    await new Promise(r => setTimeout(r, delay));
    return fetchAeeWithRetry(payload, retries - 1, delay * 2);
  }
}

/* ── Per-question image generator component ── */
function QuestionImageGenerator({ questionIndex, onImageGenerated }: { questionIndex: number; onImageGenerated: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setImageUrl('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-illustration', {
        body: { prompt: prompt.trim() },
      });
      if (fnError) throw fnError;
      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
        onImageGenerated(data.imageUrl);
      } else {
        throw new Error('Nenhuma imagem retornada');
      }
    } catch (e: any) {
      console.error('Image generation error:', e);
      setError('Adaptação textual concluída com sucesso para o nível do aluno. A imagem de apoio não pôde ser gerada, mas o conteúdo textual está completo.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-600 text-xs font-bold hover:from-purple-500/20 hover:to-pink-500/20 transition-all no-print"
      >
        <Wand2 className="h-3.5 w-3.5" />
        Gerar Imagem de Apoio
      </button>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 no-print">
      <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
        <ImageIcon className="h-4 w-4" />
        Imagem de Apoio — Questão {questionIndex + 1}
      </div>
      <div className="flex gap-2">
        <Input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ex: Desenho simples de uma pizza dividida em 4 partes, estilo cartoon limpo"
          className="rounded-xl text-sm flex-1"
          onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
          disabled={loading}
        />
        <Button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          size="sm"
          className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        </Button>
      </div>
      {loading && (
        <p className="text-xs text-purple-500 animate-pulse font-medium">🎨 Gerando imagem via IA… Aguarde ~15 segundos.</p>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Imagem de apoio gerada"
          className="w-full max-w-sm h-auto rounded-2xl shadow-md my-4"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
    </div>
  );
}

export default function Inclusao() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { addQuestions } = useSavedQuestionsBank();

  const [subject, setSubject] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [aeeMode, setAeeMode] = useState<'gerar_novas' | 'adaptar_antigas' | 'texto_resumo'>('gerar_novas');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('multipla_visual');
  const [imageMode, setImageMode] = useState<'com_imagem' | 'somente_texto'>('com_imagem');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});

  const canGenerate = !!subject && !!selectedProfile && !!topic;

  const handleImageGenerated = (index: number, url: string) => {
    setGeneratedImages(prev => ({ ...prev, [index]: url }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    setGeneratedImages({});
    try {
      const data = await fetchAeeWithRetry({
        isInclusao: true,
        activeDna: selectedProfile,
        aeeMode,
        aeeTopic: topic,
        aeeContent: content.trim() || undefined,
        aeeQuestionCount: questionCount,
        aeeQuestionType: questionType,
        aeeImageMode: imageMode,
        specificTopic: topic,
      });
      if (data?.error) throw new Error(data.error);
      if (data?.questions) {
        setResult(data.questions);
        addQuestions(data.questions.map((q: any, i: number) => ({
          id: `aee-${Date.now()}-${i}`,
          banca: 'AEE',
          tema: topic || 'Inclusão',
          conteudo: q.content,
          tipo: questionType || 'Adaptada',
          options: q.options,
          dataCriacao: new Date().toISOString(),
        })));
        toast({ title: '✅ Material AEE gerado com sucesso!' });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao gerar conteúdo AEE', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setSaving(true);
    try {
      // Merge generated images into questions
      const questionsWithImages = result.map((q: any, i: number) => ({
        ...q,
        generatedImageUrl: generatedImages[i] || q.imageUrl || null,
      }));
      const { error } = await supabase.from('aee_activities').insert({
        user_id: user.id,
        profile: selectedProfile,
        subject,
        topic,
        mode: aeeMode,
        question_type: questionType,
        questions: questionsWithImages as any,
      });
      if (error) throw error;
      toast({ title: '✅ Atividade salva no seu perfil!' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async () => {
    const el = document.getElementById('aee-result-preview');
    if (!el) return;
    try {
      const header = document.createElement('div');
      header.id = 'aee-pdf-header';
      header.style.cssText = 'text-align:center;padding:10px 0 16px;border-bottom:2px solid #0891b2;margin-bottom:16px;font-family:Inter,Arial,sans-serif;';
      header.innerHTML = `<strong style="font-size:16px;color:#0F172A;">EduCreator Pro</strong><br/><span style="font-size:11px;color:#64748b;">Por Matheus Lima Piffer</span>`;
      el.prepend(header);

      // Hide no-print elements for PDF capture
      const noPrintEls = el.querySelectorAll('.no-print');
      noPrintEls.forEach(e => (e as HTMLElement).style.display = 'none');

      const html2pdf = (await import('html2pdf.js')).default;
      const opts: any = {
        margin: [15, 15, 15, 15],
        filename: `AEE_${topic || 'atividade'}.pdf`,
        pagebreak: { mode: ['css', 'legacy'] },
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdf().set(opts).from(el).save();
      header.remove();
      noPrintEls.forEach(e => (e as HTMLElement).style.display = '');
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (e: any) {
      document.getElementById('aee-pdf-header')?.remove();
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    }
  };

  const handleWhatsApp = () => {
    if (!result) return;
    const profileLabel = AEE_PROFILES.find(p => p.value === selectedProfile)?.label || selectedProfile;
    const activityLines = result.map((q: any, i: number) => {
      let text = `*${i + 1})* ${q.content?.replace(/<[^>]*>/g, '') || ''}`;
      if (q.options?.length) {
        text += '\n' + q.options.map((o: any) => `  ${o.letter}) ${o.text}`).join('\n');
      }
      // Include image URL if generated
      const imgUrl = generatedImages[i] || q.imageUrl;
      if (imgUrl) {
        text += `\n🖼️ Imagem: ${imgUrl}`;
      }
      return text;
    });
    const msg = `🏫 *EduCreator Pro - Atividade Adaptada*\n\n👤 Professor: Matheus Lima Piffer\n\n📚 Disciplina: ${subject}\n\n🎯 Público-Alvo: ${profileLabel}\n\n${activityLines.join('\n\n')}\n\n✅ Gerado via EduCreator Pro`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const colorMap: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
    amber: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-600', shadow: 'shadow-amber-500/20' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-600', shadow: 'shadow-rose-500/20' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-500', text: 'text-violet-600', shadow: 'shadow-violet-500/20' },
    sky: { bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-600', shadow: 'shadow-sky-500/20' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-600', shadow: 'shadow-emerald-500/20' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-600', shadow: 'shadow-orange-500/20' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-600', shadow: 'shadow-indigo-500/20' },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <div className="bg-[#0F172A] rounded-[3.5rem] p-8 sm:p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 to-teal-600/10 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Accessibility className="h-6 w-6 text-white" />
            </div>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] uppercase tracking-widest font-bold">
              Inclusão AEE
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">
            Educação para Todos,<br />Sem Exceção.
          </h2>
          <p className="text-sm text-slate-400 mt-3 max-w-md leading-relaxed">
            IA especializada em Desenho Universal para a Aprendizagem. Crie materiais adaptados por perfil com imagens de apoio visual.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: form */}
        <div className="lg:col-span-3 space-y-6">
          {/* STEP 1 — Disciplina */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Disciplina <span className="text-destructive">*</span>
            </Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Selecione a disciplina" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* STEP 2 — Profile (shown after discipline) */}
          {subject && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Público-Alvo (Deficiência) <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AEE_PROFILES.map(profile => {
                  const Icon = profile.icon;
                  const isSelected = selectedProfile === profile.value;
                  const colors = colorMap[profile.color];
                  return (
                    <button
                      key={profile.value}
                      onClick={() => setSelectedProfile(profile.value)}
                      className={`relative p-4 rounded-2xl border-[3px] text-left transition-all duration-200 ${
                        isSelected
                          ? `${colors.bg} ${colors.border} shadow-lg ${colors.shadow}`
                          : 'bg-card border-transparent hover:border-border'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className={`absolute top-2 right-2 h-4 w-4 ${colors.text}`} />}
                      <Icon className={`h-6 w-6 mb-2 ${isSelected ? colors.text : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-bold block ${isSelected ? colors.text : 'text-foreground'}`}>{profile.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 — Generation fields (shown after profile) */}
          {subject && selectedProfile && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                3. Gerar Atividade Adaptada
              </Label>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assunto / Tema</Label>
                <Input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Ex: Sistema Solar, Frações, Animais vertebrados..."
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {aeeMode === 'adaptar_antigas' ? 'Cole aqui a prova original para adaptação' : 'Conteúdo / Texto de apoio'}
                </Label>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={
                    aeeMode === 'adaptar_antigas'
                      ? 'Cole aqui o texto da prova que deseja adaptar para formato inclusivo...'
                      : 'Cole aqui o conteúdo, texto-base ou informações pedagógicas...'
                  }
                  className="min-h-[200px] rounded-2xl"
                />
              </div>

              {aeeMode === 'gerar_novas' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantidade</Label>
                      <Input type="number" min={1} max={20} value={questionCount} onChange={e => setQuestionCount(+e.target.value)} className="rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                      <Select value={questionType} onValueChange={setQuestionType}>
                        <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multipla_visual">Múltipla Escolha Visual</SelectItem>
                          <SelectItem value="verdadeiro_falso">Verdadeiro ou Falso</SelectItem>
                          <SelectItem value="ligar_colunas">Ligar Colunas</SelectItem>
                          <SelectItem value="perguntas_diretas">Perguntas Diretas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Image Mode Selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modo de Imagem</Label>
                    <RadioGroup value={imageMode} onValueChange={(v) => setImageMode(v as 'com_imagem' | 'somente_texto')} className="flex gap-3">
                      <label className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all ${imageMode === 'com_imagem' ? 'border-cyan-500 bg-cyan-50 shadow-md' : 'border-transparent bg-muted/50 hover:border-border'}`}>
                        <RadioGroupItem value="com_imagem" id="com_imagem" />
                        <Image className={`h-4 w-4 ${imageMode === 'com_imagem' ? 'text-cyan-600' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-bold ${imageMode === 'com_imagem' ? 'text-cyan-700' : 'text-foreground'}`}>Com Imagem</span>
                      </label>
                      <label className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all ${imageMode === 'somente_texto' ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-transparent bg-muted/50 hover:border-border'}`}>
                        <RadioGroupItem value="somente_texto" id="somente_texto" />
                        <Type className={`h-4 w-4 ${imageMode === 'somente_texto' ? 'text-teal-600' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-bold ${imageMode === 'somente_texto' ? 'text-teal-700' : 'text-foreground'}`}>Somente Texto Adaptado</span>
                      </label>
                    </RadioGroup>
                    {imageMode === 'somente_texto' && (
                      <p className="text-[10px] text-muted-foreground italic">A IA usará descrições verbais ricas e analogias concretas para substituir recursos visuais.</p>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={generating || !canGenerate}
                size="lg"
                className="w-full rounded-2xl text-white shadow-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
              >
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Accessibility className="h-4 w-4 mr-2" />}
                {generating ? 'Gerando...' : 'GERAR ATIVIDADE INCLUSIVA'}
              </Button>
            </div>
          )}
        </div>

        {/* Right: Mode selector */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modo de Trabalho</h3>
            <div className="space-y-2">
              {AEE_MODES.map(mode => {
                const Icon = mode.icon;
                const isSelected = aeeMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setAeeMode(mode.id)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-cyan-50 border-cyan-500 shadow-md'
                        : 'bg-card border-transparent hover:border-border'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-cyan-600' : 'text-muted-foreground'}`} />
                    <div>
                      <span className={`text-xs font-bold block ${isSelected ? 'text-cyan-700' : 'text-foreground'}`}>{mode.label}</span>
                      <span className="text-[10px] text-muted-foreground">{mode.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {!subject && (
            <div className="bg-muted/50 rounded-2xl p-5 text-center space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Comece selecionando a Disciplina</p>
              <p className="text-xs text-muted-foreground">Depois escolha o perfil de deficiência para desbloquear a geração.</p>
            </div>
          )}
        </div>
      </div>

      {/* Result preview */}
      {result && result.length > 0 && (
        <div className="bg-card rounded-[3rem] border p-8 space-y-6">
          <h3 className="text-lg font-black text-foreground">📋 Material Gerado</h3>
          <div id="aee-result-preview" className="space-y-6" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {result.map((q: any, i: number) => (
              <div key={i} className="border rounded-2xl p-6 space-y-3 break-words">
                <p className="font-bold text-sm text-foreground">Questão {i + 1}</p>
                <div
                  className="prose prose-sm max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: cleanHtml(q.content || '') }}
                />
                {q.options && q.options.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {q.options.map((opt: any, j: number) => (
                      <div key={j} className={`flex items-start gap-2 p-2 rounded-xl text-sm ${opt.isCorrect ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-muted-foreground'}`}>
                        <span className="font-bold shrink-0">{opt.letter})</span>
                        <span className="break-words">{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing AI-generated image */}
                {q.imageUrl && (
                  <img
                    src={q.imageUrl}
                    alt="Imagem de apoio"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      el.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium my-2';
                      fallback.innerHTML = '✅ Adaptação textual concluída com sucesso para o nível do aluno.';
                      el.parentElement?.insertBefore(fallback, el.nextSibling);
                    }}
                    className="w-full max-w-sm h-auto rounded-2xl shadow-md my-4"
                  />
                )}

                {/* Generated image */}
                {generatedImages[i] && !q.imageUrl && (
                  <img
                    src={generatedImages[i]}
                    alt="Imagem de apoio gerada"
                    className="w-full max-w-sm h-auto rounded-2xl shadow-md my-4"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      el.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium my-2';
                      fallback.innerHTML = '✅ Adaptação textual concluída com sucesso para o nível do aluno.';
                      el.parentElement?.insertBefore(fallback, el.nextSibling);
                    }}
                  />
                )}

                {/* Per-question image generator button — only show in "com_imagem" mode */}
                {imageMode === 'com_imagem' && (
                  <QuestionImageGenerator
                    questionIndex={i}
                    onImageGenerated={(url) => handleImageGenerated(i, url)}
                  />
                )}

                {/* Text-only success badge */}
                {imageMode === 'somente_texto' && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Adaptação textual concluída com sucesso para o nível do aluno.
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Output action bar */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t no-print">
            <Button onClick={handleSave} disabled={saving} variant="outline" className="rounded-2xl gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Atividade
            </Button>
            <Button onClick={handlePdf} variant="outline" className="rounded-2xl gap-2">
              <FileDown className="h-4 w-4" /> Gerar PDF
            </Button>
            <Button onClick={handleWhatsApp} variant="outline" className="rounded-2xl gap-2">
              <MessageCircle className="h-4 w-4" /> Enviar para WhatsApp
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Estratégia Pedagógica por Matheus Lima Piffer · EduCreator Pro
      </p>
    </div>
  );
}
