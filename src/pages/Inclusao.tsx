import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSavedQuestionsBank } from '@/hooks/useSavedQuestionsBank';
import { Loader2, Sparkles, Accessibility, Brain, Shapes, Zap, RefreshCw, BookMarked, CheckCircle2, ImageIcon, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AEE_PROFILES = [
  { value: 'aee_tea', label: 'TEA (Autismo)', icon: Shapes, color: 'amber' },
  { value: 'aee_tdah', label: 'TDAH', icon: Zap, color: 'rose' },
  { value: 'aee_intelectual', label: 'Deficiência Intelectual', icon: Brain, color: 'violet' },
  { value: 'aee_visual', label: 'Deficiência Visual', icon: Eye, color: 'sky' },
];

const AEE_MODES = [
  { id: 'gerar_novas' as const, label: 'Gerar Novas Questões', icon: Sparkles, desc: 'Crie questões adaptadas do zero' },
  { id: 'adaptar_antigas' as const, label: 'Adaptar Prova Existente', icon: RefreshCw, desc: 'Traduza provas convencionais para formato inclusivo' },
  { id: 'texto_resumo' as const, label: 'Apostila / Roteiro Visual', icon: BookMarked, desc: 'Gere materiais visuais e roteiros simplificados' },
];

// Utility: remove markdown wrappers, decode escaped HTML and strip scripts
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

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
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const errorMessage =
        parsed?.error ||
        raw ||
        (response.status === 429
          ? 'Limite de requisições excedido.'
          : response.status === 402
            ? 'Créditos insuficientes.'
            : `Erro ${response.status} ao gerar conteúdo AEE.`);

      const error = new Error(errorMessage) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return parsed;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    const retriable = !status || status >= 500 || status === 429;

    if (!retriable || retries <= 0) throw error;

    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchAeeWithRetry(payload, retries - 1, delay * 2);
  }
}

export default function Inclusao() {
  const { toast } = useToast();
  const { addQuestions } = useSavedQuestionsBank();

  const [selectedProfile, setSelectedProfile] = useState('aee_tea');
  const [aeeMode, setAeeMode] = useState<'gerar_novas' | 'adaptar_antigas' | 'texto_resumo'>('gerar_novas');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('multipla_visual');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const data = await fetchAeeWithRetry({
        isInclusao: true,
        activeDna: selectedProfile,
        aeeMode,
        aeeTopic: topic,
        aeeContent: content.trim() || undefined,
        aeeQuestionCount: questionCount,
        aeeQuestionType: questionType,
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

  const colorMap: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
    amber: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-600', shadow: 'shadow-amber-500/20' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-600', shadow: 'shadow-rose-500/20' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-500', text: 'text-violet-600', shadow: 'shadow-violet-500/20' },
    sky: { bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-600', shadow: 'shadow-sky-500/20' },
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
        {/* Left: Content area */}
        <div className="lg:col-span-3 space-y-6">
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
              className="min-h-[300px] rounded-2xl"
            />
          </div>

          {aeeMode === 'gerar_novas' && (
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
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating || !topic}
            size="lg"
            className="w-full rounded-2xl text-white shadow-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
          >
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Accessibility className="h-4 w-4 mr-2" />}
            {generating ? 'Gerando...' : 'GERAR ATIVIDADE INCLUSIVA'}
          </Button>
        </div>

        {/* Right: Parameters */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Perfil do Laudo</h3>
            <div className="grid grid-cols-2 gap-3">
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

          {/* Mode selector */}
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
        </div>
      </div>

      {/* Result preview — rendered as HTML via dangerouslySetInnerHTML */}
      {result && result.length > 0 && (
        <div className="bg-card rounded-[3rem] border p-8 space-y-6">
          <h3 className="text-lg font-black text-foreground">📋 Material Gerado</h3>
          <div className="space-y-6">
            {result.map((q: any, i: number) => (
              <div key={i} className="border rounded-2xl p-6 space-y-3">
                <p className="font-bold text-sm text-foreground">Questão {i + 1}</p>
                {/* Render AI HTML properly */}
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: cleanHtml(q.content || '') }}
                />
                {q.options && q.options.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {q.options.map((opt: any, j: number) => (
                      <div key={j} className={`flex items-start gap-2 p-2 rounded-xl text-sm ${opt.isCorrect ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-muted-foreground'}`}>
                        <span className="font-bold shrink-0">{opt.letter})</span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Image from Pollinations — no alt to avoid visual pollution */}
                {q.imageUrl && (
                  <img
                    src={q.imageUrl}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="rounded-3xl w-full h-auto bg-muted"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
