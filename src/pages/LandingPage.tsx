import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap, ClipboardCheck, Presentation, ClipboardList, BarChart3,
  ArrowRight, Shield, Sparkles, CheckCircle2, Brain, FileText, Users, BookOpen
} from 'lucide-react';

const features = [
  {
    icon: ClipboardCheck,
    title: 'EduAtas',
    desc: 'Assinaturas digitais em tempo real via WhatsApp. Elimine o papel e ganhe agilidade nas reuniões.',
  },
  {
    icon: Presentation,
    title: 'EduSlides',
    desc: 'Gere roteiros de aula completos com IA, alinhados à BNCC e ao Currículo Paulista.',
  },
  {
    icon: ClipboardList,
    title: 'Simuladores Elite',
    desc: 'Cadernos de prova padrão SARESP, SAEB e Prova Paulista com gabarito automático e QR Code.',
  },
  {
    icon: BarChart3,
    title: 'Analytics MMR',
    desc: 'Mapas de calor, evolução temporal e metas IDESP para decisões pedagógicas baseadas em dados.',
  },
];

const benefits = [
  'Geração de provas e simulados com IA em segundos',
  'Alinhamento total ao Currículo Paulista e BNCC',
  'Exportação otimizada para PDF em formato A4',
  'Isolamento total de dados por usuário (Multi-tenant)',
  'Painel de governança para coordenadores PEI',
  'Assinaturas digitais sem login para professores',
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
            Entrar como Professor
          </Button>
        </nav>

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-8 border border-white/10">
            <Sparkles className="h-4 w-4 text-[hsl(38,92%,50%)]" />
            <span>Plataforma de Governança Pedagógica com IA</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Gestão escolar<br />
            <span className="text-[hsl(38,92%,50%)]">inteligente</span> e integrada
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
            Crie provas, simulados, aulas e gerencie sua escola PEI com inteligência artificial. 
            Tudo alinhado ao Currículo Paulista e à BNCC.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={openTeacherLogin}
              className="bg-[hsl(38,92%,50%)] text-[hsl(222,47%,6%)] hover:bg-[hsl(38,92%,45%)] font-bold text-lg px-10 py-7 rounded-xl"
            >
              <GraduationCap className="mr-2 h-5 w-5" />
              Sou Professor
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={openStudentLogin}
              className="border-[hsl(162,63%,45%)]/50 text-[hsl(162,63%,45%)] hover:bg-[hsl(162,63%,45%)]/10 font-bold text-lg px-10 py-7 rounded-xl"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Sou Aluno
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-white/40 mt-4">Login rápido com Google ou Apple</p>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-[hsl(38,92%,50%)] text-sm font-semibold mb-3">
            <Brain className="h-4 w-4" />
            MÓDULOS INTEGRADOS
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo em um só lugar</h2>
          <p className="text-white/50 max-w-xl mx-auto">Ferramentas completas para coordenadores e professores PEI da SEDUC-SP</p>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Feito para a realidade da escola pública paulista</h2>
              <p className="text-white/50 leading-relaxed">
                O EduCreator Pro foi desenvolvido especificamente para as demandas de coordenadores pedagógicos e professores do Programa de Ensino Integral.
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

      {/* Manual do Professor Preview */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-[hsl(38,92%,50%)] text-sm font-semibold mb-3">
            <FileText className="h-4 w-4" />
            MANUAL DO PROFESSOR
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo o que você precisa para começar</h2>
          <p className="text-white/50 max-w-xl mx-auto">Um guia rápido com passo a passo de cada funcionalidade do EduCreator Pro.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'EduAtas', desc: 'Crie reuniões, adicione professores e gere links de assinatura digital via QR Code.' },
            { step: '2', title: 'EduSlides', desc: 'Selecione o ano, habilidade e tema. A IA gera um roteiro de aula completo em segundos.' },
            { step: '3', title: 'Simuladores', desc: 'Monte cadernos de prova padrão SARESP/SAEB com gabarito automático e exporte em PDF.' },
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
        <p className="text-white/50 max-w-lg mx-auto mb-8">Coordenadores e professores PEI já usam o EduCreator Pro para resultados melhores.</p>
        <Button
          size="lg"
          onClick={() => setShowAuth(true)}
          className="bg-[hsl(38,92%,50%)] text-[hsl(222,47%,6%)] hover:bg-[hsl(38,92%,45%)] font-bold text-lg px-10 py-7 rounded-xl"
        >
          Entrar no Sistema
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/30">
        <div className="flex items-center justify-center gap-2">
          <GraduationCap className="h-4 w-4" />
          <span>EduCreator Pro 2026 — SEDUC-SP / Currículo Paulista</span>
        </div>
      </footer>
    </div>
  );
}
