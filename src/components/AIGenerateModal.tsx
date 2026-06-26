import { useState } from 'react';
import { showAiErrorToast } from '@/lib/ai-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Loader2 } from 'lucide-react';
import SubjectSelect from '@/components/SubjectSelect';
import SkillSearch from '@/components/SkillSearch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface GeneratedQuestion {
  content: string;
  options: QuestionOption[];
  answer: string;
  difficulty: string;
  topic: string;
  type: string;
  subjectId: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onGenerate: (data: GeneratedQuestion) => void;
  /**
   * 'fill'   = devolve a questão para o formulário (padrão)
   * 'append' = insere direto na tabela `questions` (banco) e chama onGenerate só pra notificar
   */
  mode?: 'fill' | 'append';
  defaults?: {
    subjectId?: string;
    type?: string;
    difficulty?: string;
    topic?: string;
  };
}

export default function AIGenerateModal({ open, onOpenChange, subjects, onGenerate, mode = 'fill', defaults }: Props) {
  const { toast } = useToast();
  const [subjectId, setSubjectId] = useState(defaults?.subjectId || '');
  const [topic, setTopic] = useState(defaults?.topic || '');
  const [difficulty, setDifficulty] = useState(defaults?.difficulty || 'medium');
  const [type, setType] = useState(defaults?.type || 'multiple-choice');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('manual');

  // Re-aplica defaults quando o modal reabre.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => undefined);
  if (open && defaults && !subjectId && defaults.subjectId) {
    // hidrata uma única vez por abertura
  }

  const subjectName = subjects.find(s => s.id === subjectId)?.name || '';

  const persistIfAppend = async (generated: GeneratedQuestion) => {
    if (mode !== 'append') return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('questions').insert({
      user_id: user.id,
      subject_id: generated.subjectId,
      type: generated.type,
      difficulty: generated.difficulty,
      topic: generated.topic,
      content: generated.content,
      options: (generated.type === 'multiple-choice' ? generated.options : []) as any,
      answer: generated.type === 'essay' ? generated.answer : '',
    });
    toast({ title: 'Questão adicionada ao banco!', description: 'Nova questão criada com tipo/tópico diferentes.' });
  };

  const generateWithAI = async (skillCode: string, skillDescription: string, grade: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-question', {
        body: {
          skillCode,
          skillDescription,
          subjectName,
          grade,
          type,
          difficulty,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generated: GeneratedQuestion = {
        subjectId,
        type,
        difficulty,
        topic: `${skillCode} - ${skillDescription.substring(0, 60)}...`,
        content: data.content || '',
        options: type === 'multiple-choice'
          ? (data.options || []).map((o: any) => ({
              id: crypto.randomUUID(),
              text: o.text,
              isCorrect: o.isCorrect,
            }))
          : [],
        answer: type === 'essay' ? (data.answer || '') : '',
      };

      await persistIfAppend(generated);
      onGenerate(generated);
      onOpenChange(false);
      setTopic('');
    } catch (e: any) {
      console.error('AI generation error:', e);
      showAiErrorToast(e, toast, 'Erro ao gerar questão')
    } finally {
      setLoading(false);
    }
  };

  const handleSkillSelect = (skill: any) => {
    generateWithAI(skill.code, skill.description, skill.grade);
  };

  const handleManualGenerate = async () => {
    if (!subjectId || !topic) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-question', {
        body: {
          skillCode: '',
          skillDescription: topic,
          subjectName,
          grade: '',
          type,
          difficulty,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generated: GeneratedQuestion = {
        subjectId,
        type,
        difficulty,
        topic,
        content: data.content || '',
        options: type === 'multiple-choice'
          ? (data.options || []).map((o: any) => ({
              id: crypto.randomUUID(),
              text: o.text,
              isCorrect: o.isCorrect,
            }))
          : [],
        answer: type === 'essay' ? (data.answer || '') : '',
      };

      await persistIfAppend(generated);
      onGenerate(generated);
      onOpenChange(false);
      setTopic('');
    } catch (e: any) {
      console.error('AI generation error:', e);
      showAiErrorToast(e, toast, 'Erro ao gerar questão')
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Gerar Questão com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Common fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <SubjectSelect value={subjectId} onValueChange={setSubjectId} subjects={subjects} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Múltipla Escolha</SelectItem>
                    <SelectItem value="essay">Dissertativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Tópico Livre</TabsTrigger>
              <TabsTrigger value="curriculum">Escopo Curricular</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>Tópico</Label>
                <Input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Ex: Equações do 2º grau"
                  className="min-h-[44px]"
                />
              </div>
              <Button
                onClick={handleManualGenerate}
                className="w-full"
                disabled={loading || !subjectId || !topic}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {loading ? 'Gerando com IA...' : 'Gerar Questão'}
              </Button>
            </TabsContent>

            <TabsContent value="curriculum" className="mt-3">
              {!subjectId ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Selecione uma disciplina acima para buscar habilidades do Escopo Curricular.
                </p>
              ) : (
                <>
                  {loading && (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando questão com IA...
                    </div>
                  )}
                  <SkillSearch
                    subjectName={subjectName}
                    onSelectSkill={handleSkillSelect}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
