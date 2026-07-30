import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ruler } from 'lucide-react';
import {
  PDF_MARGIN_PRESETS,
  MIN_MARGIN_MM,
  MAX_MARGIN_MM,
  clampMargin,
  matchPreset,
  presetToMargins,
  usableWidthMm,
  usableHeightMm,
  type PdfMargins,
} from '@/lib/pdf-margins';

interface Props {
  margins: PdfMargins;
  onChange: (m: PdfMargins) => void;
}

const FIELDS: { key: keyof PdfMargins; label: string }[] = [
  { key: 'top', label: 'Superior' },
  { key: 'bottom', label: 'Inferior' },
  { key: 'left', label: 'Esquerda' },
  { key: 'right', label: 'Direita' },
];

export default function PdfMarginControls({ margins, onChange }: Props) {
  const active = matchPreset(margins);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" title="Ajustar margens do PDF">
          <Ruler size={14} /> Margens
          <span className="text-[10px] text-muted-foreground">{usableWidthMm(margins)}mm</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-4" align="end">
        <div>
          <p className="text-sm font-semibold mb-2">Margens do PDF (A4)</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PDF_MARGIN_PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={active === p.id ? 'default' : 'outline'}
                className="text-xs"
                onClick={() => onChange(presetToMargins(p.mm))}
              >
                {p.label}
                <span className="ml-1 opacity-70">{p.mm}mm</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`pdf-margin-${f.key}`} className="text-xs text-muted-foreground">
                {f.label} (mm)
              </Label>
              <Input
                id={`pdf-margin-${f.key}`}
                type="number"
                inputMode="numeric"
                min={MIN_MARGIN_MM}
                max={MAX_MARGIN_MM}
                value={margins[f.key]}
                onChange={(e) =>
                  onChange({ ...margins, [f.key]: clampMargin(Number(e.target.value)) })
                }
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Área útil: {usableWidthMm(margins)} × {usableHeightMm(margins)} mm. Valores entre{' '}
          {MIN_MARGIN_MM} e {MAX_MARGIN_MM} mm.
        </p>
      </PopoverContent>
    </Popover>
  );
}