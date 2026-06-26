import HubGrid from '@/components/HubGrid';
import { Trophy, ClipboardList, Landmark, Cpu, Globe, BookOpen } from 'lucide-react';

export default function HubAvaliacoes() {
  return (
    <HubGrid
      title="Simulados & Avaliações"
      subtitle="Geração de provas, simulados e banco de questões."
      icon={ClipboardList}
      items={[
        { to: '/alta-performance', icon: Trophy, title: 'Módulo Alta Performance', desc: 'Avaliações de alta performance com IA.', color: 'text-yellow-500' },
        { to: '/simuladores', icon: ClipboardList, title: 'Simuladores Elite', desc: 'Simulados completos para os alunos.', color: 'text-indigo-500' },
        { to: '/vestibulares', icon: Landmark, title: 'Vestibulares & Seleções', desc: 'Provas no estilo dos principais vestibulares.', color: 'text-rose-500' },
        { to: '/tecnicos', icon: Cpu, title: 'Técnicos & Institutos', desc: 'Avaliações para cursos técnicos.', color: 'text-slate-500' },
        { to: '/pisa', icon: Globe, title: 'Simulados PISA', desc: 'Questões no modelo PISA.', color: 'text-cyan-500' },
        { to: '/banco-ia', icon: BookOpen, title: 'Banco de Questões IA', desc: 'Gere e organize questões com IA.', color: 'text-emerald-500' },
      ]}
    />
  );
}
