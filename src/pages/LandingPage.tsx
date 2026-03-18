import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap, ArrowRight, Sparkles, CheckCircle2, Brain, BookOpen,
  Shield, Cpu, Globe, Users, Lightbulb, ClipboardList, BarChart3,
  Presentation, FileText, Zap
} from 'lucide-react';

const differentials = [
  {
    icon: Brain,
    title: 'IA Pedagógica',
    desc: 'Questões personalizadas, figuras e correções geradas por inteligência artificial de ponta.',
  },
  {
    icon: Users,
    title: 'Tutoria Digital',
    desc: 'Substitua fichas impressas por registros digitais completos de atendimento individualizado.',
  },
  {
    icon: Globe,
    title: 'Multidirecionamento',
    desc: 'Preparado para Redes Estaduais, Municipais e Particulares. BNCC, SARESP, ADE e mais.',
  },
  {
    icon: BarChart3,
    title: 'Analytics em Tempo Real',
    desc: 'Acompanhe o desempenho escolar com dashboards interativos, mapas de calor e metas IDESP.',
  },
];

const features = [
  { icon: ClipboardList, label: 'Simuladores Elite' },
  { icon: Presentation, label: 'EduSlides & Aulas' },
  { icon: FileText, label: 'EduAtas Digitais' },
  { icon: Cpu, label: 'Inclusão AEE' },
  { icon: Lightbulb, label: 'Bússola Vocacional' },
  { icon: Zap, label: 'Alta Performance' },
];

export default function LandingPage() {
  const openTeacherLogin = () => window.location.assign('/professor');
  const openStudentLogin = () => window.location.assign('/estudo');

  return (
    <div className="min-h-screen bg-[hsl(220,50%,5%)] text-white selection:bg-[hsl(190,80%,45%)]/30">
      {/* Hero */}
      <header className="relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,50%,10%)] via-[hsl(220,50%,6%)] to-[hsl(220,50%,4%)]" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, hsl(190,80%,45%) 0%, transparent 55%), radial-gradient(circle at 75% 15%, hsl(220,60%,55%) 0%, transparent 45%), radial-gradient(circle at 50% 90%, hsl(190,80%,30%) 0%, transparent 40%)' }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Nav */}
        <nav className="relative max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(190,80%,45%)] to-[hsl(210,70%,50%)] shadow-lg shadow-[hsl(190,80%,45%)]/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">EduCreator <span className="text-[hsl(190,80%,55%)]">Pro</span></span>
          </div>
          <Button
            onClick={openTeacherLogin}
            className="bg-[hsl(190,80%,45%)] text-[hsl(220,50%,5%)] hover:bg-[hsl(190,80%,50%)] font-semibold shadow-md shadow-[hsl(190,80%,45%)]/20"
          >
            Acessar Plataforma
          </Button>
        </nav>

        {/* Hero Content */}
        <div className="relative max-w-6xl mx-auto px-5 pt-14 pb-20 md:pt-20 md:pb-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/[0.07] backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-8 border border-white/[0.08]">
            <Sparkles className="h-4 w-4 text-[hsl(190,80%,55%)]" />
            <span className="text-white/70">Plataforma 360º para Educadores</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            A Revolução na<br />
            <span className="bg-gradient-to-r from-[hsl(190,80%,55%)] to-[hsl(210,70%,60%)] bg-clip-text text-transparent">Gestão Pedagógica</span><br />
            e de Tutoria
          </h1>

          <p className="text-base sm:text-lg text-white/50 max-w-3xl mx-auto mb-14 leading-relaxed">
            Uma solução 360º para professores e alunos. Gere avaliações inteligentes (BNCC/SARESP/ADE), organize tutorias individuais e acompanhe o desempenho escolar em tempo real.
          </p>

          {/* Entry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Teacher Card */}
            <button
              onClick={openTeacherLogin}
              className="group relative overflow-hidden rounded-2xl border border-[hsl(190,80%,45%)]/30 bg-gradient-to-br from-[hsl(190,80%,45%)]/12 to-[hsl(210,70%,50%)]/5 p-6 sm:p-7 text-left transition-all duration-300 hover:border-[hsl(190,80%,45%)]/60 hover:shadow-[0_0_50px_-12px_hsl(190,80%,45%,0.35)] hover:scale-[1.02]"
            >
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-[hsl(190,80%,45%)]/8 rounded-full blur-3xl group-hover:bg-[hsl(190,80%,45%)]/15 transition-all" />
              <div className="relative z-10">
                <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(190,80%,45%)] to-[hsl(210,70%,50%)] shadow-lg shadow-[hsl(190,80%,45%)]/25 mb-4">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg sm:text-xl text-white mb-1.5">Sou Professor / Administrador</h3>
                <p className="text-sm text-white/45 mb-5 leading-relaxed">Acesse seu Painel de Controle, Biblioteca de Simulados e Gestão de Tutorados.</p>
                <span className="inline-flex items-center gap-1.5 text-[hsl(190,80%,55%)] font-semibold text-sm group-hover:gap-2.5 transition-all">
                  Acessar Dashboard <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </button>

            {/* Student Card */}
            <button
              onClick={openStudentLogin}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-7 text-left transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_0_50px_-12px_rgba(255,255,255,0.08)] hover:scale-[1.02]"
            >
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/[0.03] rounded-full blur-3xl group-hover:bg-white/[0.06] transition-all" />
              <div className="relative z-10">
                <div className="flex h-13 w-13 items-center justify-center rounded-xl border-2 border-white/15 bg-white/[0.06] mb-4">
                  <BookOpen className="h-6 w-6 text-white/70" />
                </div>
                <h3 className="font-bold text-lg sm:text-xl text-white mb-1.5">Sou Aluno / Ver meus Estudos</h3>
                <p className="text-sm text-white/45 mb-5 leading-relaxed">Entre no seu Portal de Estudos, revise simulados e veja seu progresso.</p>
                <span className="inline-flex items-center gap-1.5 text-white/60 font-semibold text-sm group-hover:gap-2.5 group-hover:text-white/80 transition-all">
                  Acessar Portal <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </button>
          </div>

          <p className="text-xs text-white/30 mt-6">Login rápido com Google ou Apple</p>
        </div>
      </header>

      {/* Feature Pills */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-6xl mx-auto px-5 py-10 md:py-12">
          <div className="flex flex-wrap justify-center gap-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.06] rounded-full px-4 py-2 text-sm text-white/60">
                <f.icon className="h-4 w-4 text-[hsl(190,80%,55%)]" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentials */}
      <section className="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-[hsl(190,80%,55%)] text-sm font-semibold mb-3">
            <Shield className="h-4 w-4" />
            DIFERENCIAIS
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que o EduCreator Pro é diferente?</h2>
          <p className="text-white/40 max-w-xl mx-auto">Tecnologia de ponta a serviço da educação de excelência</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {differentials.map((d) => (
            <Card key={d.title} className="bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-[hsl(190,80%,45%)]/20 transition-all duration-300">
              <CardContent className="flex items-start gap-5 p-6 sm:p-7">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(190,80%,45%)]/10 border border-[hsl(190,80%,45%)]/15">
                  <d.icon className="h-6 w-6 text-[hsl(190,80%,55%)]" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{d.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{d.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Social Proof / Benefits */}
      <section className="bg-white/[0.02] border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[hsl(190,80%,55%)] text-sm font-semibold mb-3">
                <Sparkles className="h-4 w-4" />
                RESULTADOS REAIS
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Feito para quem quer resultados</h2>
              <p className="text-white/45 leading-relaxed">
                O EduCreator Pro nasceu da vivência real em sala de aula. Cada módulo foi projetado para resolver problemas concretos de professores e coordenadores.
              </p>
            </div>
            <div className="space-y-3.5">
              {[
                'Avaliações alinhadas à BNCC, SARESP e ADE',
                'Portal do Aluno com gamificação e revisão de erros',
                'Gestão de Tutoria individual digitalizada',
                'Analytics de desempenho em tempo real',
                'Exportação em PDF otimizada para impressão',
                'Preparado para todas as redes de ensino',
              ].map((b) => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(190,80%,55%)] shrink-0 mt-0.5" />
                  <span className="text-white/70 text-sm">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-5 py-20 md:py-28 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Transforme sua gestão pedagógica hoje</h2>
        <p className="text-white/40 max-w-lg mx-auto mb-8">Junte-se a professores que já estão usando o EduCreator Pro para alcançar a excelência.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={openTeacherLogin}
            className="bg-gradient-to-r from-[hsl(190,80%,45%)] to-[hsl(210,70%,50%)] text-white hover:from-[hsl(190,80%,50%)] hover:to-[hsl(210,70%,55%)] font-bold text-lg px-10 py-7 rounded-xl shadow-lg shadow-[hsl(190,80%,45%)]/20"
          >
            <GraduationCap className="mr-2 h-5 w-5" />
            Entrar como Professor
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={openStudentLogin}
            className="border-white/20 text-white/70 hover:bg-white/[0.06] hover:text-white font-bold text-lg px-10 py-7 rounded-xl"
          >
            <BookOpen className="mr-2 h-5 w-5" />
            Entrar como Aluno
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="max-w-6xl mx-auto px-5 text-center space-y-3">
          <div className="flex items-center justify-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(190,80%,45%)]/25 to-[hsl(210,70%,50%)]/15">
              <GraduationCap className="h-4 w-4 text-[hsl(190,80%,55%)]" />
            </div>
            <span className="font-bold text-white/60">EduCreator Pro</span>
          </div>
          <p className="text-sm text-white/35">
            Plataforma Desenvolvida e Gerenciada por <span className="text-white/55 font-medium">Matheus Lima Piffer</span>
          </p>
          <p className="text-xs text-white/25 italic">Inovação tecnológica a serviço da educação de excelência.</p>
          <p className="text-xs text-white/15">© 2026 — Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
