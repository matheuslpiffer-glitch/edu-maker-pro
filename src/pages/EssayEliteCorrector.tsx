import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, Loader2, Printer, RotateCw, Sparkles, AlertTriangle, Trophy, TrendingUp, Star, BookOpen, Target, Clock, Lightbulb, CheckCircle2, Share2, FileText, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportLoadingOverlay } from '@/components/ExportLoadingOverlay';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import DocumentScanner from '@/components/DocumentScanner';
import {
  clearStoredScannerCapture,
  dataUrlToFile,
  readStoredScannerCapture,
} from '@/lib/document-scanner';

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
  { value: 'unicamp', label: 'UNICAMP — GÊNERO E INTERLOCUÇÃO' },
  { value: 'fuvest', label: 'FUVEST — ARGUMENTAÇÃO FILOSÓFICA' },
  { value: 'vunesp', label: 'VUNESP — ESTRUTURA DISSERTATIVA' },
];

const LOADING_PHASES = [
  '📷 COMPRIMINDO IMAGEM...',
  '🔍 DECIFRANDO CALIGRAFIA COM IA DE ELITE...',
  '📝 TRANSCREVENDO MANUSCRITO...',
  '🎯 APLICANDO CORREÇÃO DINÂMICA...',
  '💡 GERANDO FEEDBACK PERSONALIZADO...',
];

async function compressImage(file: File, maxWidth = 1200, quality = 0.65): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      // Constrain both width AND height to maxWidth
      if (w > maxWidth || h > maxWidth) {
        if (w >= h) {
          h = Math.round(h * (maxWidth / w)); w = maxWidth;
        } else {
          w = Math.round(w * (maxWidth / h)); h = maxWidth;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas não suportado'));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      console.log('[compressImage] size:', Math.round(base64.length * 0.75 / 1024), 'KB, dims:', w, 'x', h);
      if (base64.length > 1_200_000) {
        // Re-compress harder
        const d2 = canvas.toDataURL('image/jpeg', 0.35);
        const b2 = d2.split(',')[1];
        console.log('[compressImage] re-compressed:', Math.round(b2.length * 0.75 / 1024), 'KB');
        resolve({ base64: b2, mimeType: 'image/jpeg' });
      } else {
        resolve({ base64, mimeType: 'image/jpeg' });
      }
    };
    img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
}

/** Call edge function with extended timeout (3 min) */
async function invokeWithTimeout(functionName: string, body: Record<string, unknown>, timeoutMs = 180_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  
  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      const msg = data?.error || data?.message || `Erro ${resp.status}: ${resp.statusText}`;
      throw new Error(msg);
    }
    return { data, error: null };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Tempo esgotado (3 min). Tente com uma foto menor ou mais nítida.');
    }
    throw err;
  }
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
  returnBlob = false,
): Promise<Blob | void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 15; // margin left
  const MR = 15;
  const CW = W - ML - MR; // content width
  const now = new Date().toLocaleString('pt-BR');
  let y = 0;

  // ── Color palette ──
  const PURPLE = [88, 55, 180] as const;
  const DARK_BLUE = [20, 30, 70] as const;
  const LIGHT_GRAY_BG = [245, 246, 250] as const;
  const MINT_BG = [230, 250, 245] as const;
  const WHITE = [255, 255, 255] as const;

  function addWatermark() {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
    doc.setFontSize(56);
    doc.setTextColor(120, 120, 120);
    doc.text('PIFFER EDUTECH', W / 2, H / 2, { angle: 40, align: 'center' });
    doc.restoreGraphicsState();
  }

  function addFooter(page: number, total: number) {
    // Thin elegant line
    doc.setDrawColor(180, 170, 210);
    doc.setLineWidth(0.3);
    doc.line(ML, H - 16, W - MR, H - 16);

    doc.setFontSize(6.5);
    doc.setTextColor(140, 140, 140);
    doc.text(`Página ${page}/${total}`, ML, H - 11);
    doc.text('Análise fundamentada nas diretrizes oficiais BNCC/ENEM via tecnologia Piffer EduTech © 2026', W / 2, H - 11, { align: 'center' });
    doc.text(now, W - MR, H - 11, { align: 'right' });
  }

  function checkPage(needed: number) {
    if (y + needed > H - 25) {
      doc.addPage();
      addWatermark();
      y = 20;
    }
  }

  // Helper: draw a rounded rect with fill
  function drawCard(x: number, yPos: number, w: number, h: number, fillColor: readonly [number, number, number], radius = 3) {
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.roundedRect(x, yPos, w, h, radius, radius, 'F');
  }

  // Helper: draw a score badge with progress bar
  function drawScoreBadge(x: number, yPos: number, w: number, score: number, max: number, label: string) {
    const pct = Math.round((score / max) * 100);
    const barColor: [number, number, number] = pct >= 80 ? [34, 170, 80] : pct >= 60 ? [220, 170, 30] : pct >= 40 ? [230, 140, 50] : [220, 60, 50];

    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    const labelLines = doc.splitTextToSize(label, w - 22);
    doc.text(labelLines, x, yPos + 4);

    // Score text
    doc.setFontSize(8);
    doc.setTextColor(...DARK_BLUE);
    doc.text(`${score}/${max}`, x + w - 2, yPos + 4, { align: 'right' });

    // Progress bar background
    const barY = yPos + (labelLines.length > 1 ? 9 : 7);
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(x, barY, w, 3, 1.5, 1.5, 'F');

    // Progress bar fill
    const fillW = Math.max((pct / 100) * w, 2);
    doc.setFillColor(...barColor);
    doc.roundedRect(x, barY, fillW, 3, 1.5, 1.5, 'F');

    return barY + 6;
  }

  // ═══════════════ PAGE 1 ═══════════════
  addWatermark();
  y = 18;

  // ── Institutional Header Card ──
  drawCard(ML, y, CW, 32, LIGHT_GRAY_BG, 4);

  // Logo placeholder (elegant circle)
  doc.setFillColor(...PURPLE);
  doc.circle(ML + 12, y + 16, 8, 'F');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text('P', ML + 12, y + 20, { align: 'center' });

  // Platform name
  doc.setFontSize(14);
  doc.setTextColor(...DARK_BLUE);
  doc.text('PIFFER EDUTECH', ML + 24, y + 10);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  doc.text('RELATÓRIO DE CORREÇÃO — SUPER IA DE ELITE', ML + 24, y + 16);

  // Student data on the right side of the card
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 80);
  doc.text(`Aluno: ${studentName || '________________________'}`, ML + 24, y + 23);
  doc.text(`Nível: ${levelLabel}`, W - MR - 2, y + 10, { align: 'right' });
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, W - MR - 2, y + 16, { align: 'right' });
  doc.text(`Turma: ___________`, W - MR - 2, y + 23, { align: 'right' });

  y += 38;

  // ── Central Score Badge ──
  const pctScore = Math.round((result.total_score / result.max_total) * 100);
  const scoreFill: [number, number, number] = pctScore >= 70 ? [34, 170, 80] : pctScore >= 50 ? [220, 170, 30] : [220, 60, 50];

  drawCard(W / 2 - 30, y, 60, 24, scoreFill, 5);
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text(`${result.total_score}/${result.max_total}`, W / 2, y + 14, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`${pctScore}% DE ACERTO`, W / 2, y + 21, { align: 'center' });
  y += 30;

  // ── Score Table with Infographic Bars ──
  const bancaTableTitles: Record<string, string> = {
    enem: 'COMPETÊNCIAS ENEM',
    unicamp: 'CRITÉRIOS UNICAMP — GÊNERO, LEITURA E ESCRITA',
    fuvest: 'CRITÉRIOS FUVEST — ABSTRAÇÃO E NORMA CULTA',
    vunesp: 'CRITÉRIOS VUNESP — ESTRUTURA DISSERTATIVA',
  };
  const tableTitle = (result.subLevel && bancaTableTitles[result.subLevel]) || 'TABELA DE NOTAS POR CRITÉRIO';

  doc.setFontSize(10);
  doc.setTextColor(...DARK_BLUE);
  doc.text(tableTitle, ML, y);
  y += 5;

  // Draw each score as an infographic bar
  result.scores.forEach(s => {
    checkPage(14);
    y = drawScoreBadge(ML, y, CW, s.score, s.max, s.criteria);
  });
  y += 4;

  // ── Strengths ──
  if (result.strengths?.length) {
    checkPage(20);
    doc.setFontSize(10);
    doc.setTextColor(16, 140, 80);
    doc.text('PONTOS FORTES', ML, y);
    y += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    result.strengths.forEach(s => {
      checkPage(8);
      const lines = doc.splitTextToSize(`• ${s}`, CW - 5);
      doc.text(lines, ML + 3, y);
      y += lines.length * 4 + 1;
    });
    y += 3;
  }

  // ── Improvements ──
  if (result.improvements?.length) {
    checkPage(20);
    doc.setFontSize(10);
    doc.setTextColor(200, 120, 0);
    doc.text('O QUE MELHORAR', ML, y);
    y += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    result.improvements.forEach(s => {
      checkPage(8);
      const lines = doc.splitTextToSize(`• ${s}`, CW - 5);
      doc.text(lines, ML + 3, y);
      y += lines.length * 4 + 1;
    });
    y += 3;
  }

  // ── Feedback Aluno ──
  if (result.feedback_aluno) {
    checkPage(20);
    doc.setFontSize(10);
    doc.setTextColor(...PURPLE);
    doc.text('FEEDBACK PARA O ALUNO', ML, y);
    y += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    const fbLines = doc.splitTextToSize(result.feedback_aluno, CW - 5);
    fbLines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, ML + 3, y);
      y += 4;
    });
    y += 3;
  }

  // ── Feedback Professor ──
  if (result.feedback_professor) {
    checkPage(20);
    doc.setFontSize(10);
    doc.setTextColor(...PURPLE);
    doc.text('OBSERVAÇÕES PARA O PROFESSOR', ML, y);
    y += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    const fpLines = doc.splitTextToSize(result.feedback_professor, CW - 5);
    fpLines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, ML + 3, y);
      y += 4;
    });
    y += 3;
  }

  // ── Transcription Block (highlighted card with gray bg + rounded border) ──
  checkPage(30);
  doc.setFontSize(10);
  doc.setTextColor(...DARK_BLUE);
  doc.text('TRANSCRIÇÃO DA CALIGRAFIA (IA)', ML, y);
  y += 2;
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text(`Legibilidade: ${result.legibility || 'N/A'} · ${result.estimated_word_count || '?'} palavras · ${result.paragraph_count || '?'} parágrafos`, ML, y + 4);
  y += 8;

  // Measure text height first
  doc.setFontSize(8.5);
  const txLines = doc.splitTextToSize(result.transcribed_text || '', CW - 10);
  const txBlockH = txLines.length * 4 + 8;

  // Draw the gray card behind the text
  checkPage(txBlockH + 4);
  drawCard(ML, y - 2, CW, txBlockH, LIGHT_GRAY_BG, 3);
  // Draw a subtle border
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y - 2, CW, txBlockH, 3, 3, 'S');

  doc.setTextColor(40, 40, 40);
  txLines.forEach((line: string) => {
    doc.text(line, ML + 5, y + 2);
    y += 4;
  });
  y += 8;

  // ── Intervention Plan (mint green highlighted section) ──
  if (plan) {
    checkPage(30);
    // Section title card
    drawCard(ML, y - 2, CW, 14, MINT_BG, 3);
    doc.setDrawColor(100, 200, 170);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y - 2, CW, 14, 3, 3, 'S');
    doc.setFontSize(11);
    doc.setTextColor(20, 100, 70);
    doc.text('PLANO DE AÇÃO PARA O ALUNO', W / 2, y + 7, { align: 'center' });
    y += 18;

    // Gap
    doc.setFontSize(9);
    doc.setTextColor(180, 40, 40);
    doc.text(`Maior Lacuna: ${plan.biggest_gap}`, ML, y);
    y += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    const gapLines = doc.splitTextToSize(plan.gap_explanation, CW - 5);
    doc.text(gapLines, ML + 3, y);
    y += gapLines.length * 4 + 4;

    // Activities table
    (doc as any).autoTable({
      startY: y,
      head: [['#', 'Atividade', 'Descrição', 'Duração']],
      body: plan.activities.map((a, i) => [`${i + 1}`, a.title, a.description, a.duration]),
      margin: { left: ML, right: MR },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [40, 150, 110], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 8 }, 3: { cellWidth: 18 } },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Theory in a light blue card
    checkPage(20);
    doc.setFontSize(8.5);
    doc.setTextColor(60, 40, 120);
    doc.text('Explicação Teórica:', ML, y);
    y += 5;
    doc.setTextColor(40, 40, 40);
    const thLines = doc.splitTextToSize(plan.theory_snippet, CW - 5);
    thLines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, ML + 3, y);
      y += 4;
    });
  }

  // QR Code
  const digitalUrl = `${window.location.origin}/redacao/elite`;
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(digitalUrl, { width: 200, margin: 1 });
  } catch { /* ignore */ }

  // Apply footers & watermarks to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // QR on last page
  if (qrDataUrl) {
    doc.setPage(totalPages);
    const qrSize = 20;
    doc.addImage(qrDataUrl, 'PNG', W - MR - qrSize, H - 16 - qrSize - 2, qrSize, qrSize);
    doc.setFontSize(5.5);
    doc.setTextColor(140, 140, 140);
    doc.text('Versão Digital', W - MR - qrSize / 2, H - 16 - 1, { align: 'center' });
  }

  const cleanName = (studentName || 'Aluno').replace(/\s+/g, '_');
  const fileName = `Relatorio_Redacao_${cleanName}.pdf`;

  if (returnBlob) {
    return doc.output('blob');
  }
  doc.save(fileName);
}

const handleExportPDFWrapper = async (
  result: EliteResult,
  plan: InterventionPlan | null,
  studentName: string,
  levelLabel: string,
  setExporting: (v: boolean) => void,
  toast: any
) => {
  setExporting(true);
  try {
    await generateElitePDF(result, plan, studentName, levelLabel);
    toast({ title: '✅ PDF descarregado com sucesso!' });
  } catch (err: any) {
    console.error('[handleExportPDFWrapper] error:', err);
    toast({ title: '❌ Erro ao gerar PDF', description: err.message, variant: 'destructive' });
  } finally {
    setExporting(false);
  }
};

export default function EssayEliteCorrector() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  // fileInputRef no longer needed — DocumentScanner handles it

  const [level, setLevel] = useState('');
  const [subLevel, setSubLevel] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [result, setResult] = useState<EliteResult | null>(null);
  const [interventionPlan, setInterventionPlan] = useState<InterventionPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Restore accepted scan from storage on mount
  useEffect(() => {
    const cachedCapture = readStoredScannerCapture();
    if (cachedCapture?.processedDataUrl && !imagePreview) {
      console.log('[EssayEliteCorrector] render:restaurando imagem escaneada salva');
      setImagePreview(cachedCapture.processedDataUrl);
      setImageFile(dataUrlToFile(cachedCapture.processedDataUrl, cachedCapture.fileName, cachedCapture.mimeType));
    }
  }, []);

  const handleScannedImage = (file: File, preview: string) => {
    console.log('[EssayEliteCorrector] captura:imagem confirmada pelo scanner', {
      name: file.name,
      size: file.size,
    });

    setImageFile(file);
    setImagePreview(preview);
    setResult(null);
    setInterventionPlan(null);
  };

  const hasImage = Boolean(imagePreview);
  const hasLevel = Boolean(level) && (level !== 'ensino_medio' || Boolean(subLevel));
  const canCorrect = hasImage && hasLevel;

  const handleCorrect = async () => {
    console.log('Botão clicado, iniciando correção...', { hasImage, hasLevel, canCorrect, user: !!user });
    
    if (!hasImage) {
      toast({ title: '📷 Envie a foto primeiro', description: 'Tire ou envie uma foto da redação antes de corrigir.', variant: 'destructive' });
      return;
    }
    if (!hasLevel) {
      toast({ title: '📚 Selecione o nível', description: 'Escolha o nível de aprendizagem antes de corrigir.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: '🔒 Faça login', description: 'Você precisa estar logado para usar a correção.', variant: 'destructive' });
      return;
    }

    const currentImageFile = imageFile || (() => {
      const cachedCapture = readStoredScannerCapture();
      if (!cachedCapture?.processedDataUrl) return null;
      return dataUrlToFile(cachedCapture.processedDataUrl, cachedCapture.fileName, cachedCapture.mimeType);
    })();

    if (!currentImageFile) {
      console.log('[EssayEliteCorrector] captura:arquivo não encontrado no momento da correção');
      return;
    }

    console.log('[EssayEliteCorrector] correção:enviando imagem para edge function', {
      name: currentImageFile.name,
      size: currentImageFile.size,
      level,
      subLevel,
    });

    if (!imageFile) {
      setImageFile(currentImageFile);
    }

    setLoading(true);
    setLoadingPhase(0);
    setResult(null);
    setInterventionPlan(null);

    const timer = setInterval(() => setLoadingPhase(p => Math.min(p + 1, LOADING_PHASES.length - 1)), 5000);

    try {
      const { base64, mimeType } = await compressImage(currentImageFile);
      console.log('[handleCorrect] image compressed, sending to edge function...');
      setLoadingPhase(1);

      const { data } = await invokeWithTimeout('correct-essay-elite', {
        imageBase64: base64,
        mimeType,
        level: level === 'ensino_medio' ? 'ensino_medio' : level,
        subLevel: level === 'ensino_medio' ? subLevel : undefined,
      }, 180_000); // 3 min timeout

      clearInterval(timer);

      if (data?.error) {
        const errMsg = data.error as string;
        if (errMsg.includes('ilegível') || errMsg.includes('escura')) {
          toast({ title: '📷 FOTO ILEGÍVEL', description: errMsg, variant: 'destructive' });
          setLoading(false);
          return;
        }
        if (errMsg.includes('Créditos') || errMsg.includes('credits')) {
          toast({ title: '💳 Créditos insuficientes', description: 'Adicione créditos em Configurações > Workspace > Uso.', variant: 'destructive' });
          setLoading(false);
          return;
        }
        if (errMsg.includes('Limite') || errMsg.includes('rate')) {
          toast({ title: '⏱️ Limite de requisições', description: 'Aguarde alguns segundos e tente novamente.', variant: 'destructive' });
          setLoading(false);
          return;
        }
        throw new Error(errMsg);
      }

      setResult(data as EliteResult);
      toast({ title: '✅ CORREÇÃO DE ELITE CONCLUÍDA!' });

      // Save to DB
      const filePath = `${user.id}/${Date.now()}_elite_${currentImageFile.name}`;
      const { data: uploadData } = await supabase.storage.from('essay-images').upload(filePath, currentImageFile);
      let imageUrl = '';
      if (uploadData?.path) {
        const { data: signedData } = await supabase.storage.from('essay-images').createSignedUrl(uploadData.path, 600);
        imageUrl = signedData?.signedUrl || supabase.storage.from('essay-images').getPublicUrl(uploadData.path).data.publicUrl;
      }

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
      console.error('[handleCorrect] error:', e);
      const msg = e.message || 'Erro desconhecido';
      toast({ title: '❌ Erro na correção', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!result || !user) return;
    setLoadingPlan(true);
    try {
      const { data } = await invokeWithTimeout('correct-essay-elite', {
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
      }, 120_000);

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

  const handleShareReport = async () => {
    if (!result) return;
    setSharing(true);
    try {
      const blob = await generateElitePDF(result, interventionPlan, studentName, levelLabel, true);
      if (!blob) throw new Error('Falha ao gerar PDF');
      const cleanName = (studentName || 'Aluno').replace(/\s+/g, '_');
      const fileName = `Relatorio_Redacao_${cleanName}.pdf`;
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      // Try native share with file
      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: `Relatório de Redação - ${studentName || 'Aluno'}`,
          text: 'Olá! Segue o relatório de desempenho da redação processado pela Super IA do EduCreator Pro. Produzido por Piffer EduTech.',
          files: [pdfFile],
        });
        toast({ title: '✅ Compartilhado com sucesso!' });
      } else {
        // Fallback: save PDF locally + open WhatsApp with summary
        const pct = Math.round((result.total_score / result.max_total) * 100);
        const msg = encodeURIComponent(
          `📊 *Relatório de Redação — ${studentName || 'Aluno'}*\n\n` +
          `📝 Nível: ${levelLabel}\n` +
          `🎯 Nota: ${result.total_score}/${result.max_total} (${pct}%)\n\n` +
          `${result.scores.map(s => `• ${s.criteria}: ${s.score}/${s.max}`).join('\n')}\n\n` +
          `✅ Pontos fortes: ${(result.strengths || []).slice(0, 2).join('; ')}\n` +
          `📝 Melhorar: ${(result.improvements || []).slice(0, 2).join('; ')}\n\n` +
          `_Processado pela Super IA do EduCreator Pro — Piffer EduTech_`
        );
        // Download PDF first
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
        // Then open WhatsApp
        window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
        toast({ title: '📱 PDF salvo + WhatsApp aberto!', description: 'Anexe o PDF baixado na conversa.' });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('[handleShareReport]', e);
        toast({ title: '❌ Erro ao compartilhar', description: e.message, variant: 'destructive' });
      }
    } finally {
      setSharing(false);
    }
  };

  const levelLabel = level === 'ensino_medio'
    ? SUB_LEVELS.find(s => s.value === subLevel)?.label || 'ENSINO MÉDIO'
    : LEVELS.find(l => l.value === level)?.label || '';

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 pb-32 md:p-8 md:pb-36">
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

          {/* Document Scanner */}
          {!imagePreview && !loading && (
            <DocumentScanner onImageReady={handleScannedImage} disabled={loading} />
          )}

          {imagePreview && !loading && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
              <img src={imagePreview} alt="Scanned" className="max-h-60 mx-auto rounded-xl shadow-lg object-contain" />
              <p className="text-xs text-center text-emerald-600 dark:text-emerald-400 font-semibold">✅ IMAGEM ESCANEADA PRONTA</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                onClick={() => {
                  console.log('[EssayEliteCorrector] captura:limpando imagem aceita');
                  setImagePreview(null);
                  setImageFile(null);
                  setResult(null);
                  setInterventionPlan(null);
                  clearStoredScannerCapture();
                }}
              >
                TROCAR FOTO
              </Button>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-1000"
                  style={{ width: `${Math.min(((loadingPhase + 1) / LOADING_PHASES.length) * 100, 95)}%` }}
                />
              </div>
              <p className="text-center text-sm font-semibold text-purple-700 dark:text-purple-300 animate-pulse">
                <Loader2 className="inline mr-2 animate-spin" size={16} />
                {LOADING_PHASES[loadingPhase]}
              </p>
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
                        <img src={imagePreview} alt="Original" className="rounded-xl shadow max-h-60 object-contain w-full" />
                      </div>
                    )}
                  </div>
                  {result.transcription_notes && (
                    <p className="text-xs text-muted-foreground mt-3 italic">Obs: {result.transcription_notes}</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-wrap justify-end gap-2 no-print">
                <Button
                  onClick={handleShareReport}
                  disabled={sharing}
                  className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
                >
                  {sharing ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> PREPARANDO ARQUIVO...</>
                  ) : (
                    <><MessageCircle size={16} className="mr-2" /> ENVIAR P/ WHATSAPP</>
                  )}
                </Button>
                <Button
                  onClick={() => handleExportPDFWrapper(result, interventionPlan, studentName, levelLabel, setExporting, toast)}
                  disabled={exporting}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg"
                >
                  <FileText size={16} className="mr-2" /> GERAR PDF
                </Button>
                <Button variant="outline" onClick={() => window.print()} className="rounded-xl">
                  <Printer size={16} className="mr-2" /> IMPRIMIR
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {imagePreview && !loading && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-5xl">
            <Button
              onClick={handleCorrect}
              className={`h-14 w-full rounded-2xl text-base font-bold shadow-xl shadow-purple-500/25 ${
                canCorrect
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Sparkles className="mr-2" size={20} />
              {!hasLevel ? 'SELECIONE O NÍVEL ACIMA ☝️' : 'CONFIRMAR ESCANEAMENTO E CORRIGIR'}
            </Button>
          </div>
        </div>
      )}
      <ExportLoadingOverlay isOpen={exporting || sharing} />
    </div>
  );
}
