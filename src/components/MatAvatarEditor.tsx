import { useState, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Upload, RotateCcw, Check } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import defaultAvatar from '@/assets/mat-avatar-closeup.png';

interface Props {
  open: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  currentZoom: number;
  onSave: (dataUrl: string, zoom: number) => void;
  onReset: () => void;
}

export default function MatAvatarEditor({ open, onClose, currentAvatar, currentZoom, onSave, onReset }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatar || defaultAvatar);
  const [zoom, setZoom] = useState(currentZoom);
  const [offsetY, setOffsetY] = useState(15);
  const fileRef = useRef<HTMLInputElement>(null);
  const [hasNewImage, setHasNewImage] = useState(false);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      setHasNewImage(true);
      setZoom(130);
      setOffsetY(15);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleConfirm = () => {
    onSave(previewUrl, zoom);
    onClose();
  };

  const handleReset = () => {
    setPreviewUrl(defaultAvatar);
    setZoom(130);
    setOffsetY(15);
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

        {/* Preview Circle */}
        <div className="flex justify-center">
          <div className="w-[140px] h-[140px] rounded-full p-[3px] bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg">
            <div className="w-full h-full rounded-full overflow-hidden bg-background">
              <img
                src={previewUrl}
                alt="Preview"
                className="object-cover"
                style={{
                  width: `${zoom}%`,
                  height: `${zoom}%`,
                  marginLeft: `${-(zoom - 100) / 2}%`,
                  marginTop: `${-((zoom - 100) / 2) + offsetY * (zoom / 200)}%`,
                  objectPosition: `center ${offsetY}%`,
                }}
              />
            </div>
          </div>
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
