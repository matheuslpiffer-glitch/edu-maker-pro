import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap, ClipboardCheck, PenLine, Presentation, Accessibility,
  ArrowRight, Sparkles, Loader2, MousePointerClick, Wand2, Download,
  CheckCircle2, Clock, Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStudentMode } from '@/hooks/useStudentMode';
import Auth from './Auth';

const benefits = [
  {
    icon: ClipboardCheck,
    title: 'Provas e simulados em minutos',
    desc: 'Avaliações alinhadas à BNCC, com gabarito automático e exportação em PDF prontas para imprimir.',
  },
  {
    icon: PenLine,
    title: 'Correção de redação com IA',
    desc: 'Feedback por competências em segundos. Economize horas de correção e devolva com qualidade.',
  },
  {
    icon: Presentation,
    title: 'Aulas e materiais prontos',
    desc: 'Planos de aula, slides, mapas mentais e atividades gerados automaticamente para qualquer disciplina.',
  },
  {
    icon: Accessibility,
    title: 'Adaptação e inclusão',
    desc: 'Materiais adaptados por perfil do aluno (TEA, TDAH, DI e mais) com linguagem acessível.',
  },
];

const steps = [
  { icon: MousePointerClick, title: '1. Escolha o que criar', desc: 'Prova, redação, plano de aula, slides, mapa mental ou atividade adaptada.' },
  { icon: Wand2, title: '2. A IA gera em segundos', desc: 'Conteúdo alinhado à BNCC, no nível da turma e pronto para revisão.' },
  { icon: Download, title: '3. Baixe pronto pra usar', desc: 'Exporte em PDF, imprima ou compartilhe direto com seus alunos.' },
];

const proPerks = [
  'Gerações ilimitadas com IA',
  'Correção de redação por competências',
  'Simulados, provas e gabaritos em PDF',
  'Planos de aula, slides e mapas mentais',
  'Adaptações por perfil do aluno (inclusão)',
  'Suporte prioritário',
];

const freePerks = [
  'Acesso à plataforma',
  'Gerações limitadas para experimentar',
  'Exportação básica em PDF',
];

export default function LandingProfessor() {
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

  if (showAuth) return <Auth preferredPortal="teacher" />;

  const goAuth = () => setShowAuth(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="font-bold text-xl">MAT</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Professor</span>
          </div>
          <Button onClick={() => setShowAuth(true)}>Entrar <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-20">
        {/* HERO */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-1 bg-primary/10 text-primary text-sm px-3 py-1 rounded-full"><Sparkles className="h-4 w-4" /> Produtividade com IA</div>
          <h1 className="text-4xl font-bold">Crie simulados, provas e aulas com inteligência artificial</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Plataforma completa para professores automatizarem a criação de materiais pedagógicos alinhados à BNCC. Desenvolvida por um professor — Matheus Lima Piffer.</p>
          <Button size="lg" onClick={goAuth}>Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </section>

        {/* DOR */}
        <section className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold">Cansado de passar horas montando provas, corrigindo redações e adaptando atividades?</h2>
          <p className="text-muted-foreground">O MAT resolve isso com inteligência artificial em minutos — para você focar no que importa: ensinar.</p>
        </section>

        {/* COMO FUNCIONA */}
        <section className="space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-1 text-primary text-sm font-semibold"><Zap className="h-4 w-4" /> COMO FUNCIONA</div>
            <h2 className="text-2xl md:text-3xl font-bold mt-2">Três passos. Sem complicação.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map(s => (
              <Card key={s.title}>
                <CardContent className="pt-6 space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* O QUE VOCÊ GANHA */}
        <section className="space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-1 text-primary text-sm font-semibold"><Clock className="h-4 w-4" /> O QUE VOCÊ GANHA</div>
            <h2 className="text-2xl md:text-3xl font-bold mt-2">Mais tempo. Mais qualidade. Menos retrabalho.</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {benefits.map(f => (
              <Card key={f.title}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* PLANOS */}
        <section className="space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-1 text-primary text-sm font-semibold"><Sparkles className="h-4 w-4" /> PLANOS</div>
            <h2 className="text-2xl md:text-3xl font-bold mt-2">Comece grátis. Faça upgrade quando quiser.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">Grátis</h3>
                  <p className="text-sm text-muted-foreground">Para experimentar</p>
                </div>
                <div className="text-3xl font-bold">R$ 0</div>
                <ul className="space-y-2 text-sm">
                  {freePerks.map(p => (
                    <li key={p} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />{p}</li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" onClick={goAuth}>Criar conta grátis</Button>
              </CardContent>
            </Card>
            <Card className="border-primary shadow-lg">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Pro Mensal</h3>
                    <p className="text-sm text-muted-foreground">Flexibilidade</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Popular</span>
                </div>
                <div className="text-3xl font-bold">R$ 29,90<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                <ul className="space-y-2 text-sm">
                  {proPerks.map(p => (
                    <li key={p} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />{p}</li>
                  ))}
                </ul>
                <Button className="w-full" onClick={goAuth}>Assinar</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">Pro Anual</h3>
                  <p className="text-sm text-muted-foreground">Melhor custo-benefício</p>
                </div>
                <div className="text-3xl font-bold">R$ 358,80<span className="text-sm font-normal text-muted-foreground">/ano</span></div>
                <p className="text-xs text-muted-foreground">Equivale a R$ 29,90/mês — economize com pagamento anual.</p>
                <ul className="space-y-2 text-sm">
                  {proPerks.map(p => (
                    <li key={p} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />{p}</li>
                  ))}
                </ul>
                <Button className="w-full" onClick={goAuth}>Assinar</Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-10 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Comece agora — crie sua conta grátis</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Em poucos minutos você gera sua primeira prova, plano de aula ou correção de redação com IA.</p>
          <Button size="lg" onClick={goAuth}>Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        MAT | Gestão Pedagógica: Matheus Lima Piffer
      </footer>
    </div>
  );
}
