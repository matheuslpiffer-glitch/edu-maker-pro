import { useState } from 'react';
import { HelpCircle, BookOpen, PenLine, Puzzle, ShieldCheck, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const pillars = [
  {
    icon: BookOpen,
    title: '🚀 Apostilas Técnicas (Matriz SP)',
    items: [
      'Escolha o curso: Logística, ADM, Solda ou Dev. de Sistemas.',
      'A IA gera o Procedimento Operacional Padrão e Checklist de EPI.',
      'Conteúdo segue a matriz técnica industrial.',
    ],
  },
  {
    icon: PenLine,
    title: '✍️ Redação Elite (Lab Online)',
    items: [
      'Gere propostas com temas técnicos e receba um Link/QR Code exclusivo.',
      'Aluno digita online; a IA Doutora corrige por banca (ENEM, FUVEST, VUNESP, UNICAMP).',
      'Valide ou ajuste a nota no seu Dashboard.',
    ],
  },
  {
    icon: Puzzle,
    title: '🎲 Dinâmicas Lúdicas (Fixação)',
    items: [
      'Nuvem de Palavras para revisão de vocabulário técnico.',
      'Caça-Erros Visual para inspeção de qualidade.',
      'Labirinto de Decisão para fluxogramas e lógica.',
      'Saem com bordas pontilhadas para recorte e colagem.',
    ],
  },
  {
    icon: ShieldCheck,
    title: '🔒 Segurança & Persistência',
    items: [
      'LocalStorage salva cada alteração automaticamente.',
      'Sincronização com a nuvem a cada 10 segundos.',
      'Ícone verde no topo confirma que os dados estão seguros.',
    ],
  },
];

export default function HelpFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors no-print"
        aria-label="Ajuda"
      >
        <HelpCircle size={24} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">📘 Guia do Professor — EduCreator Pro</DialogTitle>
            <DialogDescription>Referência rápida dos módulos do sistema.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="px-6 pb-6 max-h-[60vh]">
            <div className="space-y-5 pr-3">
              {pillars.map((p) => (
                <div key={p.title} className="rounded-xl border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p.icon size={18} className="text-primary shrink-0" />
                    <h3 className="font-semibold text-sm">{p.title}</h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                    {p.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
              <MessageCircle size={20} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Suporte Direto</p>
                <p className="text-xs text-muted-foreground">Dúvidas de sistema? Entre em contato com <strong>Matheus Lima Piffer</strong> — Coordenador de Estabilidade.</p>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 pt-0 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
