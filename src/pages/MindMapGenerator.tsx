import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Brain, Sparkles, Palette, FileDown, Save, Accessibility } from 'lucide-react';
import { ALL_DEFAULT_SUBJECTS } from '@/lib/subjects-data';
import { SERIES_CATEGORIAS } from '@/lib/series-data';
import MindMapVisual from '@/components/mindmap/MindMapVisual';
import type { MindMapData } from '@/components/mindmap/MindMapVisual';

function getAutoMode(grade: string): string {
  const iniciais = ['ano_1', 'ano_2', 'ano_3', 'ano_4', 'ano_5', 'bercario', 'maternal_1', 'maternal_2'];
  const finais = ['ano_6', 'ano_7', 'ano_8', 'ano_9'];
  if (iniciais.includes(grade)) return 'infantil';
  if (finais.includes(grade)) return 'fundamental';
  return 'medio';
}

const MODES = [
  { id: 'infantil', label: '🌈 Explorador Mirim', tag: 'Anos Iniciais', desc: 'Circular/nuvem, emojis grandes, cores pastéis, frases curtas' },
  { id: 'fundamental', label: '🔗 Conexão Analítica', tag: 'Fundamental II', desc: 'Ramificado, conectores lógicos, boxes com gatilhos mentais' },
  { id: 'medio', label: '🎓 Síntese Acadêmica', tag: 'Ensino Médio', desc: 'Denso, hierárquico, definições técnicas, interconexões' },
];

export default function MindMapGenerator() {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState('');
  const [mode, setMode] = useState('medio');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [aee, setAee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapData, setMapData] = useState<MindMapData | null>(null);

  const handleGradeChange = (val: string) => {
    setGrade(val);
    setMode(getAutoMode(val));
  };

  const generate = async () => {
    if (!theme.trim()) { toast({ title: 'Informe o tema central', variant: 'destructive' }); return; }
    if (!grade) { toast({ title: 'Selecione a série/ano', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-mind-map', {
        body: { theme: theme.trim(), mode, subject, grade, aee },
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
      const canvas = await html2canvas(mapRef.current, { scale: 3, useCORS: true, backgroundColor: '#0f172a' });
      const link = document.createElement('a');
      link.download = `mapa-mental-${theme.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'PNG exportado em alta definição! 📸' });
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

  const saveToLibrary = async () => {
    if (!mapData) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login para salvar');
      const { error } = await supabase.from('question_banks').insert({
        user_id: user.id,
        subject: subject || 'Mapa Mental',
        topic: theme,
        grade: grade,
        purpose: 'multidisciplinar',
        question_type: 'mind-map',
        institution_name: '',
        questions: mapData as any,
      });
      if (error) throw error;
      toast({ title: 'Mapa salvo na Biblioteca! 📚' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedMode = MODES.find(m => m.id === mode);

  return (
    <div className="space-y-6 pb-12">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Gerador de Mapas Mentais Maker
          </h1>
        </div>
        <p className="text-muted-foreground">Dra. Mapa Mental · Neuroeducação & Visual Thinking por IA</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5" /> Painel de Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tema Central *</Label>
              <Input placeholder="Ex: Revolução Industrial" value={theme} onChange={e => setTheme(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Série/Ano *</Label>
              <Select value={grade} onValueChange={handleGradeChange}>
                <SelectTrigger><SelectValue placeholder="Selecione a série..." /></SelectTrigger>
                <SelectContent>
                  {SERIES_CATEGORIAS.map(cat => (
                    <div key={cat.label}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat.label}</div>
                      {cat.series.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
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
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <Accessibility className="h-5 w-5 text-blue-400" />
              <div>
                <Label className="text-sm font-semibold">Adaptação para Educação Especial (AEE)</Label>
                <p className="text-xs text-muted-foreground">Alto contraste, tipografia para dislexia, ícones ampliados, pistas visuais</p>
              </div>
            </div>
            <Switch checked={aee} onCheckedChange={setAee} />
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

      {mapData && (
        <>
          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" size="sm" onClick={exportImage}>
              <Download className="h-4 w-4 mr-1" /> PNG HD
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={saveToLibrary} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar na Biblioteca
            </Button>
          </div>

          <div
            ref={mapRef}
            className="rounded-2xl p-8 md:p-12 overflow-auto"
            style={{
              background: aee
                ? 'linear-gradient(145deg, #000000 0%, #1a1a2e 50%, #000000 100%)'
                : 'linear-gradient(145deg, #0c1222 0%, #162032 50%, #0f1729 100%)',
              minHeight: 560,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <MindMapVisual data={mapData} mode={mode} aee={aee} />
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Mapas Mentais Maker · Neuroeducação & Visual Thinking por Matheus Lima Piffer
      </p>
    </div>
  );
}
