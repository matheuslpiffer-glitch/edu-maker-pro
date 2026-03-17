import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
}

export default function QRCodeModal({ open, onOpenChange, url, title }: QRCodeModalProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);

  const getStudentUrl = () => {
    const origin = url.startsWith('http') ? '' : (
      window.location.hostname.includes('lovableproject.com')
        ? 'https://edu-maker-pro.lovable.app'
        : window.location.origin
    );
    return url.startsWith('http') ? url : `${origin}${url}`;
  };

  const fullUrl = getStudentUrl();

  const handleDownload = () => {
    const svg = canvasRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement('a');
      link.download = `qrcode-${title?.replace(/\s+/g, '-') || 'atividade'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'QR Code baixado com sucesso!' });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopy = async () => {
    const svg = canvasRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = async () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      try {
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), 'image/png')
        );
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast({ title: 'QR Code copiado!', description: 'Cole em documentos Word, Slides, etc.' });
      } catch {
        await navigator.clipboard.writeText(fullUrl);
        toast({ title: 'Link copiado para a área de transferência.' });
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <QrCode size={20} className="text-primary" />
            QR Code de Acesso
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {title && (
            <p className="text-sm font-semibold text-foreground text-center">{title}</p>
          )}

          <div ref={canvasRef} className="rounded-xl border-2 border-border bg-white p-4">
            <QRCodeSVG value={fullUrl} size={220} level="M" includeMargin={false} />
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-tight max-w-[260px]">
            Acesse a versão digital por aqui — sem login, sem atrito.
          </p>

          <div className="flex gap-2 w-full">
            <Button onClick={handleDownload} variant="outline" className="flex-1 gap-1.5">
              <Download size={14} /> Baixar PNG
            </Button>
            <Button onClick={handleCopy} variant="outline" className="flex-1 gap-1.5">
              <Copy size={14} /> Copiar Imagem
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/70 italic text-center">
            EduCreator Pro | Professor Matheus Lima Piffer
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
