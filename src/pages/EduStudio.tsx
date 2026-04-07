import { useState, useEffect } from 'react';
import { startGeneration, getGeneration, clearGeneration } from '@/lib/background-generation';
import { GraduationCap, Wrench, PenLine, Sparkles, Coins, Loader2, ChevronLeft, FileDown, Copy, Check, Video, Mic, Camera, FileText, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ToolConfig {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  gradient: string;
  glow: string;
}

const tools: ToolConfig[] = [
  { id: 'simulados', title: 'IA de Simulados', desc: 'Questões inéditas alinhadas à BNCC/Rede Pedagógica com gabarito e AEE', icon: GraduationCap, gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/30' },
  { id: 'atividades', title: 'Atividades Maker', desc: 'Roteiros práticos para atividades autônomas em sala', icon: Wrench, gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/30' },
  { id: 'redacao', title: 'Dossiê de Redação', desc: 'Guia de leitura com textos de apoio e estrutura argumentativa', icon: PenLine, gradient: 'from-violet-600 to-fuchsia-600', glow: 'shadow-violet-500/30' },
  { id: 'scriptlab', title: 'ScriptLab', desc: 'Roteiros de aula completos com objetivos, momentos pedagógicos e avaliação', icon: FileText, gradient: 'from-yellow-500 to-amber-600', glow: 'shadow-yellow-500/30' },
];

const GRADES = ['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1ª Série EM', '2ª Série EM', '3ª Série EM'];
const SUBJECTS = ['Matemática', 'Língua Portuguesa', 'Ciências', 'História', 'Geografia', 'Inglês', 'Arte', 'Educação Física'];

export default function EduStudio() {
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Simulados params
  const [simGrade, setSimGrade] = useState('9º Ano');
  const [simSubject, setSimSubject] = useState('Matemática');
  const [simMatrix, setSimMatrix] = useState('saresp');
  const [simLevel, setSimLevel] = useState('regular');
  const [simCount, setSimCount] = useState('5');

  // Atividades params
  const [atiTheme, setAtiTheme] = useState('');
  const [atiGrade, setAtiGrade] = useState('6º Ano');
  const [atiDuration, setAtiDuration] = useState('50');

  // Redação params
  const [redTema, setRedTema] = useState('');
  const [redGrade, setRedGrade] = useState('Ensino Médio');

  // ScriptLab params
  const [slTopic, setSlTopic] = useState('');
  const [slGrade, setSlGrade] = useState('9º Ano');
  const [slSubject, setSlSubject] = useState('Matemática');
  const [slDuration, setSlDuration] = useState('50');
  const [slMethodology, setSlMethodology] = useState('expositiva-dialogada');

  // Restore background generation on mount
  useEffect(() => {
    const bg = getGeneration('edustudio');
    if (bg.status === 'running') {
      setLoading(true);
      const interval = setInterval(() => {
        const c = getGeneration('edustudio');
        if (c.status === 'done') {
          setResult(c.result); setLoading(false); clearGeneration('edustudio');
          toast({ title: 'Conteúdo gerado com sucesso! ✨' }); clearInterval(interval);
        } else if (c.status === 'error') {
          setLoading(false); clearGeneration('edustudio');
          toast({ title: 'Erro na geração', description: c.error || '', variant: 'destructive' }); clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    } else if (bg.status === 'done') {
      setResult(bg.result); clearGeneration('edustudio');
      toast({ title: 'Conteúdo gerado com sucesso! ✨' });
    } else if (bg.status === 'error') {
      toast({ title: 'Erro na geração', description: bg.error || '', variant: 'destructive' });
      clearGeneration('edustudio');
    }
  }, []);

  const generate = async () => {
    if (!activeTool) return;
    setLoading(true);
    setResult(null);

    let params: any = {};
    if (activeTool === 'simulados') {
      params = { grade: simGrade, subject: simSubject, matrix: simMatrix, level: simLevel, count: parseInt(simCount) };
    } else if (activeTool === 'atividades') {
      if (!atiTheme.trim()) { toast({ title: 'Informe o tema da atividade', variant: 'destructive' }); setLoading(false); return; }
      params = { theme: atiTheme.trim(), grade: atiGrade, duration: atiDuration };
    } else if (activeTool === 'redacao') {
      if (!redTema.trim()) { toast({ title: 'Informe o tema da redação', variant: 'destructive' }); setLoading(false); return; }
      params = { tema: redTema.trim(), grade: redGrade };
    } else if (activeTool === 'scriptlab') {
      if (!slTopic.trim()) { toast({ title: 'Informe o tema da aula', variant: 'destructive' }); setLoading(false); return; }
      params = { topic: slTopic.trim(), grade: slGrade, subject: slSubject, duration: slDuration, methodology: slMethodology };
    }

    const tool = activeTool;
    startGeneration('edustudio', async () => {
      const { data, error } = await supabase.functions.invoke('edu-studio-ai', {
        body: { tool, params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    });

    const interval = setInterval(() => {
      const c = getGeneration('edustudio');
      if (c.status === 'done') {
        setResult(c.result); setLoading(false); clearGeneration('edustudio');
        toast({ title: 'Conteúdo gerado com sucesso! ✨' }); clearInterval(interval);
      } else if (c.status === 'error') {
        setLoading(false); clearGeneration('edustudio');
        toast({ title: 'Erro na geração', description: c.error || '', variant: 'destructive' }); clearInterval(interval);
      }
    }, 500);
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Conteúdo copiado! 📋' });
  };

  const activeConfig = tools.find(t => t.id === activeTool);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#0c0a1d] via-[#1a1145] to-[#0d1a2e] p-8 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_60%)]" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px] uppercase tracking-widest font-bold mb-3">Creative IA</Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">EduStudio</h1>
            <p className="text-sm text-slate-400 mt-1.5 max-w-md">Hub de Inteligência Artificial Pedagógica. Gere simulados, atividades e dossiês de redação prontos para a sala de aula.</p>
          </div>
          <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-3">
            <Coins size={18} className="text-amber-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Créditos</p>
              <p className="text-lg font-black text-white tabular-nums">∞</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Cards */}
      {!activeTool && (
        <div className="space-y-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Ferramentas de IA</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => { setActiveTool(tool.id); setResult(null); }}
                  className="text-left rounded-2xl border border-slate-700/50 bg-white/[0.03] p-6 hover:bg-white/[0.06] hover:border-slate-600/50 hover:shadow-md transition-all group"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} shadow-lg ${tool.glow} group-hover:scale-110 transition-transform`}>
                    <tool.icon size={26} className="text-white" />
                  </div>
                  <p className="font-bold text-white mt-4 text-base">{tool.title}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{tool.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Multimedia Labs */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Laboratórios Multimídia <Badge variant="outline" className="ml-2 text-[9px] border-cyan-500/30 text-cyan-400">Em Breve</Badge></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'videolab', title: 'VideoLab', desc: 'Crie vídeo-aulas curtas com narração e legendas via IA', icon: Video, gradient: 'from-red-500 to-rose-600', glow: 'shadow-red-500/20' },
                { id: 'audiolab', title: 'AudioLab', desc: 'Gere podcasts educativos e áudio-resumos com voz sintetizada', icon: Mic, gradient: 'from-cyan-500 to-blue-600', glow: 'shadow-cyan-500/20' },
                { id: 'photolab', title: 'PhotoLab', desc: 'Ilustrações e imagens didáticas geradas por IA para suas aulas', icon: Camera, gradient: 'from-pink-500 to-purple-600', glow: 'shadow-pink-500/20' },
              ].map(lab => (
                <div
                  key={lab.id}
                  className="relative text-left rounded-2xl border border-slate-700/30 bg-white/[0.02] p-6 opacity-60 cursor-default"
                >
                  <div className="absolute top-3 right-3">
                    <Lock size={14} className="text-slate-500" />
                  </div>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${lab.gradient} shadow-lg ${lab.glow}`}>
                    <lab.icon size={26} className="text-white" />
                  </div>
                  <p className="font-bold text-white mt-4 text-base">{lab.title}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{lab.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Tool Form */}
      {activeTool && activeConfig && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <Button variant="ghost" size="sm" onClick={() => { setActiveTool(null); setResult(null); }} className="text-slate-400 hover:text-white">
            <ChevronLeft size={16} className="mr-1" /> Voltar
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${activeConfig.gradient}`}>
              <activeConfig.icon size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">{activeConfig.title}</p>
              <p className="text-xs text-muted-foreground">{activeConfig.desc}</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              {activeTool === 'simulados' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Série</Label>
                    <Select value={simGrade} onValueChange={setSimGrade}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Disciplina</Label>
                    <Select value={simSubject} onValueChange={setSimSubject}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Matriz</Label>
                    <Select value={simMatrix} onValueChange={setSimMatrix}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saresp">Avaliação de Larga Escala (Pública)</SelectItem>
                        <SelectItem value="mackenzie">Banca Acadêmica (Particular)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nível</Label>
                    <Select value={simLevel} onValueChange={setSimLevel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="aee">AEE (Inclusão)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Questões</Label>
                    <Select value={simCount} onValueChange={setSimCount}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['3', '5', '8', '10'].map(n => <SelectItem key={n} value={n}>{n} questões</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activeTool === 'atividades' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tema da Atividade *</Label>
                    <Input placeholder="Ex: Energia Solar" value={atiTheme} onChange={e => setAtiTheme(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Série</Label>
                    <Select value={atiGrade} onValueChange={setAtiGrade}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duração (min)</Label>
                    <Select value={atiDuration} onValueChange={setAtiDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['30', '40', '50', '60', '90'].map(d => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activeTool === 'redacao' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tema da Redação *</Label>
                    <Input placeholder="Ex: Inteligência Artificial na Educação" value={redTema} onChange={e => setRedTema(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nível</Label>
                    <Select value={redGrade} onValueChange={setRedGrade}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9º Ano">9º Ano</SelectItem>
                        <SelectItem value="Ensino Médio">Ensino Médio</SelectItem>
                        <SelectItem value="Pré-Vestibular">Pré-Vestibular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {activeTool === 'scriptlab' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                    <Label>Tema da Aula *</Label>
                    <Input placeholder="Ex: Equações do 2º Grau" value={slTopic} onChange={e => setSlTopic(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Disciplina</Label>
                    <Select value={slSubject} onValueChange={setSlSubject}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Série</Label>
                    <Select value={slGrade} onValueChange={setSlGrade}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duração</Label>
                    <Select value={slDuration} onValueChange={setSlDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['30', '40', '50', '60', '90', '120'].map(d => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Metodologia</Label>
                    <Select value={slMethodology} onValueChange={setSlMethodology}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expositiva-dialogada">Expositiva Dialogada</SelectItem>
                        <SelectItem value="sala-invertida">Sala de Aula Invertida</SelectItem>
                        <SelectItem value="gamificacao">Gamificação</SelectItem>
                        <SelectItem value="maker">Cultura Maker / Mão na Massa</SelectItem>
                        <SelectItem value="problematizacao">Aprendizagem Baseada em Problemas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button onClick={generate} disabled={loading} className="w-full sm:w-auto gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? 'A IA está pensando...' : 'Gerar com IA'}
              </Button>
            </CardContent>
          </Card>

          {/* Loading overlay */}
          {loading && (
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8 text-center space-y-3">
              <Loader2 size={40} className="animate-spin text-violet-400 mx-auto" />
              <p className="text-sm font-medium text-violet-300">A IA está gerando seu conteúdo...</p>
              <div className="w-48 mx-auto h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                  {copied ? 'Copiado!' : 'Copiar Tudo'}
                </Button>
              </div>

              {activeTool === 'simulados' && <SimuladosResult data={result} />}
              {activeTool === 'atividades' && <AtividadesResult data={result} />}
              {activeTool === 'redacao' && <RedacaoResult data={result} />}
              {activeTool === 'scriptlab' && <ScriptLabResult data={result} />}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-6 border-t border-slate-800/50">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Plataforma Multimídia Autoral | Desenvolvido por <span className="text-foreground/70">Matheus Lima Piffer</span>
        </p>
      </div>
    </div>
  );
}

/* ——— Result Renderers ——— */

function SimuladosResult({ data }: { data: any }) {
  const questoes = data?.questoes || [];
  return (
    <div className="space-y-4">
      {questoes.map((q: any, i: number) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-start gap-3">
              <Badge className="shrink-0 mt-0.5">{i + 1}</Badge>
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium">{q.enunciado}</p>
                <div className="space-y-1">
                  {(q.alternativas || []).map((alt: any, j: number) => (
                    <div key={j} className={`text-sm px-3 py-1.5 rounded-lg border ${alt.correta ? 'bg-emerald-500/10 border-emerald-500/30 font-semibold' : 'bg-muted/30 border-transparent'}`}>
                      <span className="font-bold mr-2">{alt.letra})</span>{alt.texto}
                    </div>
                  ))}
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-primary font-medium">Ver justificativa</summary>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{q.justificativa}</p>
                  {q.habilidade && <p className="mt-1 text-[10px] text-muted-foreground/70">Habilidade: {q.habilidade}</p>}
                  {q.suporte_visual && <p className="mt-1 text-[10px] text-blue-400">🖼️ Suporte visual: {q.suporte_visual}</p>}
                </details>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AtividadesResult({ data }: { data: any }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold">{data.titulo}</h2>
          <p className="text-sm text-muted-foreground mt-1">{data.objetivo}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">{data.tempo_estimado} min</Badge>
            <Badge variant="outline">{data.nivel_dificuldade}</Badge>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Materiais</p>
          <div className="flex flex-wrap gap-1.5">
            {(data.materiais || []).map((m: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Passo a Passo</p>
          {(data.passos || []).map((p: any, i: number) => (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {p.numero || i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{p.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.instrucao}</p>
                {p.dica && <p className="text-xs text-amber-500 mt-1">💡 {p.dica}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Pergunta Reflexiva</p>
          <p className="text-sm italic">"{data.pergunta_reflexiva}"</p>
        </div>

        {data.conexao_bncc && (
          <p className="text-[10px] text-muted-foreground">BNCC: {data.conexao_bncc}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RedacaoResult({ data }: { data: any }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <Badge className="mb-2">Dossiê de Leitura</Badge>
          <h2 className="text-xl font-bold">{data.tema}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{data.contextualizacao}</p>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Textos de Apoio</p>
          {(data.textos_apoio || []).map((t: any, i: number) => (
            <div key={i} className="rounded-xl bg-muted/30 border p-4">
              <p className="text-sm font-semibold">{t.titulo}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.conteudo}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-2 italic">Fonte: {t.fonte}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Perguntas para Debate</p>
          <ol className="space-y-2">
            {(data.perguntas_debate || []).map((p: string, i: number) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>

        {data.estrutura_sugerida && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Estrutura Sugerida</p>
            <div className="space-y-2">
              {Object.entries(data.estrutura_sugerida).map(([key, val]) => (
                <div key={key} className="flex gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0 text-[10px]">{key.replace(/_/g, ' ')}</Badge>
                  <span className="text-muted-foreground">{val as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.palavras_chave && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Palavras-chave</p>
            <div className="flex flex-wrap gap-1.5">
              {(data.palavras_chave || []).map((p: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
              ))}
            </div>
          </div>
        )}

        {data.armadilhas && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">⚠️ Armadilhas a Evitar</p>
            <ul className="space-y-1">
              {(data.armadilhas || []).map((a: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-red-400">✗</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScriptLabResult({ data }: { data: any }) {
  const METHODOLOGY_LABELS: Record<string, string> = {
    'expositiva-dialogada': 'Expositiva Dialogada',
    'sala-invertida': 'Sala de Aula Invertida',
    'gamificacao': 'Gamificação',
    'maker': 'Cultura Maker',
    'problematizacao': 'ABP',
  };
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <Badge className="mb-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0">Roteiro de Aula</Badge>
          <h2 className="text-xl font-bold">{data.titulo}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary">{data.disciplina}</Badge>
            <Badge variant="secondary">{data.serie}</Badge>
            <Badge variant="secondary">{data.duracao_minutos} min</Badge>
            {data.metodologia && <Badge variant="outline">{METHODOLOGY_LABELS[data.metodologia] || data.metodologia}</Badge>}
          </div>
        </div>

        {data.objetivo && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Objetivo de Aprendizagem</p>
            <p className="text-sm">{data.objetivo}</p>
          </div>
        )}

        {data.competencias_bncc && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Competências / Habilidades BNCC</p>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(data.competencias_bncc) ? data.competencias_bncc : [data.competencias_bncc]).map((c: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
              ))}
            </div>
          </div>
        )}

        {data.recursos && data.recursos.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Recursos Necessários</p>
            <div className="flex flex-wrap gap-1.5">
              {data.recursos.map((r: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Momentos da Aula</p>
          {(data.momentos || []).map((m: any, i: number) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-sm font-bold text-white shadow">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{m.titulo}</p>
                  <p className="text-[10px] text-muted-foreground">{m.duracao}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.descricao}</p>
              {m.dica_professor && (
                <p className="text-xs text-amber-500">💡 Dica: {m.dica_professor}</p>
              )}
            </div>
          ))}
        </div>

        {data.avaliacao && (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Avaliação / Verificação</p>
            <p className="text-sm">{data.avaliacao}</p>
          </div>
        )}

        {data.tarefa_casa && (
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Tarefa de Casa</p>
            <p className="text-sm">{data.tarefa_casa}</p>
          </div>
        )}

        {data.reflexao_final && (
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-1">Reflexão Final</p>
            <p className="text-sm italic">"{data.reflexao_final}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
