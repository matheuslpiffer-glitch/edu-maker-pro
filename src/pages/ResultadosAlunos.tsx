import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, Search, Loader2, Trash2, Download, Sparkles, Printer, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ActivityResult {
  id: string;
  bank_id: string;
  student_name: string;
  student_class: string;
  score: number;
  total_questions: number;
  percentage: number;
  status: string;
  created_at: string;
  corrections: any[];
  _type: 'activity';
}

interface SimulatorResult {
  id: string;
  simulator_id: string;
  student_name: string;
  student_class: string;
  correct_count: number;
  total_questions: number;
  percentage: number;
  proficiency_level: string;
  created_at: string;
  _type: 'simulator';
}

type UnifiedResult = ActivityResult | SimulatorResult;

interface BankInfo { id: string; subject: string; topic: string; grade: string; }
interface SimInfo { id: string; title: string; subject_area: string; grade: string; }

interface EssayInfo {
  id: string;
  student_name: string;
  student_class: string;
  total_score: number | null;
  banca: string;
  scores: any;
  status: string;
  created_at: string;
}

export default function ResultadosAlunos() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [actResults, setActResults] = useState<ActivityResult[]>([]);
  const [simResults, setSimResults] = useState<SimulatorResult[]>([]);
  const [essayResults, setEssayResults] = useState<EssayInfo[]>([]);
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [sims, setSims] = useState<SimInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [activeTab, setActiveTab] = useState('todos');
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const extrasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [actRes, simRes, bankRes, simInfoRes, essayRes] = await Promise.all([
        supabase.from('student_activity_results').select('*').eq('teacher_user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('student_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('question_banks').select('id, subject, topic, grade').eq('user_id', user.id),
        supabase.from('simulators').select('id, title, subject_area, grade').eq('user_id', user.id),
        supabase.from('essay_submissions').select('id, student_name, student_class, total_score, banca, scores, status, created_at').eq('teacher_user_id', user.id).order('created_at', { ascending: false }),
      ]);

      setActResults((actRes.data || []).map((r: any) => ({ ...r, _type: 'activity' as const })));
      setSimResults((simRes.data || []).map((r: any) => ({ ...r, _type: 'simulator' as const })));
      setBanks((bankRes.data as any[]) || []);
      setSims((simInfoRes.data as any[]) || []);
      setEssayResults((essayRes.data as any[]) || []);
    } catch {
      toast({ title: 'Erro ao carregar resultados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: UnifiedResult) => {
    if (item._type === 'activity') {
      await supabase.from('student_activity_results').delete().eq('id', item.id);
      setActResults(prev => prev.filter(r => r.id !== item.id));
    } else {
      await supabase.from('student_results').delete().eq('id', item.id);
      setSimResults(prev => prev.filter(r => r.id !== item.id));
    }
    toast({ title: 'Resultado removido.' });
  };

  const allResults: UnifiedResult[] = useMemo(() => {
    const combined = [...actResults, ...simResults];
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [actResults, simResults]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(allResults.map(r => r.student_class).filter(Boolean));
    return Array.from(classes).sort();
  }, [allResults]);

  const getLabel = (item: UnifiedResult) => {
    if (item._type === 'activity') {
      const b = banks.find(b => b.id === (item as ActivityResult).bank_id);
      return b ? `${b.subject} — ${b.topic}` : 'Atividade';
    }
    const s = sims.find(s => s.id === (item as SimulatorResult).simulator_id);
    return s ? s.title : 'Simulado';
  };

  const getScore = (item: UnifiedResult) => {
    if (item._type === 'activity') {
      const a = item as ActivityResult;
      return a.status === 'corrigido' ? `${a.score}/${a.total_questions}` : '—';
    }
    const s = item as SimulatorResult;
    return `${s.correct_count}/${s.total_questions}`;
  };

  const getPercentage = (item: UnifiedResult) => {
    if (item._type === 'activity') {
      return (item as ActivityResult).status === 'corrigido' ? item.percentage : null;
    }
    return item.percentage;
  };

  const getStatus = (item: UnifiedResult) => {
    if (item._type === 'activity') return (item as ActivityResult).status === 'corrigido' ? 'Corrigido' : 'Aguardando Revisão';
    return 'Corrigido';
  };

  const filtered = useMemo(() => {
    return allResults.filter(r => {
      if (search && !r.student_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterClass !== 'all' && r.student_class !== filterClass) return false;
      if (activeTab === 'atividades' && r._type !== 'activity') return false;
      if (activeTab === 'simulados' && r._type !== 'simulator') return false;
      return true;
    });
  }, [allResults, search, filterClass, activeTab]);

  // Compute common errors from corrections with skill detection
  const commonErrors = useMemo(() => {
    const errorMap: Record<string, { count: number; skill: string }> = {};
    const skillKeywords: [string, string][] = [
      ['conjunto', 'Teoria dos Conjuntos'], ['subconjunto', 'Teoria dos Conjuntos'],
      ['fração', 'Números Racionais'], ['dízima', 'Números Racionais'], ['racional', 'Números Racionais'],
      ['potência', 'Potenciação'], ['expoente', 'Potenciação'], ['potenciação', 'Potenciação'],
      ['equação', 'Equações'], ['inequação', 'Inequações'],
      ['geometria', 'Geometria'], ['ângulo', 'Geometria'], ['triângulo', 'Geometria'],
      ['área', 'Geometria Plana'], ['perímetro', 'Geometria Plana'],
      ['probabilidade', 'Probabilidade'], ['estatística', 'Estatística'],
      ['porcentagem', 'Porcentagem'], ['juros', 'Matemática Financeira'],
      ['função', 'Funções'], ['gráfico', 'Análise Gráfica'],
      ['logaritmo', 'Logaritmos'], ['raiz', 'Radiciação'],
      ['matriz', 'Matrizes'], ['determinante', 'Matrizes'],
      ['progressão', 'Progressões'], ['PA', 'Progressão Aritmética'], ['PG', 'Progressão Geométrica'],
    ];

    const detectSkill = (text: string): string => {
      const lower = text.toLowerCase();
      for (const [kw, skill] of skillKeywords) {
        if (lower.includes(kw.toLowerCase())) return skill;
      }
      return 'Conteúdo Geral';
    };

    actResults.forEach(r => {
      if (!r.corrections || !Array.isArray(r.corrections)) return;
      (r.corrections as any[]).forEach((c: any) => {
        if (!c.isCorrect && c.content) {
          const key = c.content.slice(0, 80);
          if (!errorMap[key]) errorMap[key] = { count: 0, skill: detectSkill(c.content) };
          errorMap[key].count++;
        }
      });
    });
    return Object.entries(errorMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([q, data]) => ({ question: q, count: data.count, skill: data.skill }));
  }, [actResults]);

  // Essay averages
  const essayAvg = useMemo(() => {
    const corrected = essayResults.filter(e => e.total_score != null && e.total_score > 0);
    if (corrected.length === 0) return null;
    const avg = Math.round(corrected.reduce((s, e) => s + (e.total_score || 0), 0) / corrected.length);
    return { avg, count: corrected.length };
  }, [essayResults]);

  // Generate AI tips based on errors
  const handleGenerateTips = async () => {
    setLoadingTips(true);
    try {
      const errorsText = commonErrors.map(e => `"${e.question}" (${e.count} erros)`).join('; ');
      const simAvg = simResults.length > 0
        ? Math.round(simResults.reduce((s, r) => s + Number(r.percentage), 0) / simResults.length)
        : null;
      const essayText = essayAvg ? `Média de redações: ${essayAvg.avg} pontos (${essayAvg.count} corrigidas).` : '';

      const { data, error } = await supabase.functions.invoke('pedagogical-insights', {
        body: {
          examType: 'Relatório Integrado',
          subjectArea: 'Geral',
          grade: '',
          totalStudents: allResults.length,
          averageScore: simAvg || 0,
          distribution: {},
          additionalContext: `Erros mais comuns em atividades: ${errorsText}. ${essayText}. Sugira 5 dinâmicas lúdicas de alta fixação (Nuvem de Palavras, Caça-Erros, Labirinto de Decisão, Cruzadinha, Stop) contextualizadas para corrigir esses erros.`,
        },
      });

      if (error) throw error;
      const insights = data as any;
      const tips: string[] = [];
      if (insights?.general_analysis) tips.push(insights.general_analysis);
      if (insights?.suggestions?.length) tips.push(...insights.suggestions);
      if (insights?.ludic_activities?.length) tips.push(...insights.ludic_activities);
      if (tips.length === 0 && typeof data === 'object') {
        // fallback: extract any string values
        Object.values(data).forEach(v => {
          if (typeof v === 'string' && v.length > 10) tips.push(v);
          if (Array.isArray(v)) v.forEach(x => { if (typeof x === 'string') tips.push(x); });
        });
      }
      setAiTips(tips.length > 0 ? tips : ['Nenhuma sugestão disponível no momento. Tente novamente com mais dados.']);
      toast({ title: '🤖 Dicas da IA Doutora geradas!' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao gerar dicas', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingTips(false);
    }
  };

  // Print extras with signature fields
  const handlePrintExtras = async () => {
    const el = extrasRef.current;
    if (!el) {
      toast({ title: 'Nenhuma dica gerada ainda.', variant: 'destructive' });
      return;
    }
    try {
      const { generatePdfFromElement } = await import('@/lib/pdf-utils');
      await generatePdfFromElement(el, 'atividades-extras-pos-simulado', { margins: [10, 10, 10, 10] });
      toast({ title: '📄 PDF gerado com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  };

  // CSV export
  const handleExportCSV = () => {
    const header = 'Nome do Aluno,Turma,Atividade,Nota,Porcentagem,Status,Data\n';
    const rows = filtered.map(r => {
      const pct = getPercentage(r);
      return [
        `"${r.student_name}"`,
        `"${r.student_class}"`,
        `"${getLabel(r)}"`,
        `"${getScore(r)}"`,
        pct != null ? `${pct}%` : '—',
        `"${getStatus(r)}"`,
        new Date(r.created_at).toLocaleDateString('pt-BR'),
      ].join(',');
    }).join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados_alunos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '📊 Relatório exportado para CSV!' });
  };

  // Chart data
  const chartData = useMemo(() => {
    const byLabel: Record<string, { total: number; count: number; label: string }> = {};
    filtered.forEach(r => {
      const pct = getPercentage(r);
      if (pct == null) return;
      const label = getLabel(r);
      if (!byLabel[label]) byLabel[label] = { total: 0, count: 0, label };
      byLabel[label].total += pct;
      byLabel[label].count++;
    });
    return Object.values(byLabel).map(b => ({
      label: b.label.length > 30 ? b.label.slice(0, 30) + '…' : b.label,
      average: Math.round(b.total / b.count),
    }));
  }, [filtered, banks, sims]);

  const maxAvg = Math.max(...chartData.map(d => d.average), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <BarChart3 size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Resultados e Desempenho</h1>
            <p className="text-sm text-muted-foreground">Relatório integrado: Simulados Técnicos + Redação Elite + Atividades</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0} className="gap-2">
          <Download size={14} /> Exportar CSV
        </Button>
      </div>

      {/* Stats with essay integration */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black text-primary">{allResults.length}</p>
          <p className="text-xs text-muted-foreground">Respostas Recebidas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black text-foreground">{uniqueClasses.length}</p>
          <p className="text-xs text-muted-foreground">Turmas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black text-primary">{actResults.length}</p>
          <p className="text-xs text-muted-foreground">Atividades</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black text-primary">{simResults.length}</p>
          <p className="text-xs text-muted-foreground">Simulados</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black text-primary">{essayAvg ? essayAvg.avg : '—'}</p>
          <p className="text-xs text-muted-foreground">Média Redação {essayAvg ? `(${essayAvg.count})` : ''}</p>
        </div>
      </div>

      {/* Common Errors + AI Tips */}
      {(commonErrors.length > 0 || essayAvg) && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                Dicas da IA Doutora — Pós-Simulado
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleGenerateTips} disabled={loadingTips} className={`gap-1.5 ${loadingTips ? 'animate-pulse bg-primary/80' : ''}`}>
                  {loadingTips ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {loadingTips ? 'Analisando erros...' : '💡 Gerar Dicas'}
                </Button>
                {aiTips.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handlePrintExtras} className="gap-1.5">
                    <Printer size={14} /> Imprimir Extras
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Top errors - Card design */}
            {commonErrors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Erros Mais Frequentes</p>
                {commonErrors.map((e, i) => {
                  const cleanText = (e.question || '').replace(/<[^>]*>/g, '').trim();
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-bold">
                        {e.count}x
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-2">{cleanText}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Habilidade Faltante: <strong>{e.skill}</strong></p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px]">{e.skill}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => navigate('/jogos', { state: { topic: e.skill } })}
                          title="Criar jogo sobre este tema"
                        >
                          <Gamepad2 className="h-3 w-3" /> Jogo
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AI generated tips */}
            {aiTips.length > 0 && (
              <div ref={extrasRef} className="space-y-3 mt-2">
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-5 space-y-3 bg-primary/5">
                  <h3 className="text-sm font-bold text-primary text-center">📋 Atividades Extras — Reforço Pós-Simulado</h3>
                  {aiTips.map((tip, i) => {
                    const cleanTip = (tip || '').replace(/<[^>]*>/g, '').trim();
                    return (
                      <div key={i} className="border border-border rounded-lg p-3 bg-card text-sm text-foreground">
                        <p className="whitespace-pre-wrap">{cleanTip}</p>
                      </div>
                    );
                  })}

                  {/* Plano de Ação Sugerido */}
                  <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 mt-3">
                    <h4 className="text-sm font-bold text-primary mb-2">📌 Plano de Ação Sugerido</h4>
                    <ul className="list-disc list-inside text-sm text-foreground space-y-1">
                      <li>Aplicar atividade de reforço focada nos erros mais frequentes na próxima aula.</li>
                      <li>Utilizar dinâmicas lúdicas (Caça-Erros, Nuvem de Palavras) para fixação.</li>
                      <li>Revisar individualmente os alunos com desempenho abaixo de 50%.</li>
                      <li>Reaplicar questões similares em simulado de revisão.</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-dashed border-border mt-4 flex justify-between items-end">
                    <div className="text-xs text-muted-foreground">
                      <p>Data: ____/____/________</p>
                      <p className="mt-2">Assinatura do Professor: _________________________________</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>Assinatura do Coordenador: _________________________________</p>
                    </div>
                  </div>
                  <p className="text-center text-[9px] text-muted-foreground mt-2">
                    EDUFLOW INDUSTRIAL | Relatório Pós-Simulado | Coord. Matheus Lima Piffer
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground">Média de Acertos por Atividade</h2>
          <div className="space-y-3">
            {chartData.map((d, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate max-w-[200px]">{d.label}</span>
                  <span className="font-bold text-foreground">{d.average}%</span>
                </div>
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${d.average >= 70 ? 'bg-primary' : d.average >= 50 ? 'bg-accent' : 'bg-destructive'}`}
                    style={{ width: `${(d.average / maxAvg) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {uniqueClasses.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos ({allResults.length})</TabsTrigger>
          <TabsTrigger value="atividades">Atividades ({actResults.length})</TabsTrigger>
          <TabsTrigger value="simulados">Simulados ({simResults.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Nenhum resultado encontrado. Compartilhe atividades com seus alunos usando o botão "Enviar para Aluno".</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead className="text-center">Nota</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const pct = getPercentage(r);
                    return (
                      <TableRow key={`${r._type}-${r.id}`}>
                        <TableCell className="font-medium">{r.student_name}</TableCell>
                        <TableCell>{r.student_class || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{getLabel(r)}</TableCell>
                        <TableCell className="text-center font-bold">{getScore(r)}</TableCell>
                        <TableCell className="text-center">
                          {pct != null ? (
                            <span className={pct >= 70 ? 'text-primary font-bold' : pct >= 50 ? 'text-accent-foreground font-bold' : 'text-destructive font-bold'}>
                              {pct}%
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getStatus(r) === 'Corrigido' ? 'default' : 'secondary'} className="text-[10px]">
                            {getStatus(r)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(r)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-center text-[10px] text-muted-foreground">Relatório de Desempenho — Desenvolvido por Matheus Lima Piffer</p>
    </div>
  );
}
