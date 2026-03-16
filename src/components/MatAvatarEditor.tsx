import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Upload, RotateCcw, Check, Move } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import defaultAvatar from '@/assets/mat-avatar-closeup.png';

interface Props {
  open: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  currentZoom: number;
  currentOffsetX: number;
  currentOffsetY: number;
  onSave: (dataUrl: string, zoom: number, offsetX?: number, offsetY?: number) => void;
  onReset: () => void;
}

export default function MatAvatarEditor({ open, onClose, currentAvatar, currentZoom, currentOffsetX, currentOffsetY, onSave, onReset }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatar || defaultAvatar);
  const [zoom, setZoom] = useState(currentZoom);
  const [offsetY, setOffsetY] = useState(currentOffsetY);
  const [offsetX, setOffsetX] = useState(currentOffsetX);
  const fileRef = useRef<HTMLInputElement>(null);
  const [hasNewImage, setHasNewImage] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const circleRef = useRef<HTMLDivElement>(null);

  // Sync state when editor re-opens
  useEffect(() => {
    if (open) {
      setPreviewUrl(currentAvatar || defaultAvatar);
      setZoom(currentZoom);
      setOffsetX(currentOffsetX);
      setOffsetY(currentOffsetY);
      setHasNewImage(false);
    }
  }, [open, currentAvatar, currentZoom, currentOffsetX, currentOffsetY]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offsetX, offsetY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const sensitivity = 0.5;
    const newX = Math.max(0, Math.min(100, dragStart.current.ox - dx * sensitivity));
    const newY = Math.max(0, Math.min(50, dragStart.current.oy - dy * sensitivity));
    setOffsetX(newX);
    setOffsetY(newY);
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      setHasNewImage(true);
      setZoom(130);
      setOffsetY(15);
      setOffsetX(50);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleConfirm = () => {
    onSave(previewUrl, zoom, offsetX, offsetY);
    onClose();
  };

  const handleReset = () => {
    setPreviewUrl(defaultAvatar);
    setZoom(130);
    setOffsetY(15);
    setOffsetX(50);
    setHasNewImage(false);
    onReset();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-[90vw] max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Personalizar Avatar do Mat</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Preview Circle — draggable */}
        <div className="flex flex-col items-center gap-1">
          <div
            ref={circleRef}
            className="w-[140px] h-[140px] rounded-full p-[3px] bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg cursor-grab active:cursor-grabbing touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-background pointer-events-none">
              <img
                src={previewUrl}
                alt="Preview"
                className="object-cover pointer-events-none"
                draggable={false}
                style={{
                  width: `${zoom}%`,
                  height: `${zoom}%`,
                  marginLeft: `${-(zoom - 100) * (offsetX / 100)}%`,
                  marginTop: `${-((zoom - 100) / 2) + offsetY * (zoom / 200)}%`,
                  objectPosition: `${offsetX}% ${offsetY}%`,
                }}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Move className="h-3 w-3" /> Arraste para posicionar</p>
        </div>

        {/* Zoom Control */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={100}
              max={200}
              step={5}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Zoom: {zoom}%</p>
        </div>

        {/* Position Y */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0">↑</span>
            <Slider
              value={[offsetY]}
              onValueChange={([v]) => setOffsetY(v)}
              min={0}
              max={50}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">↓</span>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Posição Vertical</p>
        </div>

        {/* Position X */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0">←</span>
            <Slider
              value={[offsetX]}
              onValueChange={([v]) => setOffsetX(v)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">→</span>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Posição Horizontal</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Trocar Foto
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"
            onClick={handleConfirm}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            OK
          </Button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}
