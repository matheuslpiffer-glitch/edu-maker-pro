import { useState } from 'react';
import { Trophy, Wand2, Copy, FileDown, Loader2 } from 'lucide-react';
import matAvatar from '@/assets/mat-avatar.png';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const redesEnsino = [
  { value: 'mackenzie', label: 'Sistema Mackenzie', desc: 'Tradição e rigor acadêmico' },
  { value: 'poliedro', label: 'Poliedro', desc: 'Altíssima complexidade' },
  { value: 'anglo', label: 'Anglo', desc: 'Método espiral progressivo' },
  { value: 'coc', label: 'COC', desc: 'Foco em resultados objetivos' },
  { value: 'objetivo', label: 'Objetivo', desc: 'Abrangência e profundidade' },
  { value: 'pitagoras', label: 'Pitágoras', desc: 'Didática estruturada' },
];

interface GeneratedQuestion {
  content: string;
  options: { letter: string; text: string; isCorrect: boolean }[];
  skillCode?: string;
  descriptor?: string;
}

export default function AltaPerformance() {
  const { toast } = useToast();
  const [rede, setRede] = useState('');
  const [serie, setSerie] = useState('');
  const [disciplina, setDisciplina] = useState('');
  const [topicos, setTopicos] = useState('');
  const [totalQuestoes, setTotalQuestoes] = useState(10);
  const [niveis, setNiveis] = useState({ abaixo: 20, basico: 40, proficiente: 40 });
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [formato, setFormato] = useState('objetiva');

  const updateNivel = (key: keyof typeof niveis, value: number) => {
    const remaining = 100 - value;
    const otherKeys = (Object.keys(niveis) as (keyof typeof niveis)[]).filter(k => k !== key);
    const otherTotal = otherKeys.reduce((s, k) => s + niveis[k], 0);
    const newNiveis = { ...niveis, [key]: value };
    otherKeys.forEach(k => {
      newNiveis[k] = otherTotal > 0 ? Math.round((niveis[k] / otherTotal) * remaining) : Math.round(remaining / otherKeys.length);
    });
    // Ensure sum = 100
    const sum = Object.values(newNiveis).reduce((a, b) => a + b, 0);
    if (sum !== 100) newNiveis[otherKeys[otherKeys.length - 1]] += 100 - sum;
    setNiveis(newNiveis);
  };

  const redeInfo = redesEnsino.find(r => r.value === rede);

  const handleGenerate = async () => {
    if (!rede || !serie || !disciplina || !topicos) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setQuestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-simulator-questions', {
        body: {
          examType: 'alta_performance',
          subjectArea: disciplina,
          grade: serie,
          count: totalQuestoes,
          specificTopic: topicos,
          activeDna: rede,
          activeSpecialty: `alta_performance_${rede}`,
          difficulty: `Distribuição: ${niveis.abaixo}% Abaixo do Básico, ${niveis.basico}% Básico, ${niveis.proficiente}% Proficiente`,
          examModel: redeInfo?.label || rede,
        },
      });
      if (error) throw error;
      const parsed = Array.isArray(data) ? data : data?.questions || [];
      setQuestions(parsed);
      if (parsed.length === 0) toast({ title: 'Nenhuma questão gerada. Tente novamente.' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar simulado', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = questions.map((q, i) => {
      const opts = q.options?.map(o => `${o.letter}) ${o.text}`).join('\n') || '';
      return `Questão ${i + 1}\n${q.content.replace(/<[^>]*>/g, '')}\n${opts}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado para a área de transferência!' });
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = questions.map((q, i) => {
      const opts = q.options?.map(o => `<p style="margin:4px 0 4px 16px"><strong>${o.letter})</strong> ${o.text}</p>`).join('') || '';
      return `<div style="margin-bottom:24px;page-break-inside:avoid"><h3 style="margin:0 0 8px">Questão ${i + 1}</h3><div>${q.content}</div>${opts}</div>`;
    }).join('<hr/>');
    printWindow.document.write(`<html><head><title>Simulado Alta Performance</title><style>body{font-family:sans-serif;padding:32px;max-width:800px;margin:auto}h3{color:#1e3a5f}hr{border:none;border-top:1px solid #ddd;margin:16px 0}</style></head><body><h1 style="color:#1e3a5f">Simulado Alta Performance — ${redeInfo?.label || rede}</h1><p>${disciplina} • ${serie} • ${totalQuestoes} questões</p><hr/>${html}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(220,60%,15%)] to-[hsl(220,50%,25%)] p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(45,90%,60%,0.15),transparent_60%)]" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Gerador de Simulados — Alta Performance</h1>
            <p className="text-sm text-slate-300 mt-1">Crie avaliações com o rigor pedagógico das maiores franquias do país</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 space-y-5 shadow-sm">
            {/* Rede de Ensino */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Selecione a Rede de Ensino</Label>
              <Select value={rede} onValueChange={setRede}>
                <SelectTrigger><SelectValue placeholder="Escolha a rede..." /></SelectTrigger>
                <SelectContent>
                  {redesEnsino.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{r.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Formato da Questão */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Formato da Questão</Label>
              <ToggleGroup type="single" value={formato} onValueChange={v => { if (v) setFormato(v); }} className="w-full border border-border/50 rounded-lg p-1 bg-muted/30">
                <ToggleGroupItem value="objetiva" className="flex-1 rounded-md text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Objetiva (Múltipla Escolha)
                </ToggleGroupItem>
                <ToggleGroupItem value="discursiva" className="flex-1 rounded-md text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Discursiva (Aberta)
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Série e Disciplina */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Ano/Série</Label>
                <Input placeholder="Ex: 9° Ano" value={serie} onChange={e => setSerie(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Disciplina</Label>
                <Input placeholder="Ex: Matemática" value={disciplina} onChange={e => setDisciplina(e.target.value)} />
              </div>
            </div>

            {/* Tópicos */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tópicos da Prova</Label>
              <Textarea placeholder="Separe por vírgula: equações, geometria plana, funções..." value={topicos} onChange={e => setTopicos(e.target.value)} rows={3} />
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Quantidade de questões: {totalQuestoes}</Label>
              <Slider min={5} max={30} step={1} value={[totalQuestoes]} onValueChange={v => setTotalQuestoes(v[0])} />
            </div>

            {/* Distribuição de níveis */}
            <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Distribuição de Níveis</p>
              {([
                { key: 'abaixo' as const, label: 'Abaixo do Básico', color: 'bg-red-500' },
                { key: 'basico' as const, label: 'Básico', color: 'bg-amber-500' },
                { key: 'proficiente' as const, label: 'Proficiente', color: 'bg-emerald-500' },
              ]).map(n => (
                <div key={n.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${n.color}`} />
                      {n.label}
                    </span>
                    <span className="font-bold">{niveis[n.key]}%</span>
                  </div>
                  <Slider min={0} max={100} step={5} value={[niveis[n.key]]} onValueChange={v => updateNivel(n.key, v[0])} />
                </div>
              ))}
            </div>

            {/* Generate Button */}
            <Button onClick={handleGenerate} disabled={loading} size="lg" className="w-full text-base font-bold gap-2 h-14 bg-gradient-to-r from-primary to-[hsl(260,80%,55%)] hover:from-primary/90 hover:to-[hsl(260,80%,50%)] shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
              {loading ? 'Gerando Simulado...' : 'Gerar Simulado Premium'}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 min-h-[400px]">
            {!loading && questions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Trophy size={48} className="text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm">Configure os parâmetros e clique em <strong>Gerar Simulado Premium</strong></p>
              </div>
            )}

            {loading && (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-16 w-full" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && questions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 sticky top-0 bg-card/90 backdrop-blur-sm py-2 z-10">
                  <h2 className="text-lg font-bold flex-1">{questions.length} Questões Geradas</h2>
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1.5">
                    <Copy size={14} /> Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
                    <FileDown size={14} /> Exportar PDF
                  </Button>
                </div>
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Q{i + 1}</span>
                        {q.skillCode && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{q.skillCode}</span>}
                      </div>
                      <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: q.content }} />
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-1 pl-2">
                          {q.options.map((o, j) => (
                            <div key={j} className={`text-sm py-1.5 px-3 rounded-lg ${o.isCorrect ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/20' : 'text-foreground'}`}>
                              <strong>{o.letter})</strong> {o.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
