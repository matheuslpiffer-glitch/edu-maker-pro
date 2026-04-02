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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import QRCodeModal from '@/components/QRCodeModal';
import { buildPublicAppUrl } from '@/lib/public-links';
import { Loader2, PenLine, Send, QrCode, CheckCircle, XCircle, Eye, Gem, Copy, Users, FileText, Link as LinkIcon } from 'lucide-react';

const BANCAS = ['ENEM', 'FUVEST', 'UNESP', 'UNICAMP'] as const;

interface Competency {
  name: string;
  score: number;
  max: number;
  justification: string;
}

interface Submission {
  id: string;
  proposal_theme: string;
  banca: string;
  student_name: string;
  student_class: string;
  essay_text: string;
  status: string;
  scores: { competencies?: Competency[]; total_score?: number };
  suggestions: string;
  repertoire_analysis: string;
  total_score: number;
  corrected_at: string | null;
  teacher_validated: boolean;
  teacher_notes: string;
  access_code: string;
  created_at: string;
}

// ── Teacher: Create proposals & review corrections ──
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
    const url = buildPublicAppUrl(`/redacao-online/${code}`);
    setQrUrl(url);
    setQrOpen(true);
  };

  const copyLink = (code: string) => {
    const url = buildPublicAppUrl(`/redacao-online/${code}`);
    navigator.clipboard.writeText(url);
    toast({ title: '📋 Link copiado!' });
  };

  const validateCorrection = async (sub: Submission, validated: boolean) => {
    await supabase
      .from('essay_submissions')
      .update({ teacher_validated: validated, teacher_notes: teacherNotes } as any)
      .eq('id', sub.id);
    toast({ title: validated ? '✅ Correção validada!' : '📝 Nota ajustada' });
    setDetailSub(null);
    loadSubmissions();
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Submission[]>();
    submissions.forEach(s => {
      const key = `${s.proposal_theme}__${s.banca}__${s.access_code}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [submissions]);

  return (
    <div className="space-y-6">
      {/* Create Proposal */}
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

      {/* Submissions Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Redações Recebidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma proposta criada ainda.</p>
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
                        {answered.map(s => (
                          <div key={s.id} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-sm">{s.student_name || 'Anônimo'}</span>
                              {s.student_class && <Badge variant="outline" className="text-xs">{s.student_class}</Badge>}
                              {s.status === 'corrected' ? (
                                <Badge className="bg-emerald-500/20 text-emerald-700">
                                  Nota: {s.total_score}
                                  {s.teacher_validated && <CheckCircle className="h-3 w-3 ml-1" />}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Pendente</Badge>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => { setDetailSub(s); setTeacherNotes(s.teacher_notes || ''); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
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

      {/* Detail Dialog */}
      <Dialog open={!!detailSub} onOpenChange={() => setDetailSub(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redação de {detailSub?.student_name || 'Aluno'}</DialogTitle>
          </DialogHeader>
          {detailSub && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                {detailSub.essay_text || 'Nenhum texto enviado.'}
              </div>
              {detailSub.status === 'corrected' && detailSub.scores?.competencies && (
                <>
                  <div className="space-y-2">
                    {detailSub.scores.competencies.map((c, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{c.name}</span>
                          <span>{c.score}/{c.max}</span>
                        </div>
                        <Progress value={(c.score / c.max) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">{c.justification}</p>
                      </div>
                    ))}
                  </div>
                  <div className="font-bold text-lg text-center">Nota Total: {detailSub.total_score}</div>
                  {detailSub.suggestions && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                      <h4 className="font-semibold text-sm mb-1">💡 Sugestões de Melhoria</h4>
                      <p className="text-sm">{detailSub.suggestions}</p>
                    </div>
                  )}
                  {detailSub.repertoire_analysis && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                      <h4 className="font-semibold text-sm mb-1">📚 Análise de Repertório</h4>
                      <p className="text-sm">{detailSub.repertoire_analysis}</p>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2 border-t pt-3">
                <label className="text-sm font-medium">Notas do Professor</label>
                <Textarea value={teacherNotes} onChange={e => setTeacherNotes(e.target.value)} placeholder="Observações, ajustes de nota..." rows={3} />
                <div className="flex gap-2">
                  <Button onClick={() => validateCorrection(detailSub, true)} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-1" /> Validar Correção
                  </Button>
                  <Button variant="outline" onClick={() => validateCorrection(detailSub, false)} className="flex-1">
                    <XCircle className="h-4 w-4 mr-1" /> Ajustar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Student: Write essay & submit ──
function StudentEditor({ accessCode }: { accessCode: string }) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [essayText, setEssayText] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const lsKey = `essay_draft_${accessCode}`;
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

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
      // Restore draft from localStorage
      const draft = localStorage.getItem(lsKey);
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
      setLoading(false);
    })();
  }, [accessCode]);

  // Auto-save draft
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(lsKey, JSON.stringify({ text: essayText, name: studentName, cls: studentClass }));
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [essayText, studentName, studentClass, lsKey]);

  const lineCount = useMemo(() => {
    if (!essayText) return 0;
    return essayText.split('\n').length;
  }, [essayText]);

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
    // Save text first
    await supabase.from('essay_submissions').update({
      essay_text: essayText, student_name: studentName.trim(), student_class: studentClass.trim(), status: 'correcting'
    } as any).eq('id', submission.id);

    // Call AI correction
    const { data: fnData, error: fnError } = await supabase.functions.invoke('correct-essay-text', {
      body: { essayText, banca: submission.banca, theme: submission.proposal_theme },
    });

    if (fnError || fnData?.error) {
      toast({ title: 'Erro na correção', description: fnData?.error || fnError?.message || 'Tente novamente.', variant: 'destructive' });
      setCorrecting(false);
      return;
    }

    // Save correction
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

  const isCorrected = submission?.status === 'corrected';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
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

        {/* Student ID */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Seu nome completo *" value={studentName} onChange={e => setStudentName(e.target.value)} disabled={isCorrected} />
          <Input placeholder="Turma (ex: 3ºA)" value={studentClass} onChange={e => setStudentClass(e.target.value)} disabled={isCorrected} />
        </div>

        {/* Editor */}
        <Card className="border-2 border-primary/10">
          <CardContent className="p-0">
            <div className="relative">
              {/* Line numbers */}
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
                disabled={isCorrected || correcting}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
              <span>Linhas: <strong className={lineCount < 7 || lineCount > 30 ? 'text-destructive' : 'text-foreground'}>{lineCount}</strong> (min 7, máx 30)</span>
              <span>{essayText.length} caracteres</span>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        {!isCorrected && (
          <Button onClick={submitForCorrection} disabled={correcting || essayText.trim().length < 50} className="w-full text-base py-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700" size="lg">
            {correcting ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Corrigindo com IA Doutora...</>
            ) : (
              <><Gem className="h-5 w-5 mr-2" /> 💎 ENVIAR PARA CORREÇÃO DOUTORA</>
            )}
          </Button>
        )}

        {/* Correction Results */}
        {isCorrected && submission.scores?.competencies && (
          <div className="space-y-4">
            <Card className="border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="pt-6 text-center">
                <h2 className="text-3xl font-bold text-emerald-600">{submission.total_score}</h2>
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
              <Card className="border-amber-300/50">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-sm mb-2">💡 Sugestões de Melhoria</h4>
                  <p className="text-sm text-muted-foreground">{submission.suggestions}</p>
                </CardContent>
              </Card>
            )}

            {submission.repertoire_analysis && (
              <Card className="border-blue-300/50">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-sm mb-2">📚 Análise de Repertório</h4>
                  <p className="text-sm text-muted-foreground">{submission.repertoire_analysis}</p>
                </CardContent>
              </Card>
            )}
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Gem className="h-7 w-7 text-primary" />
          Redação Elite: Laboratório de Escrita Online
        </h1>
        <p className="text-muted-foreground">Crie propostas, compartilhe com alunos e corrija com IA multibancas</p>
      </div>
      <TeacherPanel />
    </div>
  );
}

// ── Student Route Component ──
export function EssayLabStudent({ accessCode }: { accessCode: string }) {
  return <StudentEditor accessCode={accessCode} />;
}
