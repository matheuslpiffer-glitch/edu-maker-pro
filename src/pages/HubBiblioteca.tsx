import HubGrid from '@/components/HubGrid';
import { FileText, Library, Layers } from 'lucide-react';

export default function HubBiblioteca() {
  return (
    <HubGrid
      title="Biblioteca"
      subtitle="Tudo que você já criou, em um só lugar."
      icon={Library}
      items={[
        { to: '/provas', icon: FileText, title: 'Minhas Provas', desc: 'Suas provas salvas.', color: 'text-blue-500' },
        { to: '/minha-biblioteca', icon: Library, title: 'Minha Biblioteca', desc: 'Materiais salvos por você.', color: 'text-emerald-500' },
        { to: '/biblioteca', icon: Library, title: 'Biblioteca de Avaliações', desc: 'Avaliações arquivadas.', color: 'text-indigo-500' },
        { to: '/disciplinas', icon: Layers, title: 'Disciplinas', desc: 'Gerencie suas disciplinas.', color: 'text-amber-600' },
      ]}
    />
  );
}
