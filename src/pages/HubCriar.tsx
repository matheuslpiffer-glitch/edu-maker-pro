import HubGrid from '@/components/HubGrid';
import { Brain, Workflow, Presentation, Puzzle, Dices, Coffee, Camera } from 'lucide-react';

export default function HubCriar() {
  return (
    <HubGrid
      title="Criar Conteúdo"
      subtitle="Ferramentas de criação de material pedagógico."
      icon={Puzzle}
      items={[
        { to: '/mapas-mentais', icon: Brain, title: 'Mapas Mentais Maker', desc: 'Gere mapas mentais de qualquer tema.', color: 'text-violet-500' },
        { to: '/infograficos', icon: Workflow, title: 'Infográficos', desc: 'Crie infográficos passo a passo.', color: 'text-cyan-500' },
        { to: '/eduslides', icon: Presentation, title: 'Aulas & Slides', desc: 'Monte apresentações de aula completas.', color: 'text-orange-500' },
        { to: '/jogos', icon: Puzzle, title: 'Fábrica de Jogos', desc: 'Jogos didáticos para engajar a turma.', color: 'text-pink-500' },
        { to: '/atividade-extra', icon: Dices, title: 'Atividade Extra', desc: 'Atividades rápidas e dinâmicas.', color: 'text-emerald-500' },
        { to: '/pausa-pedagogica', icon: Coffee, title: 'Pausa Pedagógica', desc: 'Dinâmicas de pausa e acolhimento.', color: 'text-amber-600' },
        { to: '/edustudio', icon: Camera, title: 'EduStudio', desc: 'Estúdio de criação visual.', color: 'text-blue-500' },
      ]}
    />
  );
}
