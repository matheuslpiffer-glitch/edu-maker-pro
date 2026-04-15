import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, Loader2, Printer, RotateCw, Sparkles, AlertTriangle, Trophy, TrendingUp, Star, BookOpen, Target, Clock, Lightbulb, CheckCircle2, Share2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

interface ScoreItem {
  criteria: string;
  score: number;
  max: number;
}

interface InterventionPlan {
  biggest_gap: string;
  gap_explanation: string;
  activities: { title: string; description: string; duration: string }[];
  theory_snippet: string;
}

interface EliteResult {
  scores: ScoreItem[];
  total_score: number;
  max_total: number;
  strengths: string[];
  improvements: string[];
  feedback_aluno: string;
  feedback_professor: string;
  transcribed_text: string;
  legibility: string;
  paragraph_count?: number;
  estimated_word_count?: number;
  transcription_notes?: string;
  level: string;
  subLevel?: string;
}

const LEVELS = [
  { value: 'anos_iniciais', label: 'ANOS INICIAIS (1º AO 5º ANO)', desc: 'Alfabetização, ortografia básica, estrutura de frase' },
  { value: 'anos_finais', label: 'ANOS FINAIS (6º AO 9º ANO)', desc: 'Coesão, pontuação, desenvolvimento do tema' },
  { value: 'ensino_medio', label: 'ENSINO MÉDIO (BANCAS)', desc: 'Correção técnica por banca de vestibular' },
];

const SUB_LEVELS = [
  { value: 'enem', label: 'ENEM — 5 COMPETÊNCIAS' },
  { value: 'vunesp', label: 'VUNESP — ESTRUTURA DISSERTATIVA' },
  { value: 'fuvest', label: 'FUVEST — ARGUMENTAÇÃO FILOSÓFICA' },
];

const LOADING_PHASES = [
  '📷 COMPRIMINDO IMAGEM...',
  '🔍 DECIFRANDO CALIGRAFIA COM IA DE ELITE...',
  '📝 TRANSCREVENDO MANUSCRITO...',
  '🎯 APLICANDO CORREÇÃO DINÂMICA...',
  '💡 GERANDO FEEDBACK PERSONALIZADO...',
];

async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas não suportado'));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      if (base64.length > 1_400_000) {
        const d2 = canvas.toDataURL('image/jpeg', 0.4);
        resolve({ base64: d2.split(',')[1], mimeType: 'image/jpeg' });
      } else {
        resolve({ base64, mimeType: 'image/jpeg' });
      }
    };
    img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
}

function ScoreBar({ item }: { item: ScoreItem }) {
  const pct = (item.score / item.max) * 100;
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">{item.criteria}</span>
        <span className="font-bold">{item.score}/{item.max}</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

async function generateElitePDF(
  result: EliteResult,
  plan: InterventionPlan | null,
  studentName: string,
  levelLabel: string,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const now = new Date().toLocaleString('pt-BR');
  let y = 0;

  function addWatermark() {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.setFontSize(52);
    doc.setTextColor(128, 128, 128);
    doc.text('PIFFER EDUTECH', W / 2, H / 2, { angle: 45, align: 'center' });
    doc.restoreGraphicsState();
  }

  function addHeaderFooter(page: number, total: number) {
    // Header line
    doc.setDrawColor(180, 160, 220);
    doc.setLineWidth(0.5);
    doc.line(15, 14, W - 15, 14);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Produzido por Piffer EduTech', W - 15, 11, { align: 'right' });

    // Footer
    doc.setDrawColor(180, 160, 220);
    doc.line(15, H - 14, W - 15, H - 14);
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text(`Página ${page} de ${total}`, 15, H - 9);
    doc.text(`Processado em: ${now}`, W - 15, H - 9, { align: 'right' });
    doc.text('MATHEUS PIFFER — INOVAÇÃO & ESTRATÉGIA PEDAGÓGICA', W / 2, H - 9, { align: 'center' });
  }

  function checkPage(needed: number) {
    if (y + needed > H - 25) {
      doc.addPage();
      addWatermark();
      y = 22;
    }
  }

  // === PAGE 1 ===
  addWatermark();
  y = 22;

  // Title block
  doc.setFillColor(88, 55, 180);
  doc.roundedRect(15, y, W - 30, 18, 3, 3, 'F');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('RELATÓRIO DE CORREÇÃO — SUPER IA DE ELITE', W / 2, y + 12, { align: 'center' });
  y += 24;

  // Student info
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Aluno: ${studentName || '___________________________'}`, 15, y);
  doc.text(`Turma: ___________`, W / 2 + 10, y);
  y += 6;
  doc.text(`Nível: ${levelLabel}`, 15, y);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, W / 2 + 10, y);
  y += 10;

  // Score badge
  const pctScore = Math.round((result.total_score / result.max_total) * 100);
  doc.setFillColor(pctScore >= 70 ? 34 : pctScore >= 50 ? 200 : 220, pctScore >= 70 ? 170 : pctScore >= 50 ? 160 : 60, pctScore >= 70 ? 80 : pctScore >= 50 ? 30 : 30);
  doc.roundedRect(W / 2 - 25, y, 50, 20, 4, 4, 'F');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(`${result.total_score}/${result.max_total}`, W / 2, y + 14, { align: 'center' });
  y += 26;

  // Score table
  doc.setFontSize(11);
  doc.setTextColor(88, 55, 180);
  doc.text('TABELA DE NOTAS POR CRITÉRIO', 15, y);
  y += 4;

  const tableBody = result.scores.map(s => {
    const p = Math.round((s.score / s.max) * 100);
    return [s.criteria, `${s.score}`, `${s.max}`, `${p}%`];
  });

  (doc as any).autoTable({
    startY: y,
    head: [['Critério', 'Nota', 'Máx', '%']],
    body: tableBody,
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [88, 55, 180], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 240, 255] },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Strengths
  if (result.strengths?.length) {
    checkPage(30);
    doc.setFontSize(11);
    doc.setTextColor(16, 140, 80);
    doc.text('✅ PONTOS FORTES', 15, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    result.strengths.forEach(s => {
      checkPage(8);
      const lines = doc.splitTextToSize(`• ${s}`, W - 35);
      doc.text(lines, 18, y);
      y += lines.length * 4.5;
    });
    y += 4;
  }

  // Improvements
  if (result.improvements?.length) {
    checkPage(30);
    doc.setFontSize(11);
    doc.setTextColor(200, 120, 0);
    doc.text('📝 O QUE MELHORAR', 15, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    result.improvements.forEach(s => {
      checkPage(8);
      const lines = doc.splitTextToSize(`• ${s}`, W - 35);
      doc.text(lines, 18, y);
      y += lines.length * 4.5;
    });
    y += 4;
  }

  // Feedback aluno
  if (result.feedback_aluno) {
    checkPage(20);
    doc.setFontSize(11);
    doc.setTextColor(88, 55, 180);
    doc.text('💬 FEEDBACK PARA O ALUNO', 15, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const fbLines = doc.splitTextToSize(result.feedback_aluno, W - 35);
    fbLines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, 18, y);
      y += 4.5;
    });
    y += 4;
  }

  // Feedback professor
  if (result.feedback_professor) {
    checkPage(20);
    doc.setFontSize(11);
    doc.setTextColor(88, 55, 180);
    doc.text('🎓 OBSERVAÇÕES PARA O PROFESSOR', 15, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const fpLines = doc.splitTextToSize(result.feedback_professor, W - 35);
    fpLines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, 18, y);
      y += 4.5;
    });
    y += 4;
  }

  // Transcription
  checkPage(25);
  doc.setFontSize(11);
  doc.setTextColor(88, 55, 180);
  doc.text('📝 TRANSCRIÇÃO DA CALIGRAFIA (IA)', 15, y);
  y += 2;
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text(`Legibilidade: ${result.legibility || 'N/A'} · ${result.estimated_word_count || '?'} palavras · ${result.paragraph_count || '?'} parágrafos`, 15, y + 4);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const txLines = doc.splitTextToSize(result.transcribed_text || '', W - 35);
  txLines.forEach((line: string) => {
    checkPage(5);
    doc.text(line, 18, y);
    y += 4.5;
  });
  y += 6;

  // Intervention Plan
  if (plan) {
    checkPage(30);
    doc.setFillColor(255, 240, 220);
    doc.roundedRect(15, y - 2, W - 30, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(180, 90, 0);
    doc.text('🎯 PLANO DE AÇÃO PARA O ALUNO', W / 2, y + 6, { align: 'center' });
    y += 16;

    // Gap
    doc.setFontSize(9);
    doc.setTextColor(180, 40, 40);
    doc.text(`Maior Lacuna: ${plan.biggest_gap}`, 15, y);
    y += 5;
    doc.setTextColor(60, 60, 60);
    const gapLines = doc.splitTextToSize(plan.gap_explanation, W - 35);
    doc.text(gapLines, 18, y);
    y += gapLines.length * 4.5 + 4;

    // Activities table
    (doc as any).autoTable({
      startY: y,
      head: [['#', 'Atividade', 'Descrição', 'Duração']],
      body: plan.activities.map((a, i) => [`${i + 1}`, a.title, a.description, a.duration]),
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [200, 120, 0], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8 }, 3: { cellWidth: 18 } },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Theory
    checkPage(20);
    doc.setFontSize(9);
    doc.setTextColor(60, 40, 120);
    doc.text('💡 Explicação Teórica:', 15, y);
    y += 5;
    doc.setTextColor(40, 40, 40);
    const thLines = doc.splitTextToSize(plan.theory_snippet, W - 35);
    thLines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, 18, y);
      y += 4.5;
    });
  }

  // Apply headers, footers & watermarks to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeaderFooter(i, totalPages);
  }

  doc.save(`relatorio_elite_${(studentName || 'aluno').replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.pdf`);
}

export default function EssayEliteCorrector() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [level, setLevel] = useState('');
  const [subLevel, setSubLevel] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [result, setResult] = useState<EliteResult | null>(null);
  const [interventionPlan, setInterventionPlan] = useState<InterventionPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast({ title: 'Formato inválido', description: 'Envie uma foto (JPG, PNG).', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setRotation(0);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null);
    setInterventionPlan(null);
  };

  const canCorrect = imageFile && level && (level !== 'ensino_medio' || subLevel);

  const handleCorrect = async () => {
    if (!canCorrect || !user) return;
    setLoading(true);
    setLoadingPhase(0);
    setResult(null);
    setInterventionPlan(null);

    const timer = setInterval(() => setLoadingPhase(p => Math.min(p + 1, LOADING_PHASES.length - 1)), 5000);

    try {
      const { base64, mimeType } = await compressImage(imageFile!);
      setLoadingPhase(1);

      const { data, error } = await supabase.functions.invoke('correct-essay-elite', {
        body: {
          imageBase64: base64,
          mimeType,
          level: level === 'ensino_medio' ? 'ensino_medio' : level,
          subLevel: level === 'ensino_medio' ? subLevel : undefined,
        },
      });

      clearInterval(timer);

      if (error) throw error;
      if (data?.error) {
        if ((data.error as string).includes('ilegível') || (data.error as string).includes('escura')) {
          toast({ title: '📷 FOTO ILEGÍVEL', description: data.error, variant: 'destructive' });
          setLoading(false);
          return;
        }
        throw new Error(data.error);
      }

      setResult(data as EliteResult);
      toast({ title: '✅ CORREÇÃO DE ELITE CONCLUÍDA!' });

      // Save to DB
      const filePath = `${user.id}/${Date.now()}_elite_${imageFile!.name}`;
      const { data: uploadData } = await supabase.storage.from('essay-images').upload(filePath, imageFile!);
      const imageUrl = uploadData?.path ? supabase.storage.from('essay-images').getPublicUrl(uploadData.path).data.publicUrl : '';

      await supabase.from('essay_corrections').insert({
        user_id: user.id,
        image_url: imageUrl,
        extracted_text: data.transcribed_text || '',
        comp1_score: data.scores?.[0]?.score || 0,
        comp2_score: data.scores?.[1]?.score || 0,
        comp3_score: data.scores?.[2]?.score || 0,
        comp4_score: data.scores?.[3]?.score || 0,
        comp5_score: data.scores?.[4]?.score || 0,
        total_score: data.total_score || 0,
        comp1_justification: data.scores?.[0]?.criteria || '',
        comp2_justification: data.scores?.[1]?.criteria || '',
        comp3_justification: data.scores?.[2]?.criteria || '',
        comp4_justification: data.scores?.[3]?.criteria || '',
        comp5_justification: data.scores?.[4]?.criteria || '',
        golden_tips: [...(data.strengths || []), ...(data.improvements || [])] as any,
        student_name: studentName,
      });
    } catch (e: any) {
      clearInterval(timer);
      toast({ title: 'Erro na correção', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!result || !user) return;
    setLoadingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke('correct-essay-elite', {
        body: {
          generatePlan: true,
          level: result.level,
          subLevel: result.subLevel,
          correctionData: {
            scores: result.scores,
            total_score: result.total_score,
            max_total: result.max_total,
            strengths: result.strengths,
            improvements: result.improvements,
            transcribed_text: result.transcribed_text,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInterventionPlan(data as InterventionPlan);
      toast({ title: '📋 PLANO DE INTERVENÇÃO GERADO!' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar plano', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSharePlan = () => {
    if (!interventionPlan) return;
    const text = `📋 PLANO DE AÇÃO PARA O ALUNO${studentName ? ` — ${studentName}` : ''}\n\n🔍 MAIOR LACUNA: ${interventionPlan.biggest_gap}\n${interventionPlan.gap_explanation}\n\n📝 ATIVIDADES:\n${interventionPlan.activities.map((a, i) => `${i + 1}. ${a.title} (${a.duration})\n   ${a.description}`).join('\n\n')}\n\n💡 TEORIA:\n${interventionPlan.theory_snippet}\n\n— SUPER IA DE ELITE`;

    if (navigator.share) {
      navigator.share({ title: 'Plano de Intervenção', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Copiado!', description: 'Plano copiado para a área de transferência.' });
    }
  };

  const levelLabel = level === 'ensino_medio'
    ? SUB_LEVELS.find(s => s.value === subLevel)?.label || 'ENSINO MÉDIO'
    : LEVELS.find(l => l.value === level)?.label || '';

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-800 p-8 text-white shadow-2xl shadow-purple-500/30">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/redacao')} className="text-white/80 hover:text-white hover:bg-white/10">
              <ArrowLeft size={18} />
            </Button>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles size={24} className="text-yellow-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">SUPER IA DE ELITE</h1>
              <p className="text-white/60 text-sm">Motor de visão ultra-robusto com correção dinâmica por nível</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Config + Upload */}
        <div className="space-y-4">
          {/* Level selector */}
          <Card className="rounded-2xl shadow-lg border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen size={16} className="text-purple-500" />
                NÍVEL DE APRENDIZAGEM
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={level} onValueChange={(v) => { setLevel(v); setSubLevel(''); setResult(null); setInterventionPlan(null); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione o nível..." />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => (
                    <SelectItem key={l.value} value={l.value}>
                      <div>
                        <div className="font-semibold text-sm">{l.label}</div>
                        <div className="text-xs text-muted-foreground">{l.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {level === 'ensino_medio' && (
                <Select value={subLevel} onValueChange={setSubLevel}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione a banca..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_LEVELS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">NOME DO ALUNO (OPCIONAL)</Label>
                <Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Ex: João Silva" className="rounded-xl" />
              </div>
            </CardContent>
          </Card>

          {/* Upload */}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
          <div
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
              imagePreview ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-950/10'
            }`}
          >
            {imagePreview ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setRotation(r => (r + 90) % 360); }} className="rounded-xl">
                    <RotateCw size={14} className="mr-1" /> GIRAR
                  </Button>
                </div>
                <img src={imagePreview} alt="Preview" className="max-h-60 mx-auto rounded-xl shadow-lg object-contain transition-transform" style={{ transform: `rotate(${rotation}deg)` }} />
                <p className="text-xs text-emerald-600">✅ Foto carregada — clique para trocar</p>
              </div>
            ) : (
              <div className="py-6 space-y-3">
                <Camera size={36} className="mx-auto text-purple-400" />
                <p className="font-semibold text-foreground">ARRASTE A FOTO DA REDAÇÃO AQUI</p>
                <p className="text-xs text-muted-foreground">ou clique para selecionar / tirar foto</p>
              </div>
            )}
          </div>

          {imagePreview && !loading && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Certifique-se de que a foto está nítida, bem iluminada e sem sombras.</span>
            </div>
          )}

          <Button
            onClick={handleCorrect}
            disabled={loading || !canCorrect}
            className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-xl shadow-purple-500/25 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={20} />
                {LOADING_PHASES[loadingPhase]}
              </>
            ) : (
              <>
                <Sparkles className="mr-2" size={20} />
                ✨ CORREÇÃO DE ELITE COM IA
              </>
            )}
          </Button>

          {loading && (
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-1000" style={{ width: `${((loadingPhase + 1) / LOADING_PHASES.length) * 100}%` }} />
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {!result && !loading && (
            <Card className="rounded-2xl border-dashed h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center py-12">
                <Sparkles size={48} className="mx-auto text-purple-300 mb-4" />
                <p className="font-semibold text-foreground">SUPER IA DE ELITE</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">Selecione o nível, envie a foto e a IA fará a transcrição paleográfica + correção dinâmica</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <div className="space-y-4">
              {/* IA Processada com Sucesso Badge */}
              <div className="flex items-center justify-center gap-2 py-2">
                <Badge className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  IA PROCESSADA COM SUCESSO — LEITURA PROFUNDA
                </Badge>
              </div>

              {/* Level badge + Score */}
              <Card className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800 shadow-lg">
                <CardContent className="pt-6 text-center space-y-2">
                  <Badge className="bg-purple-600 text-white text-xs">{levelLabel}</Badge>
                  <div className="text-5xl font-black text-purple-700 dark:text-purple-300">{result.total_score}/{result.max_total}</div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    {Math.round((result.total_score / result.max_total) * 100)}% DE ACERTO
                  </p>
                  {result.estimated_word_count && (
                    <p className="text-xs text-muted-foreground">{result.estimated_word_count} palavras · {result.paragraph_count || '?'} parágrafos</p>
                  )}
                </CardContent>
              </Card>

              {/* Generate Intervention Plan Button */}
              {!interventionPlan && (
                <Button
                  onClick={handleGeneratePlan}
                  disabled={loadingPlan}
                  className="w-full h-12 rounded-2xl text-sm font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25"
                >
                  {loadingPlan ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      GERANDO PLANO DE INTERVENÇÃO...
                    </>
                  ) : (
                    <>
                      <Target className="mr-2" size={18} />
                      🎯 GERAR PLANO DE INTERVENÇÃO
                    </>
                  )}
                </Button>
              )}

              {/* Intervention Plan Card */}
              {interventionPlan && (
                <Card className="rounded-2xl border-2 border-orange-300 dark:border-orange-700 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 shadow-xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-300">
                        <Target size={16} />
                        📋 PLANO DE AÇÃO PARA O ALUNO
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={handleSharePlan} className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl">
                        <Share2 size={14} className="mr-1" /> COMPARTILHAR
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Biggest Gap */}
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                      <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-1 flex items-center gap-1.5">
                        <AlertTriangle size={12} /> MAIOR LACUNA IDENTIFICADA
                      </p>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200">{interventionPlan.biggest_gap}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{interventionPlan.gap_explanation}</p>
                    </div>

                    {/* Activities */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                        📝 3 ATIVIDADES PRÁTICAS IMEDIATAS
                      </p>
                      {interventionPlan.activities.map((activity, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white dark:bg-background/50 border border-orange-200 dark:border-orange-800 shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                              {activity.title}
                            </p>
                            <Badge variant="outline" className="text-xs shrink-0 flex items-center gap-1">
                              <Clock size={10} /> {activity.duration}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6.5 leading-relaxed">{activity.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* Theory Snippet */}
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
                        <Lightbulb size={12} /> EXPLICAÇÃO TEÓRICA PERSONALIZADA
                      </p>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed whitespace-pre-wrap">{interventionPlan.theory_snippet}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Scores table */}
              <Card className="rounded-2xl shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star size={16} className="text-purple-500" />
                    TABELA DE NOTAS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.scores.map((item, i) => <ScoreBar key={i} item={item} />)}
                </CardContent>
              </Card>

              {/* Strengths */}
              {result.strengths?.length > 0 && (
                <Card className="rounded-2xl border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <Trophy size={16} /> PONTOS FORTES
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                          <span className="shrink-0">✅</span><span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Improvements */}
              {result.improvements?.length > 0 && (
                <Card className="rounded-2xl border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <TrendingUp size={16} /> O QUE MELHORAR
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.improvements.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                          <span className="shrink-0">📝</span><span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Feedback for student */}
              {result.feedback_aluno && (
                <Card className="rounded-2xl shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">💬 FEEDBACK PARA O ALUNO</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{result.feedback_aluno}</p>
                  </CardContent>
                </Card>
              )}

              {/* Feedback for teacher */}
              {result.feedback_professor && (
                <Card className="rounded-2xl shadow-lg border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">🎓 OBSERVAÇÕES PARA O PROFESSOR</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{result.feedback_professor}</p>
                  </CardContent>
                </Card>
              )}

              {/* Transcribed text + original image side by side */}
              <Card className="rounded-2xl shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">📝 TEXTO TRANSCRITO vs ORIGINAL</CardTitle>
                  {result.legibility === 'baixa' && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-600">
                      <AlertTriangle size={12} />
                      <span>Caligrafia de baixa legibilidade — verifique a transcrição</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">TRANSCRIÇÃO IA</p>
                      <div className="p-3 rounded-xl bg-muted/50 text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                        {result.transcribed_text}
                      </div>
                    </div>
                    {imagePreview && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">IMAGEM ORIGINAL</p>
                        <img src={imagePreview} alt="Original" className="rounded-xl shadow max-h-60 object-contain w-full" style={{ transform: `rotate(${rotation}deg)` }} />
                      </div>
                    )}
                  </div>
                  {result.transcription_notes && (
                    <p className="text-xs text-muted-foreground mt-3 italic">Obs: {result.transcription_notes}</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 no-print">
                <Button
                  onClick={() => generateElitePDF(result, interventionPlan, studentName, levelLabel)}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg"
                >
                  <FileText size={16} className="mr-2" /> GERAR RELATÓRIO OFICIAL (PDF)
                </Button>
                <Button variant="outline" onClick={() => window.print()} className="rounded-xl">
                  <Printer size={16} className="mr-2" /> IMPRIMIR
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
