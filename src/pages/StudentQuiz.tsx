import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStudentMode } from '@/hooks/useStudentMode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Timer, Brain, CheckCircle2, XCircle, ArrowRight, Trophy, Sparkles, Loader2, RotateCcw, AlertTriangle, Flame, Building2, Cpu } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface QuizQuestion {
  content: string;
  options: { letter: string; text: string; isCorrect: boolean }[];
  skillCode?: string;
  tutorExplanation?: string;
}

type Phase = 'setup' | 'loading' | 'error' | 'quiz' | 'review' | 'results';

const EXAM_OPTIONS = [
  { value: 'super_enem', label: 'Banca Padrão Nacional' },
  { value: 'fuvest', label: 'Banca Acadêmica (Elite)' },
  { value: 'unicamp', label: 'Banca de Excelência' },
  { value: 'unesp', label: 'Avaliação Técnica' },
  { value: 'ufscar', label: 'Seleção Federal' },
  { value: 'vestibulinho_etec', label: 'Vestibulinho ETEC' },
  { value: 'selecao_ifs', label: 'IFs - Inst. Federais' },
  { value: 'puc', label: 'PUC' },
  { value: 'rede_vertice_plus', label: 'Colégio Vértice' },
  { value: 'fgv', label: 'FGV' },
  { value: 'medicina', label: 'Medicina (Einstein)' },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

const FAST_TRACK_OPTIONS = [
  { id: 'selecao_ifs', label: 'Instituto Federal (IFs)', icon: Building2, gradient: 'from-emerald-600 to-green-700', count: 10 },
  { id: 'vestibulinho_etec', label: 'Instituto Técnico / Rede Tech', icon: Cpu, gradient: 'from-teal-500 to-emerald-600', count: 10 },
];

// Retry helper with exponential backoff (up to 5 retries)
async function invokeWithRetry(
  fnName: string,
  body: any,
  maxRetries = 5,
): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      return data;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

export default function StudentQuiz() {
  const { user } = useAuth();
  const { addXP } = useStudentMode();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [phase, setPhase] = useState<Phase>('setup');
  const [examType, setExamType] = useState('super_enem');
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-start fast-track from URL params
  useEffect(() => {
    const ft = searchParams.get('fast');
    if (ft === 'ifs') {
      setExamType('selecao_ifs');
      setQuestionCount(10);
      setTimeout(() => startQuizWithParams('selecao_ifs', 10), 100);
    } else if (ft === 'etec') {
      setExamType('vestibulinho_etec');
      setQuestionCount(10);
      setTimeout(() => startQuizWithParams('vestibulinho_etec', 10), 100);
    }
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'quiz') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timerRef.current!);
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const startQuizWithParams = async (exam: string, count: number) => {
    setPhase('loading');
    setErrorMessage('');
    try {
      const isFastTrack = exam === 'selecao_ifs' || exam === 'vestibulinho_etec';
      const data = await invokeWithRetry('generate-simulator-questions', {
        examType: exam,
        subjectArea: 'Conhecimentos Gerais',
        grade: 'Ensino Médio',
        count: count,
        questionType: 'multiple-choice',
        examModel: exam,
        activeSpecialty: exam,
        provaFormat: 'completa',
        studentMode: true,
        isFastTrackVestibulinho: isFastTrack,
        tecnicoInstitution: isFastTrack ? (exam === 'selecao_ifs' ? 'ifs' : 'etec') : undefined,
        tecnicoMode: isFastTrack ? 'completo' : undefined,
      });
      const qs = data?.questions || data || [];
      if (!qs.length) throw new Error('Nenhuma questão gerada');
      setQuestions(qs);
      setTimeLeft(count * 90);
      setTotalTime(count * 90);
      setCurrentIdx(0);
      setAnswers({});
      setShowFeedback(false);
      setPhase('quiz');
      setRetryCount(0);
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setErrorMessage(err.message || 'Falha ao gerar o quiz. Tente novamente.');
      setPhase('error');
    }
  };

  const startQuiz = () => startQuizWithParams(examType, questionCount);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    startQuizWithParams(examType, questionCount);
  };

  const selectAnswer = (letter: string) => {
    if (showFeedback) return;
    setAnswers(prev => ({ ...prev, [currentIdx]: letter }));
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('results');

    const score = questions.reduce((acc, q, i) => {
      const selected = answers[i];
      const correct = q.options.find(o => o.isCorrect)?.letter;
      return acc + (selected === correct ? 1 : 0);
    }, 0);

    const xpGained = score * 50;
    addXP(xpGained);

    // Show confetti for good performance
    if (questions.length > 0 && score / questions.length >= 0.7) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }

    if (user) {
      await supabase.from('student_quiz_results').insert({
        user_id: user.id,
        exam_type: examType,
        institution: EXAM_OPTIONS.find(e => e.value === examType)?.label || examType,
        score,
        total_questions: questions.length,
        time_spent_seconds: totalTime - timeLeft,
        answers: Object.entries(answers).map(([idx, letter]) => ({ questionIndex: Number(idx), selected: letter })),
      });

      const { data: existing } = await supabase
        .from('student_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject', examType)
        .maybeSingle();

      if (existing) {
        await supabase.from('student_progress').update({
          xp_earned: (existing as any).xp_earned + xpGained,
          quizzes_completed: (existing as any).quizzes_completed + 1,
          correct_answers: (existing as any).correct_answers + score,
          total_answers: (existing as any).total_answers + questions.length,
          level: Math.floor(((existing as any).xp_earned + xpGained) / 500) + 1,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', (existing as any).id);
      } else {
        await supabase.from('student_progress').insert({
          user_id: user.id,
          subject: examType,
          xp_earned: xpGained,
          quizzes_completed: 1,
          correct_answers: score,
          total_answers: questions.length,
          level: Math.floor(xpGained / 500) + 1,
        });
      }
    }
  }, [questions, answers, examType, user, timeLeft, totalTime, addXP]);

  const score = questions.reduce((acc, q, i) => {
    const selected = answers[i];
    const correct = q.options.find(o => o.isCorrect)?.letter;
    return acc + (selected === correct ? 1 : 0);
  }, 0);

  // ═══ ERROR STATE ═══
  if (phase === 'error') {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <AlertTriangle className="text-white" size={36} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Ops! Algo deu errado</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {errorMessage || 'A geração do quiz falhou. Isso pode acontecer por instabilidade temporária.'}
          </p>
        </div>

        <Card className="border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Possíveis causas:</strong></p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Timeout do servidor (IA demorou demais)</li>
                  <li>Instabilidade temporária de rede</li>
                  <li>Excesso de requisições simultâneas</li>
                </ul>
              </div>
            </div>

            {retryCount > 0 && (
              <div className="text-xs text-muted-foreground text-center">
                Tentativa {retryCount + 1} • Reduzir quantidade de questões pode ajudar
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleRetry} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white h-12">
                <RotateCcw className="mr-2" size={16} />
                Tentar Novamente
              </Button>
              <Button onClick={() => { setPhase('setup'); setErrorMessage(''); }} variant="outline" className="flex-1 h-12">
                Voltar
              </Button>
            </div>

            {retryCount >= 2 && (
              <Button
                onClick={() => {
                  setQuestionCount(5);
                  handleRetry();
                }}
                variant="secondary"
                className="w-full"
              >
                Tentar com apenas 5 questões
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ SETUP ═══
  if (phase === 'setup') {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Brain className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Quiz Interativo</h1>
          <p className="text-muted-foreground mt-1">Escolha a banca e comece a treinar</p>
        </div>

        {/* Fast-Track Cards */}
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Flame size={14} className="text-orange-500" />
            Vestibulinho Rápido (20 questões)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {FAST_TRACK_OPTIONS.map(ft => (
              <button
                key={ft.id}
                onClick={() => {
                  setExamType(ft.id);
                  setQuestionCount(ft.count);
                  startQuizWithParams(ft.id, ft.count);
                }}
                className="group relative overflow-hidden rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-card p-4 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-400"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${ft.gradient} flex items-center justify-center mb-3`}>
                  <ft.icon className="text-white" size={20} />
                </div>
                <h4 className="font-bold text-sm text-foreground">{ft.label}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{ft.count} questões mistas • Padrão Oficial</p>
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou configure</span>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Banca / Vestibular</label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXAM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Quantidade de questões</label>
              <div className="flex gap-2">
                {QUESTION_COUNTS.map(n => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      questionCount === n
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={startQuiz} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-12 text-base">
              <Sparkles className="mr-2" size={18} />
              Iniciar Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ LOADING ═══
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="text-muted-foreground font-medium">Gerando seu quiz com IA...</p>
        <p className="text-xs text-muted-foreground">Tutor Socrático ativado 🧠</p>
        <p className="text-[10px] text-muted-foreground mt-2">Tentativa automática de reconexão em caso de falha</p>
      </div>
    );
  }

  // ═══ RESULTS ═══
  if (phase === 'results') {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const xpGained = score * 50;
    const bonusXP = 500;
    return (
      <div className="min-h-[80vh] bg-[#0F172A] -m-4 md:-m-6 p-6 md:p-8 rounded-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Confetti */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                  fontSize: `${14 + Math.random() * 20}px`,
                }}
              >
                {['🎉', '⭐', '🏆', '✨', '🎊', '💎', '🔥'][Math.floor(Math.random() * 7)]}
              </div>
            ))}
          </div>
        )}

        <div className="max-w-lg mx-auto relative z-10 space-y-6">
          {/* Trophy */}
          <div className="text-center pt-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-[0_0_60px_rgba(251,191,36,0.3)] animate-pulse">
              <Trophy className="text-white drop-shadow-lg" size={44} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              MISSÃO CONCLUÍDA
            </h1>
            <p className="text-indigo-300 mt-2 text-sm">
              {EXAM_OPTIONS.find(e => e.value === examType)?.label || examType} • {questions.length} questões
            </p>
          </div>

          {/* Score Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center space-y-4">
            <div className="text-6xl font-black text-white">{pct}%</div>
            <div className="text-indigo-300 text-sm">{score} de {questions.length} acertos</div>
            <div className="flex justify-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold text-sm">
                <Sparkles size={14} /> +{xpGained} XP
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
                <Trophy size={14} /> +{bonusXP} XP Bónus
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium text-sm">
                <Timer size={14} /> {formatTime(totalTime - timeLeft)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="h-12 border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              📄 Imprimir PDF
            </Button>
            <Button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Quiz EduCreator',
                    text: `Acertei ${pct}% no Quiz ${EXAM_OPTIONS.find(e => e.value === examType)?.label}! 🏆`,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(`Acertei ${pct}% no Quiz ${EXAM_OPTIONS.find(e => e.value === examType)?.label}! 🏆`);
                  toast({ title: 'Copiado!', description: 'Resultado copiado para a área de transferência.' });
                }
              }}
              variant="outline"
              className="h-12 border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              📤 Compartilhar
            </Button>
          </div>

          <Button
            onClick={() => { setPhase('setup'); setQuestions([]); }}
            className="w-full h-14 text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20"
          >
            <RotateCcw className="mr-2" size={18} /> Novo Treino
          </Button>

          {/* Review incorrect */}
          {questions.some((q, i) => answers[i] !== q.options.find(o => o.isCorrect)?.letter) && (
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Brain size={16} className="text-indigo-400" /> Revisão com Tutor Socrático
              </h3>
              {questions.map((q, i) => {
                const selected = answers[i];
                const correct = q.options.find(o => o.isCorrect);
                const isCorrect = selected === correct?.letter;
                if (isCorrect) return null;
                return (
                  <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <XCircle size={16} className="text-red-400 mt-1 shrink-0" />
                      <p className="text-sm text-white/90">{q.content}</p>
                    </div>
                    <div className="text-xs text-indigo-300">
                      Você marcou: <strong>{selected || '—'}</strong> | Correta: <strong>{correct?.letter}</strong>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-sm text-indigo-300">
                      <Brain size={14} className="inline mr-1" />
                      <strong>Tutor:</strong> {q.tutorExplanation || `A resposta correta é "${correct?.letter}) ${correct?.text}". Reflita sobre o que diferencia esta alternativa das demais.`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══ QUIZ ═══
  const q = questions[currentIdx];
  const correctLetter = q?.options.find(o => o.isCorrect)?.letter;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          {currentIdx + 1} / {questions.length}
        </Badge>
        <div className={`flex items-center gap-1.5 font-mono font-bold text-sm ${timeLeft < 60 ? 'text-red-500' : 'text-foreground'}`}>
          <Timer size={16} />
          {formatTime(timeLeft)}
        </div>
      </div>

      <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-1.5" />

      {/* Question */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-foreground font-medium leading-relaxed">{q?.content}</p>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="space-y-2">
        {q?.options.map(opt => {
          const isSelected = answers[currentIdx] === opt.letter;
          const isCorrect = opt.letter === correctLetter;
          let classes = 'border-border bg-card hover:bg-muted/50';
          if (showFeedback) {
            if (isCorrect) classes = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
            else if (isSelected && !isCorrect) classes = 'border-red-500 bg-red-50 dark:bg-red-950/30';
          } else if (isSelected) {
            classes = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30';
          }

          return (
            <button
              key={opt.letter}
              onClick={() => selectAnswer(opt.letter)}
              disabled={showFeedback}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${classes}`}
            >
              <span className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                {opt.letter}
              </span>
              <span className="text-sm text-foreground">{opt.text}</span>
              {showFeedback && isCorrect && <CheckCircle2 className="text-emerald-500 ml-auto shrink-0" size={20} />}
              {showFeedback && isSelected && !isCorrect && <XCircle className="text-red-500 ml-auto shrink-0" size={20} />}
            </button>
          );
        })}
      </div>

      {/* Tutor feedback */}
      {showFeedback && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="text-indigo-600" size={18} />
            <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300">Tutor Socrático</span>
          </div>
          <p className="text-sm text-indigo-800 dark:text-indigo-300">
            {q?.tutorExplanation || (answers[currentIdx] === correctLetter
              ? '✅ Excelente! Você acertou. Continue assim — cada acerto consolida seu conhecimento.'
              : `A resposta correta é "${correctLetter}". Pense: o que diferencia esta alternativa? Qual conceito fundamental está sendo testado aqui?`
            )}
          </p>
        </div>
      )}

      {showFeedback && (
        <Button onClick={nextQuestion} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white h-12">
          {currentIdx < questions.length - 1 ? (
            <>Próxima <ArrowRight className="ml-2" size={16} /></>
          ) : (
            <>Ver Resultado <Trophy className="ml-2" size={16} /></>
          )}
        </Button>
      )}
    </div>
  );
}
