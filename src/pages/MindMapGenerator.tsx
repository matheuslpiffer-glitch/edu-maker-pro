import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Brain, Sparkles, Palette } from 'lucide-react';
import { ALL_DEFAULT_SUBJECTS } from '@/lib/subjects-data';

interface MindMapChild {
  label: string;
  detail?: string;
}

interface MindMapBranch {
  label: string;
  emoji: string;
  color: string;
  summary: string;
  connector: string;
  children?: MindMapChild[];
}

interface MindMapData {
  center: { label: string; emoji: string };
  branches: MindMapBranch[];
}

const MODES = [
  { id: 'infantil', label: 'Anos Iniciais', tag: 'Nuvem Mágica', desc: 'Lúdico, poucas palavras, ícones grandes' },
  { id: 'fundamental', label: 'Fundamental II', tag: 'Rede de Conhecimento', desc: 'Conectores lógicos, resumos por braço' },
  { id: 'medio', label: 'Ensino Médio', tag: 'Mapa Conceitual', desc: 'Denso, termos técnicos, interdisciplinar' },
];

export default function MindMapGenerator() {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState('');
  const [mode, setMode] = useState('medio');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapData, setMapData] = useState<MindMapData | null>(null);

  const generate = async () => {
    if (!theme.trim()) { toast({ title: 'Informe o tema central', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-mind-map', {
        body: { theme: theme.trim(), mode, subject },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMapData(data);
      toast({ title: 'Mapa mental gerado com sucesso! 🧠' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar mapa', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportImage = async () => {
    if (!mapRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(mapRef.current, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
      const link = document.createElement('a');
      link.download = `mapa-mental-${theme.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'Imagem exportada! 📸' });
    } catch (e: any) {
      toast({ title: 'Erro na exportação', description: e.message, variant: 'destructive' });
    }
  };

  const exportPdf = async () => {
    if (!mapRef.current) return;
    try {
      const { generatePdfFromElement } = await import('@/lib/pdf-utils');
      await generatePdfFromElement(mapRef.current, `mapa-mental-${theme.replace(/\s+/g, '-')}`, { orientation: 'landscape' });
      toast({ title: 'PDF exportado! 📄' });
    } catch (e: any) {
      toast({ title: 'Erro na exportação', description: e.message, variant: 'destructive' });
    }
  };

  const selectedMode = MODES.find(m => m.id === mode);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Gerador de Mapas Mentais Maker
          </h1>
        </div>
        <p className="text-muted-foreground">Transforme qualquer tema em um resumo visual inteligente</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5" /> Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tema Central *</Label>
              <Input placeholder="Ex: Revolução Industrial" value={theme} onChange={e => setTheme(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Disciplina (opcional)</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ALL_DEFAULT_SUBJECTS.map(s => (
                    <SelectItem key={s.name} value={s.name}>{s.icon} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nível de Complexidade</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label} — {m.tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedMode && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Palette className="h-4 w-4" />
              <span>Estilo: <strong>{selectedMode.tag}</strong> — {selectedMode.desc}</span>
            </div>
          )}

          <Button onClick={generate} disabled={loading} className="w-full md:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            {loading ? 'Gerando Mapa Mental...' : 'Gerar Mapa Mental com IA'}
          </Button>
        </CardContent>
      </Card>

      {/* Mind Map Render */}
      {mapData && (
        <>
          <div className="flex gap-2 no-print">
            <Button variant="outline" size="sm" onClick={exportImage}>
              <Download className="h-4 w-4 mr-1" /> Exportar PNG
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <Download className="h-4 w-4 mr-1" /> Exportar PDF
            </Button>
          </div>

          <div
            ref={mapRef}
            className="rounded-2xl p-8 md:p-12 overflow-auto"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: 500 }}
          >
            <MindMapVisual data={mapData} mode={mode} />
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Mapas Mentais Maker · Resumo Visual Inteligente por Matheus Lima Piffer
      </p>
    </div>
  );
}

/* ——— Visual Renderer ——— */

function MindMapVisual({ data, mode }: { data: MindMapData; mode: string }) {
  const branches = data.branches || [];
  const total = branches.length;

  return (
    <div className="relative flex items-center justify-center" style={{ minHeight: 480 }}>
      {/* Center node */}
      <div className="absolute z-20 flex flex-col items-center justify-center rounded-full border-4 border-white/20 shadow-2xl"
        style={{
          width: 160, height: 160,
          background: 'radial-gradient(circle, #6366f1 0%, #4f46e5 100%)',
        }}
      >
        <span className="text-3xl">{data.center.emoji}</span>
        <span className="text-white font-bold text-center text-sm px-3 leading-tight mt-1">{data.center.label}</span>
      </div>

      {/* Branches */}
      {branches.map((branch, i) => {
        const angle = (360 / total) * i - 90;
        const rad = (angle * Math.PI) / 180;
        const radius = mode === 'infantil' ? 220 : 260;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        return (
          <BranchNode key={i} branch={branch} x={x} y={y} angle={angle} mode={mode} />
        );
      })}

      {/* SVG connectors */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
        <g transform={`translate(${0},${0})`} style={{ transform: 'translate(50%, 50%)' }}>
          {branches.map((branch, i) => {
            const angle = (360 / total) * i - 90;
            const rad = (angle * Math.PI) / 180;
            const radius = mode === 'infantil' ? 220 : 260;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            return (
              <line key={i} x1={0} y1={0} x2={x} y2={y}
                stroke={branch.color || '#6366f1'} strokeWidth={2.5} strokeDasharray="6 4" opacity={0.5}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function BranchNode({ branch, x, y, mode }: { branch: MindMapBranch; x: number; y: number; angle: number; mode: string }) {
  const isInfantil = mode === 'infantil';
  const isMedio = mode === 'medio';

  return (
    <div
      className="absolute z-20 flex flex-col items-center"
      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, maxWidth: isInfantil ? 140 : 200 }}
    >
      {/* Connector verb */}
      {branch.connector && !isInfantil && (
        <Badge variant="outline" className="mb-1 text-[10px] border-white/30 text-white/70 bg-white/5">
          {branch.connector}
        </Badge>
      )}

      {/* Node card */}
      <div
        className="rounded-xl p-3 text-center shadow-lg border border-white/10"
        style={{ background: `${branch.color}22`, borderColor: `${branch.color}55` }}
      >
        <span className={isInfantil ? 'text-3xl' : 'text-xl'}>{branch.emoji}</span>
        <p className="text-white font-semibold text-sm mt-1 leading-tight">{branch.label}</p>
        {!isInfantil && branch.summary && (
          <p className="text-white/60 text-[11px] mt-1 leading-snug">{branch.summary}</p>
        )}
      </div>

      {/* Children */}
      {branch.children && branch.children.length > 0 && (isMedio || mode === 'fundamental') && (
        <div className="mt-2 space-y-1">
          {branch.children.map((child, ci) => (
            <div key={ci} className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-center">
              <span className="text-white/90 text-[11px] font-medium">{child.label}</span>
              {child.detail && isMedio && (
                <p className="text-white/50 text-[10px] leading-tight">{child.detail}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
