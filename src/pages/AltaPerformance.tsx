import { useState, useRef } from 'react';
import { Trophy, Wand2, Copy, FileDown, Loader2, Save, MessageCircle } from 'lucide-react';
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
  answerLines?: number;
  correctionMirror?: string;
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
  const previewRef = useRef<HTMLDivElement>(null);

  const isDiscursiva = formato === 'discursiva';

  const updateNivel = (key: keyof typeof niveis, value: number) => {
    const remaining = 100 - value;
    const otherKeys = (Object.keys(niveis) as (keyof typeof niveis)[]).filter(k => k !== key);
    const otherTotal = otherKeys.reduce((s, k) => s + niveis[k], 0);
    const newNiveis = { ...niveis, [key]: value };
    otherKeys.forEach(k => {
      newNiveis[k] = otherTotal > 0 ? Math.round((niveis[k] / otherTotal) * remaining) : Math.round(remaining / otherKeys.length);
    });
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
          isDiscursiva,
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

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

  const copyToClipboard = () => {
    const text = questions.map((q, i) => {
      if (isDiscursiva) {
        return `Questão ${i + 1}\n${stripHtml(q.content)}\n\n(Espaço para resposta)`;
      }
      const opts = q.options?.map(o => `${o.letter}) ${o.text}`).join('\n') || '';
      return `Questão ${i + 1}\n${stripHtml(q.content)}\n${opts}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado para a área de transferência!' });
  };

  const handleSaveQuestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Faça login para salvar', variant: 'destructive' }); return; }
      const questionsOnly = questions.map(q => ({
        content: q.content,
        options: isDiscursiva ? [] : q.options,
        skillCode: q.skillCode,
        descriptor: q.descriptor,
      }));
      await supabase.from('question_banks').insert({
        user_id: user.id,
        subject: disciplina,
        topic: topicos,
        grade: serie,
        purpose: `alta_performance_${rede}`,
        question_type: isDiscursiva ? 'discursiva' : 'objetiva',
        questions: questionsOnly as any,
        institution_name: redeInfo?.label || rede,
      });
      toast({ title: 'Questões salvas com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveGabarito = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Faça login para salvar', variant: 'destructive' }); return; }
      const gabaritoData = questions.map((q, i) => ({
        questionNumber: i + 1,
        correctionMirror: q.correctionMirror || '',
        correctOption: isDiscursiva ? null : q.options?.find(o => o.isCorrect)?.letter || '',
        skillCode: q.skillCode,
      }));
      await supabase.from('question_banks').insert({
        user_id: user.id,
        subject: disciplina,
        topic: `[GABARITO] ${topicos}`,
        grade: serie,
        purpose: `gabarito_${rede}`,
        question_type: isDiscursiva ? 'gabarito_discursivo' : 'gabarito_objetiva',
        questions: gabaritoData as any,
        institution_name: redeInfo?.label || rede,
      });
      toast({ title: 'Gabarito salvo com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar gabarito', description: e.message, variant: 'destructive' });
    }
  };

  const exportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const container = document.createElement('div');
    container.style.cssText = 'font-family:Inter,Arial,sans-serif;padding:0;max-width:800px;margin:auto;word-wrap:break-word;overflow-wrap:break-word;';

    // Header
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #1e3a5f;padding-bottom:16px;">
        <p style="font-size:10px;color:#666;margin:0;">EduCreator Pro | Por Matheus Lima Piffer</p>
        <h1 style="color:#1e3a5f;margin:8px 0 4px;">Simulado Alta Performance — ${redeInfo?.label || rede}</h1>
        <p style="margin:4px 0;font-size:13px;">${disciplina} • ${serie} • ${totalQuestoes} questões${isDiscursiva ? ' • Formato Discursivo' : ''}</p>
      </div>
    `;

    // Questions
    questions.forEach((q, i) => {
      let qHtml = `<div style="margin-bottom:20px;page-break-inside:avoid;">
        <h3 style="margin:0 0 8px;color:#1e3a5f;">Questão ${i + 1}</h3>
        <div style="word-wrap:break-word;overflow-wrap:break-word;">${q.content}</div>`;

      if (isDiscursiva) {
        const lines = q.answerLines || 10;
        for (let j = 0; j < lines; j++) {
          qHtml += `<div style="border-bottom:1px solid #ccc;height:28px;margin:0 0 2px;"></div>`;
        }
      } else if (q.options?.length) {
        q.options.forEach(o => {
          qHtml += `<p style="margin:4px 0 4px 16px;"><strong>${o.letter})</strong> ${o.text}</p>`;
        });
      }
      qHtml += '</div><hr style="border:none;border-top:1px solid #eee;margin:12px 0;"/>';
      container.innerHTML += qHtml;
    });

    // Gabarito on new page
    container.innerHTML += `<div style="page-break-before:always;"></div>`;
    container.innerHTML += `<h2 style="text-align:center;color:#1e3a5f;margin-bottom:16px;">Gabarito e Critérios de Avaliação</h2>`;

    questions.forEach((q, i) => {
      if (isDiscursiva) {
        container.innerHTML += `<div style="margin-bottom:16px;page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
          <p style="font-weight:bold;margin:0 0 4px;">Questão ${i + 1}</p>
          <div style="word-wrap:break-word;overflow-wrap:break-word;font-size:13px;color:#374151;">${q.correctionMirror || 'Critérios de correção não disponíveis.'}</div>
        </div>`;
      } else {
        const correct = q.options?.find(o => o.isCorrect);
        container.innerHTML += `<p style="margin:4px 0;"><strong>${i + 1}.</strong> ${correct?.letter || '—'}</p>`;
      }
    });

    container.innerHTML += `<p style="text-align:center;font-size:10px;color:#999;margin-top:32px;">EduCreator Pro — Por Matheus Lima Piffer</p>`;

    document.body.appendChild(container);
    await html2pdf().set({
      margin: [15, 15, 15, 15],
      filename: `simulado-alta-performance-${rede}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css'] },
    }).from(container).save();
    document.body.removeChild(container);
  };

  const handleWhatsApp = () => {
    const text = questions.map((q, i) => {
      if (isDiscursiva) {
        return `*Questão ${i + 1}*\n${stripHtml(q.content)}\n_(Espaço para resposta)_`;
      }
      const opts = q.options?.map(o => `${o.letter}) ${o.text}`).join('\n') || '';
      return `*Questão ${i + 1}*\n${stripHtml(q.content)}\n${opts}`;
    }).join('\n\n---\n\n');

    const msg = `🏫 *EduCreator Pro — Simulado Alta Performance*\n\n👤 Professor: Matheus Lima Piffer\n📚 Disciplina: ${disciplina}\n🎯 Rede: ${redeInfo?.label || rede}\n📝 Formato: ${isDiscursiva ? 'Discursivo' : 'Objetiva'}\n\n${text}\n\n✅ Gerado via EduCreator Pro`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
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

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tópicos da Prova</Label>
              <Textarea placeholder="Separe por vírgula: equações, geometria plana, funções..." value={topicos} onChange={e => setTopicos(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Quantidade de questões: {totalQuestoes}</Label>
              <Slider min={5} max={30} step={1} value={[totalQuestoes]} onValueChange={v => setTotalQuestoes(v[0])} />
            </div>

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
                    {!isDiscursiva && (
                      <div className="grid grid-cols-2 gap-2">
                        <Skeleton className="h-8" /><Skeleton className="h-8" />
                        <Skeleton className="h-8" /><Skeleton className="h-8" />
                      </div>
                    )}
                    {isDiscursiva && <Skeleton className="h-32 w-full" />}
                  </div>
                ))}
              </div>
            )}

            {!loading && questions.length > 0 && (
              <div className="space-y-4" ref={previewRef}>
                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-2 sticky top-0 bg-card/90 backdrop-blur-sm py-2 z-10">
                  <h2 className="text-lg font-bold flex-1">{questions.length} Questões {isDiscursiva ? 'Discursivas' : ''} Geradas</h2>
                  <Button variant="outline" size="sm" onClick={handleSaveQuestions} className="gap-1.5">
                    <Save size={14} /> Salvar Questões
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSaveGabarito} className="gap-1.5">
                    <Save size={14} /> Salvar Gabarito
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
                    <FileDown size={14} /> Exportar PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-1.5">
                    <MessageCircle size={14} /> WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1.5">
                    <Copy size={14} /> Copiar
                  </Button>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Q{i + 1}</span>
                        {q.skillCode && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{q.skillCode}</span>}
                        {isDiscursiva && <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">Discursiva</span>}
                      </div>
                      <div className="text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: q.content }} />
                      {!isDiscursiva && q.options && q.options.length > 0 && (
                        <div className="space-y-1 pl-2">
                          {q.options.map((o, j) => (
                            <div key={j} className={`text-sm py-1.5 px-3 rounded-lg ${o.isCorrect ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/20' : 'text-foreground'}`}>
                              <strong>{o.letter})</strong> {o.text}
                            </div>
                          ))}
                        </div>
                      )}
                      {isDiscursiva && (
                        <div className="mt-2 space-y-1">
                          {Array.from({ length: q.answerLines || 8 }).map((_, j) => (
                            <div key={j} className="border-b border-border/40 h-6" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Gabarito Section */}
                <div className="mt-8 rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
                  <h3 className="text-lg font-bold text-primary text-center">Gabarito e Critérios de Avaliação</h3>
                  {questions.map((q, i) => (
                    <div key={i} className="rounded-lg border border-border/40 bg-card p-3 space-y-1" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                      <p className="text-sm font-bold text-foreground">Questão {i + 1}</p>
                      {isDiscursiva ? (
                        <p className="text-sm text-muted-foreground break-words">{q.correctionMirror || 'Critérios de correção não disponíveis.'}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Resposta: <strong className="text-emerald-600 dark:text-emerald-400">{q.options?.find(o => o.isCorrect)?.letter || '—'}</strong>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mat Assistant */}
            <div className="mt-6 flex items-start gap-4 rounded-2xl border border-border/50 bg-muted/30 p-4">
              <img src={matAvatar} alt="Mat - Assistente EduCreator" className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30 shadow-md flex-shrink-0" />
              <div className="relative bg-card rounded-xl p-3 shadow-sm border border-border/40">
                <div className="absolute -left-2 top-4 w-3 h-3 bg-card border-l border-b border-border/40 rotate-45" />
                <p className="text-sm font-bold text-foreground">Mat — Seu Assistente EduCreator</p>
                <p className="text-xs text-muted-foreground mt-1">Estou aqui para ajudar! Configure os parâmetros ao lado e gere simulados com o padrão das maiores redes de ensino do Brasil. 🚀</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
