import { useState, useRef } from 'react';
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

const THEMES: Record<string, { bg: string; border: string; circle: string; text: string; subBg: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', circle: 'bg-blue-500', text: 'text-blue-700', subBg: 'bg-white' },
  green: { bg: 'bg-green-50', border: 'border-green-200', circle: 'bg-green-500', text: 'text-green-700', subBg: 'bg-white' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', circle: 'bg-orange-500', text: 'text-orange-700', subBg: 'bg-white' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', circle: 'bg-purple-500', text: 'text-purple-700', subBg: 'bg-white' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', circle: 'bg-pink-500', text: 'text-pink-700', subBg: 'bg-white' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', circle: 'bg-teal-500', text: 'text-teal-700', subBg: 'bg-white' },
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
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [footerTips, setFooterTips] = useState<string[]>([]);
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

      if (data?.steps) {
        setSteps(data.steps);
        setFooterTips(data.footerTips || []);
        toast({ title: 'Infográfico gerado com sucesso!' });
      } else {
        throw new Error('Formato de resposta inválido');
      }
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
    window.print();
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
    <div className="space-y-8 max-w-4xl mx-auto p-4">
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

          <div ref={printRef} className="max-w-5xl mx-auto bg-white border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <header className="bg-slate-900 text-white p-8 text-center">
              <h2 className="text-3xl font-bold uppercase tracking-tight">
                {subject}
              </h2>
              <div className="mt-4 h-1 w-24 bg-blue-500 mx-auto rounded-full" />
            </header>

            <div className="p-6 md:p-8 space-y-4">
              {steps.map((step, index) => {
                const theme = THEMES[step.colorTheme] || THEMES.blue;
                return (
                  <div key={index} className="flex flex-col items-center">
                    {/* Step Row */}
                    <div className={`w-full flex flex-col md:flex-row items-stretch gap-6 p-6 border-2 rounded-2xl ${theme.bg} ${theme.border} transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${index * 100}ms` }}>
                      
                      {/* Column 1: Identification */}
                      <div className="flex flex-col items-center justify-center space-y-3 w-full md:w-32 flex-shrink-0">
                        <div className={`w-16 h-16 rounded-full ${theme.circle} flex items-center justify-center text-white text-3xl font-black shadow-lg ring-4 ring-white`}>
                          {step.number}
                        </div>
                        <h3 
                          className="text-sm font-black text-slate-800 text-center uppercase tracking-wider outline-none focus:ring-2 ring-primary/20 rounded"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateStep(index, 'title', e.currentTarget.textContent || '')}
                        >
                          {step.title}
                        </h3>
                      </div>

                      {/* Column 2: Content */}
                      <div className="flex-1 flex flex-col justify-center space-y-4">
                        <div 
                          className="text-lg font-bold text-slate-800 leading-tight outline-none focus:ring-2 ring-primary/20 rounded"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateStep(index, 'mainInstruction', e.currentTarget.textContent || '')}
                        >
                          {step.mainInstruction}
                        </div>
                        <div 
                          className={`p-3 rounded-xl border border-slate-200 ${theme.subBg} text-sm text-slate-600 shadow-sm italic outline-none focus:ring-2 ring-primary/20`}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateStep(index, 'subInstruction', e.currentTarget.textContent || '')}
                        >
                          {step.subInstruction}
                        </div>
                      </div>

                      {/* Column 3: Visual/Apoio */}
                      <div className="w-full md:w-56 flex-shrink-0 flex items-center justify-center md:justify-end gap-4">
                        <div className="flex-shrink-0">
                          <IconRenderer name={step.iconName} className="w-14 h-14 text-slate-700 opacity-80" />
                        </div>
                        <div className="relative max-w-[160px]">
                          <div 
                            className="bg-white p-3 rounded-2xl rounded-tl-none shadow-md text-xs italic border border-slate-100 relative text-slate-700 outline-none focus:ring-2 ring-primary/20"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateStep(index, 'thoughtBubble', e.currentTarget.textContent || '')}
                          >
                            {step.thoughtBubble}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow between steps */}
                    {index < steps.length - 1 && (
                      <div className="my-2 text-slate-300">
                        <ArrowDown className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Footer "LEMBRE-SE!" */}
              {footerTips.length > 0 && (
                <div className="mt-8 border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-8">
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <LucideIcons.Star className="w-10 h-10 text-amber-400 fill-amber-400 animate-pulse" />
                    <span className="text-xl font-black text-blue-800 tracking-tighter">LEMBRE-SE!</span>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {footerTips.map((tip, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <LucideIcons.Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span 
                          className="text-sm font-medium text-slate-700 outline-none focus:ring-2 ring-blue-400/20 rounded"
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
            
            <div className="p-4 bg-slate-50 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Gerado por EduCreator — Inteligência Artificial Pedagógica
            </div>
          </div>
        </div>
      )}
    </div>
  );
}