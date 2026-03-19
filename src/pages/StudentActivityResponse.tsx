import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle, Send, Trophy, User, School } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import matAvatar from '@/assets/mat-avatar.png';
import MathRenderer from '@/components/MathRenderer';

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

          {/* Direct identification — no login required */}

          {/* Manual identification form */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground text-center">
              Identificação do Aluno
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
              <MathRenderer content={q.content} className="text-sm leading-relaxed break-words" />

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
