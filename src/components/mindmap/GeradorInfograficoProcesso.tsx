import { useState, useRef } from 'react';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer, Plus, Trash2, ArrowDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface Step {
  number: number;
  title: string;
  mainInstruction: string;
  subInstruction: string;
  iconName: string;
  thoughtBubble: string;
  colorTheme: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'teal';
}

const THEMES: Record<string, { bg: string; border: string; circle: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', circle: 'bg-blue-500', text: 'text-blue-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', circle: 'bg-green-500', text: 'text-green-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', circle: 'bg-orange-500', text: 'text-orange-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', circle: 'bg-purple-500', text: 'text-purple-700' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', circle: 'bg-pink-500', text: 'text-pink-700' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', circle: 'bg-teal-500', text: 'text-teal-700' },
};

const IconRenderer = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[
    name
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  ];
  
  if (!IconComponent) {
    return <LucideIcons.HelpCircle className={className} />;
  }
  
  return <IconComponent className={className} />;
};

export default function GeradorInfograficoProcesso() {
  const { toast } = useToast();
  const [subject, setSubject] = useAutoSaveDraft('infographic-subject', '');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useAutoSaveDraft<Step[]>('infographic-steps', []);
  const [footerTips, setFooterTips] = useAutoSaveDraft<string[]>('infographic-footer-tips', []);
  const printRef = useRef<HTMLDivElement>(null);

  const generateInfographic = async () => {
    if (!subject.trim()) {
      toast({ title: 'Por favor, digite um assunto.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-infographic-steps', {
        body: { subject },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const validatedSteps = (data?.steps || []).map((step: any, idx: number) => ({
        number: step.number || idx + 1,
        title: step.title || 'PASSO',
        mainInstruction: step.mainInstruction || 'Instrução não fornecida.',
        subInstruction: step.subInstruction || 'Detalhes adicionais em breve.',
        iconName: step.iconName || 'help-circle',
        thoughtBubble: step.thoughtBubble || 'Continue aprendendo!',
        colorTheme: ['blue', 'green', 'orange', 'purple', 'pink', 'teal'].includes(step.colorTheme) 
          ? step.colorTheme 
          : ['blue', 'green', 'orange', 'purple', 'pink', 'teal'][idx % 6]
      }));

      const validatedTips = Array.isArray(data?.footerTips) && data.footerTips.length >= 4
        ? data.footerTips.slice(0, 4)
        : [
            'Revise os pontos principais com atenção.',
            'Tire suas dúvidas com o professor.',
            'Pratique o que foi aprendido hoje.',
            'Compartilhe seu conhecimento com colegas.'
          ];

      if (validatedSteps.length === 0) throw new Error('A IA não retornou passos válidos.');

      setSteps(validatedSteps);
      setFooterTips(validatedTips);
      toast({ title: 'Infográfico gerado com sucesso!' });
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Erro ao gerar infográfico', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Pequeno delay para garantir que qualquer edição pendente seja renderizada
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const updateStep = (index: number, field: keyof Step, value: string | number) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const updateFooterTip = (index: number, value: string) => {
    const newTips = [...footerTips];
    newTips[index] = value;
    setFooterTips(newTips);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4 print:p-0 print:max-w-none">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 1.2cm; }
          body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-break-inside-avoid { break-inside: avoid; }
          
          /* Forçar cores de fundo no PDF/Impressão */
          .print-bg-slate-900 { background-color: #0f172a !important; color: white !important; }
          .print-bg-blue-50 { background-color: #eff6ff !important; }
          .print-bg-green-50 { background-color: #f0fdf4 !important; }
          .print-bg-orange-50 { background-color: #fff7ed !important; }
          .print-bg-purple-50 { background-color: #faf5ff !important; }
          .print-bg-pink-50 { background-color: #fdf2f8 !important; }
          .print-bg-teal-50 { background-color: #f0fdfa !important; }
          
          /* Forçar cores de círculos */
          .print-bg-blue-500 { background-color: #3b82f6 !important; }
          .print-bg-green-500 { background-color: #22c55e !important; }
          .print-bg-orange-500 { background-color: #f97316 !important; }
          .print-bg-purple-500 { background-color: #a855f7 !important; }
          .print-bg-pink-500 { background-color: #ec4899 !important; }
          .print-bg-teal-500 { background-color: #14b8a6 !important; }

          /* Cores de texto específicas para print */
          .print-text-slate-500 { color: #64748b !important; }
          .print-text-blue-800 { color: #1e40af !important; }
          .print-text-blue-500 { color: #3b82f6 !important; }

          /* Garantir que as colunas fiquem horizontais no papel */
          .print-flex-row { display: flex !important; flex-direction: row !important; align-items: stretch !important; }
          .print-items-center { align-items: center !important; }
          .print-w-32 { width: 8rem !important; flex-shrink: 0 !important; }
          .print-w-64 { width: 14rem !important; flex-shrink: 0 !important; }
          .print-flex-1 { flex: 1 1 0% !important; }
          .print-border-r { border-right: 1px solid #e2e8f0 !important; }
          .print-border-l { border-left: 1px solid #e2e8f0 !important; }
          .print-pr-4 { padding-right: 1rem !important; }
          .print-pl-4 { padding-left: 1rem !important; }
          .print-m-0 { margin: 0 !important; }
          
          .shadow-xl, .shadow-md, .shadow-sm { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />
      <Card className="no-print">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto do Infográfico</Label>
            <Input
              id="subject"
              placeholder="Ex: Ciclo da Água ou Resolução de Problemas Matemáticos"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button 
            onClick={generateInfographic} 
            disabled={loading} 
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Estruturando o conhecimento...
              </>
            ) : (
              'Gerar Infográfico Passo a Passo'
            )}
          </Button>
        </CardContent>
      </Card>

      {steps.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-end no-print">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir / Exportar PDF
            </Button>
          </div>

          <div ref={printRef} className="max-w-5xl mx-auto bg-white border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden print:shadow-none print:border-none">
            <header className="bg-slate-900 text-white p-6 text-center print-bg-slate-900">
              <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wide">
                {subject}
              </h1>
            </header>

            <div className="p-4 md:p-6 space-y-2">
              {steps.map((step, index) => {
                const theme = THEMES[step.colorTheme] || THEMES.blue;
                const printBgClass = `print-bg-${step.colorTheme}-50`;
                const printCircleClass = `print-bg-${step.colorTheme}-500`;

                return (
                  <div key={index} className="flex flex-col items-center w-full print-break-inside-avoid">
                    <div className={`w-full flex flex-col md:flex-row items-stretch gap-4 p-4 border-2 rounded-xl mb-2 ${theme.bg} ${theme.border} print:border-slate-300 print-flex-row ${printBgClass}`}>
                      {/* Coluna 1: Esquerda - Identificação */}
                      <div className="flex flex-col items-center justify-center w-full md:w-32 flex-shrink-0 border-r-0 md:border-r border-slate-200/50 pr-0 md:pr-4 print-w-32 print-border-r print-pr-4">
                        <div className={`w-14 h-14 rounded-full ${theme.circle} flex items-center justify-center text-white text-2xl font-black shadow-md ${printCircleClass}`}>
                          {step.number}
                        </div>
                        <span 
                          className="text-xs font-bold text-slate-800 text-center mt-2 uppercase outline-none focus:bg-white p-1 rounded"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateStep(index, 'title', e.currentTarget.textContent || '')}
                        >
                          {step.title}
                        </span>
                      </div>

                      {/* Coluna 2: Centro - Conteúdo */}
                      <div className="flex-1 flex flex-col justify-center py-2 print-flex-1">
                        <div 
                          className="text-base md:text-lg font-medium text-slate-800 leading-tight outline-none focus:bg-white p-1 rounded"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateStep(index, 'mainInstruction', e.currentTarget.textContent || '')}
                        >
                          {step.mainInstruction}
                        </div>
                        <div 
                          className="bg-white border border-slate-100 rounded p-2 text-sm mt-2 text-slate-600 shadow-sm outline-none focus:ring-1 ring-slate-200"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateStep(index, 'subInstruction', e.currentTarget.textContent || '')}
                        >
                          {step.subInstruction}
                        </div>
                      </div>

                      {/* Coluna 3: Direita - Visual/Apoio */}
                      <div className="w-full md:w-[200px] flex-shrink-0 flex items-center justify-center md:justify-start gap-3 pl-0 md:pl-4 border-l-0 md:border-l border-slate-200/50 print-w-64 print-border-l print-pl-4">
                        <div className="flex-shrink-0">
                          <IconRenderer name={step.iconName} className="w-16 h-16 text-slate-700" />
                        </div>
                        <div className="relative">
                          <div 
                            className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-[10px] leading-tight italic border border-slate-100 relative text-slate-600 min-w-[80px] outline-none focus:bg-slate-50"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateStep(index, 'thoughtBubble', e.currentTarget.textContent || '')}
                          >
                            {step.thoughtBubble}
                          </div>
                        </div>
                      </div>
                    </div>

                    {index < steps.length - 1 && (
                      <div className="my-1 text-slate-300 print-text-slate-500">
                        <ArrowDown className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Rodapé "LEMBRE-SE!" - print-break-inside-avoid para não quebrar a caixa */}
              {footerTips.length > 0 && (
                <div className="border-2 border-dashed border-blue-300 bg-blue-50/50 p-4 m-4 rounded-xl flex flex-col md:flex-row items-center gap-6 print:m-2 print:border-blue-400 print-break-inside-avoid print-flex-row print-items-center print-bg-blue-50">
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <LucideIcons.Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                    <span className="text-lg font-black text-blue-800 print-text-blue-800">LEMBRE-SE!</span>
                  </div>
                  <div className="flex-1 flex flex-wrap justify-between gap-4 print-flex-row">
                    {footerTips.map((tip, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <LucideIcons.CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 print-text-blue-500" />
                        <span 
                          className="text-xs font-medium text-slate-700 outline-none focus:bg-white p-1 rounded"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateFooterTip(idx, e.currentTarget.textContent || '')}
                        >
                          {tip}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold border-t border-slate-100">
              EduCreator — Sistematização de Processos Pedagógicos
            </div>
          </div>
        </div>
      )}
    </div>
  );
}