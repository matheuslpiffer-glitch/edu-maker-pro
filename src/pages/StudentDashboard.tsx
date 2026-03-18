import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStudentMode } from '@/hooks/useStudentMode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Zap, Target, BookOpen, Gamepad2, Trophy, Star, Clock, Brain, Flame, Building2, Cpu, Award, Landmark, Medal, Shield, Sparkles, BarChart3, Eye, ChevronDown, ChevronUp, CheckCircle2, XCircle, MessageCircle, ClipboardList, TrendingUp, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubjectProgress {
  subject: string;
  xp_earned: number;
  quizzes_completed: number;
  correct_answers: number;
  total_answers: number;
  level: number;
}

interface SimulatorResult {
  id: string;
  simulator_id: string;
  student_name: string;
  student_class: string;
  correct_count: number;
  total_questions: number;
  percentage: number;
  proficiency_level: string;
  created_at: string;
}

interface SimulatorData {
  id: string;
  title: string;
  questions: any[];
}

const BADGES = [
  { id: 'elite', label: 'Estudante Elite', desc: 'Acima de 80% de acerto em um simulado', icon: Star, color: 'from-yellow-400 to-amber-600', minPercentage: 80 },
  { id: 'lenda_if', label: 'Lenda do IF', desc: 'Completou 5 simulados de Institutos Federais', icon: Landmark, color: 'from-emerald-500 to-green-600', requiredQuizzes: 5, examType: 'selecao_ifs' },
  { id: 'guerreiro_etec', label: 'Guerreiro ETEC', desc: 'Completou 5 simulados da ETEC', icon: Cpu, color: 'from-teal-500 to-cyan-600', requiredQuizzes: 5, examType: 'vestibulinho_etec' },
  { id: 'genio_exatas', label: 'Gênio de Exatas', desc: '80%+ de acerto em Matemática', icon: Brain, color: 'from-blue-500 to-indigo-600', requiredAccuracy: 80, subject: 'Matemática' },
  { id: 'maratonista', label: 'Maratonista', desc: 'Completou 20 quizzes no total', icon: Trophy, color: 'from-yellow-500 to-orange-500', totalQuizzes: 20 },
  { id: 'iniciante', label: 'Desbravador', desc: 'Completou seu primeiro quiz', icon: Star, color: 'from-purple-500 to-pink-500', totalQuizzes: 1 },
  { id: 'escudo', label: 'Escudo de Ferro', desc: '3 dias de sequência de estudos', icon: Shield, color: 'from-gray-500 to-slate-600', streakDays: 3 },
];

const DAILY_MISSIONS = [
  { id: 'quiz_if', label: 'Fazer um simulado do IF', xp: 500, icon: Building2, path: '/portal-aluno/quiz?fast=ifs' },
  { id: 'quiz_etec', label: 'Fazer um simulado da ETEC', xp: 500, icon: Cpu, path: '/portal-aluno/quiz?fast=etec' },
  { id: 'quiz_enem', label: 'Treinar 10 questões ENEM', xp: 300, icon: Target, path: '/portal-aluno/quiz' },
  { id: 'jogos', label: 'Jogar um jogo didático', xp: 200, icon: Gamepad2, path: '/jogos' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { studentXP, studentLevel } = useStudentMode();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<SubjectProgress[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  const [simulatorResults, setSimulatorResults] = useState<SimulatorResult[]>([]);
  const [simulatorDataMap, setSimulatorDataMap] = useState<Record<string, SimulatorData>>({});
  const [totalQuizCount, setTotalQuizCount] = useState(0);
  const [quizCountByExam, setQuizCountByExam] = useState<Record<string, number>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [studySuggestion, setStudySuggestion] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [latestSimulator, setLatestSimulator] = useState<{ title: string } | null>(null);

  // First-visit welcome modal + toast
  useEffect(() => {
    if (!user) return;
    const key = `educreator_welcome_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShowWelcome(true);
      localStorage.setItem(key, 'true');
    }
    // Always show a brief welcome toast on dashboard load
    const { toast } = await import('@/hooks/use-toast').then(m => m);
    // Use setTimeout to avoid calling during render
  }, [user]);

  // Load latest available simulator (most recent from any teacher)
  useEffect(() => {
    supabase.from('simulators').select('title').order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setLatestSimulator(data[0]);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    // Load student progress
    supabase.from('student_progress').select('*').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          setProgress(data as SubjectProgress[]);
          const total = data.reduce((s: number, d: any) => s + (d.quizzes_completed || 0), 0);
          setTotalQuizCount(total);
        }
      });
    // Load quiz results
    supabase.from('student_quiz_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        if (data) {
          setRecentQuizzes(data.slice(0, 5));
          const counts: Record<string, number> = {};
          data.forEach((q: any) => { counts[q.exam_type] = (counts[q.exam_type] || 0) + 1; });
          setQuizCountByExam(counts);
        }
      });
    // Load simulator results (where user_id matches - student logged in and did simulators)
    supabase.from('student_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      .then(async ({ data }) => {
        if (data && data.length > 0) {
          setSimulatorResults(data as SimulatorResult[]);
          // Fetch simulator details for review
          const ids = [...new Set(data.map((r: any) => r.simulator_id))];
          const { data: sims } = await supabase.from('simulators').select('id, title, questions').in('id', ids);
          if (sims) {
            const map: Record<string, SimulatorData> = {};
            sims.forEach((s: any) => { map[s.id] = s; });
            setSimulatorDataMap(map);
          }
        }
      });
  }, [user]);

  const xpForNextLevel = studentLevel * 500;
  const xpProgress = ((studentXP % 500) / 500) * 100;

  // Weekly average
  const weeklyAverage = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekResults = simulatorResults.filter(r => new Date(r.created_at) >= oneWeekAgo);
    if (weekResults.length === 0) return null;
    return (weekResults.reduce((s, r) => s + r.percentage, 0) / weekResults.length).toFixed(1);
  }, [simulatorResults]);

  // Has elite badge
  const hasEliteBadge = simulatorResults.some(r => r.percentage >= 80);

  const unlockedBadges = BADGES.filter(b => {
    if (b.id === 'elite') return hasEliteBadge;
    if ((b as any).totalQuizzes) return totalQuizCount >= (b as any).totalQuizzes;
    if ((b as any).requiredQuizzes && (b as any).examType) return (quizCountByExam[(b as any).examType] || 0) >= (b as any).requiredQuizzes;
    if ((b as any).requiredAccuracy && (b as any).subject) {
      const p = progress.find(pr => pr.subject.includes('mat') || pr.subject.includes('Matem'));
      return p && p.total_answers > 0 && (p.correct_answers / p.total_answers) * 100 >= (b as any).requiredAccuracy;
    }
    return false;
  });

  // Generate AI study suggestion based on errors
  const generateStudySuggestion = async () => {
    if (simulatorResults.length === 0) return;
    setLoadingSuggestion(true);
    setStudySuggestion('');
    try {
      const errorSummary = simulatorResults.slice(0, 10).map(r => {
        const sim = simulatorDataMap[r.simulator_id];
        return `Simulado "${sim?.title || 'Desconhecido'}": ${r.correct_count}/${r.total_questions} acertos (${r.percentage}%)`;
      }).join('; ');

      const { data, error } = await supabase.functions.invoke('mat-chat', {
        body: {
          messages: [{
            role: 'user',
            content: `Baseado nos resultados do aluno: ${errorSummary}. Sugira 3 tópicos de estudo prioritários com dicas práticas. Seja breve e motivador.`
          }]
        }
      });
      if (error) throw error;
      setStudySuggestion(data?.reply || 'Não foi possível gerar sugestões no momento.');
    } catch {
      setStudySuggestion('Não foi possível gerar sugestões. Tente novamente mais tarde.');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const trainingActions = [
    { id: 'vestibular', label: 'Treino de Vestibular', desc: 'Quiz interativo com cronômetro — ENEM, IFs, ETEC', icon: Target, gradient: 'from-indigo-500 to-blue-600', path: '/portal-aluno/quiz' },
    { id: 'literatura', label: 'Dossiê Literário', desc: 'Resumos rápidos e flashcards literários', icon: BookOpen, gradient: 'from-pink-500 to-rose-600', path: '/portal-aluno/literatura' },
    { id: 'jogos', label: 'Jogos Didáticos', desc: 'Cruzadinhas, sudokus e vocabulário', icon: Gamepad2, gradient: 'from-orange-500 to-amber-600', path: '/jogos' },
  ];

  const studentName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Estudante';
  const overallAverage = useMemo(() => {
    if (simulatorResults.length === 0) return null;
    return (simulatorResults.reduce((s, r) => s + r.percentage, 0) / simulatorResults.length).toFixed(1);
  }, [simulatorResults]);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Welcome Modal */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="max-w-md text-center">
          <div className="space-y-4 py-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Rocket className="text-white" size={28} />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Olá, {studentName}! Bem-vindo ao seu Portal de Estudos EduCreator Pro. 🚀
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Aqui você pode realizar seus simulados, revisar seus erros e acompanhar sua evolução em cada matéria. O seu sucesso é o nosso objetivo!
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Direção Pedagógica: Prof. Matheus Lima Piffer
            </p>
            <Button onClick={() => { setShowWelcome(false); }} className="w-full gap-2" size="lg">
              <Eye size={16} /> Ver meus Simulados
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Branding Header */}
      <p className="text-center text-xs text-muted-foreground font-medium tracking-wide">
        Portal de Estudos — EduCreator Pro | Direção Pedagógica: Matheus Lima Piffer
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
              <ClipboardList className="text-white" size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalQuizCount + simulatorResults.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Realizados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
              <TrendingUp className="text-white" size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overallAverage ? `${overallAverage}%` : '—'}</p>
              <p className="text-xs text-muted-foreground font-medium">Média Geral</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shrink-0">
              <Rocket className="text-white" size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground truncate">{latestSimulator?.title || 'Nenhum disponível'}</p>
              <p className="text-xs text-muted-foreground font-medium">Próximo Desafio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {hasEliteBadge ? <Award className="text-yellow-300" size={24} /> : <Star className="text-yellow-300" size={24} />}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {user?.user_metadata?.full_name || user?.user_metadata?.name || 'Olá, Estudante!'} 🎓
              </h1>
              <p className="text-white/80 text-sm">
                {hasEliteBadge ? '⭐ Estudante Elite — Continue brilhando!' : 'Continue treinando para alcançar seus objetivos'}
              </p>
            </div>
            {user?.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white/40 ml-auto" />
            )}
          </div>

          {/* XP Bar */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="text-yellow-300" size={18} />
                <span className="font-bold text-lg">Nível {studentLevel}</span>
              </div>
              <span className="text-sm text-white/70">{studentXP} / {xpForNextLevel} XP</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div className="bg-gradient-to-r from-yellow-300 to-orange-400 h-3 rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <Trophy className="mx-auto text-yellow-300 mb-1" size={20} />
              <div className="text-xl font-bold">{totalQuizCount + simulatorResults.length}</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Atividades</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <Medal className="mx-auto text-emerald-300 mb-1" size={20} />
              <div className="text-xl font-bold">{unlockedBadges.length}</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Insígnias</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <Brain className="mx-auto text-pink-300 mb-1" size={20} />
              <div className="text-xl font-bold">{studentXP}</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">XP Total</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <BarChart3 className="mx-auto text-cyan-300 mb-1" size={20} />
              <div className="text-xl font-bold">{weeklyAverage ?? '—'}</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Média Semanal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      {simulatorResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 size={20} className="text-primary" />
              Meu Progresso
              {hasEliteBadge && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-amber-600 text-white border-0 ml-2">
                  ⭐ Estudante Elite
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {simulatorResults.slice(0, 8).map((r, i) => {
                const sim = simulatorDataMap[r.simulator_id];
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 truncate">{sim?.title || `Sim. ${i + 1}`}</span>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all ${r.percentage >= 80 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : r.percentage >= 50 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
                        style={{ width: `${r.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold w-12 text-right">{r.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulados Realizados + Revisão de Erros */}
      {simulatorResults.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Eye size={20} className="text-blue-500" />
            Simulados Realizados — Revisão de Erros
          </h2>
          <div className="space-y-3">
            {simulatorResults.map(r => {
              const sim = simulatorDataMap[r.simulator_id];
              const isReviewing = reviewingId === r.id;
              const questions: any[] = sim?.questions || [];

              return (
                <Card key={r.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground">{sim?.title || 'Simulado'}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString('pt-BR')} · {r.student_class}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.percentage >= 80 ? 'default' : r.percentage >= 50 ? 'secondary' : 'destructive'}>
                          {r.correct_count}/{r.total_questions} ({r.percentage}%)
                        </Badge>
                        {r.percentage >= 80 && <Star size={16} className="text-yellow-500" />}
                        {questions.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => setReviewingId(isReviewing ? null : r.id)}>
                            {isReviewing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isReviewing && questions.length > 0 && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        {questions.map((q: any, qi: number) => {
                          const correctOption = q.options?.find((o: any) => o.isCorrect);
                          return (
                            <div key={qi} className="text-sm space-y-1">
                              <div className="flex items-start gap-2">
                                <Badge variant="outline" className="shrink-0">Q{qi + 1}</Badge>
                                <p className="text-foreground" dangerouslySetInnerHTML={{ __html: q.content?.slice(0, 200) }} />
                              </div>
                              {correctOption && (
                                <div className="flex items-center gap-1 ml-8 text-xs">
                                  <CheckCircle2 size={12} className="text-emerald-500" />
                                  <span className="text-emerald-600 font-medium">Resposta correta: {correctOption.letter}) {correctOption.text}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Study Suggestions */}
      {simulatorResults.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <MessageCircle size={18} className="text-primary" />
                Sugestões de Estudo (IA)
              </h3>
              <Button size="sm" onClick={generateStudySuggestion} disabled={loadingSuggestion}>
                {loadingSuggestion ? <Sparkles size={14} className="animate-spin mr-1" /> : <Sparkles size={14} className="mr-1" />}
                {loadingSuggestion ? 'Analisando...' : 'Gerar Sugestões'}
              </Button>
            </div>
            {studySuggestion && (
              <div className="text-sm text-foreground whitespace-pre-line bg-background rounded-lg p-4 border">
                {studySuggestion}
              </div>
            )}
            {!studySuggestion && !loadingSuggestion && (
              <p className="text-sm text-muted-foreground">Clique em "Gerar Sugestões" para receber dicas baseadas nos seus erros.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Missions */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Flame size={20} className="text-orange-500" />
          Missões Ativas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DAILY_MISSIONS.map(mission => (
            <button key={mission.id} onClick={() => navigate(mission.path)} className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card text-left transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
                <mission.icon className="text-white" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-foreground truncate">{mission.label}</h4>
                <div className="flex items-center gap-1 mt-1">
                  <Sparkles size={12} className="text-yellow-500" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">+{mission.xp} XP</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Badge Trophy Cabinet */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Award size={20} className="text-yellow-500" />
          Armário de Troféus
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {BADGES.map(badge => {
            const unlocked = unlockedBadges.some(b => b.id === badge.id);
            return (
              <div key={badge.id} className={`relative rounded-xl border p-4 text-center transition-all ${unlocked ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-950/20 shadow-md' : 'border-border bg-card opacity-50 grayscale'}`}>
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center mx-auto mb-2 ${!unlocked ? 'opacity-40' : ''}`}>
                  <badge.icon className="text-white" size={20} />
                </div>
                <h4 className="font-bold text-xs text-foreground">{badge.label}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{badge.desc}</p>
                {unlocked && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                    <Star size={10} className="text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Training Actions */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Target size={20} className="text-indigo-500" />
          Ações de Treino
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trainingActions.map(action => (
            <button key={action.id} onClick={() => navigate(action.path)} className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all hover:shadow-lg hover:-translate-y-1">
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4`}>
                <action.icon className="text-white" size={22} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{action.label}</h3>
              <p className="text-sm text-muted-foreground">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Continue Studying */}
      {progress.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-pink-500" />
            Continuar Estudando
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progress.map(p => {
              const accuracy = p.total_answers > 0 ? Math.round((p.correct_answers / p.total_answers) * 100) : 0;
              return (
                <Card key={p.subject} className="border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{p.subject || 'Geral'}</h3>
                      <Badge variant="secondary" className="text-xs">Nível {p.level}</Badge>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Acertos</span><span>{accuracy}%</span>
                        </div>
                        <Progress value={accuracy} className="h-2" />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{p.quizzes_completed} quizzes</span><span>{p.xp_earned} XP</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentQuizzes.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock size={20} className="text-orange-500" />
            Atividade Recente
          </h2>
          <div className="space-y-2">
            {recentQuizzes.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                <div>
                  <span className="font-medium text-sm text-foreground">{q.institution || q.exam_type}</span>
                  <span className="text-xs text-muted-foreground ml-2">{new Date(q.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <Badge variant={q.score / q.total_questions >= 0.7 ? 'default' : 'secondary'}>
                  {q.score}/{q.total_questions}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer branding */}
      <p className="text-center text-[10px] text-muted-foreground pb-4">
        Portal de Estudos — EduCreator Pro | Direção Pedagógica: Matheus Lima Piffer
      </p>
    </div>
  );
}
