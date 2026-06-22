import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, Lightbulb, BookOpen, Star, TrendingUp, Send } from 'lucide-react';

interface FeedbackResult {
  clarity_score: number;
  evidence_score: number;
  accuracy_score: number;
  overall_level: number;
  summary: string;
  constructive_provocation?: string;
  study_hints: string[];
  main_error: string;
  strengths: string;
}

interface Props {
  questionContent: string;
  scenario: string;
  modelAnswer: string;
  skill21: string;
  questionIndex: number;
  onFeedbackReceived?: (feedback: FeedbackResult) => void;
}

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: any }) {
  const color = score >= 7 ? 'bg-primary' : score >= 4 ? 'bg-yellow-500' : 'bg-destructive';
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{score}/10</span>
    </div>
  );
}

export default function PisaFeedbackPanel({ questionContent, scenario, modelAnswer, skill21, questionIndex, onFeedbackReceived }: Props) {
  const { toast } = useToast();
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      toast({ title: 'Escreva uma resposta antes de enviar.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pisa-feedback', {
        body: { questionContent, scenario, studentAnswer: answer, modelAnswer, skill21 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFeedback(data as FeedbackResult);
      onFeedbackReceived?.(data as FeedbackResult);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao gerar feedback', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const levelColor = feedback
    ? feedback.overall_level <= 2 ? 'text-destructive' : feedback.overall_level <= 4 ? 'text-yellow-600' : 'text-primary'
    : '';

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          <Send className="h-3 w-3" />
          Resposta do Aluno (Questão {questionIndex + 1})
        </Label>
        <Textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="O aluno escreve sua resposta aqui, explicando o raciocínio completo..."
          className="min-h-[100px] resize-y"
        />
      </div>

      <Button onClick={handleSubmit} disabled={loading || !answer.trim()} size="sm" className="w-full sm:w-auto">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
        {loading ? 'Analisando...' : 'Enviar para Feedback IA'}
      </Button>

      {feedback && (
        <div className="rounded-xl border bg-card p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Chat-style summary bubble */}
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 rounded-xl rounded-tl-none bg-muted/50 p-3">
              <p className="text-sm leading-relaxed">{feedback.summary}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={levelColor}>
                  <Star className="h-3 w-3 mr-1" />
                  Nível PISA {feedback.overall_level}
                </Badge>
              </div>
            </div>
          </div>

          {/* Score bars */}
          <div className="space-y-2">
            <ScoreBar label="Clareza" score={feedback.clarity_score} icon={MessageCircle} />
            <ScoreBar label="Evidências" score={feedback.evidence_score} icon={BookOpen} />
            <ScoreBar label="Precisão" score={feedback.accuracy_score} icon={TrendingUp} />
          </div>

          {/* Strengths */}
          {feedback.strengths && (
            <Alert className="border-primary/20 bg-primary/5">
              <Star className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-foreground/80">
                <strong>Pontos fortes:</strong> {feedback.strengths}
              </AlertDescription>
            </Alert>
          )}

          {/* Constructive provocation */}
          {feedback.constructive_provocation && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                <strong>Provocação:</strong> {feedback.constructive_provocation}
              </AlertDescription>
            </Alert>
          )}

          {/* Study hints */}
          {feedback.study_hints && feedback.study_hints.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Pistas de Estudo
              </p>
              <ul className="space-y-1">
                {feedback.study_hints.map((hint, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary">📌</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { FeedbackResult };
