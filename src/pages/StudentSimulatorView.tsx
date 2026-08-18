import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStudentMode } from '@/hooks/useStudentMode';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GraduationCap, CheckCircle2, Send, XCircle, Clock, Trophy, Target, Timer } from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';

interface SimulatorOption {
  letter: string;
  text: string;
  isCorrect?: boolean;
}

interface SimulatorQuestion {
  content: string;
  options?: SimulatorOption[];
  skillCode?: string;
  descriptor?: string;
  answerLines?: number;
}

interface PublicSimulatorData {
  id: string;
  title: string;
  institution_name: string;
  exam_type: string;
  grade: string;
  subject_area: string;
  user_id: string;
  questions: SimulatorQuestion[];
}

const PROFICIENCY_LEVELS = [
  { key: 'abaixo_basico', max: 25 },
  { key: 'basico', max: 50 },
  { key: 'proficiente', max: 75 },
  { key: 'avancado', max: 100 },
] as const;

function getProficiencyKey(percentage: number) {
  return PROFICIENCY_LEVELS.find((level) => percentage < level.max)?.key ?? 'avancado';
}

export default function StudentSimulatorView() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [simulator, setSimulator] = useState<PublicSimulatorData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState<{ correct: number; total: number; percentage: number; timeSeconds: number } | null>(null);
  const { isStudentMode } = useStudentMode();
  const { isTeacher } = useRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const isTeacherPreview = isStudentMode && isTeacher;

  const storageKey = useMemo(() => id ? `eduFlow_sim_answers_${id}` : null, [id]);

  // Restore answers from localStorage
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAnswers(parsed);
          if (Object.keys(parsed).length > 0) {
            toast({ title: '🔄 Progresso recuperado', description: 'Suas respostas marcadas anteriormente foram restauradas.' });
          }
        } catch { /* ignore */ }
      }
    }
  }, [storageKey, toast]);

  // Save answers to localStorage on change
  useEffect(() => {
    if (storageKey && Object.keys(answers).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    }
  }, [answers, storageKey]);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}h ${String(m).padStart(2, '0')}min ${String(sec).padStart(2, '0')}s`
      : `${m}min ${String(sec).padStart(2, '0')}s`;
  };

  useEffect(() => {
    if (!id) return;

    const loadSimulator = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('simulators')
          .select('id, title, institution_name, exam_type, grade, subject_area, user_id, questions')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Simulado não encontrado.');

        setSimulator({
          ...data,
          questions: Array.isArray(data.questions) ? (data.questions as unknown as SimulatorQuestion[]) : [],
        } as PublicSimulatorData);
      } catch (err: any) {
        setError(err.message || 'Não foi possível carregar o simulado.');
      } finally {
        setLoading(false);
      }
    };

    loadSimulator();
  }, [id]);

  const questions = useMemo(() => simulator?.questions ?? [], [simulator]);

  const allAnswered = useMemo(() => {
    if (!questions.length) return false;

    return questions.every((question, index) => {
      const value = answers[index] ?? '';
      if (Array.isArray(question.options) && question.options.length > 0) {
        return value.length > 0;
      }
      return value.trim().length > 0;
    });
  }, [answers, questions]);

  const handleSubmit = async () => {
    if (!simulator || !studentName.trim() || !studentClass.trim()) return;

    setSubmitting(true);
    stopTimer();

    try {
      const gradableQuestions = questions.filter(
        (question) => Array.isArray(question.options) && question.options.length > 0,
      );

      const totalQuestions = gradableQuestions.length || questions.length;
      const correctCount = gradableQuestions.reduce((score, question, index) => {
        const selected = answers[index];
        const correctOption = question.options?.find((option) => option.isCorrect)?.letter;
        return score + (selected === correctOption ? 1 : 0);
      }, 0);

      const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      const { error: insertError } = await supabase.from('student_results').insert({
        user_id: simulator.user_id,
        simulator_id: simulator.id,
        student_name: isTeacherPreview ? `[Teste de Professor] ${studentName.trim()}` : studentName.trim().slice(0, 200),
        student_class: isTeacherPreview ? `[TESTE] ${studentClass.trim()}` : studentClass.trim().slice(0, 100),
        correct_count: correctCount,
        total_questions: totalQuestions,
        percentage,
        proficiency_level: getProficiencyKey(percentage),
      });

      if (insertError) throw insertError;

      setResultData({ correct: correctCount, total: totalQuestions, percentage, timeSeconds: elapsedSeconds });
      setShowResultModal(true);
      setSubmitted(true);
      if (storageKey) localStorage.removeItem(storageKey);
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar suas respostas.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !simulator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border">
          <CardContent className="space-y-4 py-10 text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground">Simulado indisponível</h1>
              <p className="text-sm text-muted-foreground">{error || 'Verifique o link e tente novamente.'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getMotivationalMessage = (pct: number, name: string) => {
    if (pct >= 70) {
      return `Incrível, ${name}! Você está no caminho certo para o IF. Sua base está sólida, agora é hora de refinar os detalhes. Continue assim, Agente Maker!`;
    }
    if (pct >= 50) {
      return `Bom trabalho, ${name}! Você já domina metade do caminho. O segredo da alta performance é a constância. Revise as questões que errou e tente de novo. Paz e Bem!`;
    }
    return `Não desanime, ${name}! Como dizemos na Academia Maker, o erro é apenas o primeiro rascunho do sucesso. Cada questão errada é uma oportunidade de aprender algo novo. Vamos revisar o conteúdo e subir esse nível!`;
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border">
          <CardContent className="space-y-6 py-10 text-center">
            <Trophy className="mx-auto h-16 w-16 text-yellow-500" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Parabéns, {studentName}!</h1>
              <p className="text-sm text-muted-foreground">
                Você concluiu o desafio.
              </p>
            </div>

            {resultData && (
              <>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Target className="mx-auto h-5 w-5 text-primary mb-1" />
                    <p className="text-lg font-bold text-primary">{resultData.correct}/{resultData.total}</p>
                    <p className="text-[10px] text-muted-foreground">Acertos</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Trophy className="mx-auto h-5 w-5 text-primary mb-1" />
                    <p className="text-lg font-bold text-primary">{resultData.percentage}%</p>
                    <p className="text-[10px] text-muted-foreground">Desempenho</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Clock className="mx-auto h-5 w-5 text-primary mb-1" />
                    <p className="text-lg font-bold text-primary">{formatTime(resultData.timeSeconds)}</p>
                    <p className="text-[10px] text-muted-foreground">Tempo</p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl text-sm text-left leading-relaxed ${
                  resultData.percentage >= 70 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  resultData.percentage >= 50 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  {getMotivationalMessage(resultData.percentage, studentName)}
                </div>
              </>
            )}

            <p className="text-[10px] text-muted-foreground">EduCreator Pro | Desenvolvido por Matheus Lima Piffer | Suporte: suporte@educreatorpro.com</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!identified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border">
          <CardContent className="space-y-6 py-8">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">{simulator.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {simulator.institution_name || 'EduCreator Pro'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {simulator.grade && <Badge variant="secondary">{simulator.grade}</Badge>}
                {simulator.subject_area && <Badge variant="outline">{simulator.subject_area}</Badge>}
                <Badge variant="outline">{questions.length} questões</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Nome Completo</label>
              <Input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Digite seu nome completo"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Série / Turma</label>
              <Input
                value={studentClass}
                onChange={(event) => setStudentClass(event.target.value)}
                placeholder="Ex: 9º A"
                className="h-12"
              />
            </div>

            <Button
              onClick={() => { setIdentified(true); startTimer(); }}
              disabled={!studentName.trim() || !studentClass.trim()}
              size="lg"
              className="h-12 w-full"
            >
              Iniciar Atividade
            </Button>

            <p className="text-center text-[10px] text-muted-foreground">EduCreator Pro | Desenvolvido por Matheus Lima Piffer</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Simulado do Aluno</p>
            <h1 className="text-xl font-bold text-foreground">{simulator.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="w-fit">{studentName}</Badge>
            <Badge variant="outline" className="w-fit gap-1">
              <Timer className="h-3 w-3" /> {formatTime(elapsedSeconds)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        {questions.map((question, index) => {
          const selectedAnswer = answers[index] ?? '';
          const hasOptions = Array.isArray(question.options) && question.options.length > 0;

          return (
            <Card key={`${simulator.id}-${index}`} className="border-border">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Questão {index + 1}</Badge>
                  {question.skillCode && <Badge variant="secondary">{question.skillCode}</Badge>}
                  {question.descriptor && <Badge variant="outline">{question.descriptor}</Badge>}
                </div>

                <MathRenderer
                  content={question.content}
                  className="text-sm leading-relaxed text-foreground [&_img]:h-auto [&_img]:max-w-full"
                />

                {hasOptions ? (
                  <div className="space-y-2">
                    {question.options?.map((option) => {
                      const isSelected = selectedAnswer === option.letter;

                      return (
                        <button
                          key={option.letter}
                          type="button"
                          data-student-option
                          onClick={() => setAnswers((current) => ({ ...current, [index]: option.letter }))}
                          className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors relative z-50 ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background text-foreground hover:border-primary/40'
                          }`}
                        >
                          <span className="font-semibold">{option.letter})</span>{' '}
                          <MathRenderer content={option.text} className="inline" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Textarea
                    value={selectedAnswer}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [index]: event.target.value }))
                    }
                    rows={question.answerLines || 6}
                    placeholder="Escreva sua resposta aqui"
                  />
                )}
              </CardContent>
            </Card>
          );
        })}

        <Button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          size="lg"
          className="h-12 w-full gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'Enviando...' : 'Enviar Respostas'}
        </Button>

        <p className="pb-4 text-center text-[10px] text-muted-foreground">EduCreator Pro | Desenvolvido por Matheus Lima Piffer</p>
      </div>
    </div>
  );
}
