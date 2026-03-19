import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
  role: 'teacher' | 'student';
}

export default function WelcomeModal({ role }: WelcomeModalProps) {
  const storageKey = `educreator_welcome_seen_${role}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setOpen(true);
    }
  }, [storageKey]);

  const handleClose = () => {
    localStorage.setItem(storageKey, 'true');
    setOpen(false);
  };

  const isTeacher = role === 'teacher';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="flex flex-col items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${
            isTeacher
              ? 'bg-gradient-to-br from-[hsl(38,92%,50%)] to-[hsl(38,72%,40%)] shadow-[hsl(38,92%,50%)]/25'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25'
          }`}>
            {isTeacher
              ? <GraduationCap className="h-8 w-8 text-white" />
              : <BookOpen className="h-8 w-8 text-white" />
            }
          </div>
          <DialogTitle className="text-xl font-bold">
            {isTeacher
              ? 'Bem-vindo ao seu Painel Criativo, Professor!'
              : 'Olá! Bem-vindo ao seu Portal de Estudos.'
            }
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {isTeacher
              ? 'Pronto para transformar sua aula hoje? Crie simulados, dossiês e atividades de alta performance com IA.'
              : 'Digite o PIN da sala ou escolha uma atividade abaixo para começar seus estudos.'
            }
          </DialogDescription>
        </DialogHeader>
        <Button
          onClick={handleClose}
          className={`w-full mt-4 font-bold py-5 rounded-xl ${
            isTeacher
              ? 'bg-gradient-to-r from-[hsl(38,92%,50%)] to-[hsl(38,72%,45%)] text-[hsl(222,47%,6%)] hover:from-[hsl(38,92%,55%)] hover:to-[hsl(38,72%,50%)]'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
          }`}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Começar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
