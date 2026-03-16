import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle, Send, Trophy, User, School, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import matAvatar from '@/assets/mat-avatar.png';

interface ActivityQuestion {
  index: number;
  content: string;
  options: { letter: string; text: string }[];
  skillCode?: string;
}

interface ActivityData {
  title: string;
  institution: string;
  questionType: string;
  grade: string;
  questions: ActivityQuestion[];
}

interface CorrectionItem {
  index: number;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  content: string;
}

interface SubmitResult {
  type: string;
  studentName: string;
  score?: number;
  total?: number;
  percentage?: number;
  corrections?: CorrectionItem[];
  message?: string;
  totalQuestions?: number;
}

export default function StudentActivityResponse() {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [identified, setIdentified] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  // Check if user is already logged in via social auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        setStudentName(meta?.full_name || meta?.name || '');
        setStudentEmail(session.user.email || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        setStudentName(meta?.full_name || meta?.name || '');
        setStudentEmail(session.user.email || '');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data, error: err } = await supabase.functions.invoke('student-activity', {
          body: { action: 'fetch', bankId: id },
        });
        if (err) throw err;
        if (data?.error) throw new Error(data.error);
        setActivity(data);
      } catch (e: any) {
        setError(e.message || 'Atividade não encontrada.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isDiscursiva = activity?.questionType === 'discursiva' || activity?.questionType === 'gabarito_discursivo';

  const allAnswered = activity
    ? activity.questions.every((_, i) => answers[i] && answers[i].trim().length > 0)
    : false;

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      // Store the current activity URL so we return here after OAuth
      const currentUrl = window.location.href;
      
      // Use Lovable's managed OAuth with redirect back to this activity page
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: currentUrl,
      });
      if (error) {
        console.error('Social login error:', error);
        // If OAuth bridge fails, show friendly message instead of redirecting away
        setSocialLoading(null);
      }
    } catch (e) {
      console.error('Social login failed:', e);
      setSocialLoading(null);
    }
  };

  const handleSubmit = async () => {
    if (!studentName.trim()) return;
    setSubmitting(true);
    try {
      const { data, error: err } = await supabase.functions.invoke('student-activity', {
        body: {
          action: 'submit',
          bankId: id,
          studentName: studentName.trim(),
          studentClass: studentClass.trim(),
          studentEmail: studentEmail.trim() || undefined,
          answers,
        },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      setShowResult(true);
    } catch (e: any) {
      setError(e.message || 'Erro ao enviar respostas.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Atividade não encontrada</h1>
        <p className="text-muted-foreground text-sm">{error || 'O link pode estar incorreto ou a atividade foi removida.'}</p>
      </div>
    );
  }

  // Identification gate
  if (!identified) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">EduCreator Pro | Organizado por Matheus Lima Piffer</p>
        </div>
        <div className="max-w-md mx-auto px-4 py-8 space-y-6">
          {/* Branded Header */}
          <div className="text-center space-y-3">
            <img
              src={matAvatar}
              alt="EduCreator Pro"
              className="w-20 h-20 rounded-2xl mx-auto object-cover shadow-lg"
            />
            <h1 className="text-xl font-bold text-foreground">{activity.title}</h1>
            <p className="text-sm text-muted-foreground">{activity.institution} • {activity.grade}</p>
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {isDiscursiva ? 'Discursiva' : 'Múltipla Escolha'} • {activity.questions.length} questões
            </span>
          </div>

          {/* Social Login Section */}
          {!studentEmail && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground text-center">Entrar com sua conta</p>
              <p className="text-xs text-muted-foreground text-center">Preencha seus dados automaticamente</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-12 text-sm font-medium gap-3 justify-center"
                  onClick={() => handleSocialLogin('google')}
                  disabled={!!socialLoading}
                >
                  {socialLoading === 'google' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Entrar com Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-sm font-medium gap-3 justify-center"
                  onClick={() => handleSocialLogin('apple')}
                  disabled={!!socialLoading}
                >
                  {socialLoading === 'apple' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  )}
                  Entrar com Apple
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">ou preencha manualmente</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          )}

          {/* Social login success indicator */}
          {studentEmail && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{studentName}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Mail size={10} /> {studentEmail}
                </p>
              </div>
            </div>
          )}

          {/* Manual identification form */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground text-center">
              {studentEmail ? 'Confirme seus dados' : 'Identificação do Aluno'}
            </h2>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <User size={14} /> Nome Completo
              </label>
              <Input
                placeholder="Ex: Maria Oliveira"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                className="text-base h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <School size={14} /> Série / Turma
              </label>
              <Input
                placeholder="Ex: 9º Ano A"
                value={studentClass}
                onChange={e => setStudentClass(e.target.value)}
                className="text-base h-12"
              />
            </div>
            <Button
              onClick={() => setIdentified(true)}
              disabled={!studentName.trim() || !studentClass.trim()}
              size="lg"
              className="w-full text-base font-bold h-14"
            >
              Iniciar Atividade
            </Button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground">EduCreator Pro — Por Matheus Lima Piffer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with top padding to avoid clipping */}
      <div className="border-b border-border bg-card px-4 py-3 pt-8">
        <p className="text-xs text-muted-foreground text-center">EduCreator Pro | Organizado por Matheus Lima Piffer</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6" style={{ maxWidth: '95%', marginLeft: 'auto', marginRight: 'auto' }}>
        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground">{activity.title}</h1>
          <p className="text-sm text-muted-foreground">{activity.institution} • {activity.grade}</p>
          <p className="text-xs text-muted-foreground">Aluno: <strong className="text-foreground">{studentName}</strong> • Turma: <strong className="text-foreground">{studentClass}</strong></p>
        </div>

        {/* Questions */}
        <div className="space-y-5">
          {activity.questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {i + 1}
                </span>
                {q.skillCode && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{q.skillCode}</span>
                )}
              </div>
              <div className="text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: q.content }} />

              {isDiscursiva ? (
                <Textarea
                  placeholder="Escreva sua resposta aqui..."
                  value={answers[i] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                  rows={6}
                  disabled={!!result}
                  className="text-sm"
                />
              ) : (
                <div className="space-y-1.5">
                  {q.options.map(o => {
                    const selected = answers[i] === o.letter;
                    return (
                      <button
                        key={o.letter}
                        onClick={() => !result && setAnswers(prev => ({ ...prev, [i]: o.letter }))}
                        disabled={!!result}
                        className={`w-full text-left text-sm py-2.5 px-4 rounded-lg border transition-all ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border hover:border-primary/40 text-foreground'
                        } ${result ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <strong>{o.letter})</strong> {o.text}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        {!result && (
          <Button
            onClick={handleSubmit}
            disabled={submitting || !allAnswered}
            size="lg"
            className="w-full text-base font-bold gap-2 h-14"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            {submitting ? 'Enviando...' : 'Finalizar Atividade'}
          </Button>
        )}

        <p className="text-center text-[10px] text-muted-foreground">EduCreator Pro — Por Matheus Lima Piffer</p>
      </div>

      {/* Result Modal */}
      <Dialog open={showResult} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center text-lg">
              {result?.type === 'objetiva' ? (
                <>
                  <Trophy className="h-6 w-6 text-amber-500" />
                  Resultado
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  Enviado!
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {result?.type === 'objetiva' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Aluno: <strong>{result.studentName}</strong></p>
                <div className="text-5xl font-black text-primary">{result.score}/{result.total}</div>
                <p className="text-sm text-muted-foreground">{result.percentage}% de acerto</p>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {result.corrections?.map((c, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${c.isCorrect ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                    {c.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <span>Q{i + 1}: {c.studentAnswer || '—'} {c.isCorrect ? '✓' : `(correta: ${c.correctAnswer})`}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Atividade enviada com sucesso ao Professor Matheus Lima Piffer!
              </p>
            </div>
          )}

          {result?.type === 'discursiva' && (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="text-base font-semibold text-foreground">
                Atividade enviada com sucesso ao Professor Matheus Lima Piffer!
              </p>
              <p className="text-sm text-muted-foreground">Suas {result.totalQuestions} respostas foram registradas.</p>
            </div>
          )}

          <Button
            onClick={() => {
              setShowResult(false);
              setResult(null);
              setAnswers({});
              setIdentified(false);
              setStudentName('');
              setStudentClass('');
              setStudentEmail('');
            }}
            className="w-full font-bold"
          >
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
