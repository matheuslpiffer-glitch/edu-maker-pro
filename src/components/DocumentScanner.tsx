import { useRef, useState, useCallback, useEffect } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Camera, RotateCw, Check, X, AlertTriangle, ScanLine, Loader2 } from 'lucide-react';
import {
  clearStoredScannerCapture,
  createPersistableCapture,
  dataUrlToFile,
  getCroppedProcessedImage,
  persistScannerCapture,
  readStoredScannerCapture,
} from '@/lib/document-scanner';

interface DocumentScannerProps {
  onImageReady: (file: File, preview: string) => void;
  disabled?: boolean;
}

const SHARPNESS_THRESHOLD = 200;
const DEFAULT_CROP: Point = { x: 0, y: 0 };

export default function DocumentScanner({ onImageReady, disabled }: DocumentScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [sharpnessWarning, setSharpnessWarning] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [stage, setStage] = useState<'capture' | 'adjust' | 'processed'>('capture');
  const [crop, setCrop] = useState<Point>(DEFAULT_CROP);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    const storedCapture = readStoredScannerCapture();
    if (!storedCapture) return;

    console.log('[DocumentScanner] render:restaurando captura persistida', {
      hasProcessed: Boolean(storedCapture.processedDataUrl),
    });

    setRawPreview(storedCapture.rawDataUrl);
    setRawFile(dataUrlToFile(storedCapture.rawDataUrl, storedCapture.fileName, storedCapture.mimeType));
    setRotation(storedCapture.rotation ?? 0);
    setProcessedPreview(storedCapture.processedDataUrl);
    setStage(storedCapture.processedDataUrl ? 'processed' : 'adjust');
  }, []);

  useEffect(() => {
    if (!rawPreview) return;

    console.log('[DocumentScanner] render:scanner visível', {
      stage,
      hasProcessedPreview: Boolean(processedPreview),
    });

    if (stage === 'capture') {
      setStage(processedPreview ? 'processed' : 'adjust');
    }
  }, [rawPreview, processedPreview, stage]);

  const processCurrentImage = useCallback(async () => {
    if (!rawPreview || !rawFile || !croppedAreaPixels) return;

    setProcessing(true);

    try {
      console.log('[DocumentScanner] processamento:iniciado', {
        rotation,
        cropArea: croppedAreaPixels,
      });

      const { dataUrl, sharpness } = await getCroppedProcessedImage({
        src: rawPreview,
        cropArea: croppedAreaPixels,
        rotation,
        fileName: rawFile.name,
      });

      setProcessedPreview(dataUrl);
      setSharpnessWarning(sharpness < SHARPNESS_THRESHOLD);
      setStage('processed');
      persistScannerCapture({
        rawDataUrl: rawPreview,
        processedDataUrl: dataUrl,
        fileName: rawFile.name,
        mimeType: rawFile.type || 'image/jpeg',
        rotation,
        lastUpdatedAt: Date.now(),
      });

      console.log('[DocumentScanner] processamento:concluído', {
        sharpness,
        hasWarning: sharpness < SHARPNESS_THRESHOLD,
      });
    } catch (error) {
      console.error('[DocumentScanner] processamento:erro', error);
    } finally {
      setProcessing(false);
    }
  }, [croppedAreaPixels, rawFile, rawPreview, rotation]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    console.log('[DocumentScanner] captura:arquivo recebido', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    setProcessing(true);

    try {
      const capture = await createPersistableCapture(file);

      setRawFile(capture.file);
      setRawPreview(capture.dataUrl);
      setProcessedPreview(null);
      setRotation(0);
      setSharpnessWarning(false);
      setCrop(DEFAULT_CROP);
      setZoom(1);
      setStage('adjust');

      persistScannerCapture({
        rawDataUrl: capture.dataUrl,
        processedDataUrl: null,
        fileName: capture.file.name,
        mimeType: capture.file.type || 'image/jpeg',
        rotation: 0,
        lastUpdatedAt: Date.now(),
      });

      console.log('[DocumentScanner] captura:salva e pronta para renderizar');
    } catch (error) {
      console.error('[DocumentScanner] captura:erro ao salvar', error);
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  const handleRotate = () => {
    if (!rawPreview) return;
    const newRot = (rotation + 90) % 360;
    setRotation(newRot);
    setProcessedPreview(null);
    setStage('adjust');

    if (rawFile) {
      persistScannerCapture({
        rawDataUrl: rawPreview,
        processedDataUrl: null,
        fileName: rawFile.name,
        mimeType: rawFile.type || 'image/jpeg',
        rotation: newRot,
        lastUpdatedAt: Date.now(),
      });
    }

    console.log('[DocumentScanner] ajuste:rotação atualizada', { rotation: newRot });
  };

  const handleAccept = () => {
    if (!processedPreview) return;

    const processedFile = dataUrlToFile(
      processedPreview,
      rawFile?.name || `redacao-escaneada-${Date.now()}.jpg`,
      'image/jpeg',
    );

    console.log('[DocumentScanner] aceite:imagem confirmada para correção', {
      name: processedFile.name,
      size: processedFile.size,
    });

    onImageReady(processedFile, processedPreview);
  };

  const handleRetake = useCallback(() => {
    setRawPreview(null);
    setProcessedPreview(null);
    setSharpnessWarning(false);
    setStage('capture');
    setRotation(0);
    setRawFile(null);
    setCrop(DEFAULT_CROP);
    setZoom(1);
    setCroppedAreaPixels(null);
    clearStoredScannerCapture();

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    console.log('[DocumentScanner] captura:reiniciada');
  }, []);

  const handleAdjustAgain = () => {
    setStage('adjust');
    console.log('[DocumentScanner] ajuste:retornando para recorte');
  };

  // CAPTURE stage
  if (stage === 'capture') {
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
          className="relative cursor-pointer rounded-2xl border-2 border-dashed border-primary/40 bg-accent/40 p-4 text-center transition-all hover:border-primary"
        >
          <div className="relative mx-auto flex aspect-[3/4] w-full max-w-xs flex-col items-center justify-center gap-3 rounded-xl border-4 border-dashed border-primary/50 bg-background/70">
            <div className="absolute left-0 top-0 h-6 w-6 rounded-tl-md border-l-4 border-t-4 border-primary" />
            <div className="absolute right-0 top-0 h-6 w-6 rounded-tr-md border-r-4 border-t-4 border-primary" />
            <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-md border-b-4 border-l-4 border-primary" />
            <div className="absolute bottom-0 right-0 h-6 w-6 rounded-br-md border-b-4 border-r-4 border-primary" />

            {processing ? (
              <>
                <Loader2 size={36} className="animate-spin text-primary" />
                <p className="text-sm font-semibold text-primary">SALVANDO CAPTURA...</p>
              </>
            ) : (
              <>
                <ScanLine size={36} className="text-primary" />
                <p className="text-sm font-bold text-foreground">POSICIONE A FOLHA AQUI</p>
                <p className="px-4 text-xs text-muted-foreground">A foto é salva imediatamente no aparelho antes do escaneamento.</p>
                <Camera size={28} className="mt-2 text-primary" />
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Clique ou toque para abrir a câmera traseira</p>
        </div>
      </div>
    );
  }

  if (stage === 'adjust' && rawPreview) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <ScanLine size={14} />
              AJUSTE O ENQUADRAMENTO DA FOLHA
            </span>
            <Button variant="outline" size="sm" onClick={handleRotate} className="h-8 rounded-xl text-xs" disabled={processing}>
              <RotateCw size={12} className="mr-1" /> GIRAR
            </Button>
          </div>

          <div className="relative mx-auto h-[420px] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-muted">
            <Cropper
              image={rawPreview}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={3 / 4}
              showGrid
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
            />

            <div className="pointer-events-none absolute inset-6 rounded-[1.75rem] border-2 border-dashed border-primary/70 shadow-[0_0_0_9999px_hsl(var(--background)/0.38)]" />
            <div className="pointer-events-none absolute left-10 top-10 h-6 w-6 border-l-4 border-t-4 border-primary" />
            <div className="pointer-events-none absolute right-10 top-10 h-6 w-6 border-r-4 border-t-4 border-primary" />
            <div className="pointer-events-none absolute bottom-10 left-10 h-6 w-6 border-b-4 border-l-4 border-primary" />
            <div className="pointer-events-none absolute bottom-10 right-10 h-6 w-6 border-b-4 border-r-4 border-primary" />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>AJUSTE FINO DO RECORTE</span>
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-[hsl(var(--primary))]"
              disabled={processing}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleRetake} className="h-11 rounded-xl text-sm font-bold" disabled={processing}>
              <X size={16} className="mr-1.5" /> TIRAR OUTRA
            </Button>
            <Button onClick={processCurrentImage} className="h-11 rounded-xl text-sm font-bold" disabled={processing || !croppedAreaPixels}>
              {processing ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <ScanLine size={16} className="mr-1.5" />}
              GERAR PREVIEW DO SCANNER
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // PROCESSED stage — show scanned result
  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <ScanLine size={14} />
            IMAGEM ESCANEADA (EFEITO XEROX)
          </span>
          <Button variant="outline" size="sm" onClick={handleAdjustAgain} className="h-8 rounded-xl text-xs" disabled={processing}>
            <RotateCw size={12} className="mr-1" /> AJUSTAR
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

        {sharpnessWarning && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">FOTO DETECTADA COMO POUCO NÍTIDA</p>
              <p>Para uma melhor correção, tente um local mais iluminado e segure firme o celular.</p>
            </div>
          </div>
        )}

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
          <Button onClick={handleAccept} className="h-11 rounded-xl text-sm font-bold" disabled={processing}>
            <Check size={16} className="mr-1.5" />
            USAR ESTA VERSÃO
          </Button>
        </div>
      </div>
    </div>
  );
}
