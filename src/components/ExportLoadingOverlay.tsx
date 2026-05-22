import { Loader2 } from "lucide-react";

interface ExportLoadingOverlayProps {
  isOpen: boolean;
  message?: string;
}

export function ExportLoadingOverlay({ 
  isOpen, 
  message = "Processando dados e gerando documento... Por favor, aguarde." 
}: ExportLoadingOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card p-8 rounded-xl shadow-2xl border border-border flex flex-col items-center gap-4 max-w-md text-center animate-in fade-in zoom-in duration-300">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">{message}</p>
        <p className="text-sm text-muted-foreground italic">
          Isso pode levar alguns segundos dependendo do tamanho do documento.
        </p>
      </div>
    </div>
  );
}
