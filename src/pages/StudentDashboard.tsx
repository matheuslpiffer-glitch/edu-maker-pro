import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStudentMode } from '@/hooks/useStudentMode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap, Target, BookOpen, Gamepad2, Trophy, Star, TrendingUp, Clock, Brain, Flame, Building2, Cpu, Award, Landmark, Medal, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubjectProgress {
  subject: string;
  xp_earned: number;
  quizzes_completed: number;
  correct_answers: number;
  total_answers: number;
  level: number;
}

// Badge definitions
const BADGES = [
  { id: 'lenda_if', label: 'Lenda do IF', desc: 'Completou 5 simulados de Institutos Federais', icon: Landmark, color: 'from-emerald-500 to-green-600', requiredQuizzes: 5, examType: 'selecao_ifs' },
  { id: 'guerreiro_etec', label: 'Guerreiro ETEC', desc: 'Completou 5 simulados da ETEC', icon: Cpu, color: 'from-teal-500 to-cyan-600', requiredQuizzes: 5, examType: 'vestibulinho_etec' },
  { id: 'genio_exatas', label: 'Gênio de Exatas', desc: '80%+ de acerto em Matemática', icon: Brain, color: 'from-blue-500 to-indigo-600', requiredAccuracy: 80, subject: 'Matemática' },
  { id: 'maratonista', label: 'Maratonista', desc: 'Completou 20 quizzes no total', icon: Trophy, color: 'from-yellow-500 to-orange-500', totalQuizzes: 20 },
  { id: 'iniciante', label: 'Desbravador', desc: 'Completou seu primeiro quiz', icon: Star, color: 'from-purple-500 to-pink-500', totalQuizzes: 1 },
  { id: 'escudo', label: 'Escudo de Ferro', desc: '3 dias de sequência de estudos', icon: Shield, color: 'from-gray-500 to-slate-600', streakDays: 3 },
];

// Daily missions
const DAILY_MISSIONS = [
  { id: 'quiz_if', label: 'Fazer um simulado do IF', xp: 500, icon: Building2, path: '/aluno/quiz?fast=ifs' },
  { id: 'quiz_etec', label: 'Fazer um simulado da ETEC', xp: 500, icon: Cpu, path: '/aluno/quiz?fast=etec' },
  { id: 'quiz_enem', label: 'Treinar 10 questões ENEM', xp: 300, icon: Target, path: '/aluno/quiz' },
  { id: 'jogos', label: 'Jogar um jogo didático', xp: 200, icon: Gamepad2, path: '/jogos' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { studentXP, studentLevel } = useStudentMode();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<SubjectProgress[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  const [totalQuizCount, setTotalQuizCount] = useState(0);
  const [quizCountByExam, setQuizCountByExam] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from('student_progress').select('*').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          setProgress(data as SubjectProgress[]);
          const total = data.reduce((s: number, d: any) => s + (d.quizzes_completed || 0), 0);
          setTotalQuizCount(total);
        }
      });
    supabase.from('student_quiz_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        if (data) {
          setRecentQuizzes(data.slice(0, 5));
          const counts: Record<string, number> = {};
          data.forEach((q: any) => {
            counts[q.exam_type] = (counts[q.exam_type] || 0) + 1;
          });
          setQuizCountByExam(counts);
        }
      });
  }, [user]);

  const xpForNextLevel = studentLevel * 500;
  const xpProgress = ((studentXP % 500) / 500) * 100;

  // Calculate unlocked badges
  const unlockedBadges = BADGES.filter(b => {
    if (b.totalQuizzes) return totalQuizCount >= b.totalQuizzes;
    if (b.requiredQuizzes && b.examType) return (quizCountByExam[b.examType] || 0) >= b.requiredQuizzes;
    if (b.requiredAccuracy && b.subject) {
      const p = progress.find(pr => pr.subject.includes('mat') || pr.subject.includes('Matem'));
      return p && p.total_answers > 0 && (p.correct_answers / p.total_answers) * 100 >= b.requiredAccuracy;
    }
    return false;
  });

  const trainingActions = [
    { id: 'vestibular', label: 'Treino de Vestibular', desc: 'Quiz interativo com cronômetro — ENEM, IFs, ETEC', icon: Target, gradient: 'from-indigo-500 to-blue-600', path: '/aluno/quiz' },
    { id: 'literatura', label: 'Dossiê Literário Aluno', desc: 'Resumos rápidos e flashcards literários', icon: BookOpen, gradient: 'from-pink-500 to-rose-600', path: '/literatura' },
    { id: 'jogos', label: 'Jogos Didáticos', desc: 'Cruzadinhas, sudokus e vocabulário', icon: Gamepad2, gradient: 'from-orange-500 to-amber-600', path: '/jogos' },
  ];

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Star className="text-yellow-300" size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Olá, Estudante! 🎓</h1>
              <p className="text-white/80 text-sm">Continue treinando para alcançar seus objetivos</p>
            </div>
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
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <Trophy className="mx-auto text-yellow-300 mb-1" size={20} />
              <div className="text-xl font-bold">{totalQuizCount}</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Quizzes</div>
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
          </div>
        </div>
      </div>

      {/* Daily Missions */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Flame size={20} className="text-orange-500" />
          Missões Ativas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DAILY_MISSIONS.map(mission => (
            <button
              key={mission.id}
              onClick={() => navigate(mission.path)}
              className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card text-left transition-all hover:shadow-md hover:-translate-y-0.5"
            >
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
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Target size={14} className="text-muted-foreground" />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {BADGES.map(badge => {
            const unlocked = unlockedBadges.some(b => b.id === badge.id);
            return (
              <div
                key={badge.id}
                className={`relative rounded-xl border p-4 text-center transition-all ${
                  unlocked
                    ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-950/20 shadow-md'
                    : 'border-border bg-card opacity-50 grayscale'
                }`}
              >
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
            <button
              key={action.id}
              onClick={() => navigate(action.path)}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all hover:shadow-lg hover:-translate-y-1"
            >
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
                          <span>Acertos</span>
                          <span>{accuracy}%</span>
                        </div>
                        <Progress value={accuracy} className="h-2" />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{p.quizzes_completed} quizzes</span>
                        <span>{p.xp_earned} XP</span>
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
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(q.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <Badge variant={q.score / q.total_questions >= 0.7 ? 'default' : 'secondary'}>
                  {q.score}/{q.total_questions}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
