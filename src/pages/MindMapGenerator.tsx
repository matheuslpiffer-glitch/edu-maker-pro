import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Brain, Sparkles, Palette, FileDown } from 'lucide-react';
import { ALL_DEFAULT_SUBJECTS } from '@/lib/subjects-data';
import MindMapVisual from '@/components/mindmap/MindMapVisual';
import type { MindMapData } from '@/components/mindmap/MindMapVisual';

const MODES = [
  { id: 'infantil', label: 'Nuvem Lúdica', tag: 'Anos Iniciais', desc: 'Figuras grandes, emojis, cores pastéis, resumos de 1 linha' },
  { id: 'fundamental', label: 'Rede de Conhecimento', tag: 'Fundamental II', desc: 'Conectores lógicos, ícones menores, parágrafos curtos' },
  { id: 'medio', label: 'Infográfico Técnico', tag: 'Ensino Médio', desc: 'Layout denso, hierarquia clara, definições técnicas completas' },
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
              <Label>Modelo Visual</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label} — {m.tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedMode && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Palette className="h-4 w-4" />
              <span>Estilo: <strong>{selectedMode.label}</strong> — {selectedMode.desc}</span>
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
              <Download className="h-4 w-4 mr-1" /> PNG
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>

          <div
            ref={mapRef}
            className="rounded-2xl p-8 md:p-12 overflow-auto"
            style={{
              background: 'linear-gradient(145deg, #0c1222 0%, #162032 50%, #0f1729 100%)',
              minHeight: 560,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.5)',
            }}
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
