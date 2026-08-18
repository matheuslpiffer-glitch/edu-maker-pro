import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Save, Loader2, Plus, Trash2, ArrowLeft, AlertCircle, BookOpen, Wand2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import RichTextEditor from '@/components/RichTextEditor';
import AIGenerateModal from '@/components/AIGenerateModal';
import SubjectSelect from '@/components/SubjectSelect';
import { getBnccPrefix } from '@/lib/subjects-data';
import MathRenderer from '@/components/MathRenderer';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Subject { id: string; name: string; color: string; }

export default function CreateQuestion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState('multiple-choice');
  const [difficulty, setDifficulty] = useState('medium');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: crypto.randomUUID(), text: '', isCorrect: true },
    { id: crypto.randomUUID(), text: '', isCorrect: false },
    { id: crypto.randomUUID(), text: '', isCorrect: false },
    { id: crypto.randomUUID(), text: '', isCorrect: false },
  ]);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAppendOpen, setAiAppendOpen] = useState(false);
  const [generatingResolution, setGeneratingResolution] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [latexMode, setLatexMode] = useState(false);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    return content.trim() !== '' || 
           topic.trim() !== '' || 
           answer.trim() !== '' || 
           explanation.trim() !== '' ||
           options.some(opt => opt.text.trim() !== '');
  }, [content, topic, answer, explanation, options]);

  const handleCancel = () => {
    if (isDirty) {
      setPendingRoute('/questoes');
      setShowExitDialog(true);
    } else {
      navigate('/questoes');
    }
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    if (pendingRoute) navigate(pendingRoute);
  };

  useEffect(() => {
    async function load() {
      const { data: subs } = await supabase.from('subjects').select('*').order('name');
      setSubjects((subs as Subject[]) || []);

      if (id) {
        const { data: q } = await supabase.from('questions').select('*').eq('id', id).maybeSingle();
        if (q) {
          setSubjectId(q.subject_id);
          setType(q.type);
          setDifficulty(q.difficulty);
          setTopic(q.topic);
          setContent(q.content);
          setOptions(q.options as unknown as QuestionOption[] || []);
          setAnswer(q.answer);
          setExplanation(q.explanation || '');
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // BNCC prefix hint
  const selectedSubject = subjects.find(s => s.id === subjectId);
  const bnccPrefix = selectedSubject ? getBnccPrefix(selectedSubject.name) : '';

  const handleSave = async () => {
    if (!user || !subjectId || !content.trim()) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      subject_id: subjectId,
      type,
      difficulty,
      topic,
      content,
      options: (type === 'multiple-choice' ? options : []) as unknown as any,
      answer: type === 'essay' ? answer : '',
      explanation: explanation || null,
    };

    if (id) {
      const { error } = await supabase.from('questions').update(payload).eq('id', id);
      if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); }
      else { toast({ title: 'Questão atualizada!' }); navigate('/questoes'); }
    } else {
      const { error } = await supabase.from('questions').insert(payload);
      if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); }
      else { toast({ title: 'Questão criada!' }); navigate('/questoes'); }
    }
    setSaving(false);
  };

  const handleAIGenerate = (data: any) => {
    setSubjectId(data.subjectId);
    setType(data.type);
    setDifficulty(data.difficulty);
    setTopic(data.topic);
    setContent(data.content);
    if (data.type === 'multiple-choice') setOptions(data.options);
    if (data.type === 'essay') setAnswer(data.answer);
    setExplanation('');
    toast({ title: 'Questão gerada pela IA!', description: 'Edite como desejar antes de salvar.' });
  };

  const handleGenerateResolution = async () => {
    if (!content.trim()) {
      toast({ title: 'Escreva o enunciado antes de gerar a resolução.', variant: 'destructive' });
      return;
    }
    setGeneratingResolution(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-resolution', {
        body: {
          content,
          options: options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
          answer,
          type,
          subjectName: selectedSubject?.name || '',
          topic,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setExplanation(data?.explanation || '');
      toast({ title: 'Resolução comentada gerada!', description: 'Revise e edite antes de salvar.' });
    } catch (e: any) {
      console.error('generate-resolution error:', e);
      toast({ title: 'Erro ao gerar resolução', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingResolution(false);
    }
  };

  const variantPool = ['aplicações práticas', 'interpretação de problema', 'contexto interdisciplinar', 'erros comuns'];
  const variantTopic = topic
    ? `${topic} — ${variantPool[Math.floor(Math.random() * variantPool.length)]}`
    : variantPool[Math.floor(Math.random() * variantPool.length)];
  const invertedType = type === 'multiple-choice' ? 'essay' : 'multiple-choice';

  const updateOption = (idx: number, text: string) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, text } : o));
  };

  const setCorrect = (idx: number) => {
    setOptions(prev => prev.map((o, i) => ({ ...o, isCorrect: i === idx })));
  };

  const addOption = () => {
    if (options.length >= 5) return;
    setOptions(prev => [...prev, { id: crypto.randomUUID(), text: '', isCorrect: false }]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const removed = options[idx];
    const newOpts = options.filter((_, i) => i !== idx);
    if (removed.isCorrect && newOpts.length > 0) newOpts[0].isCorrect = true;
    setOptions(newOpts);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCancel}
          disabled={saving}
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-bold">{id ? 'Editar Questão' : 'Nova Questão'}</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Dados da Questão</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAiOpen(true)} disabled={saving}>
              <Sparkles className="h-4 w-4 mr-2" />Gerar com IA
            </Button>
            <Button
              variant="outline"
              onClick={() => setAiAppendOpen(true)}
              disabled={saving || !content.trim() || !subjectId}
              title="Gera uma 2ª questão (tipo/tópico diferentes) e adiciona direto ao banco"
            >
              <BookOpen className="h-4 w-4 mr-2" />Gerar outra p/ banco
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Disciplina *</Label>
              <SubjectSelect value={subjectId} onValueChange={setSubjectId} subjects={subjects} disabled={saving} />
              {bnccPrefix && (
                <p className="text-xs text-muted-foreground">
                  💡 Prefixo BNCC: <span className="font-mono font-semibold text-primary">{bnccPrefix}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tópico / Habilidade</Label>
               <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder={bnccPrefix ? `Ex: ${bnccPrefix}01 – Tema...` : 'Ex: Potenciação'}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
               <Label>Tipo</Label>
              <Select value={type} onValueChange={setType} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Múltipla Escolha</SelectItem>
                  <SelectItem value="essay">Dissertativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label>Dificuldade</Label>
              <Select value={difficulty} onValueChange={setDifficulty} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Enunciado *</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="latex-mode" className="text-xs text-muted-foreground cursor-pointer">
                  Modo LaTeX
                </Label>
                <Switch id="latex-mode" checked={latexMode} onCheckedChange={setLatexMode} disabled={saving} />
              </div>
            </div>
            {latexMode ? (
              <>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={'Digite usando LaTeX. Ex: Resolva $x^2 + 2x - 3 = 0$ ou $$\\frac{a}{b} = \\sqrt{c}$$'}
                  className="min-h-[140px] font-mono text-sm"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="font-mono">$...$</code> para fórmulas inline e <code className="font-mono">$$...$$</code> para bloco.
                </p>
                {content.trim() && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-2">Pré-visualização:</p>
                    <MathRenderer content={content} />
                  </div>
                )}
              </>
            ) : (
              <RichTextEditor value={content} onChange={setContent} placeholder="Digite o enunciado da questão..." disabled={saving} />
            )}
          </div>

          {type === 'multiple-choice' && (
            <div className="space-y-3">
              <Label>Alternativas</Label>
              {options.map((opt, i) => (
                <div key={opt.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                  <button
                    type="button"
                     onClick={() => setCorrect(i)}
                    disabled={saving}
                    className={`flex items-center justify-center h-8 w-8 rounded-full border-2 text-xs font-bold shrink-0 transition-colors ${
                      opt.isCorrect ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                   <Input
                    value={opt.text}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                    className="flex-1"
                    disabled={saving}
                  />
                  {options.length > 2 && (
                     <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(i)} className="ml-2" disabled={saving}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                  </div>
                {latexMode && opt.text.trim() && (
                  <div className="ml-10 rounded border bg-muted/30 px-3 py-1.5 text-sm">
                    <MathRenderer content={opt.text} />
                  </div>
                )}
                </div>
              ))}
              {options.length < 5 && (
                 <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={saving}>
                  <Plus size={14} className="mr-1" />Adicionar alternativa
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Clique na letra para marcar a alternativa correta.</p>
            </div>
          )}

          {type === 'essay' && (
            <div className="space-y-2">
              <Label>Resposta Esperada (Gabarito)</Label>
              <textarea
                value={answer}
                 onChange={e => setAnswer(e.target.value)}
                placeholder="Descreva a resposta esperada..."
                className="w-full min-h-[100px] rounded-lg border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={saving}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Resolução Comentada (anexada ao gabarito)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateResolution}
                disabled={saving || generatingResolution || !content.trim()}
              >
                {generatingResolution ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Gerar resolução com IA
              </Button>
            </div>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Passo a passo + justificativa de cada alternativa. Aparece no gabarito do PDF/DOCX."
              className="min-h-[120px] text-sm"
              disabled={saving || generatingResolution}
            />
            {explanation.trim() && latexMode && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-2">Pré-visualização:</p>
                <MathRenderer content={explanation} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <AIGenerateModal
        open={aiOpen}
        onOpenChange={(val) => !saving && setAiOpen(val)}
        subjects={subjects}
        onGenerate={handleAIGenerate}
      />

      {/* 2ª geração — variar tipo/tópico e inserir direto no banco */}
      <AIGenerateModal
        open={aiAppendOpen}
        onOpenChange={(val) => !saving && setAiAppendOpen(val)}
        subjects={subjects}
        onGenerate={() => { /* já persistido em modo append */ }}
        mode="append"
        defaults={{
          subjectId,
          type: invertedType,
          difficulty,
          topic: variantTopic,
        }}
      />

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas nesta questão. Deseja realmente sair? Os dados digitados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair sem Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
