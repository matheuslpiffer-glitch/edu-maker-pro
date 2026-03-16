import { BookOpen, Target, Gamepad2, BarChart3, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const sections = [
  {
    icon: Target,
    title: 'Treino de Vestibular',
    desc: 'Acesse quizzes com questões no estilo dos maiores vestibulares do Brasil. Escolha a banca, o tema e treine no seu ritmo.',
  },
  {
    icon: BookOpen,
    title: 'Dossiê Literário',
    desc: 'Explore resumos, análises e contextos das principais obras literárias cobradas nos vestibulares.',
  },
  {
    icon: Gamepad2,
    title: 'Jogos Didáticos',
    desc: 'Aprenda brincando! Jogos interativos que reforçam o conteúdo de forma divertida e eficiente.',
  },
  {
    icon: BarChart3,
    title: 'Meu Desempenho',
    desc: 'Acompanhe sua evolução, veja gráficos de acertos e identifique onde precisa melhorar.',
  },
  {
    icon: Brain,
    title: 'Sistema de XP e Ranking',
    desc: 'Ganhe XP a cada atividade concluída. Suba de nível e conquiste rankings mais altos!',
  },
];

export default function ManualAluno() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-[#0F172A] rounded-[3.5rem] p-8 sm:p-10 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-600/15 to-orange-600/10 pointer-events-none" />
        <div className="relative z-10">
          <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-[10px] uppercase tracking-widest font-bold mb-4">
            Student Edition
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            Manual do Aluno 📚
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-lg">
            Tudo o que você precisa saber para aproveitar ao máximo a plataforma EduCreator Pro no modo aluno.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={i} className="bg-card rounded-[24px] border border-border p-6 flex gap-5 items-start shadow-sm hover:shadow-md transition-all">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/20">
              <s.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-10 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Idealizador e Criador: <span className="text-foreground">Matheus Lima Piffer</span>
        </p>
      </div>
    </div>
  );
}
