import HubGrid from '@/components/HubGrid';
import { PenLine, ScanEye, Gem, Camera, Eye, BookText } from 'lucide-react';

export default function HubRedacao() {
  return (
    <HubGrid
      title="Redação"
      subtitle="Todas as ferramentas de escrita e correção num só lugar."
      icon={PenLine}
      items={[
        { to: '/redacao', icon: PenLine, title: 'Redação Elite', desc: 'Gerador de propostas e temas no padrão dos grandes exames.', color: 'text-blue-500' },
        { to: '/redacao/elite', icon: ScanEye, title: 'Super IA de Elite', desc: 'Correção avançada, competência por competência.', color: 'text-purple-500' },
        { to: '/redacao-lab', icon: Gem, title: 'Laboratório de Escrita', desc: 'Prática e reescrita guiada para o aluno evoluir.', color: 'text-emerald-500' },
        { to: '/redacao/corretor', icon: Camera, title: 'Corretor IA de Redação', desc: 'Corrija redações manuscritas a partir de uma foto.', color: 'text-orange-500' },
        { to: '/corretor-visao', icon: Eye, title: 'Corretor de Visão', desc: 'Leitura e correção visual de textos por imagem.', color: 'text-rose-500' },
        { to: '/literatura', icon: BookText, title: 'Dossiê Literário', desc: 'Análises das obras literárias dos vestibulares.', color: 'text-amber-600' },
      ]}
    />
  );
}
