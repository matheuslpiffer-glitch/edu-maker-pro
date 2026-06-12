import { useState, useRef } from 'react';
import { showAiErrorToast } from '@/lib/ai-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Loader2, AlertTriangle, Lightbulb, Clock, CheckCircle, BookOpen,
  Sparkles, Copy, FileDown, Share2, Target, Users
} from 'lucide-react';

interface InterventionPlan {
  objective: string;
  duration: string;
  activities: { title: string; description: string; duration: string }[];
  resources: string[];
  evaluation_criteria: string;
}

interface Props {
  mainErrors: string[];
}

function formatPlanForWhatsApp(plan: InterventionPlan): string {
  let text = `📋 *PLANO DE INTERVENÇÃO PEDAGÓGICA*\n\n`;
  text += `🎯 *Objetivo:* ${plan.objective}\n`;
  text += `⏱ *Duração:* ${plan.duration}\n\n`;
  text += `📚 *Sequência de Atividades:*\n`;
  plan.activities.forEach((act, i) => {
    text += `\n${i + 1}. *${act.title}* (${act.duration})\n`;
    text += `   ${act.description}\n`;
  });
  text += `\n📦 *Recursos:*\n`;
  plan.resources.forEach(r => { text += `• ${r}\n`; });
  text += `\n✅ *Avaliação:* ${plan.evaluation_criteria}`;
  return text;
}

export default function PisaPedagogicalHighlights({ mainErrors }: Props) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<InterventionPlan | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const topErrors = mainErrors.filter(Boolean).slice(0, 3);

  const handleGeneratePlan = async () => {
    if (topErrors.length === 0) {
      toast({ title: 'Nenhum erro registrado para gerar o plano.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pisa-intervention-plan', {
        body: { errors: topErrors },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data as InterventionPlan);
      setPlanOpen(true);
    } catch (e: any) {
      console.error(e);
      showAiErrorToast(e, toast, 'Erro ao gerar plano')
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWhatsApp = () => {
    if (!plan) return;
    const text = formatPlanForWhatsApp(plan);
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copiado para a área de transferência!', description: 'Cole no WhatsApp para enviar ao grupo.' });
    }).catch(() => {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    });
  };

  const handleSavePDF = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Permita pop-ups para gerar o PDF.', variant: 'destructive' });
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Plano de Intervenção</title>
      <style>
        @page { size: A4; margin: 20mm 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', 'Roboto', Arial, sans-serif; font-size: 11pt; line-height: 1.7; color: #1a1a1a; padding: 20mm 15mm; max-width: 210mm; word-break: break-word; }
        h1 { font-size: 16pt; margin-bottom: 6px; }
        h2 { font-size: 12pt; margin: 16px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .meta { font-size: 10pt; color: #666; margin-bottom: 16px; }
        .activity { padding: 10px 12px; margin-bottom: 8px; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid; }
        .activity-num { display: inline-block; width: 22px; height: 22px; background: #3b82f6; color: white; border-radius: 50%; text-align: center; line-height: 22px; font-size: 10pt; margin-right: 8px; }
        .activity-title { font-weight: 600; font-size: 11pt; }
        .activity-desc { font-size: 10pt; color: #444; margin-top: 4px; }
        .activity-time { font-size: 9pt; color: #888; margin-top: 2px; }
        .resources { list-style: none; }
        .resources li { font-size: 10pt; padding: 2px 0; }
        .resources li::before { content: "📦 "; }
        .eval { padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 10pt; margin-top: 12px; page-break-inside: avoid; }
        .eval-label { font-weight: 600; color: #166534; }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  if (topErrors.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Destaques Pedagógicos
          </CardTitle>
          <CardDescription>Principais erros conceituais identificados nos simulados de elite.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-sm">{err}</span>
            </div>
          ))}
          <Button onClick={handleGeneratePlan} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? 'Gerando Plano de Intervenção IA...' : 'Gerar Plano de Intervenção IA'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className={`${isMobile ? 'max-w-full h-full rounded-none' : 'max-w-2xl'} max-h-[95vh] overflow-y-auto p-0`}>
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Plano de Intervenção Pedagógica
              </DialogTitle>
            </DialogHeader>
            {plan && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={handleCopyWhatsApp}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar para WhatsApp
                </Button>
                <Button size="sm" variant="outline" onClick={handleSavePDF}>
                  <FileDown className="h-4 w-4 mr-1" />
                  Salvar em PDF
                </Button>
              </div>
            )}
          </div>

          {plan && (
            <div className="px-6 py-4">
              {/* Printable content */}
              <div ref={printRef}>
                <h1>Plano de Intervenção Pedagógica</h1>
                <div className="meta">Gerado por EduCreator Pro — PISA Elite</div>

                {/* Objective */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 mb-4">
                  <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Objetivo</p>
                    <p className="text-sm mt-1">{plan.objective}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {plan.duration}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Activities */}
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-primary" />
                  Sequência de Atividades
                </h2>
                <div className="space-y-3">
                  {plan.activities.map((act, i) => (
                    <div key={i} className="activity flex items-start gap-3 p-4 rounded-xl border bg-card">
                      <Badge className="shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center p-0">
                        {i + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="activity-title text-sm font-semibold">{act.title}</p>
                        <p className="activity-desc text-sm text-muted-foreground mt-1 leading-relaxed">{act.description}</p>
                        <p className="activity-time text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {act.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Resources */}
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Recursos Necessários
                </h2>
                <ul className="resources space-y-1.5 mb-4">
                  {plan.resources.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>

                {/* Evaluation */}
                <div className="eval p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="eval-label text-sm font-semibold text-primary flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Critérios de Avaliação
                  </p>
                  <p className="text-sm text-foreground/70 mt-1 leading-relaxed">{plan.evaluation_criteria}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
