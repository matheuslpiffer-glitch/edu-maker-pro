import { Badge } from '@/components/ui/badge';
import { Heart, Eye, Gem, Sparkles, ExternalLink } from 'lucide-react';

const pilares = [
  {
    icon: Heart,
    title: 'Missão',
    text: 'Democratizar a alta performance acadêmica e a inclusão pedagógica através da Inteligência Artificial, capacitando professores e alunos com ferramentas de elite para os desafios nacionais brasileiros.',
    gradient: 'from-rose-500 to-pink-600',
    shadow: 'shadow-rose-500/20',
  },
  {
    icon: Eye,
    title: 'Visão',
    text: 'Ser a plataforma de referência nacional em tecnologia educacional, reconhecida por transformar a prática pedagógica com inteligência artificial acessível, inclusiva e de alto impacto.',
    gradient: 'from-indigo-500 to-blue-600',
    shadow: 'shadow-indigo-500/20',
  },
  {
    icon: Gem,
    title: 'Valores',
    text: 'Excelência sem exceção. Inovação com propósito. Inclusão como padrão. Autonomia do professor. Acessibilidade real. Tecnologia a serviço da aprendizagem humana.',
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/20',
  },
];

export default function SobreProjeto() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-10">
      {/* Hero */}
      <div className="bg-[#0F172A] rounded-[4rem] p-10 sm:p-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-cyan-600/10 pointer-events-none" />
        <div className="relative z-10">
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] uppercase tracking-widest font-bold mb-6 mx-auto">
            EduCreator Pro 2026
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight max-w-3xl mx-auto">
            Onde a Inteligência Artificial Encontra a Educação Real.
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-6 max-w-xl mx-auto leading-relaxed">
            Uma plataforma brasileira de elite, projetada para professores e alunos que buscam alta performance nos maiores desafios acadêmicos do país.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">Powered by AI</span>
          </div>
        </div>
      </div>

      {/* Pilares */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pilares.map((p, i) => (
          <div key={i} className="bg-card rounded-[2rem] border border-border p-8 flex flex-col items-start gap-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${p.gradient} flex items-center justify-center shadow-lg ${p.shadow}`}>
              <p.icon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-black text-foreground">{p.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
          </div>
        ))}
      </div>

      {/* Manifesto */}
      <div className="bg-[#0F172A] rounded-[4rem] p-10 sm:p-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400 mb-6">Manifesto</p>
          <div className="space-y-5 text-slate-300 text-sm sm:text-base leading-relaxed">
            <p>
              O <strong className="text-white">EduCreator Pro</strong> nasceu da convicção de que a tecnologia de ponta não deve ser privilégio de poucos. Idealizado e criado por <strong className="text-white">Matheus Lima Piffer</strong>, o projeto surgiu da observação direta das necessidades reais de professores brasileiros que enfrentam, diariamente, o desafio de preparar seus alunos para vestibulares, concursos, olimpíadas e, acima de tudo, para a vida.
            </p>
            <p>
              Cada módulo foi desenhado com precisão cirúrgica: dos simulados FUVEST e ENEM à geração de materiais inclusivos para alunos com TEA, TDAH e deficiências intelectuais. Não se trata apenas de gerar questões — trata-se de <strong className="text-white">reinventar a forma como o conteúdo pedagógico é criado, distribuído e vivenciado</strong>.
            </p>
            <p>
              A inteligência artificial aqui não substitui o professor. Ela o potencializa. Ela transforma horas de trabalho em minutos. Ela democratiza o acesso à excelência. Ela garante que nenhum aluno fique para trás.
            </p>
          </div>
        </div>
      </div>

      {/* Link Oficial */}
      <div className="text-center">
        <a
          href="https://educreatorpro.lovable.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-105 transition-all"
        >
          <ExternalLink className="h-4 w-4" />
          educreatorpro.lovable.app
        </a>
      </div>

      {/* Créditos */}
      <div className="text-center py-10 space-y-3">
        <p className="text-2xl text-indigo-400" style={{ fontFamily: "'Dancing Script', cursive" }}>
          Matheus Lima Piffer
        </p>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Idealizador & Criador
        </p>
        <p className="text-xs text-muted-foreground/60 mt-4">
          © {new Date().getFullYear()} EduCreator Pro — Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
