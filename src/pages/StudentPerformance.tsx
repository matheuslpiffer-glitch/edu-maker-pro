import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Trophy, Target, TrendingUp, Clock, Brain } from 'lucide-react';

export default function StudentPerformance() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('student_progress').select('*').eq('user_id', user.id).then(({ data }) => {
      if (data) setProgress(data);
    });
    supabase.from('student_quiz_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      if (data) setQuizzes(data);
    });
  }, [user]);

  const totalQuizzes = quizzes.length;
  const totalCorrect = quizzes.reduce((s, q) => s + (q.score || 0), 0);
  const totalQuestions = quizzes.reduce((s, q) => s + (q.total_questions || 0), 0);
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const totalTime = quizzes.reduce((s, q) => s + (q.time_spent_seconds || 0), 0);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="text-indigo-500" size={24} />
          Meu Desempenho
        </h1>
        <p className="text-muted-foreground mt-1">Acompanhe sua evolução nos estudos</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="mx-auto text-yellow-500 mb-2" size={24} />
            <div className="text-2xl font-bold text-foreground">{totalQuizzes}</div>
            <div className="text-xs text-muted-foreground">Quizzes Feitos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="mx-auto text-emerald-500 mb-2" size={24} />
            <div className="text-2xl font-bold text-foreground">{avgAccuracy}%</div>
            <div className="text-xs text-muted-foreground">Precisão Média</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Brain className="mx-auto text-indigo-500 mb-2" size={24} />
            <div className="text-2xl font-bold text-foreground">{progress.length}</div>
            <div className="text-xs text-muted-foreground">Matérias Estudadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="mx-auto text-orange-500 mb-2" size={24} />
            <div className="text-2xl font-bold text-foreground">{Math.round(totalTime / 60)}min</div>
            <div className="text-xs text-muted-foreground">Tempo Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Per-subject progress */}
      {progress.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-pink-500" />
            Progresso por Matéria
          </h2>
          <div className="space-y-3">
            {progress.map((p: any) => {
              const accuracy = p.total_answers > 0 ? Math.round((p.correct_answers / p.total_answers) * 100) : 0;
              return (
                <Card key={p.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{p.subject}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Nível {p.level}</Badge>
                        <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs">{p.xp_earned} XP</Badge>
                      </div>
                    </div>
                    <Progress value={accuracy} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{p.correct_answers}/{p.total_answers} acertos</span>
                      <span>{accuracy}%</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent quizzes */}
      {quizzes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Histórico de Quizzes</h2>
          <div className="space-y-2">
            {quizzes.map((q: any) => {
              const pct = q.total_questions > 0 ? Math.round((q.score / q.total_questions) * 100) : 0;
              return (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex-1">
                    <span className="font-medium text-sm text-foreground">{q.institution || q.exam_type}</span>
                    <span className="text-xs text-muted-foreground ml-2">{new Date(q.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{Math.round(q.time_spent_seconds / 60)}min</span>
                    <Badge variant={pct >= 70 ? 'default' : 'secondary'}>{q.score}/{q.total_questions}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
