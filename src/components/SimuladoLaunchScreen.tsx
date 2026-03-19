import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Users, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { buildPublicAppUrl } from '@/lib/public-links';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SimuladoLaunchScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessCode: string;
  title: string;
  bankId: string;
  onStart?: () => void;
}

export default function SimuladoLaunchScreen({
  open,
  onOpenChange,
  accessCode,
  title,
  bankId,
  onStart,
}: SimuladoLaunchScreenProps) {
  const { toast } = useToast();
  const [connectedCount, setConnectedCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [started, setStarted] = useState(false);

  const shortUrl = buildPublicAppUrl(`/s/${accessCode}`);
  const formattedCode = accessCode
    ? `${accessCode.slice(0, 3)} ${accessCode.slice(3)}`
    : '';

  // Poll for connected students (count results for this bank)
  useEffect(() => {
    if (!open || !bankId) return;

    const poll = async () => {
      const { count } = await supabase
        .from('student_activity_results')
        .select('*', { count: 'exact', head: true })
        .eq('bank_id', bankId);
      setConnectedCount(count || 0);
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [open, bankId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleStart = () => {
    setStarted(true);
    onStart?.();
    toast({ title: '🚀 Simulado iniciado!', description: 'Os alunos já podem começar a responder.' });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    toast({ title: 'PIN copiado!' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] p-0 border-0 bg-transparent shadow-none [&>button]:hidden rounded-none">
        <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(220,60%,8%)] via-[hsl(220,50%,12%)] to-[hsl(220,40%,18%)] p-8 md:p-12 text-white h-[100vh] w-full flex flex-col items-center justify-center">
          {/* Gold accent overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(45,90%,55%,0.08),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(45,80%,50%,0.05),transparent_60%)]" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          {/* Header */}
          <div className="relative text-center space-y-2 mb-8">
            <p className="text-amber-400/80 text-sm font-semibold tracking-[0.3em] uppercase">
              EduCreator Pro
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              Simulado Pronto para Lançamento!
            </h1>
            <p className="text-white/60 text-sm md:text-base">{title}</p>
          </div>

          {/* Main content */}
          <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-8 w-full max-w-3xl">
            {/* PIN Section */}
            <div className="flex-1 text-center space-y-4">
              <p className="text-white/50 text-sm font-semibold tracking-wider uppercase">
                Digite o PIN para Entrar:
              </p>
              <button
                onClick={handleCopyCode}
                className="group relative inline-block cursor-pointer"
                title="Clique para copiar"
              >
                <span className="text-6xl md:text-8xl font-mono font-black tracking-[0.2em] bg-gradient-to-b from-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(245,200,66,0.3)] group-hover:drop-shadow-[0_0_40px_rgba(245,200,66,0.5)] transition-all">
                  {formattedCode}
                </span>
                <Copy
                  size={16}
                  className="absolute -top-2 -right-6 text-white/30 group-hover:text-white/70 transition-colors"
                />
              </button>
              <p className="text-white/40 text-xs">Clique no PIN para copiar</p>
            </div>

            {/* Divider */}
            <div className="hidden md:flex flex-col items-center gap-2 text-white/20">
              <div className="w-px h-12 bg-white/10" />
              <span className="text-xs font-semibold">OU</span>
              <div className="w-px h-12 bg-white/10" />
            </div>
            <div className="md:hidden flex items-center gap-3 w-full max-w-xs">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30 font-semibold">OU</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* QR Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-[0_0_60px_rgba(245,200,66,0.15)]">
                <QRCodeSVG value={shortUrl} size={180} level="M" includeMargin={false} />
              </div>
              <p className="text-white/40 text-xs text-center max-w-[200px]">
                Aponte a câmera do celular
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-4 max-w-2xl w-full mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/70">
              <div className="flex items-start gap-2">
                <span className="text-lg">1️⃣</span>
                <span>Aponte a câmera para o <strong className="text-amber-400">QR Code</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">2️⃣</span>
                <span>
                  Acesse <strong className="text-amber-400">educreatorpro.com</strong> e digite o PIN
                </span>
              </div>
            </div>
          </div>

          {/* Connected students counter + Start button */}
          <div className="relative flex flex-col sm:flex-row items-center gap-4 w-full max-w-xl">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-white/10 flex-1 justify-center">
              <Users size={20} className="text-amber-400" />
              <span className="text-white/60 text-sm font-medium">Alunos Conectados:</span>
              <span
                className="text-2xl font-black text-amber-400 tabular-nums transition-all duration-500"
                key={connectedCount}
              >
                {connectedCount}
              </span>
            </div>

            <Button
              size="lg"
              onClick={handleStart}
              disabled={started}
              className="gap-2 px-8 h-14 text-base font-bold rounded-xl text-gray-900 border-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
              style={{
                background: started
                  ? 'linear-gradient(135deg, #6B7280, #9CA3AF)'
                  : 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7)',
              }}
            >
              {started ? (
                '✅ Simulado em Andamento'
              ) : (
                <>
                  <Play size={18} /> Iniciar Simulado
                </>
              )}
            </Button>
          </div>

          {/* Footer */}
          <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-white/20 tracking-wide">
            EduCreator Pro | Sistema de Lançamento de Elite por Matheus Lima Piffer
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
