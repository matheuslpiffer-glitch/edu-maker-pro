import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import QRCodeModal from '@/components/QRCodeModal';
import { buildPublicAppUrl } from '@/lib/public-links';
import { Loader2, PenLine, QrCode, CheckCircle, XCircle, Eye, Gem, Copy, Users, RefreshCw, AlertTriangle, ShieldAlert, Sparkles, BarChart3, MessageSquareHeart, Printer, Filter, SortAsc } from 'lucide-react';

const BANCAS = ['ENEM', 'FUVEST', 'VUNESP', 'UNICAMP'] as const;

interface Annotation {
  start: number;
  end: number;
  type: 'error' | 'weak' | 'good';
  comment: string;
}

interface Originality {
  score: number;
  flags: string[];
  ai_generated_probability: number;
}

interface Competency {
  name: string;
  score: number;
  max: number;
  justification: string;
}

interface Scores {
  competencies?: Competency[];
  total_score?: number;
  annotations?: Annotation[];
  originality?: Originality;
}

interface Submission {
  id: string;
  proposal_theme: string;
  banca: string;
  student_name: string;
  student_class: string;
  essay_text: string;
  status: string;
  scores: Scores;
  suggestions: string;
  repertoire_analysis: string;
  total_score: number;
  corrected_at: string | null;
  teacher_validated: boolean;
  teacher_notes: string;
  access_code: string;
  created_at: string;
}

// ── Annotated text renderer ──
function AnnotatedText({ text, annotations }: { text: string; annotations: Annotation[] }) {
  if (!annotations || annotations.length === 0) return <span>{text}</span>;

  const sorted = [...annotations]
    .filter(a => a.start >= 0 && a.end <= text.length && a.start < a.end)
    .sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((ann, idx) => {
    if (ann.start > cursor) {
      parts.push(<span key={`t-${idx}`}>{text.slice(cursor, ann.start)}</span>);
    }
    const colorClass = ann.type === 'error'
      ? 'bg-destructive/20 border-b-2 border-destructive'
      : ann.type === 'weak'
        ? 'bg-yellow-200/40 dark:bg-yellow-800/30 border-b-2 border-yellow-500'
        : 'bg-emerald-200/40 dark:bg-emerald-800/30 border-b-2 border-emerald-500';

    parts.push(
      <Tooltip key={`a-${idx}`}>
        <TooltipTrigger asChild>
          <span className={`${colorClass} cursor-help rounded-sm px-0.5`}>
            {text.slice(ann.start, ann.end)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <span className="font-semibold">{ann.type === 'error' ? '❌ Erro' : ann.type === 'weak' ? '⚠️ Ponto fraco' : '✅ Destaque'}:</span> {ann.comment}
        </TooltipContent>
      </Tooltip>
    );
    cursor = ann.end;
  });

  if (cursor < text.length) {
    parts.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return <>{parts}</>;
}

// ── Originality Badge ──
function OriginalityBadge({ originality }: { originality?: Originality }) {
  if (!originality) return null;
  const { score, ai_generated_probability, flags } = originality;

  let color = 'bg-primary/10 text-primary';
  let label = 'Original';
  if (score <= 30) { color = 'bg-destructive/20 text-destructive'; label = 'Suspeito de Plágio/IA'; }
  else if (score <= 60) { color = 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'; label = 'Atenção'; }

  return (
    <Card className="border-muted">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-semibold text-sm">Análise de Originalidade</h4>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={color}>{label} ({score}%)</Badge>
          {ai_generated_probability > 50 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {ai_generated_probability}% chance IA externa
            </Badge>
          )}
        </div>
        {flags.length > 0 && (
          <ul className="text-xs text-muted-foreground list-disc pl-4">
            {flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Competency Heatmap ──
function CompetencyHeatmap({ submissions }: { submissions: Submission[] }) {
  const corrected = submissions.filter(s => s.status === 'corrected' && s.scores?.competencies);
  if (corrected.length < 2) return null;

  // Aggregate: for each competency name, calculate average percentage
  const compMap = new Map<string, { total: number; count: number }>();
  corrected.forEach(s => {
    s.scores.competencies!.forEach(c => {
      const existing = compMap.get(c.name) || { total: 0, count: 0 };
      existing.total += (c.score / c.max) * 100;
      existing.count += 1;
      compMap.set(c.name, existing);
    });
  });

  const compStats = Array.from(compMap.entries()).map(([name, { total, count }]) => ({
    name,
    avg: Math.round(total / count),
    count,
  })).sort((a, b) => a.avg - b.avg);

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Mapa de Calor — Dificuldades da Turma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {compStats.map((c, i) => {
          const heatColor = c.avg < 40 ? 'bg-destructive' : c.avg < 60 ? 'bg-yellow-500' : c.avg < 80 ? 'bg-primary' : 'bg-emerald-500';
          const failPct = 100 - c.avg;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground text-xs">
                  {failPct > 50 && <span className="text-destructive font-semibold">{failPct}% dos alunos falharam • </span>}
                  Média: {c.avg}%
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${heatColor} rounded-full transition-all`} style={{ width: `${c.avg}%` }} />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground mt-2">Baseado em {corrected.length} redações corrigidas</p>
      </CardContent>
    </Card>
  );
}

// ── Banca-aware Scorecard ──
function BancaScorecard({ banca, competencies }: { banca: string; competencies: Competency[] }) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Scorecard — {banca}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {competencies.map((c, i) => {
          const pct = (c.score / c.max) * 100;
          const color = pct < 40 ? 'bg-destructive' : pct < 60 ? 'bg-yellow-500' : pct < 80 ? 'bg-primary' : 'bg-emerald-500';
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <Badge variant="outline" className="text-xs">{c.score}/{c.max}</Badge>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{c.justification}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ── Teacher Panel ──
function TeacherPanel() {
  const { user } = useAuth();
  const [theme, setTheme] = useState('');
  const [banca, setBanca] = useState<string>('ENEM');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [detailSub, setDetailSub] = useState<Submission | null>(null);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [generatingRewrite, setGeneratingRewrite] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<{ rewritten_text: string; changes_summary: string; key_improvements: string[] } | null>(null);
  const [correctingFromTeacher, setCorrectingFromTeacher] = useState(false);
  const [aiTurmaSummary, setAiTurmaSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'lowest' | 'by_class'>('all');
  const [filterClass, setFilterClass] = useState('');
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [printingPdf, setPrintingPdf] = useState(false);

  const loadSubmissions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('essay_submissions')
      .select('*')
      .eq('teacher_user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setSubmissions(data as unknown as Submission[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  const createProposal = async () => {
    if (!user || !theme.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('essay_submissions')
      .insert({ teacher_user_id: user.id, proposal_theme: theme.trim(), banca })
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else if (data) {
      const sub = data as unknown as Submission;
      toast({ title: '✅ Proposta criada!', description: `Código de acesso: ${sub.access_code}` });
      setTheme('');
      loadSubmissions();
    }
    setCreating(false);
  };

  const openQR = (code: string) => {
    setQrUrl(buildPublicAppUrl(`/redacao-online/${code}`));
    setQrOpen(true);
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(buildPublicAppUrl(`/redacao-online/${code}`));
    toast({ title: '📋 Link copiado!' });
  };

  const validateCorrection = async (sub: Submission, validated: boolean) => {
    const source = validated ? (sub.teacher_validated ? 'teacher_edited' : 'teacher_released') : 'teacher_adjusted';
    await supabase
      .from('essay_submissions')
      .update({ teacher_validated: validated, teacher_notes: teacherNotes, correction_source: source } as any)
      .eq('id', sub.id);
    toast({ title: validated ? '📤 Correção liberada para o aluno!' : '📝 Nota ajustada (rascunho)' });
    setDetailSub(null);
    loadSubmissions();
  };

  const generateRewrite = async (sub: Submission) => {
    setGeneratingRewrite(true);
    setRewriteResult(null);
    const { data, error } = await supabase.functions.invoke('rewrite-essay', {
      body: { essayText: sub.essay_text, banca: sub.banca, theme: sub.proposal_theme, suggestions: sub.suggestions },
    });
    if (error || data?.error) {
      toast({ title: 'Erro', description: data?.error || error?.message || 'Falha ao gerar reescrita', variant: 'destructive' });
    } else {
      setRewriteResult(data);
    }
    setGeneratingRewrite(false);
  };

  const correctFromTeacher = async (sub: Submission) => {
    if (!sub.essay_text || sub.essay_text.trim().length < 20) {
      toast({ title: 'Texto insuficiente', description: 'O aluno ainda não escreveu o suficiente.', variant: 'destructive' });
      return;
    }
    setCorrectingFromTeacher(true);
    const { data: fnData, error: fnError } = await supabase.functions.invoke('correct-essay-text', {
      body: { essayText: sub.essay_text, banca: sub.banca, theme: sub.proposal_theme },
    });
    if (fnError || fnData?.error) {
      toast({ title: 'Erro na correção', description: fnData?.error || fnError?.message, variant: 'destructive' });
      setCorrectingFromTeacher(false);
      return;
    }
    const totalScore = fnData.total_score || 0;
    await supabase.from('essay_submissions').update({
      scores: fnData,
      suggestions: fnData.suggestions || '',
      repertoire_analysis: fnData.repertoire_analysis || '',
      total_score: totalScore,
      status: 'corrected',
      corrected_at: new Date().toISOString(),
    } as any).eq('id', sub.id);
    setDetailSub({ ...sub, scores: fnData, suggestions: fnData.suggestions || '', repertoire_analysis: fnData.repertoire_analysis || '', total_score: totalScore, status: 'corrected' });
    toast({ title: '✅ Correção Doutora concluída!', description: `Nota: ${totalScore}` });
    loadSubmissions();
    setCorrectingFromTeacher(false);
  };

  const generateTurmaSummary = async () => {
    const corrected = submissions.filter(s => s.status === 'corrected' && s.scores?.competencies);
    if (corrected.length < 2) {
      toast({ title: 'Dados insuficientes', description: 'Corrija ao menos 2 redações para gerar o resumo.', variant: 'destructive' });
      return;
    }
    setGeneratingSummary(true);
    const compMap = new Map<string, { total: number; count: number }>();
    corrected.forEach(s => {
      s.scores.competencies!.forEach(c => {
        const e = compMap.get(c.name) || { total: 0, count: 0 };
        e.total += (c.score / c.max) * 100;
        e.count++;
        compMap.set(c.name, e);
      });
    });
    const stats = Array.from(compMap.entries()).map(([name, { total, count }]) => `${name}: média ${Math.round(total / count)}%`).join(', ');
    const { data, error } = await supabase.functions.invoke('pedagogical-insights', {
      body: { prompt: `Com base em ${corrected.length} redações corrigidas, as médias por competência são: ${stats}. Gere um resumo de 3 linhas para o professor com: 1) a principal dificuldade da turma, 2) a competência que precisa de reforço, 3) uma sugestão de atividade.` },
    });
    if (!error && data?.tips) setAiTurmaSummary(data.tips);
    else setAiTurmaSummary(`Análise: ${stats}. Reforce as competências com menor média.`);
    setGeneratingSummary(false);
  };

  // Filter + sort submissions
  const uniqueClasses = useMemo(() => {
    const classes = new Set(submissions.map(s => s.student_class).filter(Boolean));
    return Array.from(classes).sort();
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    let list = [...submissions];
    if (filterMode === 'pending') list = list.filter(s => s.status !== 'corrected');
    else if (filterMode === 'lowest') list = list.filter(s => s.status === 'corrected').sort((a, b) => (a.total_score || 0) - (b.total_score || 0));
    else if (filterMode === 'by_class' && filterClass) list = list.filter(s => s.student_class === filterClass);
    return list;
  }, [submissions, filterMode, filterClass]);

  const grouped = useMemo(() => {
    const map = new Map<string, Submission[]>();
    filteredSubmissions.forEach(s => {
      const key = `${s.proposal_theme}__${s.banca}__${s.access_code}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [filteredSubmissions]);

  // Generate motivational feedback for student
  const generateStudentFeedback = async (sub: Submission) => {
    setGeneratingFeedback(true);
    setFeedbackText('');
    const compSummary = sub.scores?.competencies
      ? sub.scores.competencies.map(c => `${c.name}: ${c.score}/${c.max}`).join(', ')
      : `Nota: ${sub.total_score}`;
    const { data, error } = await supabase.functions.invoke('pedagogical-insights', {
      body: {
        prompt: `Escreva uma mensagem de feedback motivadora e técnica para um aluno de redação (banca ${sub.banca}). Dados da correção: ${compSummary}. Sugestões: ${sub.suggestions || 'nenhuma'}. A mensagem deve: 1) Elogiar os pontos fortes, 2) Indicar de forma construtiva 2-3 áreas de melhoria, 3) Terminar com uma frase motivacional. Máximo 150 palavras. Tom: profissional mas acolhedor.`,
      },
    });
    if (!error && data?.tips) setFeedbackText(data.tips);
    else setFeedbackText(`Parabéns pelo esforço! Sua nota foi ${sub.total_score}. Continue praticando para melhorar nas competências indicadas.`);
    setGeneratingFeedback(false);
  };

  // Print audit PDF
  const printAuditPdf = async (sub: Submission) => {
    setPrintingPdf(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const container = document.createElement('div');
      container.style.width = '794px';
      container.style.padding = '30px';
      container.style.fontFamily = 'serif';
      container.style.fontSize = '12px';
      container.style.lineHeight = '1.6';

      const compRows = sub.scores?.competencies
        ? sub.scores.competencies.map(c =>
          `<tr><td style="padding:6px;border:1px solid #ccc;font-weight:600">${c.name}</td><td style="padding:6px;border:1px solid #ccc;text-align:center">${c.score}/${c.max}</td><td style="padding:6px;border:1px solid #ccc;font-size:11px">${c.justification}</td></tr>`
        ).join('')
        : '';

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px">
          <div><h1 style="margin:0;font-size:18px">LAUDO DE CORREÇÃO — IA DOUTORA</h1><p style="margin:4px 0 0;font-size:12px;color:#666">Banca: ${sub.banca} | Tema: ${sub.proposal_theme}</p></div>
          <div style="text-align:right;font-size:11px;color:#666"><p style="margin:0">Aluno: <strong>${sub.student_name || 'N/I'}</strong></p><p style="margin:0">Turma: ${sub.student_class || 'N/I'}</p><p style="margin:0">Data: ${sub.corrected_at ? new Date(sub.corrected_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</p></div>
        </div>
        <div style="columns:2;column-gap:24px">
          <div style="break-inside:avoid;margin-bottom:16px">
            <h3 style="margin:0 0 8px;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:4px">📝 TEXTO DO ALUNO</h3>
            <div style="white-space:pre-wrap;font-size:11px;line-height:1.7;background:#f9f9f9;padding:12px;border-radius:4px">${sub.essay_text || 'Texto não disponível.'}</div>
          </div>
          <div style="break-inside:avoid">
            <h3 style="margin:0 0 8px;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:4px">📊 CHECKLIST DA IA DOUTORA</h3>
            <table style="width:100%;border-collapse:collapse;font-size:11px">${compRows || '<tr><td style="padding:6px;border:1px solid #ccc">Sem dados de competência</td></tr>'}</table>
            <div style="text-align:center;margin:12px 0;padding:10px;background:#e8f5e9;border-radius:6px"><strong style="font-size:20px">${sub.total_score}</strong><br/><span style="font-size:11px;color:#666">Nota Total</span></div>
            ${sub.suggestions ? `<div style="break-inside:avoid;margin-top:12px"><h4 style="margin:0 0 4px;font-size:12px">💡 Sugestões</h4><p style="font-size:11px;color:#444">${sub.suggestions}</p></div>` : ''}
            ${sub.repertoire_analysis ? `<div style="break-inside:avoid;margin-top:12px"><h4 style="margin:0 0 4px;font-size:12px">📚 Repertório</h4><p style="font-size:11px;color:#444">${sub.repertoire_analysis}</p></div>` : ''}
          </div>
        </div>
        <div style="margin-top:24px;border-top:1px solid #ddd;padding-top:12px;font-size:10px;color:#999;text-align:center">Laudo gerado por EduCreator Pro — IA Doutora | ${new Date().toLocaleDateString('pt-BR')}</div>
      `;

      document.body.appendChild(container);
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `laudo_redacao_${sub.student_name || 'aluno'}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(container).save();
      document.body.removeChild(container);
      toast({ title: '📄 PDF gerado!', description: 'Laudo de correção baixado com sucesso.' });
    } catch (e) {
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
    setPrintingPdf(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PenLine className="h-5 w-5 text-primary" />
            Criar Proposta de Redação Online
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
            <Input placeholder="Ex: O impacto da IA na educação brasileira" value={theme} onChange={e => setTheme(e.target.value)} />
            <Select value={banca} onValueChange={setBanca}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{BANCAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={createProposal} disabled={creating || !theme.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Proposta'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <CompetencyHeatmap submissions={submissions} />

      {/* AI Turma Summary */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Dashboard de Habilidades — Resumo IA
            </h3>
            <Button size="sm" variant="outline" onClick={generateTurmaSummary} disabled={generatingSummary}>
              {generatingSummary ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <BarChart3 className="h-4 w-4 mr-1" />}
              Gerar Análise
            </Button>
          </div>
          {aiTurmaSummary && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground leading-relaxed">
              {aiTurmaSummary}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Biblioteca de Redações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar por..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendentes de correção</SelectItem>
                <SelectItem value="lowest">Notas mais baixas</SelectItem>
                <SelectItem value="by_class">Por Turma</SelectItem>
              </SelectContent>
            </Select>
            {filterMode === 'by_class' && (
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Turma" /></SelectTrigger>
                <SelectContent>
                  {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Badge variant="secondary" className="ml-auto">{filteredSubmissions.length} resultados</Badge>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredSubmissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma redação encontrada com esse filtro.</p>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([key, subs]) => {
                const first = subs[0];
                const answered = subs.filter(s => s.essay_text.length > 0);
                return (
                  <div key={key} className="border rounded-lg p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{first.proposal_theme || 'Sem tema'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{first.banca}</Badge>
                          <Badge variant="secondary">{answered.length}/{subs.length} respostas</Badge>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{first.access_code}</code>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => copyLink(first.access_code)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openQR(first.access_code)}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {answered.length > 0 && (
                      <div className="space-y-2">
                        {answered.map(s => {
                          const hasPlagiarismAlert = s.scores?.originality && (s.scores.originality.score <= 30 || s.scores.originality.ai_generated_probability > 70);
                          return (
                            <div key={s.id} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-medium text-sm">{s.student_name || 'Anônimo'}</span>
                                {s.student_class && <Badge variant="outline" className="text-xs">{s.student_class}</Badge>}
                                {s.status === 'corrected' ? (
                                  <Badge className="bg-primary/20 text-primary">
                                    Nota: {s.total_score}
                                    {s.teacher_validated && <CheckCircle className="h-3 w-3 ml-1" />}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Pendente</Badge>
                                )}
                                {hasPlagiarismAlert && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Plágio/IA detectado
                                  </Badge>
                                )}
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => { setDetailSub(s); setTeacherNotes(s.teacher_notes || ''); setRewriteResult(null); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <QRCodeModal open={qrOpen} onOpenChange={setQrOpen} url={qrUrl} title="Link da Redação Online" />

      {/* Detail Dialog — Audit Interface */}
      <Dialog open={!!detailSub} onOpenChange={() => { setDetailSub(null); setFeedbackText(''); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Auditoria — {detailSub?.student_name || 'Aluno'}</span>
              <div className="flex items-center gap-2">
                {detailSub?.status === 'corrected' && (
                  <Button size="sm" variant="outline" onClick={() => detailSub && printAuditPdf(detailSub)} disabled={printingPdf}>
                    {printingPdf ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Printer className="h-4 w-4 mr-1" />}
                    Imprimir Laudo
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {detailSub && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              {/* Left: Annotated text */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">📝 Texto do Aluno</h3>
                <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto leading-relaxed font-serif border">
                  {detailSub.scores?.annotations && detailSub.scores.annotations.length > 0 ? (
                    <AnnotatedText text={detailSub.essay_text} annotations={detailSub.scores.annotations} />
                  ) : (
                    detailSub.essay_text || 'Nenhum texto enviado.'
                  )}
                </div>
                {detailSub.scores?.annotations && detailSub.scores.annotations.length > 0 && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/30 border border-destructive" /> Gramática</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300/50 border border-yellow-500" /> Coesão</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300/50 border border-emerald-500" /> Repertório</span>
                  </div>
                )}
                <OriginalityBadge originality={detailSub.scores?.originality} />
              </div>

              {/* Right: Scorecard + Actions */}
              <div className="space-y-4">
                {/* Teacher correction trigger for pending essays */}
                {detailSub.status !== 'corrected' && detailSub.essay_text && detailSub.essay_text.length > 20 && (
                  <Button
                    onClick={() => correctFromTeacher(detailSub)}
                    disabled={correctingFromTeacher}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold py-5"
                    size="lg"
                  >
                    {correctingFromTeacher ? (
                      <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Executando Correção Doutora...</>
                    ) : (
                      <><Gem className="h-5 w-5 mr-2" /> ⚖️ EXECUTAR CORREÇÃO DOUTORA</>
                    )}
                  </Button>
                )}

                {detailSub.status === 'corrected' && detailSub.scores?.competencies && (
                  <>
                    {/* Banca-aware Scorecard */}
                    <BancaScorecard banca={detailSub.banca} competencies={detailSub.scores.competencies} />

                    <div className="font-bold text-xl text-center p-3 bg-primary/10 rounded-lg">
                      Nota Total: {detailSub.total_score}
                    </div>

                    {detailSub.suggestions && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <h4 className="font-semibold text-sm mb-1">💡 Sugestões de Melhoria</h4>
                        <p className="text-sm">{detailSub.suggestions}</p>
                      </div>
                    )}
                    {detailSub.repertoire_analysis && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <h4 className="font-semibold text-sm mb-1">📚 Análise de Repertório</h4>
                        <p className="text-sm">{detailSub.repertoire_analysis}</p>
                      </div>
                    )}

                    {/* Feedback Generator */}
                    <Button onClick={() => generateStudentFeedback(detailSub)} disabled={generatingFeedback} variant="outline" className="w-full">
                      {generatingFeedback ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando Comentário...</>
                      ) : (
                        <><MessageSquareHeart className="h-4 w-4 mr-2" /> 💎 GERAR COMENTÁRIO PARA O ALUNO</>
                      )}
                    </Button>

                    {feedbackText && (
                      <Card className="border-primary/20">
                        <CardContent className="pt-4 space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <MessageSquareHeart className="h-4 w-4 text-primary" /> Feedback para o Aluno
                          </h4>
                          <Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={5} className="text-sm" />
                          <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(feedbackText); toast({ title: '📋 Feedback copiado!' }); }}>
                            <Copy className="h-3 w-3 mr-1" /> Copiar Feedback
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Rewrite button */}
                    <Button onClick={() => generateRewrite(detailSub)} disabled={generatingRewrite} variant="outline" className="w-full">
                      {generatingRewrite ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando Reescrita...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> ✨ Reescrita Inteligente (Nota Máxima)</>
                      )}
                    </Button>

                    {rewriteResult && (
                      <Card className="border-primary/30">
                        <CardContent className="pt-4 space-y-3">
                          <h4 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Versão Nota Máxima</h4>
                          <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed font-serif">
                            {rewriteResult.rewritten_text}
                          </div>
                          {rewriteResult.key_improvements?.length > 0 && (
                            <ul className="text-sm text-muted-foreground list-disc pl-4">
                              {rewriteResult.key_improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* Teacher notes + validation */}
                <div className="space-y-2 border-t pt-3">
                  <label className="text-sm font-medium">Notas do Professor</label>
                  <Textarea value={teacherNotes} onChange={e => setTeacherNotes(e.target.value)} placeholder="Observações, ajustes de nota..." rows={3} />
                  <div className="flex gap-2">
                    <Button onClick={() => validateCorrection(detailSub, true)} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-1" /> Validar
                    </Button>
                    <Button variant="outline" onClick={() => validateCorrection(detailSub, false)} className="flex-1">
                      <XCircle className="h-4 w-4 mr-1" /> Ajustar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Student Editor ──
function StudentEditor({ accessCode }: { accessCode: string }) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [proposalContent, setProposalContent] = useState<{ textos_motivadores?: { tipo: string; conteudo: string }[]; comando?: string; area?: string } | null>(null);
  const [essayText, setEssayText] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const lsKey = `eduflow_draft_redacao_${accessCode}`;
  const ssKey = `eduflow_session_redacao_${accessCode}`;
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const dbSyncTimer = useRef<ReturnType<typeof setInterval>>();
  const lastSyncedText = useRef('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('essay_submissions')
        .select('*')
        .eq('access_code', accessCode)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      if (!data) { setNotFound(true); setLoading(false); return; }
      const sub = data as unknown as Submission;
      setSubmission(sub);
      // Load proposal content (motivational texts)
      const pc = (data as any).proposal_content;
      if (pc && typeof pc === 'object' && pc.textos_motivadores) {
        setProposalContent(pc);
      }
      // Restore draft: sessionStorage > localStorage > DB
      const sessionDraft = sessionStorage.getItem(ssKey);
      const draft = sessionDraft || localStorage.getItem(lsKey);
      if (draft) {
        try {
          const d = JSON.parse(draft);
          setEssayText(d.text || sub.essay_text || '');
          setStudentName(d.name || sub.student_name || '');
          setStudentClass(d.cls || sub.student_class || '');
        } catch { setEssayText(sub.essay_text || ''); }
      } else {
        setEssayText(sub.essay_text || '');
        setStudentName(sub.student_name || '');
        setStudentClass(sub.student_class || '');
      }
      lastSyncedText.current = sub.essay_text || '';
      setLoading(false);
    })();
  }, [accessCode]);

  // localStorage auto-save (500ms debounce)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload = JSON.stringify({ text: essayText, name: studentName, cls: studentClass });
      localStorage.setItem(lsKey, payload);
      sessionStorage.setItem(ssKey, payload);
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [essayText, studentName, studentClass, lsKey, ssKey]);

  // DB sync every 10 seconds
  useEffect(() => {
    if (!submission || submission.status === 'corrected') return;
    dbSyncTimer.current = setInterval(async () => {
      if (essayText !== lastSyncedText.current && essayText.length > 0 && submission) {
        await supabase.from('essay_submissions').update({
          essay_text: essayText,
          student_name: studentName.trim(),
          student_class: studentClass.trim(),
        } as any).eq('id', submission.id);
        lastSyncedText.current = essayText;
      }
    }, 10000);
    return () => { if (dbSyncTimer.current) clearInterval(dbSyncTimer.current); };
  }, [submission, essayText, studentName, studentClass]);

  const lineCount = useMemo(() => {
    if (!essayText) return 0;
    return essayText.split('\n').length;
  }, [essayText]);

  useEffect(() => {
    setWordCount(essayText.trim() ? essayText.trim().split(/\s+/).length : 0);
  }, [essayText]);

  const handleRewrite = () => {
    setRewriting(true);
    setSubmission(prev => prev ? { ...prev, status: 'pending' } : null);
  };

  const submitForCorrection = async () => {
    if (!submission) return;
    if (essayText.trim().length < 50) {
      toast({ title: 'Texto muito curto', description: 'Escreva pelo menos 50 caracteres.', variant: 'destructive' });
      return;
    }
    if (!studentName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe seu nome antes de enviar.', variant: 'destructive' });
      return;
    }
    setCorrecting(true);
    await supabase.from('essay_submissions').update({
      essay_text: essayText, student_name: studentName.trim(), student_class: studentClass.trim(), status: 'correcting'
    } as any).eq('id', submission.id);

    const { data: fnData, error: fnError } = await supabase.functions.invoke('correct-essay-text', {
      body: { essayText, banca: submission.banca, theme: submission.proposal_theme },
    });

    if (fnError || fnData?.error) {
      toast({ title: 'Erro na correção', description: fnData?.error || fnError?.message || 'Tente novamente.', variant: 'destructive' });
      setCorrecting(false);
      return;
    }

    const totalScore = fnData.total_score || 0;
    await supabase.from('essay_submissions').update({
      scores: fnData,
      suggestions: fnData.suggestions || '',
      repertoire_analysis: fnData.repertoire_analysis || '',
      total_score: totalScore,
      status: 'corrected',
      corrected_at: new Date().toISOString(),
    } as any).eq('id', submission.id);

    setSubmission(prev => prev ? {
      ...prev,
      scores: fnData,
      suggestions: fnData.suggestions || '',
      repertoire_analysis: fnData.repertoire_analysis || '',
      total_score: totalScore,
      status: 'corrected',
    } : null);

    localStorage.removeItem(lsKey);
    sessionStorage.removeItem(ssKey);
    setRewriting(false);
    toast({ title: '✅ Redação corrigida!', description: `Nota total: ${totalScore}` });
    setCorrecting(false);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (notFound) return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8">
        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Proposta não encontrada</h2>
        <p className="text-muted-foreground">Verifique o código de acesso e tente novamente.</p>
      </Card>
    </div>
  );

  const isCorrected = submission?.status === 'corrected' && !rewriting;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Gem className="h-6 w-6 text-primary" />
            Redação Elite: Laboratório de Escrita
          </h1>
          <div className="flex items-center justify-center gap-2">
            <Badge>{submission?.banca}</Badge>
            <span className="text-muted-foreground text-sm">•</span>
            <span className="text-sm font-medium">{submission?.proposal_theme}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Seu nome completo *" value={studentName} onChange={e => setStudentName(e.target.value)} disabled={isCorrected} />
          <Input placeholder="Turma (ex: 3ºA)" value={studentClass} onChange={e => setStudentClass(e.target.value)} disabled={isCorrected} />
        </div>

        {/* Proposal content (motivational texts) for student reference */}
        {proposalContent?.textos_motivadores && proposalContent.textos_motivadores.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-primary">📄 Textos de Apoio — Proposta de Redação</h3>
              {proposalContent.textos_motivadores.map((t, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-3">
                  <p className="font-semibold text-xs uppercase text-muted-foreground mb-0.5">{t.tipo}</p>
                  <p className="text-sm leading-relaxed">{t.conteudo}</p>
                </div>
              ))}
              {proposalContent.comando && (
                <div className="bg-muted/50 rounded-lg p-3 mt-2">
                  <p className="text-sm leading-relaxed">{proposalContent.comando.replace('[TEMA]', submission?.proposal_theme || '')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Editor or Annotated view */}
        {isCorrected && submission.scores?.annotations && submission.scores.annotations.length > 0 ? (
          <Card className="border-2 border-primary/10">
            <CardContent className="p-4">
              <div className="whitespace-pre-wrap text-sm font-serif leading-relaxed min-h-[300px]">
                <AnnotatedText text={submission.essay_text} annotations={submission.scores.annotations} />
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground border-t pt-2">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/30 border border-destructive" /> Erro</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300/50 border border-yellow-500" /> Ponto fraco</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300/50 border border-emerald-500" /> Destaque</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-primary/10">
            <CardContent className="p-0">
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted/30 border-r flex flex-col items-end pr-2 pt-3 text-xs text-muted-foreground font-mono overflow-hidden pointer-events-none" style={{ lineHeight: '1.625rem' }}>
                  {Array.from({ length: Math.max(30, lineCount + 5) }, (_, i) => (
                    <div key={i} className={i + 1 < 7 || i + 1 > 30 ? 'text-destructive/50' : ''}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  className="w-full min-h-[500px] pl-12 pr-4 py-3 bg-transparent resize-none focus:outline-none text-sm font-serif"
                  style={{ lineHeight: '1.625rem' }}
                  placeholder="Comece a escrever sua redação aqui..."
                  value={essayText}
                  onChange={e => setEssayText(e.target.value)}
                  disabled={correcting}
                />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
                <div className="flex gap-4">
                  <span>Linhas: <strong className={lineCount < 7 || lineCount > 30 ? 'text-destructive' : 'text-foreground'}>{lineCount}</strong> (7-30)</span>
                  <span>Palavras: <strong className="text-foreground">{wordCount}</strong></span>
                </div>
                <span className="flex items-center gap-1">{essayText.length} chars • <span className="text-primary text-[10px]">● Sincronizando</span></span>
              </div>
            </CardContent>
          </Card>
        )}

        {rewriting && submission?.suggestions && (
          <Card className="border-primary/20">
            <CardContent className="pt-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><RefreshCw className="h-4 w-4" /> Dicas para reescrita</h4>
              <p className="text-sm text-muted-foreground">{submission.suggestions}</p>
            </CardContent>
          </Card>
        )}

        {!isCorrected && (
          <Button onClick={submitForCorrection} disabled={correcting || essayText.trim().length < 50} className="w-full text-base py-6" size="lg">
            {correcting ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Corrigindo com IA Doutora...</>
            ) : (
              <><Gem className="h-5 w-5 mr-2" /> 💎 ENVIAR PARA CORREÇÃO DOUTORA</>
            )}
          </Button>
        )}

        {isCorrected && submission.scores?.competencies && (
          <div className="space-y-4">
            <Card className="border-primary/20">
              <CardContent className="pt-6 text-center">
                <h2 className="text-3xl font-bold text-primary">{submission.total_score}</h2>
                <p className="text-sm text-muted-foreground">Nota Total ({submission.banca})</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {submission.scores.competencies.map((c, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge variant="outline">{c.score}/{c.max}</Badge>
                    </div>
                    <Progress value={(c.score / c.max) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">{c.justification}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {submission.suggestions && (
              <Card className="border-muted">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-sm mb-2">💡 Sugestões de Melhoria</h4>
                  <p className="text-sm text-muted-foreground">{submission.suggestions}</p>
                </CardContent>
              </Card>
            )}

            {submission.repertoire_analysis && (
              <Card className="border-muted">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-sm mb-2">📚 Análise de Repertório</h4>
                  <p className="text-sm text-muted-foreground">{submission.repertoire_analysis}</p>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleRewrite} variant="outline" className="w-full" size="lg">
              <RefreshCw className="h-5 w-5 mr-2" /> 🔄 REESCREVER COM AS DICAS
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──
export default function EssayLab() {
  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
          <Gem className="h-7 w-7 text-primary" />
          Redação Elite: Laboratório de Escrita Online
        </h1>
        <p className="text-muted-foreground">Crie propostas, compartilhe com alunos e corrija com IA multibancas</p>
      </div>
      <TeacherPanel />
    </div>
  );
}

export function EssayLabStudent({ accessCode }: { accessCode: string }) {
  return <StudentEditor accessCode={accessCode} />;
}
