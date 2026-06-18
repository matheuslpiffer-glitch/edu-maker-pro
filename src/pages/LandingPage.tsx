import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap, ClipboardCheck, Presentation, BarChart3,
  ArrowRight, Shield, Sparkles, CheckCircle2, Brain, FileText, BookOpen,
  Zap, Monitor, Lock
} from 'lucide-react';

const features = [
  {
    icon: ClipboardCheck,
    title: 'Simulados & Avaliações',
    desc: 'Crie provas e simulados alinhados à BNCC e ao Currículo Paulista com geração automática por IA.',
  },
  {
    icon: BookOpen,
    title: 'Dossiês Literários',
    desc: 'Análises completas de obras literárias com questões contextualizadas para vestibulares.',
  },
  {
    icon: Presentation,
    title: 'Atividades de Alta Performance',
    desc: 'Listas de exercícios, bancos de questões e materiais de estudo personalizados por IA.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Desempenho',
    desc: 'Mapas de calor, evolução temporal e metas IDESP para decisões pedagógicas baseadas em dados.',
  },
];

const differentials = [
  { icon: Zap, label: 'IA Pedagógica', desc: 'Geração de questões, correções e roteiros com inteligência artificial' },
  { icon: Brain, label: 'Inteligência Criativa', desc: 'Simulados, dossiês e atividades elaboradas em segundos' },
  { icon: BarChart3, label: 'Analytics Avançado', desc: 'Dados para tomada de decisão com visualizações interativas' },
];

const benefits = [
  'Geração de provas e simulados com IA em segundos',
  'Alinhamento total ao Currículo Paulista e BNCC',
  'Dossiês literários completos para vestibulares',
  'Atividades de Alta Performance com IA generativa',
  'Exportação otimizada para PDF em formato A4',
  'Isolamento total de dados por usuário (Multi-tenant)',
];

export default function LandingPage() {
  const enterSystem = () => window.location.assign('/professor');

  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)] text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,14%)] via-[hsl(222,47%,8%)] to-[hsl(222,47%,4%)]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(38,92%,50%) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(162,63%,35%) 0%, transparent 40%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(hsl(38,92%,50%) 1px, transparent 1px), linear-gradient(90deg, hsl(38,92%,50%) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <nav className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(38,92%,50%)]">
              <GraduationCap className="h-5 w-5 text-[hsl(222,47%,6%)]" />
            </div>
            <span className="font-bold text-xl tracking-tight">EduCreator <span className="text-[hsl(38,92%,50%)]">Pro</span></span>
          </div>
        </nav>

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-8 border border-white/10">
            <Sparkles className="h-4 w-4 text-[hsl(38,92%,50%)]" />
            <span>Desenvolvida por um professor, para professores</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Crie simulados, provas e aulas<br />
            com <span className="text-[hsl(38,92%,50%)]">inteligência artificial</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto mb-12 leading-relaxed">
            Plataforma completa para professores automatizarem a criação de materiais pedagógicos alinhados ao Currículo Paulista e BNCC. Desenvolvida por um professor — <span className="text-white/80 font-semibold">Matheus Lima Piffer</span>.
          </p>

          {/* Single Premium Entry Button */}
          <Button
            size="lg"
            onClick={enterSystem}
            className="bg-gradient-to-r from-[hsl(38,92%,50%)] to-[hsl(38,72%,45%)] text-[hsl(222,47%,6%)] hover:from-[hsl(38,92%,55%)] hover:to-[hsl(38,72%,50%)] font-bold text-lg px-12 py-7 rounded-2xl shadow-2xl shadow-[hsl(38,92%,50%)]/20 hover:shadow-[hsl(38,92%,50%)]/30 transition-all duration-300 hover:scale-105"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Criar conta grátis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-sm text-white/30 mt-6">Login rápido com Google ou Apple • Professores e Alunos</p>
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
          <p className="text-white/50 max-w-xl mx-auto">Ferramentas completas para professores que buscam alta performance pedagógica</p>
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
                O EduCreator Pro foi desenvolvido para integrar criação de simulados, dossiês literários e atividades de alta performance em uma plataforma única e inteligente.
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
            { step: '1', title: 'Acesse o sistema', desc: 'Login rápido com Google ou Apple. Em segundos você está dentro do ecossistema.' },
            { step: '2', title: 'Crie com IA', desc: 'Gere simulados, dossiês literários e atividades alinhadas à BNCC automaticamente.' },
            { step: '3', title: 'Acompanhe resultados', desc: 'Veja o desempenho e evolução com analytics avançado em tempo real.' },
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
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Transforme sua prática pedagógica</h2>
        <p className="text-white/50 max-w-lg mx-auto mb-8">Professores de todas as redes já usam o EduCreator Pro para resultados extraordinários.</p>
        <Button
          size="lg"
          onClick={enterSystem}
          className="bg-gradient-to-r from-[hsl(38,92%,50%)] to-[hsl(38,72%,45%)] text-[hsl(222,47%,6%)] hover:from-[hsl(38,92%,55%)] hover:to-[hsl(38,72%,50%)] font-bold text-lg px-12 py-7 rounded-2xl shadow-2xl shadow-[hsl(38,92%,50%)]/20"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Criar conta grátis
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
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
