import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Target, Brain, Trophy, ArrowRight, Rocket, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStudentMode } from '@/hooks/useStudentMode';
import Auth from './Auth';

const features = [
  { icon: Target, title: 'Simulados Online', desc: 'Realize provas enviadas pelo seu professor e acompanhe sua nota.' },
  { icon: Brain, title: 'Revisão de Erros', desc: 'Veja quais questões errou e entenda a resposta correta.' },
  { icon: Trophy, title: 'Gamificação', desc: 'Ganhe selos e acompanhe seu progresso em cada disciplina.' },
  { icon: Rocket, title: 'Sugestões de Estudo', desc: 'A IA analisa seus erros e sugere o que revisar.' },
];

export default function LandingEstudo() {
  const [showAuth, setShowAuth] = useState(false);
  const { user } = useAuth();
  const { isTeacher, isStudent, hasRole, loading } = useRole();
  const { setStudentMode } = useStudentMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || loading) return;

    if (isTeacher) {
      setStudentMode(false);
      navigate('/dashboard-professor', { replace: true });
      return;
    }

    if (isStudent) {
      navigate('/portal-aluno', { replace: true });
      return;
    }

    if (!hasRole) {
      navigate('/', { replace: true });
    }
  }, [user, loading, isTeacher, isStudent, hasRole, navigate, setStudentMode]);

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showAuth) return <Auth preferredPortal="student" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <span className="font-bold text-xl">EduCreator Pro</span>
            <span className="text-xs bg-accent/10 text-accent-foreground px-2 py-0.5 rounded-full">Portal do Aluno</span>
          </div>
          <Button onClick={() => setShowAuth(true)}>Entrar <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-1 bg-accent/10 text-accent-foreground text-sm px-3 py-1 rounded-full"><Rocket className="h-4 w-4" /> Aprendizado e Desempenho</div>
          <h1 className="text-4xl font-bold">Seu portal de estudos personalizado</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Acesse simulados, revise seus erros e receba sugestões de estudo com inteligência artificial. Acompanhe seu progresso e conquiste selos!</p>
          <Button size="lg" onClick={() => setShowAuth(true)}>Entrar no Portal</Button>
        </section>

        <section className="grid sm:grid-cols-2 gap-6">
          {features.map(f => (
            <Card key={f.title}>
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <f.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        EduCreator Pro | Gestão Pedagógica: Matheus Lima Piffer
      </footer>
    </div>
  );
}
