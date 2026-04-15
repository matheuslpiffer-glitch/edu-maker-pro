import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCw, Check, X, AlertTriangle, ScanLine, Loader2 } from 'lucide-react';

interface DocumentScannerProps {
  onImageReady: (file: File, preview: string) => void;
  disabled?: boolean;
}

/**
 * Applies "xerox" effect: grayscale, high contrast, brightness boost.
 * Returns a processed dataURL and a sharpness score (Laplacian variance).
 */
function processImage(
  img: HTMLImageElement,
  rotation: number
): { dataUrl: string; sharpness: number } {
  const radians = (rotation * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(radians));
  const absSin = Math.abs(Math.sin(radians));
  const w = Math.round(img.width * absCos + img.height * absSin);
  const h = Math.round(img.width * absSin + img.height * absCos);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.translate(w / 2, h / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Grayscale + high contrast + brightness (xerox effect)
  for (let i = 0; i < data.length; i += 4) {
    let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Contrast: stretch around 128
    gray = ((gray - 128) * 1.8) + 128;
    // Brightness boost
    gray += 30;
    // Clamp
    gray = Math.max(0, Math.min(255, gray));
    // Threshold soft: push light grays to white, dark grays to black
    if (gray > 200) gray = 255;
    if (gray < 80) gray = 0;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);

  // Compute sharpness (Laplacian variance on a downscaled version)
  const sharpness = computeSharpness(data, w, h);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return { dataUrl, sharpness };
}

function computeSharpness(data: Uint8ClampedArray, w: number, h: number): number {
  // Laplacian kernel on grayscale
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  const step = 4; // sample every 4th pixel for speed
  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const idx = (y * w + x) * 4;
      const center = data[idx];
      const top = data[((y - 1) * w + x) * 4];
      const bottom = data[((y + 1) * w + x) * 4];
      const left = data[(y * w + (x - 1)) * 4];
      const right = data[(y * w + (x + 1)) * 4];
      const lap = 4 * center - top - bottom - left - right;
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean; // variance
}

const SHARPNESS_THRESHOLD = 200;

export default function DocumentScanner({ onImageReady, disabled }: DocumentScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [sharpnessWarning, setSharpnessWarning] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [stage, setStage] = useState<'capture' | 'processed'>('capture');

  const processCurrentImage = useCallback((src: string, rot: number) => {
    setProcessing(true);
    const img = new Image();
    img.onload = () => {
      const { dataUrl, sharpness } = processImage(img, rot);
      setProcessedPreview(dataUrl);
      setSharpnessWarning(sharpness < SHARPNESS_THRESHOLD);
      setStage('processed');
      setProcessing(false);
    };
    img.src = src;
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setRawFile(file);
    setRotation(0);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setRawPreview(dataUrl);
      processCurrentImage(dataUrl, 0);
    };
    reader.readAsDataURL(file);
  };

  const handleRotate = () => {
    if (!rawPreview) return;
    const newRot = (rotation + 90) % 360;
    setRotation(newRot);
    processCurrentImage(rawPreview, newRot);
  };

  const handleAccept = () => {
    if (!processedPreview || !rawFile) return;
    // Convert processed dataUrl to File
    fetch(processedPreview)
      .then(r => r.blob())
      .then(blob => {
        const processedFile = new File([blob], rawFile.name, { type: 'image/jpeg' });
        onImageReady(processedFile, processedPreview);
      });
  };

  const handleRetake = () => {
    setRawPreview(null);
    setProcessedPreview(null);
    setSharpnessWarning(false);
    setStage('capture');
    setRotation(0);
    setRawFile(null);
  };

  // CAPTURE stage
  if (stage === 'capture' || !processedPreview) {
    return (
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div
          onClick={() => !disabled && !processing && fileInputRef.current?.click()}
          className="relative cursor-pointer rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 p-4 text-center transition-all bg-purple-50/30 dark:bg-purple-950/10"
        >
          {/* Frame overlay illustration */}
          <div className="relative mx-auto w-full max-w-xs aspect-[3/4] rounded-xl border-4 border-dashed border-purple-400/60 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-purple-100/40 to-white/20 dark:from-purple-900/20 dark:to-black/10">
            {/* Corner marks */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-purple-500 rounded-tl-md" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-purple-500 rounded-tr-md" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-purple-500 rounded-bl-md" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-purple-500 rounded-br-md" />

            {processing ? (
              <>
                <Loader2 size={36} className="text-purple-500 animate-spin" />
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-300">PROCESSANDO IMAGEM...</p>
              </>
            ) : (
              <>
                <ScanLine size={36} className="text-purple-400" />
                <p className="font-bold text-sm text-purple-700 dark:text-purple-300">POSICIONE A FOLHA AQUI</p>
                <p className="text-xs text-muted-foreground px-4">Enquadre a redação dentro das marcas. A IA aplicará o efeito scanner automaticamente.</p>
                <Camera size={28} className="text-purple-500 mt-2" />
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Clique ou toque para abrir a câmera</p>
        </div>
      </div>
    );
  }

  // PROCESSED stage — show scanned result
  return (
    <div className="space-y-3">
      {/* Scanned preview */}
      <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <ScanLine size={14} />
            IMAGEM ESCANEADA (EFEITO XEROX)
          </span>
          <Button variant="outline" size="sm" onClick={handleRotate} className="rounded-xl text-xs h-8" disabled={processing}>
            <RotateCw size={12} className="mr-1" /> GIRAR
          </Button>
        </div>

        <div className="relative">
          <img
            src={processedPreview}
            alt="Scanned preview"
            className="max-h-64 mx-auto rounded-xl shadow-lg object-contain"
          />
          {processing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
              <Loader2 size={28} className="text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Sharpness warning */}
        {sharpnessWarning && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">FOTO DETECTADA COMO POUCO NÍTIDA</p>
              <p>Para uma melhor correção, tente um local mais iluminado e segure firme o celular.</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleRetake}
            className="rounded-xl h-11 text-sm font-bold"
            disabled={processing}
          >
            <X size={16} className="mr-1.5" />
            TIRAR OUTRA
          </Button>
          <Button
            onClick={handleAccept}
            className="rounded-xl h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
            disabled={processing}
          >
            <Check size={16} className="mr-1.5" />
            USAR ESTA VERSÃO
          </Button>
        </div>
      </div>
    </div>
  );
}
