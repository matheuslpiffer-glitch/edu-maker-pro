import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap, ClipboardCheck, Presentation, ClipboardList, BarChart3,
  ArrowRight, Shield, Sparkles, CheckCircle2, Brain, FileText, BookOpen,
  Zap, Users, Monitor
} from 'lucide-react';

const features = [
  {
    icon: ClipboardCheck,
    title: 'Avaliações BNCC/SARESP',
    desc: 'Crie provas e simulados alinhados à BNCC e ao Currículo Paulista com geração automática por IA.',
  },
  {
    icon: BookOpen,
    title: 'Portal do Aluno',
    desc: 'Ambiente exclusivo para alunos acessarem atividades, simulados e acompanharem seu desempenho.',
  },
  {
    icon: Users,
    title: 'Gestão de Tutoria',
    desc: 'Gerencie tutorias, acompanhe evolução individual e personalize intervenções pedagógicas.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Desempenho',
    desc: 'Mapas de calor, evolução temporal e metas IDESP para decisões pedagógicas baseadas em dados.',
  },
];

const differentials = [
  { icon: Zap, label: 'IA Pedagógica', desc: 'Geração de questões, correções e roteiros com inteligência artificial' },
  { icon: Monitor, label: 'Tutoria Digital', desc: 'Acompanhamento individualizado de cada aluno em tempo real' },
  { icon: BarChart3, label: 'Analytics Avançado', desc: 'Dados para tomada de decisão com visualizações interativas' },
];

const benefits = [
  'Geração de provas e simulados com IA em segundos',
  'Alinhamento total ao Currículo Paulista e BNCC',
  'Portal do Aluno com gamificação e desempenho',
  'Gestão de tutoria integrada ao painel do professor',
  'Exportação otimizada para PDF em formato A4',
  'Isolamento total de dados por usuário (Multi-tenant)',
];

export default function LandingPage() {
  const openTeacherLogin = () => window.location.assign('/professor');
  const openStudentLogin = () => window.location.assign('/estudo');

  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)] text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,14%)] via-[hsl(222,47%,8%)] to-[hsl(222,47%,4%)]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(38,92%,50%) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(162,63%,35%) 0%, transparent 40%)' }} />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(hsl(38,92%,50%) 1px, transparent 1px), linear-gradient(90deg, hsl(38,92%,50%) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <nav className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(38,92%,50%)]">
              <GraduationCap className="h-5 w-5 text-[hsl(222,47%,6%)]" />
            </div>
            <span className="font-bold text-xl tracking-tight">EduCreator <span className="text-[hsl(38,92%,50%)]">Pro</span></span>
          </div>
          <Button
            onClick={openTeacherLogin}
            className="bg-[hsl(38,92%,50%)] text-[hsl(222,47%,6%)] hover:bg-[hsl(38,92%,45%)] font-semibold"
          >
            Entrar
          </Button>
        </nav>

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-8 border border-white/10">
            <Sparkles className="h-4 w-4 text-[hsl(38,92%,50%)]" />
            <span>Ecossistema Educacional 360º com IA</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            EduCreator Pro:<br />
            <span className="text-[hsl(38,92%,50%)]">O Ecossistema Digital</span> do Professor
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto mb-12 leading-relaxed">
            Desenvolvido por <span className="text-white/80 font-semibold">Matheus Lima Piffer</span>, o EduCreator Pro agora integra criação de avaliações (BNCC/SARESP), Portal do Aluno e Gestão de Tutoria em um único lugar. Voltado para professores de todas as redes que buscam alta performance e organização.
          </p>

          {/* Entry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card
              onClick={openTeacherLogin}
              className="group cursor-pointer bg-gradient-to-br from-[hsl(38,92%,50%)]/20 to-[hsl(38,92%,50%)]/5 border-[hsl(38,92%,50%)]/30 hover:border-[hsl(38,92%,50%)]/60 hover:from-[hsl(38,92%,50%)]/30 hover:to-[hsl(38,92%,50%)]/10 transition-all duration-300"
            >
              <CardContent className="flex flex-col items-center text-center p-8 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(38,92%,50%)] shadow-lg shadow-[hsl(38,92%,50%)]/25">
                  <GraduationCap className="h-8 w-8 text-[hsl(222,47%,6%)]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">Sou Professor / Administrador</h3>
                  <p className="text-sm text-white/50">Dashboard completo com IA, simulados e gestão</p>
                </div>
                <ArrowRight className="h-5 w-5 text-[hsl(38,92%,50%)] group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>

            <Card
              onClick={openStudentLogin}
              className="group cursor-pointer bg-white/[0.04] border-[hsl(162,63%,45%)]/30 hover:border-[hsl(162,63%,45%)]/60 hover:bg-[hsl(162,63%,45%)]/5 transition-all duration-300"
            >
              <CardContent className="flex flex-col items-center text-center p-8 gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[hsl(162,63%,45%)]/50 bg-[hsl(162,63%,45%)]/10">
                  <BookOpen className="h-8 w-8 text-[hsl(162,63%,45%)]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">Sou Aluno / Ver meus Estudos</h3>
                  <p className="text-sm text-white/50">Portal de atividades, simulados e desempenho</p>
                </div>
                <ArrowRight className="h-5 w-5 text-[hsl(162,63%,45%)] group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </div>

          <p className="text-sm text-white/40 mt-6">Login rápido com Google ou Apple</p>
        </div>
      </header>

      {/* Differentials */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {differentials.map((d) => (
              <div key={d.label} className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(38,92%,50%)]/10 border border-[hsl(38,92%,50%)]/20">
                  <d.icon className="h-6 w-6 text-[hsl(38,92%,50%)]" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{d.label}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-[hsl(38,92%,50%)] text-sm font-semibold mb-3">
            <Brain className="h-4 w-4" />
            MÓDULOS INTEGRADOS
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo em um só lugar</h2>
          <p className="text-white/50 max-w-xl mx-auto">Ferramentas completas para professores de todas as redes que buscam alta performance</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-[hsl(38,92%,50%)]/30 transition-all duration-300">
              <CardContent className="flex items-start gap-5 p-7">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[hsl(38,92%,50%)]/15 border border-[hsl(38,92%,50%)]/20">
                  <f.icon className="h-7 w-7 text-[hsl(38,92%,50%)]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">{f.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white/[0.02] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[hsl(162,63%,45%)] text-sm font-semibold mb-3">
                <Shield className="h-4 w-4" />
                POR QUE ESCOLHER
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Feito para professores que buscam excelência</h2>
              <p className="text-white/50 leading-relaxed">
                O EduCreator Pro foi desenvolvido para integrar criação de avaliações, portal do aluno e gestão de tutoria em uma plataforma única e inteligente.
              </p>
            </div>
            <div className="space-y-4">
              {benefits.map((b) => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(162,63%,45%)] shrink-0 mt-0.5" />
                  <span className="text-white/80">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-[hsl(38,92%,50%)] text-sm font-semibold mb-3">
            <FileText className="h-4 w-4" />
            COMECE AGORA
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Três passos para transformar sua aula</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Crie sua conta', desc: 'Login rápido com Google ou Apple. Em segundos você está dentro do ecossistema.' },
            { step: '2', title: 'Gere com IA', desc: 'Crie avaliações, simulados e roteiros de aula alinhados à BNCC automaticamente.' },
            { step: '3', title: 'Acompanhe resultados', desc: 'Veja o desempenho dos alunos em tempo real e personalize intervenções.' },
          ].map((item) => (
            <Card key={item.step} className="bg-white/[0.04] border-white/10">
              <CardContent className="p-7">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(38,92%,50%)] text-[hsl(222,47%,6%)] font-bold text-lg mb-4">{item.step}</div>
                <h3 className="font-bold text-lg text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Transforme sua gestão pedagógica</h2>
        <p className="text-white/50 max-w-lg mx-auto mb-8">Professores de todas as redes já usam o EduCreator Pro para resultados melhores.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={openTeacherLogin}
            className="bg-[hsl(38,92%,50%)] text-[hsl(222,47%,6%)] hover:bg-[hsl(38,92%,45%)] font-bold text-lg px-10 py-7 rounded-xl"
          >
            <GraduationCap className="mr-2 h-5 w-5" />
            Entrar como Professor
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={openStudentLogin}
            className="border-[hsl(162,63%,45%)]/50 text-[hsl(162,63%,45%)] hover:bg-[hsl(162,63%,45%)]/10 font-bold text-lg px-10 py-7 rounded-xl"
          >
            <BookOpen className="mr-2 h-5 w-5" />
            Entrar como Aluno
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-2 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="font-semibold text-white/40">EduCreator Pro</span>
          </div>
          <span>Plataforma oficial desenvolvida por Matheus Lima Piffer | 2026</span>
        </div>
      </footer>
    </div>
  );
}
