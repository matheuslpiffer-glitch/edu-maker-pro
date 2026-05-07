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
  stepNumber: number;
  title: string;
  description: string;
  lucideIcon: string;
  extraTip: string;
}

const COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-indigo-500',
];

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

          <div ref={printRef} className="space-y-8 pb-10 print:p-0">
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">
                {subject}
              </h2>
              <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
            </div>

            <div className="space-y-12 relative">
              {/* Visual connection line */}
              <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-slate-100 -z-10 hidden sm:block" />

              {steps.map((step, index) => (
                <div key={index} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                  <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-white overflow-visible">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-start gap-6">
                      {/* Left: Step Number Circle */}
                      <div className={`flex-shrink-0 w-16 h-16 rounded-full ${COLORS[index % COLORS.length]} flex items-center justify-center text-white text-2xl font-black shadow-lg ring-4 ring-white`}>
                        {step.stepNumber}
                      </div>

                      {/* Middle: Title and Description */}
                      <div className="flex-grow space-y-2">
                        <h3 
                          className="text-xl font-bold text-slate-800 outline-none focus:ring-2 ring-primary/20 rounded px-1 -mx-1"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateStep(index, 'title', e.currentTarget.textContent || '')}
                        >
                          {step.title}
                        </h3>
                        <p 
                          className="text-slate-600 leading-relaxed outline-none focus:ring-2 ring-primary/20 rounded px-1 -mx-1"
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => updateStep(index, 'description', e.currentTarget.textContent || '')}
                        >
                          {step.description}
                        </p>
                      </div>

                      {/* Right: Icon and Extra Tip */}
                      <div className="flex-shrink-0 w-full sm:w-48 flex flex-col items-center sm:items-end gap-3">
                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-primary transition-colors">
                          <IconRenderer name={step.lucideIcon} className="w-8 h-8" />
                        </div>
                        
                        <div className="relative">
                          <div 
                            className="bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-2 rounded-lg border border-yellow-200 shadow-sm max-w-[180px] text-center sm:text-right outline-none focus:ring-2 ring-yellow-400/20"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateStep(index, 'extraTip', e.currentTarget.textContent || '')}
                          >
                            {step.extraTip}
                          </div>
                          {/* Speech bubble tail */}
                          <div className="absolute -top-1 right-4 w-2 h-2 bg-yellow-100 border-t border-l border-yellow-200 rotate-45 hidden sm:block" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Vertical Arrow between steps */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center sm:justify-start sm:ml-14 -my-4 relative z-10 no-print">
                      <div className="bg-white p-1 rounded-full border shadow-sm">
                        <ArrowDown className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-12 text-center text-[10px] text-slate-300 uppercase tracking-widest font-bold print:block hidden">
              Gerado por Piffer EduTech — Inteligência Artificial Pedagógica
            </div>
          </div>
        </div>
      )}
    </div>
  );
}