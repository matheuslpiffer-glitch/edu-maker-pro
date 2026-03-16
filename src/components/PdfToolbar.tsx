import { Button } from '@/components/ui/button';
import { Printer, Download, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PdfToolbarProps {
  filename?: string;
  onSave?: () => void;
  containerId?: string;
}

export default function PdfToolbar({ filename = 'documento', onSave, containerId = 'pdf-preview-container' }: PdfToolbarProps) {
  const { toast } = useToast();

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
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opts: any = {
        margin: [15, 10, 15, 10],
        filename: `${filename}.pdf`,
        pagebreak: { mode: ['css', 'legacy'] },
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdf().set(opts).from(el).save();
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-2 no-print">
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer size={14} className="mr-1" /> Imprimir
      </Button>
      <Button variant="outline" size="sm" onClick={handlePdf}>
        <Download size={14} className="mr-1" /> Gerar PDF
      </Button>
      {onSave && (
        <Button variant="outline" size="sm" onClick={onSave}>
          <Save size={14} className="mr-1" /> Salvar
        </Button>
      )}
    </div>
  );
}
