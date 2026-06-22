import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSavedQuestionsBank } from '@/hooks/useSavedQuestionsBank';
import {
  Loader2, Sparkles, Accessibility, Brain, Shapes, Zap, RefreshCw,
  BookMarked, CheckCircle2, Eye, Save, FileDown, MessageCircle,
  Users, Hand, Ear, Wand2, ImageIcon, Type, Image, Copy, KeyRound, QrCode,
  ArrowLeft, Volume2, Languages, Lightbulb, Stethoscope, GraduationCap,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildPinUrl } from '@/lib/public-links';
import QRCodeModal from '@/components/QRCodeModal';
import TriagemNeuro from '@/components/TriagemNeuro';

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

/* ── Necessity-specific AI adaptation tips ── */
const NECESSITY_TIPS: Record<string, string> = {
  'TEA': 'Professor, adaptei este material para TEA utilizando linguagem literal e estrutura previsível, evitando metáforas e figuras de linguagem ambíguas. Sugiro aplicar em ambiente calmo com rotina visual clara.',
  'TDAH': 'Professor, adaptei esta prova para TDAH destacando palavras-chave em negrito e dividindo textos longos em parágrafos menores com tópicos. Sugiro aplicar em um ambiente com poucos distratores sonoros.',
  'Dislexia': 'Professor, adaptei este material para Dislexia com maior espaçamento entre linhas, fonte acessível e suporte visual. Sugiro permitir tempo extra e leitura em voz alta se necessário.',
  'Baixa Visão': 'Professor, adaptei este material para Baixa Visão com fonte ampliada (14pt+), alto contraste e descrições textuais detalhadas de imagens. Sugiro imprimir em papel fosco.',
  'Surdez': 'Professor, adaptei este material para alunos Surdos priorizando recursos visuais, imagens e linguagem direta. Sugiro disponibilizar intérprete de Libras durante a aplicação.',
  'Altas Habilidades': 'Professor, este material foi enriquecido para Altas Habilidades com questões de aprofundamento e desafios extras. Sugiro oferecer projetos de pesquisa complementares.',
};

const NECESSITY_OPTIONS = ['TEA', 'TDAH', 'Dislexia', 'Baixa Visão', 'Surdez', 'Altas Habilidades'];

/* ── Dashboard Cards ── */
const INCLUSION_CARDS = [
  {
    id: 'adaptar' as const,
    title: 'Adaptar Avaliação',
    desc: 'Adapte provas e materiais com IA especializada em DUA',
    icon: RefreshCw,
    gradient: 'from-purple-600 to-violet-700',
    shadow: 'shadow-purple-500/30',
    bgAccent: 'bg-purple-500/10',
  },
  {
    id: 'tdah' as const,
    title: 'Criar Trilha TDAH',
    desc: 'Conteúdos curtos com estímulos visuais e micro-learning',
    icon: Zap,
    gradient: 'from-blue-600 to-cyan-600',
    shadow: 'shadow-blue-500/30',
    bgAccent: 'bg-blue-500/10',
  },
  {
    id: 'audio' as const,
    title: 'Audiodescrição Pedagógica',
    desc: 'Materiais acessíveis para alunos com deficiência visual',
    icon: Volume2,
    gradient: 'from-emerald-600 to-teal-600',
    shadow: 'shadow-emerald-500/30',
    bgAccent: 'bg-emerald-500/10',
  },
  {
    id: 'libras' as const,
    title: 'Tradutor para Libras',
    desc: 'Geração de imagens e roteiros visuais em Libras',
    icon: Languages,
    gradient: 'from-orange-500 to-amber-600',
    shadow: 'shadow-orange-500/30',
    bgAccent: 'bg-orange-500/10',
  },
  {
    id: 'triagem' as const,
    title: 'Triagem e Anamnese Neuro',
    desc: 'Questionários SNAP-IV e M-CHAT com relatório de apoio pedagógico',
    icon: Stethoscope,
    gradient: 'from-rose-600 to-pink-600',
    shadow: 'shadow-rose-500/30',
    bgAccent: 'bg-rose-500/10',
  },
];

const CYCLE_OPTIONS = [
  { value: 'infantil', label: 'Educação Infantil' },
  { value: 'anos_iniciais', label: 'Anos Iniciais (1º ao 5º)' },
  { value: 'anos_finais', label: 'Anos Finais (6º ao 9º)' },
  { value: 'medio', label: 'Ensino Médio' },
  { value: 'eja', label: 'EJA' },
];

type ActiveView = 'dashboard' | 'adaptar' | 'tdah' | 'audio' | 'libras' | 'triagem';

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

function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\$(.*?)\$\$/g, '$1')
    .replace(/\$(.*?)\$/g, '$1')
    .replace(/\\(?:c?frac)\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]*)\}/g, '√$1')
    .replace(/\\pi/g, 'π').replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ').replace(/\\delta/g, 'δ').replace(/\\theta/g, 'θ')
    .replace(/\\Delta/g, 'Δ').replace(/\\Sigma/g, 'Σ').replace(/\\Omega/g, 'Ω')
    .replace(/\\infty/g, '∞').replace(/\\times/g, '×').replace(/\\div/g, '÷')
    .replace(/\\neq/g, '≠').replace(/\\leq/g, '≤').replace(/\\geq/g, '≥')
    .replace(/\\approx/g, '≈').replace(/\\pm/g, '±').replace(/\\cdot/g, '·')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/<sup>([\d]+)<\/sup>/gi, (_m, d: string) => {
      const s: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
      return d.split('').map((c: string) => s[c] || c).join('');
    })
    .replace(/<sub>([\d]+)<\/sub>/gi, (_m, d: string) => {
      const s: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
      return d.split('').map((c: string) => s[c] || c).join('');
    })
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeQuestion(q: any): any {
  return {
    ...q,
    options: q.options?.map((opt: any) => ({
      ...opt,
      text: sanitizeText(opt.text || ''),
    })),
  };
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

/* ── Coming Soon Card ── */
function ComingSoonView({ title, icon: Icon, onBack }: { title: string; icon: React.ElementType; onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 rounded-xl">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      <div className="bg-card rounded-[3rem] border p-12 text-center space-y-4">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-black text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Este módulo está em desenvolvimento e será liberado em breve. Fique atento às atualizações do EduCreator Pro!
        </p>
        <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs font-bold">EM BREVE</Badge>
      </div>
    </div>
  );
}

export default function Inclusao() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { addQuestions } = useSavedQuestionsBank();

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [subject, setSubject] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
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
  const [savedAccessCode, setSavedAccessCode] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [specificNecessity, setSpecificNecessity] = useState('');
  const [consultancyTip, setConsultancyTip] = useState('');
  const [schoolCycle, setSchoolCycle] = useState('');

  const canGenerate = !!subject && selectedProfiles.length > 0 && !!topic && !!schoolCycle;

  const toggleProfile = (value: string) => {
    setSelectedProfiles(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleImageGenerated = (index: number, url: string) => {
    setGeneratedImages(prev => ({ ...prev, [index]: url }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    setGeneratedImages({});
    setSavedAccessCode('');
    setConsultancyTip('');
    try {
      const data = await fetchAeeWithRetry({
        isInclusao: true,
        activeDna: selectedProfiles.join(','),
        aeeProfiles: selectedProfiles,
        aeeMode,
        aeeTopic: topic,
        aeeContent: content.trim() || undefined,
        aeeQuestionCount: questionCount,
        aeeQuestionType: questionType,
        aeeImageMode: imageMode,
        specificTopic: topic,
        specificNecessity,
        schoolCycle,
      });
      if (data?.error) throw new Error(data.error);
      if (data?.questions) {
        const sanitized = data.questions.map((q: any) => sanitizeQuestion(q));
        setResult(sanitized);
        addQuestions(sanitized.map((q: any, i: number) => ({
          id: `aee-${Date.now()}-${i}`,
          banca: 'AEE',
          tema: topic || 'Inclusão',
          conteudo: q.content,
          tipo: questionType || 'Adaptada',
          options: q.options,
          dataCriacao: new Date().toISOString(),
        })));

        // Generate consultancy tip
        if (specificNecessity && NECESSITY_TIPS[specificNecessity]) {
          setConsultancyTip(NECESSITY_TIPS[specificNecessity]);
        } else if (selectedProfiles.length > 0) {
          const profileLabel = AEE_PROFILES.find(p => p.value === selectedProfiles[0])?.label || '';
          setConsultancyTip(`Professor, este material foi adaptado com foco em ${profileLabel}, seguindo as diretrizes do Desenho Universal para a Aprendizagem (DUA). Sugiro revisar o ambiente de aplicação para minimizar barreiras.`);
        }

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
      const questionsWithImages = result.map((q: any, i: number) => ({
        ...q,
        generatedImageUrl: generatedImages[i] || q.imageUrl || null,
      }));
      const { error } = await supabase.from('aee_activities').insert({
        user_id: user.id,
        profile: selectedProfiles.join(','),
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

  const handleSaveToBank = async () => {
    if (!user || !result) return;
    setSaving(true);
    try {
      const profileLabels = selectedProfiles.map(p => AEE_PROFILES.find(ap => ap.value === p)?.label || p).join(' + ');
      const { data, error } = await supabase.from('question_banks').insert({
        user_id: user.id,
        subject,
        topic: `AEE: ${profileLabels} — ${topic}`,
        grade: 'AEE',
        purpose: 'regular',
        question_type: questionType,
        institution_name: 'EduCreator Pro — Inclusão',
        questions: result.map((q: any, i: number) => ({
          ...q,
          generatedImageUrl: generatedImages[i] || q.imageUrl || null,
        })) as any,
      }).select('access_code').single();
      if (error) throw error;
      if (data?.access_code) {
        setSavedAccessCode(data.access_code);
        toast({ title: '✅ Simulado salvo com PIN!', description: `PIN: ${data.access_code}` });
      } else {
        toast({ title: '✅ Simulado salvo!' });
      }
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyQuestions = () => {
    if (!result) return;
    const profileLabels = selectedProfiles.map(p => AEE_PROFILES.find(ap => ap.value === p)?.label || p).join(' + ');
    const lines = result.map((q: any, i: number) => {
      let text = `${i + 1}) ${q.content?.replace(/<[^>]*>/g, '') || ''}`;
      if (q.options?.length) {
        text += '\n' + q.options.map((o: any) => `  ${o.letter}) ${o.text}`).join('\n');
      }
      return text;
    });
    const fullText = `📚 Atividade Adaptada — ${subject}\n🎯 Público-Alvo: ${profileLabels}\n📝 Tema: ${topic}\n\n${lines.join('\n\n')}\n\n✅ EduCreator Pro — Tecnologia Assistiva Autoral por Matheus Lima Piffer`;
    navigator.clipboard.writeText(fullText);
    toast({ title: '📋 Questões copiadas!' });
  };

  const handlePdf = async () => {
    const el = document.getElementById('aee-result-preview');
    if (!el) return;
    try {
      const header = document.createElement('div');
      header.id = 'aee-pdf-header';
      header.style.cssText = 'text-align:center;padding:10px 0 16px;border-bottom:2px solid #0891b2;margin-bottom:16px;font-family:Inter,Arial,sans-serif;';
      header.innerHTML = `<strong style="font-size:16px;color:#0F172A;">EduCreator Pro</strong><br/><span style="font-size:11px;color:#64748b;">Tecnologia Assistiva Autoral por Matheus Lima Piffer</span>`;
      el.prepend(header);

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
    const profileLabels = selectedProfiles.map(p => AEE_PROFILES.find(ap => ap.value === p)?.label || p).join(' + ');
    const activityLines = result.map((q: any, i: number) => {
      let text = `*${i + 1})* ${q.content?.replace(/<[^>]*>/g, '') || ''}`;
      if (q.options?.length) {
        text += '\n' + q.options.map((o: any) => `  ${o.letter}) ${o.text}`).join('\n');
      }
      const imgUrl = generatedImages[i] || q.imageUrl;
      if (imgUrl) {
        text += `\n🖼️ Imagem: ${imgUrl}`;
      }
      return text;
    });
    const msg = `🏫 *EduCreator Pro - Atividade Adaptada*\n\n👤 Professor: Matheus Lima Piffer\n\n📚 Disciplina: ${subject}\n\n🎯 Público-Alvo: ${profileLabels}\n\n${activityLines.join('\n\n')}\n\n✅ Tecnologia Assistiva Autoral por Matheus Lima Piffer`;
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

  /* ── Dashboard View ── */
  if (activeView === 'dashboard') {
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

        {/* Welcome Introduction */}
        <div className="rounded-[2.5rem] border border-sky-200/60 bg-gradient-to-br from-sky-50/80 via-white to-blue-50/60 p-8 sm:p-10 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground leading-tight">
              Bem-vindo ao Centro de Apoio Especializado Piffer EduTech 🧠
            </h3>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Professor(a), você acaba de acessar uma ferramenta de elite fundamentada nos protocolos globais de neurociência e no Desenho Universal para a Aprendizagem (DUA).
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nossa Inteligência Artificial atua como uma consultora especialista em neurodesenvolvimento para te ajudar a:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 border border-sky-100">
              <Stethoscope className="h-5 w-5 text-sky-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-foreground">Identificar Sinais</p>
                <p className="text-[11px] text-muted-foreground leading-snug">Realizar triagens técnicas de suspeita (TEA, TDAH, Dislexia e outros).</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 border border-sky-100">
              <Eye className="h-5 w-5 text-violet-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-foreground">Analisar o Desenvolvimento</p>
                <p className="text-[11px] text-muted-foreground leading-snug">Avaliar a coordenação motora fina através da caligrafia do aluno.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 border border-sky-100">
              <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-foreground">Adaptar com Precisão</p>
                <p className="text-[11px] text-muted-foreground leading-snug">Gerar materiais personalizados por ciclo escolar que removem barreiras de aprendizagem.</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground italic leading-relaxed border-l-4 border-sky-300 pl-4">
            Lembre-se: Este é um suporte pedagógico de alta precisão para embasar suas decisões e encaminhamentos. Juntos, garantimos o direito de aprender de cada aluno.
          </p>

          {/* Selo de Garantia Pedagógica */}
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-50/80 to-yellow-50/80">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Selo de Garantia Pedagógica</p>
              <p className="text-[10px] text-amber-700 leading-tight">Análise baseada em Protocolos de Neurociência Clínica · DSM-5-TR · CID-11</p>
            </div>
          </div>

          <Button
            onClick={() => setActiveView('triagem')}
            className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black py-5 px-8 text-sm hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-500/30 transition-all"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Iniciar Nova Triagem ou Adaptação
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {INCLUSION_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => setActiveView(card.id)}
                className={`group relative p-6 sm:p-8 rounded-[2rem] border bg-card text-left transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${card.shadow}`}
              >
                <div className={`absolute inset-0 rounded-[2rem] ${card.bgAccent} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative z-10 space-y-3">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black text-foreground">{card.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Tecnologia Assistiva Autoral por Matheus Lima Piffer · Sistema de Inclusão Blindado · EduCreator Pro
        </p>
      </div>
    );
  }

  /* ── Coming Soon Views ── */
  if (activeView === 'tdah') return <ComingSoonView title="Criar Trilha TDAH" icon={Zap} onBack={() => setActiveView('dashboard')} />;
  if (activeView === 'audio') return <ComingSoonView title="Audiodescrição Pedagógica" icon={Volume2} onBack={() => setActiveView('dashboard')} />;
  if (activeView === 'libras') return <ComingSoonView title="Tradutor para Libras (Imagens)" icon={Languages} onBack={() => setActiveView('dashboard')} />;

  /* ── Triagem Neuro View ── */
  if (activeView === 'triagem') return (
    <TriagemNeuro
      onBack={() => setActiveView('dashboard')}
      onAdaptFromProfile={(profile) => {
        setSelectedProfiles([profile]);
        setActiveView('adaptar');
      }}
    />
  );

  /* ── Main Adaptar View ── */
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Back button */}
      <Button variant="ghost" onClick={() => setActiveView('dashboard')} className="gap-2 rounded-xl">
        <ArrowLeft className="h-4 w-4" /> Voltar para Inclusão
      </Button>

      {/* Hero */}
      <div className="bg-[#0F172A] rounded-[3.5rem] p-8 sm:p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-violet-600/10 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase tracking-widest font-bold">
              Adaptar Avaliação
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">
            Adaptar Material / Prova
          </h2>
          <p className="text-sm text-slate-400 mt-3 max-w-md leading-relaxed">
            A IA adapta materiais pedagógicos inteiros com base no Desenho Universal para a Aprendizagem (DUA).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Ciclo Escolar */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Ciclo / Série <span className="text-destructive">*</span>
            </Label>
            <Select value={schoolCycle} onValueChange={setSchoolCycle}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="Selecione o ciclo escolar" />
              </SelectTrigger>
              <SelectContent>
                {CYCLE_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {schoolCycle && (
              <p className="text-[10px] text-cyan-600 font-semibold animate-in fade-in">
                🎯 IA ajustará: {schoolCycle === 'infantil' ? 'foco lúdico/imagético, linguagem simples, estímulos visuais amplos' :
                  schoolCycle === 'anos_iniciais' ? 'linguagem acessível, ilustrações de apoio, enunciados curtos' :
                  schoolCycle === 'anos_finais' ? 'enunciados intermediários, vocabulário progressivo' :
                  schoolCycle === 'medio' ? 'linguagem estrutural/objetiva, abordagem formal' :
                  'linguagem adulta, contextos práticos do cotidiano'}
              </p>
            )}
          </div>

          {/* Necessidade Específica */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Defina a Necessidade Específica
            </Label>
            <Select value={specificNecessity} onValueChange={setSpecificNecessity}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="Selecione a necessidade (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {NECESSITY_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            {specificNecessity && (
              <p className="text-[10px] text-purple-600 font-semibold animate-in fade-in">
                ✨ A IA ajustará automaticamente: {specificNecessity === 'TEA' ? 'linguagem literal, sem metáforas' :
                  specificNecessity === 'TDAH' ? 'instruções curtas, tópicos, negritos' :
                  specificNecessity === 'Dislexia' ? 'espaçamento amplo, suporte visual' :
                  specificNecessity === 'Baixa Visão' ? 'fonte 14pt+, alto contraste' :
                  specificNecessity === 'Surdez' ? 'prioridade visual, linguagem direta' :
                  'enriquecimento e desafios extras'}
              </p>
            )}
          </div>

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

          {/* STEP 2 — Profile multi-select */}
          {subject && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Público-Alvo — Selecione um ou mais <span className="text-destructive">*</span>
              </Label>
              {selectedProfiles.length > 1 && (
                <p className="text-[10px] text-cyan-600 font-semibold">
                  ✨ A IA cruzará as adaptações de {selectedProfiles.length} perfis automaticamente.
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AEE_PROFILES.map(profile => {
                  const Icon = profile.icon;
                  const isSelected = selectedProfiles.includes(profile.value);
                  const colors = colorMap[profile.color];
                  return (
                    <button
                      key={profile.value}
                      onClick={() => toggleProfile(profile.value)}
                      className={`relative p-4 rounded-2xl border-[3px] text-left transition-all duration-200 ${
                        isSelected
                          ? `${colors.bg} ${colors.border} shadow-lg ${colors.shadow}`
                          : 'bg-card border-transparent hover:border-border'
                      }`}
                    >
                      <div className="absolute top-2 right-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleProfile(profile.value)}
                          className="pointer-events-none"
                        />
                      </div>
                      <Icon className={`h-6 w-6 mb-2 ${isSelected ? colors.text : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-bold block ${isSelected ? colors.text : 'text-foreground'}`}>{profile.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 — Generation fields */}
          {subject && selectedProfiles.length > 0 && (
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
                className="w-full rounded-2xl text-white shadow-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
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
                        ? 'bg-purple-50 border-purple-500 shadow-md'
                        : 'bg-card border-transparent hover:border-border'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-purple-600' : 'text-muted-foreground'}`} />
                    <div>
                      <span className={`text-xs font-bold block ${isSelected ? 'text-purple-700' : 'text-foreground'}`}>{mode.label}</span>
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
              <p className="text-xs text-muted-foreground">Depois escolha o(s) perfil(is) de deficiência para desbloquear a geração.</p>
            </div>
          )}
        </div>
      </div>

      {/* Result preview */}
      {result && result.length > 0 && (
        <div className="bg-card rounded-[3rem] border p-8 space-y-6">
          <h3 className="text-lg font-black text-foreground">📋 Material Gerado</h3>

          {/* Consultancy Tip */}
          {consultancyTip && (
            <div className="flex items-start gap-3 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
              <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1">💡 Consultoria de Acessibilidade IA</p>
                <p className="text-sm text-amber-900 leading-relaxed">{consultancyTip}</p>
              </div>
            </div>
          )}

          {/* PIN badge */}
          {savedAccessCode && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-cyan-50 border border-cyan-200">
              <KeyRound className="h-5 w-5 text-cyan-600" />
              <div>
                <p className="text-xs font-bold text-cyan-700">PIN de Acesso do Aluno</p>
                <p className="text-2xl font-black tracking-[0.3em] text-cyan-800">{savedAccessCode}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto rounded-xl gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(savedAccessCode);
                  toast({ title: 'PIN copiado!' });
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1"
                onClick={() => setQrOpen(true)}
              >
                <QrCode className="h-3.5 w-3.5" /> QR Code
              </Button>
            </div>
          )}

          <div id="aee-result-preview" className="space-y-6" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {result.map((q: any, i: number) => (
              <div key={i} className="border rounded-2xl p-6 sm:p-8 space-y-4 break-words">
                <p className="font-black text-base sm:text-lg text-foreground">Questão {i + 1}</p>
                <div
                  className="prose prose-sm sm:prose-base max-w-none break-words leading-relaxed"
                  style={{ fontSize: '1.1rem', lineHeight: '1.85', fontFamily: 'Inter, system-ui, sans-serif' }}
                  dangerouslySetInnerHTML={{ __html: cleanHtml(q.content || '') }}
                />
                {q.options && q.options.length > 0 && (
                  <div className="space-y-3 mt-4">
                    {q.options.map((opt: any, j: number) => (
                      <div key={j} className={`flex items-start gap-3 p-4 sm:p-5 rounded-xl ${opt.isCorrect ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-foreground'}`}
                        style={{ fontSize: '1.1rem', lineHeight: '1.7', fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.01em' }}
                      >
                        <span className="font-black shrink-0 text-lg">{opt.letter})</span>
                        <span className="break-words">{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}

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

                {imageMode === 'com_imagem' && (
                  <QuestionImageGenerator
                    questionIndex={i}
                    onImageGenerated={(url) => handleImageGenerated(i, url)}
                  />
                )}

                {imageMode === 'somente_texto' && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Adaptação textual concluída com sucesso para o nível do aluno.
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t no-print">
            <Button onClick={handleSave} disabled={saving} variant="outline" className="rounded-2xl gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Atividade
            </Button>
            <Button onClick={handleSaveToBank} disabled={saving} className="rounded-2xl gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Enviar para Aluno (PIN)
            </Button>
            <Button onClick={handleCopyQuestions} variant="outline" className="rounded-2xl gap-2">
              <Copy className="h-4 w-4" /> Copiar Questões
            </Button>
            <Button onClick={handlePdf} variant="outline" className="rounded-2xl gap-2">
              <FileDown className="h-4 w-4" /> Gerar PDF
            </Button>
            <Button onClick={handleWhatsApp} variant="outline" className="rounded-2xl gap-2">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {savedAccessCode && (
        <QRCodeModal
          open={qrOpen}
          onOpenChange={setQrOpen}
          url={buildPinUrl(savedAccessCode)}
          title="PIN do Simulado Adaptado"
        />
      )}

      <p className="text-center text-xs text-muted-foreground">
        Tecnologia Assistiva Autoral por Matheus Lima Piffer · Sistema de Inclusão Blindado · EduCreator Pro
      </p>
    </div>
  );
}
