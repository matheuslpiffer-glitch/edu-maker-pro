import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildPublicAppUrl } from '@/lib/public-links';
import { 
  usableWidthPx, 
  captureStyleFor, 
  toHtml2PdfMargin, 
  type PdfMargins 
} from '@/lib/pdf-margins';
import { showAiErrorToast } from '@/lib/ai-utils';

interface SimOption { letter: string; text: string; isCorrect: boolean; }
interface SimQuestion { content: string; options: SimOption[]; skillCode?: string; descriptor?: string; answerLines?: number; correctionMirror?: string; explanation?: string; }

interface UseSimulatorExportProps {
  questions: SimQuestion[];
  setQuestions: (qs: SimQuestion[]) => void;
  title: string;
  savedId: string | null;
  selectedSubjects: string[];
  pdfMargins: PdfMargins;
  columns: 1 | 2;
  setColumns: (cols: 1 | 2) => void;
  setIsExporting: (val: boolean) => void;
  handleSave: () => Promise<void>;
  printContainerRef: React.RefObject<HTMLDivElement>;
}

export function useSimulatorExport({
  questions,
  setQuestions,
  title,
  savedId,
  selectedSubjects,
  pdfMargins,
  columns,
  setColumns,
  setIsExporting,
  handleSave,
  printContainerRef,
}: UseSimulatorExportProps) {
  const { toast } = useToast();
  const [magicLoading, setMagicLoading] = useState<string | null>(null);
  const [podcastScript, setPodcastScript] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const handlePDF = async () => {
    const container = printContainerRef.current;
    if (!container) return;
    
    setIsExporting(true);
    const PDF_CONTENT_WIDTH = usableWidthPx(pdfMargins);
    const captureStyle = captureStyleFor(pdfMargins);
    const prevStyle: Record<string, string> = {};
    const prevColumns = columns;
    if (columns === 2) setColumns(1);
    
    try {
      Object.entries(captureStyle).forEach(([prop, value]) => {
        prevStyle[prop] = (container.style as any)[prop] || '';
        (container.style as any)[prop] = value;
      });
      await new Promise((r) => setTimeout(r, 400));

      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: toHtml2PdfMargin(pdfMargins),
        filename: `${title || 'simulado'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#ffffff', 
          windowWidth: PDF_CONTENT_WIDTH,
          width: PDF_CONTENT_WIDTH,
          scrollX: 0,
          scrollY: 0,
          removeContainer: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      } as any).from(container).save();
      
      toast({ 
        title: 'PDF Gerado com Sucesso', 
        description: 'O download foi iniciado automaticamente.' 
      });
    } catch (e: any) {
      console.error('PDF error:', e);
      showAiErrorToast(e, toast, 'Erro ao gerar PDF')
    } finally {
      Object.entries(prevStyle).forEach(([prop, value]) => {
        (container.style as any)[prop] = value;
      });
      if (prevColumns === 2) setColumns(2);
      setIsExporting(false);
    }
  };

  const handleCopyStudentLink = async () => {
    if (!savedId) {
      toast({ title: 'Salve o simulado antes de enviar para o aluno.', variant: 'destructive' });
      return;
    }
    const link = buildPublicAppUrl(`/simulado/${savedId}`);
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: '🔗 Link copiado!', description: 'Envie para seus alunos via WhatsApp ou projete o QR Code.' });
    } catch {
      toast({ title: 'Link do Simulado', description: link });
    }
  };

  const handleSaveAndShare = async () => {
    if (!savedId) {
      await handleSave();
    }
  };

  const handleWhatsApp = () => {
    if (!savedId) return;
    const link = buildPublicAppUrl(`/simulado/${savedId}`);
    const text = `📝 *Simulado Online — ${title || 'EduCreator Pro'}*\n\nAcesse o link, digite seu Nome e Turma e responda as questões:\n${link}\n\nBoa prova! 🚀`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePodcast = async () => {
    if (questions.length === 0) return;
    setMagicLoading('podcast');
    try {
      const { data, error } = await supabase.functions.invoke('generate-podcast-summary', {
        body: { questions, title, subject: selectedSubjects[0] || 'Geral' },
      });
      if (error) throw error;
      setPodcastScript(data.script);
      toast({ title: '🎙️ Roteiro de Podcast gerado!' });
    } catch (e: any) {
      showAiErrorToast(e, toast, 'Erro ao gerar podcast')
    } finally { setMagicLoading(null); }
  };

  const handleIllustrate = async () => {
    const prompt = window.prompt('Descreva a ilustração que deseja gerar:');
    if (!prompt?.trim()) return;
    setMagicLoading('illustrate');
    toast({ title: '🎨 Gerando ilustração via IA…', description: 'Aguarde ~15 segundos.' });
    try {
      const { data, error } = await supabase.functions.invoke('generate-illustration', {
        body: { prompt: prompt.trim() },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        const imgTag = `<div style="text-align:center;margin:20px 0"><img src="${data.imageUrl}" style="max-width:100%;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)" alt="${prompt}" /></div>`;
        if (questions.length > 0) {
          const updated = [...questions];
          updated[0] = { ...updated[0], content: updated[0].content + imgTag };
          setQuestions(updated);
        }
        toast({ title: '🎨 Ilustração adicionada ao documento!' });
      } else {
        throw new Error('Nenhuma imagem retornada pela IA.');
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('429') || msg.includes('rate') || msg.includes('limite')) {
        toast({ title: 'Limite de requisições excedido', description: 'Aguarde um momento e tente novamente.', variant: 'destructive' });
      } else if (msg.includes('402') || msg.includes('créditos')) {
        toast({ title: 'Créditos insuficientes', description: 'Adicione créditos para continuar gerando imagens.', variant: 'destructive' });
      } else {
        toast({ title: 'Falha na geração', description: 'Tente descrever a imagem de forma diferente.', variant: 'destructive' });
      }
    } finally { setMagicLoading(null); }
  };

  const handleKahoot = async () => {
    if (questions.length === 0) return;
    setMagicLoading('kahoot');
    try {
      const { data, error } = await supabase.functions.invoke('export-kahoot', {
        body: { questions },
      });
      if (error) throw error;
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kahoot_${title || 'simulado'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '🎮 CSV do Kahoot baixado!' });
    } catch (e: any) {
      showAiErrorToast(e, toast, 'Erro ao exportar Kahoot')
    } finally { setMagicLoading(null); }
  };

  return {
    magicLoading,
    podcastScript,
    setPodcastScript,
    showQRModal,
    setShowQRModal,
    handlePDF,
    handleCopyStudentLink,
    handleSaveAndShare,
    handleWhatsApp,
    handlePodcast,
    handleIllustrate,
    handleKahoot,
  };
}
