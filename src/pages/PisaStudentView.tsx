import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Globe, Brain, Send, CheckCircle } from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';

interface PisaOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

interface PisaQuestion {
  type: string;
  scenario: string;
  content: string;
  options?: PisaOption[];
  modelAnswer: string;
  skill21: string;
  dataTable?: string;
}

const TYPE_LABELS: Record<string, string> = {
  'multiple-choice': 'Múltipla Escolha',
  'constructed-response': 'Resposta Construída',
  'data-analysis': 'Análise de Dados',
  'interactive-scenario': 'Cenário Interativo',
};

export default function PisaStudentView() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [simulator, setSimulator] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('pisa_simulators')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) setSimulator(data);
      setLoading(false);
    })();
  }, [id]);

  const questions: PisaQuestion[] = simulator?.questions || [];

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!simulator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Simulado não encontrado</h2>
            <p className="text-sm text-muted-foreground mt-2">Verifique o link e tente novamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Respostas Enviadas!</h2>
            <p className="text-sm text-muted-foreground">
              Obrigado, {studentName || 'aluno'}! Suas respostas do simulado "{simulator.title}" foram registradas com sucesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Simulado PISA</h1>
          </div>
          <p className="text-lg font-semibold">{simulator.title}</p>
          <Badge variant="outline">Nível {simulator.proficiency_level} OCDE</Badge>
        </div>

        {/* Student name */}
        <Card>
          <CardContent className="p-4">
            <Label>Seu Nome</Label>
            <input
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="Digite seu nome completo"
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[44px]"
            />
          </CardContent>
        </Card>

        {/* Questions */}
        {(questions || []).map((q, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-bold">Q{i + 1}</Badge>
                <Badge variant="secondary" className="text-xs">{TYPE_LABELS[q.type] || q.type}</Badge>
                <Badge variant="outline" className="text-xs"><Brain className="h-3 w-3 mr-1" />{q.skill21}</Badge>
              </div>

              {q.scenario && (
                <div className="bg-muted/50 p-3 rounded-lg text-sm italic">
                  <MathRenderer content={q.scenario} className="inline" />
                </div>
              )}

              {q.dataTable && (
                <ScrollArea className="w-full">
                  <pre className="bg-muted p-3 rounded-lg text-xs whitespace-pre-wrap min-w-[280px]">{q.dataTable}</pre>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}

              <MathRenderer content={q.content} className="text-sm leading-relaxed" />

              {q.type === 'multiple-choice' && (q.options || []).length > 0 && (
                <div className="space-y-2">
                  {(q.options || []).map(opt => (
                    <label
                      key={opt.letter}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        answers[i] === opt.letter ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${i}`}
                        value={opt.letter}
                        checked={answers[i] === opt.letter}
                        onChange={() => setAnswers(prev => ({ ...prev, [i]: opt.letter }))}
                        className="accent-primary"
                      />
                      <span className="font-medium text-sm">({opt.letter})</span>
                      <MathRenderer content={opt.text} className="text-sm inline" />
                    </label>
                  ))}
                </div>
              )}

              {(q.type === 'constructed-response' || q.type === 'interactive-scenario' || q.type === 'data-analysis') && (
                <Textarea
                  value={answers[i] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                  placeholder="Escreva sua resposta, explicando seu raciocínio completo..."
                  className="min-h-[120px] resize-y"
                />
              )}
            </CardContent>
          </Card>
        ))}

        {/* Submit */}
        <Button onClick={handleSubmit} size="lg" className="w-full" disabled={!studentName.trim()}>
          <Send className="mr-2 h-4 w-4" />
          Enviar Respostas
        </Button>
      </div>
    </div>
  );
}
