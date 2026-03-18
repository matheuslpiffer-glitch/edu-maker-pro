import { Button } from '@/components/ui/button';
import { Printer, Download, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { generatePdfFromElement } from '@/lib/pdf-utils';

interface PdfToolbarProps {
  filename?: string;
  onSave?: () => void;
  containerId?: string;
}

export default function PdfToolbar({ filename = 'documento', onSave, containerId = 'pdf-preview-container' }: PdfToolbarProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handlePrint = () => {
    document.body.classList.add('print-mode');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('print-mode');
    }, 100);
  };

  const handlePdf = async () => {
    const el = document.getElementById(containerId);
    if (!el) {
      toast({ title: 'Container não encontrado', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      await generatePdfFromElement(el, filename);
      toast({ title: 'PDF gerado com sucesso! ✅', description: 'Verificado por Matheus Lima Piffer.' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 no-print">
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer size={14} className="mr-1" /> Imprimir
      </Button>
      <Button variant="outline" size="sm" onClick={handlePdf} disabled={generating}>
        {generating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
        {generating ? 'Gerando...' : 'Gerar PDF'}
      </Button>
      {onSave && (
        <Button variant="outline" size="sm" onClick={onSave}>
          <Save size={14} className="mr-1" /> Salvar
        </Button>
      )}
    </div>
  );
}
