import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Gem, XCircle, RefreshCw, Trophy, Star, Award, TrendingUp, MessageCircle, Send, ChevronRight } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

// ── Types ──
interface Annotation {
  start: number;
  end: number;
  type: 'error' | 'weak' | 'good';
  comment: string;
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
  originality?: { score: number; flags: string[]; ai_generated_probability: number };
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

// ── Tooltip-annotated text ──
function TooltipAnnotatedText({ text, annotations }: { text: string; annotations: Annotation[] }) {
  if (!annotations?.length) return <span className="whitespace-pre-wrap">{text}</span>;

  const sorted = [...annotations]
    .filter(a => a.start >= 0 && a.end <= text.length && a.start < a.end)
    .sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((ann, idx) => {
    if (ann.start > cursor) parts.push(<span key={`t-${idx}`}>{text.slice(cursor, ann.start)}</span>);

    const colorMap = {
      error: 'bg-destructive/20 border-b-2 border-destructive cursor-help',
      weak: 'bg-yellow-300/30 border-b-2 border-yellow-500 cursor-help',
      good: 'bg-emerald-300/30 border-b-2 border-emerald-500 cursor-help',
    };

    parts.push(
      <Tooltip key={`a-${idx}`}>
        <TooltipTrigger asChild>
          <span className={`${colorMap[ann.type]} rounded-sm px-0.5 transition-colors hover:opacity-80`}>
            {text.slice(ann.start, ann.end)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <div className="flex items-start gap-1.5">
            <span className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${ann.type === 'error' ? 'bg-destructive' : ann.type === 'weak' ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
            <span>{ann.comment}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    );
    cursor = ann.end;
  });

  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return <span className="whitespace-pre-wrap">{parts}</span>;
}

// ── Competency Radar Chart ──
function CompetencyRadar({ competencies }: { competencies: Competency[] }) {
  const data = competencies.map(c => ({
    subject: c.name.length > 18 ? c.name.slice(0, 16) + '…' : c.name,
    score: Math.round((c.score / c.max) * 100),
    fullMark: 100,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
          <Radar name="Desempenho" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Badges ──
function EssayBadges({ competencies }: { competencies: Competency[] }) {
  const badges: { label: string; icon: React.ReactNode; earned: boolean }[] = [];

  const getPercent = (name: string) => {
    const c = competencies.find(x => x.name.toLowerCase().includes(name));
    return c ? (c.score / c.max) * 100 : 0;
  };

  badges.push({ label: 'Gramática Impecável', icon: <Star className="h-4 w-4" />, earned: getPercent('gramát') >= 80 || getPercent('norma') >= 80 || getPercent('comp') >= 80 });
  badges.push({ label: 'Mestre da Coesão', icon: <Award className="h-4 w-4" />, earned: getPercent('coes') >= 80 || getPercent('coerên') >= 80 });
  badges.push({ label: 'Gênio do Repertório', icon: <Trophy className="h-4 w-4" />, earned: getPercent('repertório') >= 80 || getPercent('argumen') >= 80 });

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b, i) => (
        <Badge key={i} variant={b.earned ? 'default' : 'outline'} className={`gap-1 text-xs py-1 ${b.earned ? '' : 'opacity-40'}`}>
          {b.icon} {b.label}
        </Badge>
      ))}
    </div>
  );
}

// ── History Timeline ──
function EssayTimeline({ submissions }: { submissions: Submission[] }) {
  if (!submissions.length) return null;
  const maxScore = submissions[0]?.banca === 'ENEM' ? 1000 : submissions[0]?.banca === 'FUVEST' ? 50 : 28;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Curva de Aprendizado</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end gap-2 h-28">
          {submissions.map((s, i) => {
            const pct = Math.max(5, ((s.total_score || 0) / maxScore) * 100);
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-primary">{s.total_score || 0}</span>
                <div className="w-full bg-muted rounded-t" style={{ height: `${pct}%` }}>
                  <div className="w-full h-full bg-primary/70 rounded-t transition-all" />
                </div>
                <span className="text-[10px] text-muted-foreground">#{submissions.length - i}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Teacher Question Box ──
function TeacherQuestionBox({ submissionId, accessCode }: { submissionId: string; accessCode: string }) {
  const [question, setQuestion] = useState('');
  const [sent, setSent] = useState(false);
  const lsKey = `essay_question_${accessCode}`;

  useEffect(() => {
    const saved = localStorage.getItem(lsKey);
    if (saved) { setQuestion(saved); setSent(true); }
  }, [lsKey]);

  const handleSend = async () => {
    if (!question.trim()) return;
    await supabase.from('essay_submissions').update({ teacher_notes: `[DÚVIDA ALUNO] ${question}` } as any).eq('id', submissionId);
    localStorage.setItem(lsKey, question);
    setSent(true);
    toast({ title: 'Dúvida enviada!', description: 'Seu professor receberá sua mensagem.' });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Dúvida para o Professor</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {sent ? (
          <p className="text-sm text-muted-foreground">✅ Sua dúvida foi enviada: "{question}"</p>
        ) : (
          <>
            <Textarea placeholder="Escreva sua dúvida sobre a correção..." value={question} onChange={e => setQuestion(e.target.value)} rows={2} className="text-sm" />
            <Button size="sm" onClick={handleSend} disabled={!question.trim()} className="w-full">
              <Send className="h-3.5 w-3.5 mr-1" /> Enviar Dúvida
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Portal ──
export default function StudentEssayPortal() {
  const { code } = useParams<{ code: string }>();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [proposalContent, setProposalContent] = useState<any>(null);
  const [essayText, setEssayText] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteText, setRewriteText] = useState('');
  const [history, setHistory] = useState<Submission[]>([]);
  const [wordCount, setWordCount] = useState(0);

  const lsKey = `eduflow_draft_redacao_${code}`;
  const rwKey = `eduflow_rewrite_${code}`;
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const dbSyncTimer = useRef<ReturnType<typeof setInterval>>();
  const lastSyncedText = useRef('');

  // Load submission
  useEffect(() => {
    if (!code) return;
    (async () => {
      const { data } = await supabase
        .from('essay_submissions')
        .select('*')
        .eq('access_code', code)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      if (!data) { setNotFound(true); setLoading(false); return; }
      const sub = data as unknown as Submission;
      setSubmission(sub);
      const pc = (data as any).proposal_content;
      if (pc?.textos_motivadores) setProposalContent(pc);

      // Restore draft
      const draft = sessionStorage.getItem(lsKey) || localStorage.getItem(lsKey);
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

      // Restore rewrite draft
      const rwDraft = localStorage.getItem(rwKey);
      if (rwDraft) setRewriteText(rwDraft);

      lastSyncedText.current = sub.essay_text || '';

      // Load history (same student name + teacher)
      if (sub.student_name) {
        const { data: hist } = await supabase
          .from('essay_submissions')
          .select('*')
          .eq('teacher_user_id', sub.id ? (data as any).teacher_user_id : '')
          .eq('student_name', sub.student_name)
          .eq('status', 'corrected')
          .order('created_at', { ascending: false })
          .limit(5);
        if (hist) setHistory(hist as unknown as Submission[]);
      }

      setLoading(false);
    })();
  }, [code]);

  // Auto-save draft
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload = JSON.stringify({ text: essayText, name: studentName, cls: studentClass });
      localStorage.setItem(lsKey, payload);
      sessionStorage.setItem(lsKey, payload);
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [essayText, studentName, studentClass, lsKey]);

  // Persist rewrite text
  useEffect(() => {
    if (rewriteText) localStorage.setItem(rwKey, rewriteText);
  }, [rewriteText, rwKey]);

  // DB sync every 10s
  useEffect(() => {
    if (!submission || submission.status === 'corrected') return;
    dbSyncTimer.current = setInterval(async () => {
      if (essayText !== lastSyncedText.current && essayText.length > 0 && submission) {
        await supabase.from('essay_submissions').update({
          essay_text: essayText, student_name: studentName.trim(), student_class: studentClass.trim(),
        } as any).eq('id', submission.id);
        lastSyncedText.current = essayText;
      }
    }, 10000);
    return () => { if (dbSyncTimer.current) clearInterval(dbSyncTimer.current); };
  }, [submission, essayText, studentName, studentClass]);

  const lineCount = useMemo(() => essayText ? essayText.split('\n').length : 0, [essayText]);
  useEffect(() => { setWordCount(essayText.trim() ? essayText.trim().split(/\s+/).length : 0); }, [essayText]);

  const handleRewrite = () => {
    setRewriting(true);
    setRewriteText(localStorage.getItem(rwKey) || '');
  };

  const submitForCorrection = async (textToSubmit?: string) => {
    if (!submission) return;
    const txt = textToSubmit || essayText;
    if (txt.trim().length < 50) {
      toast({ title: 'Texto muito curto', description: 'Escreva pelo menos 50 caracteres.', variant: 'destructive' });
      return;
    }
    if (!studentName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setCorrecting(true);
    await supabase.from('essay_submissions').update({
      essay_text: txt, student_name: studentName.trim(), student_class: studentClass.trim(), status: 'correcting',
    } as any).eq('id', submission.id);

    const { data: fnData, error: fnError } = await supabase.functions.invoke('correct-essay-text', {
      body: { essayText: txt, banca: submission.banca, theme: submission.proposal_theme },
    });

    if (fnError || fnData?.error) {
      toast({ title: 'Erro na correção', description: fnData?.error || fnError?.message, variant: 'destructive' });
      setCorrecting(false);
      return;
    }

    const totalScore = fnData.total_score || 0;
    await supabase.from('essay_submissions').update({
      scores: fnData, suggestions: fnData.suggestions || '', repertoire_analysis: fnData.repertoire_analysis || '',
      total_score: totalScore, status: 'corrected', corrected_at: new Date().toISOString(),
    } as any).eq('id', submission.id);

    setSubmission(prev => prev ? { ...prev, scores: fnData, suggestions: fnData.suggestions || '', repertoire_analysis: fnData.repertoire_analysis || '', total_score: totalScore, status: 'corrected', essay_text: txt } : null);
    setEssayText(txt);
    localStorage.removeItem(lsKey);
    sessionStorage.removeItem(lsKey);
    localStorage.removeItem(rwKey);
    setRewriting(false);
    setRewriteText('');
    toast({ title: '✅ Redação corrigida!', description: `Nota total: ${totalScore}` });
    setCorrecting(false);
  };

  if (!code) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Código inválido</div>;
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (notFound) return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8">
        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Proposta não encontrada</h2>
        <p className="text-muted-foreground">Verifique o código de acesso.</p>
      </Card>
    </div>
  );

  const isCorrected = submission?.status === 'corrected' && !rewriting;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Gem className="h-6 w-6 text-primary" /> Portal do Aluno — Redação Elite
          </h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge>{submission?.banca}</Badge>
            <span className="text-muted-foreground text-sm">•</span>
            <span className="text-sm font-medium">{submission?.proposal_theme}</span>
          </div>
        </div>

        {/* Student info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Seu nome completo *" value={studentName} onChange={e => setStudentName(e.target.value)} disabled={isCorrected} />
          <Input placeholder="Turma (ex: 3ºA)" value={studentClass} onChange={e => setStudentClass(e.target.value)} disabled={isCorrected} />
        </div>

        {/* Proposal texts */}
        {proposalContent?.textos_motivadores?.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-primary">📄 Textos de Apoio</h3>
              {proposalContent.textos_motivadores.map((t: any, i: number) => (
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

        {/* ─── REWRITE SPLIT SCREEN ─── */}
        {rewriting && isCorrected === false && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left: Original + annotations */}
            <Card className="border-2 border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">📝 Texto Original (com erros)</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm font-serif leading-relaxed min-h-[300px] max-h-[500px] overflow-y-auto">
                  <TooltipAnnotatedText text={submission?.essay_text || ''} annotations={submission?.scores?.annotations || []} />
                </div>
                {submission?.suggestions && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                    <h4 className="font-semibold text-xs mb-1 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Dicas</h4>
                    <p className="text-xs text-muted-foreground">{submission.suggestions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: New editor */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-primary">✍️ Nova Versão</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <textarea
                  className="w-full min-h-[300px] max-h-[500px] bg-transparent resize-none focus:outline-none text-sm font-serif leading-relaxed border rounded-md p-3"
                  placeholder="Escreva sua nova versão aqui..."
                  value={rewriteText}
                  onChange={e => setRewriteText(e.target.value)}
                  disabled={correcting}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Palavras: {rewriteText.trim() ? rewriteText.trim().split(/\s+/).length : 0}</span>
                  <span className="text-primary text-[10px]">● Salvando rascunho</span>
                </div>
                <Button onClick={() => submitForCorrection(rewriteText)} disabled={correcting || rewriteText.trim().length < 50} className="w-full mt-3">
                  {correcting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Corrigindo...</> : <><Gem className="h-4 w-4 mr-1" /> Enviar Reescrita</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── EDITOR (pre-correction) ─── */}
        {!isCorrected && !rewriting && (
          <>
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
                  <span className="text-primary text-[10px]">● Sincronizando</span>
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => submitForCorrection()} disabled={correcting || essayText.trim().length < 50} className="w-full text-base py-6" size="lg">
              {correcting ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Corrigindo com IA Doutora...</> : <><Gem className="h-5 w-5 mr-2" /> 💎 ENVIAR PARA CORREÇÃO DOUTORA</>}
            </Button>
          </>
        )}

        {/* ─── FEEDBACK VIEW (post-correction) ─── */}
        {isCorrected && submission?.scores?.competencies && (
          <div className="space-y-4">
            {/* Score + Radar */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-primary/20">
                <CardContent className="pt-6 text-center space-y-3">
                  <h2 className="text-4xl font-bold text-primary">{submission.total_score}</h2>
                  <p className="text-sm text-muted-foreground">Nota Total ({submission.banca})</p>
                  <EssayBadges competencies={submission.scores.competencies} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">Radar de Competências</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CompetencyRadar competencies={submission.scores.competencies} />
                </CardContent>
              </Card>
            </div>

            {/* Annotated text with tooltips */}
            {submission.scores.annotations && submission.scores.annotations.length > 0 && (
              <Card className="border-2 border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">📝 Texto Comentado — passe o mouse sobre os destaques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-serif leading-relaxed min-h-[200px] max-h-[400px] overflow-y-auto">
                    <TooltipAnnotatedText text={submission.essay_text} annotations={submission.scores.annotations} />
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground border-t pt-2">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/30 border border-destructive" /> Erro</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300/50 border border-yellow-500" /> Ponto fraco</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300/50 border border-emerald-500" /> Destaque</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Competencies detail */}
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

            {/* History Timeline */}
            {history.length > 1 && <EssayTimeline submissions={history} />}

            {/* Teacher Question Box */}
            <TeacherQuestionBox submissionId={submission.id} accessCode={code!} />

            {/* Rewrite button */}
            <Button onClick={handleRewrite} variant="outline" className="w-full" size="lg">
              <RefreshCw className="h-5 w-5 mr-2" /> 🔄 REESCREVER COM AS DICAS
            </Button>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground pt-4">Portal de Estudos — EduCreator Pro | Direção Pedagógica: Matheus Lima Piffer</p>
      </div>
    </div>
  );
}
