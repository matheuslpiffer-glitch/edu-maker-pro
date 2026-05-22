import { useEffect, useState, useRef, useMemo } from 'react';
import { ExportLoadingOverlay } from '@/components/ExportLoadingOverlay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Plus, Trash2, BarChart3, Sparkles, Printer, TrendingUp, TrendingDown, Target, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Simulator {
  id: string;
  title: string;
  exam_type: string;
  subject_area: string;
  grade: string;
  questions: any[];
}

interface StudentRow {
  id?: string;
  student_name: string;
  correct_count: number;
}

interface AIInsights {
  overallAnalysis: string;
  urgentActions: { title: string; description: string; priority: string }[];
  strengths: string[];
  recommendations: string[];
}

const PROFICIENCY_LEVELS = [
  { key: 'abaixo_basico', label: 'Abaixo do Básico', max: 25, color: 'hsl(0, 72%, 51%)' },
  { key: 'basico', label: 'Básico', max: 50, color: 'hsl(38, 92%, 50%)' },
  { key: 'proficiente', label: 'Proficiente', max: 75, color: 'hsl(239, 84%, 67%)' },
  { key: 'avancado', label: 'Avançado', max: 100, color: 'hsl(217, 91%, 60%)' },
];

function getProficiency(percentage: number) {
  if (percentage < 25) return PROFICIENCY_LEVELS[0];
  if (percentage < 50) return PROFICIENCY_LEVELS[1];
  if (percentage < 75) return PROFICIENCY_LEVELS[2];
  return PROFICIENCY_LEVELS[3];
}

export default function ResultsAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [simulators, setSimulators] = useState<Simulator[]>([]);
  const [selectedSimId, setSelectedSimId] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [idespMeta, setIdespMeta] = useState(60);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const selectedSim = simulators.find(s => s.id === selectedSimId);
  const totalQuestions = selectedSim ? (selectedSim.questions as any[])?.length || 0 : 0;

  useEffect(() => {
    loadSimulators();
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsExporting(false);
      toast({ 
        title: 'Relatório Gerado', 
        description: 'O documento foi processado com sucesso.' 
      });
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    if (selectedSimId) loadResults();
  }, [selectedSimId]);

  const loadSimulators = async () => {
    setLoading(true);
    const { data } = await supabase.from('simulators').select('*').order('created_at', { ascending: false });
    setSimulators((data as unknown as Simulator[]) || []);
    setLoading(false);
  };

  const loadResults = async () => {
    setLoadingResults(true);
    setInsights(null);
    const { data } = await supabase
      .from('student_results')
      .select('*')
      .eq('simulator_id', selectedSimId)
      .order('student_name');

    if (data && data.length > 0) {
      setStudents(data.map(r => ({
        id: r.id,
        student_name: r.student_name,
        correct_count: r.correct_count,
      })));
    } else {
      setStudents([{ student_name: '', correct_count: 0 }]);
    }
    setLoadingResults(false);
  };

  const addRow = () => setStudents(prev => [...prev, { student_name: '', correct_count: 0 }]);

  const removeRow = (idx: number) => setStudents(prev => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: keyof StudentRow, value: string | number) => {
    setStudents(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const validStudents = students.filter(s => s.student_name.trim() !== '');

  const handleSave = async () => {
    if (!user || !selectedSimId || validStudents.length === 0) return;
    setSaving(true);

    // Delete existing results for this simulator
    await supabase.from('student_results').delete().eq('simulator_id', selectedSimId);

    const rows = validStudents.map(s => {
      const pct = totalQuestions > 0 ? (s.correct_count / totalQuestions) * 100 : 0;
      const level = getProficiency(pct);
      return {
        user_id: user.id,
        simulator_id: selectedSimId,
        student_name: s.student_name.trim().slice(0, 200),
        correct_count: Math.max(0, Math.min(s.correct_count, totalQuestions)),
        total_questions: totalQuestions,
        percentage: Math.round(pct * 100) / 100,
        proficiency_level: level.key,
      };
    });

    const { error } = await supabase.from('student_results').insert(rows);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Notas salvas com sucesso!' });
    }
    setSaving(false);
  };

  // Analytics computations
  const computedStudents = useMemo(() => {
    return validStudents.map(s => {
      const pct = totalQuestions > 0 ? (s.correct_count / totalQuestions) * 100 : 0;
      return { ...s, percentage: pct, proficiency: getProficiency(pct) };
    });
  }, [validStudents, totalQuestions]);

  const { average, highest, lowest } = useMemo(() => {
    if (computedStudents.length === 0) return { average: 0, highest: 0, lowest: 0 };
    
    const sum = computedStudents.reduce((acc, s) => acc + s.percentage, 0);
    const avg = sum / computedStudents.length;
    const high = Math.max(...computedStudents.map(s => s.percentage));
    const low = Math.min(...computedStudents.map(s => s.percentage));
    
    return { average: avg, highest: high, lowest: low };
  }, [computedStudents]);

  const distribution = useMemo(() => {
    return PROFICIENCY_LEVELS.map(level => ({
      ...level,
      count: computedStudents.filter(s => s.proficiency.key === level.key).length,
    }));
  }, [computedStudents]);

  const gaugePercentage = useMemo(() => Math.min(100, (average / idespMeta) * 100), [average, idespMeta]);

  const generateInsights = async () => {
    if (!selectedSim || computedStudents.length === 0) return;
    setLoadingInsights(true);

    try {
      const dist: Record<string, number> = {};
      distribution.forEach(d => { dist[d.key] = d.count; });

      const { data, error } = await supabase.functions.invoke('pedagogical-insights', {
        body: {
          examType: selectedSim.exam_type,
          subjectArea: selectedSim.subject_area,
          grade: selectedSim.grade,
          average: Math.round(average * 100) / 100,
          distribution: dist,
          weakSkills: [],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInsights(data as AIInsights);
      toast({ title: 'Insights gerados!' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar insights', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingInsights(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 no-print">
        <BarChart3 className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Análise de Resultados</h1>
      </div>

      {/* Simulator Selector */}
      <Card className="mb-4 no-print">
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>Selecionar Simulado</Label>
              <Select value={selectedSimId} onValueChange={setSelectedSimId}>
                <SelectTrigger><SelectValue placeholder="Escolha um simulado" /></SelectTrigger>
                <SelectContent>
                  {simulators.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title} — {s.subject_area} ({s.grade})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-32">
              <Label>Meta IDESP (%)</Label>
              <Input type="number" min={0} max={100} value={idespMeta} onChange={e => setIdespMeta(+e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedSimId ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Selecione um simulado para lançar notas e ver a análise.</p>
        </div>
      ) : loadingResults ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="entry" className="no-print">
          <TabsList className="mb-4">
            <TabsTrigger value="entry">Lançamento de Notas</TabsTrigger>
            <TabsTrigger value="dashboard" disabled={validStudents.length === 0}>Dashboard</TabsTrigger>
            <TabsTrigger value="report" disabled={validStudents.length === 0}>Relatório</TabsTrigger>
          </TabsList>

          {/* GRADE ENTRY */}
          <TabsContent value="entry">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">
                    Lançamento de Acertos — {selectedSim?.title}
                    <span className="text-sm font-normal text-muted-foreground ml-2">({totalQuestions} questões)</span>
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={addRow}><Plus size={16} className="mr-1" />Aluno</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  <div className="grid grid-cols-[1fr_100px_100px_80px_40px] gap-2 text-xs font-medium text-muted-foreground px-1 mb-1">
                    <span>Nome do Aluno</span>
                    <span className="text-center">Acertos</span>
                    <span className="text-center">%</span>
                    <span className="text-center">Nível</span>
                    <span></span>
                  </div>
                  {students.map((s, i) => {
                    const pct = totalQuestions > 0 ? (s.correct_count / totalQuestions) * 100 : 0;
                    const level = getProficiency(pct);
                    return (
                      <div key={i} className="grid grid-cols-[1fr_100px_100px_80px_40px] gap-2 items-center">
                        <Input
                          value={s.student_name}
                          onChange={e => updateRow(i, 'student_name', e.target.value)}
                          placeholder={`Aluno ${i + 1}`}
                          maxLength={200}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={totalQuestions}
                          value={s.correct_count}
                          onChange={e => updateRow(i, 'correct_count', Math.min(+e.target.value, totalQuestions))}
                          className="text-center"
                        />
                        <div className="text-center text-sm font-medium">{pct.toFixed(1)}%</div>
                        <Badge
                          variant="outline"
                          className="text-xs justify-center"
                          style={{ borderColor: level.color, color: level.color }}
                        >
                          {level.label.split(' ').pop()}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-destructive h-8 w-8 p-0">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-4 gap-2">
                  <Button onClick={handleSave} disabled={saving || validStudents.length === 0}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Notas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DASHBOARD */}
          <TabsContent value="dashboard">
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{computedStudents.length}</p>
                    <p className="text-xs text-muted-foreground">Alunos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-2xl font-bold">{average.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Média da Turma</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
                    <p className="text-2xl font-bold">{highest.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Maior Nota</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingDown className="h-5 w-5 mx-auto mb-1 text-destructive" />
                    <p className="text-2xl font-bold">{lowest.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Menor Nota</p>
                  </CardContent>
                </Card>
              </div>

              {/* Distribution Chart */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Distribuição por Nível de Proficiência</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={distribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Alunos" radius={[6, 6, 0, 0]}>
                        {distribution.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gauge / Meta IDESP */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Meta IDESP — Progresso</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="relative w-48 h-24 overflow-hidden">
                    <div className="absolute inset-0 rounded-t-full border-8 border-muted" />
                    <div
                      className="absolute inset-0 rounded-t-full border-8 border-primary transition-all duration-700"
                      style={{
                        clipPath: `polygon(0 100%, 0 0, ${gaugePercentage}% 0, ${gaugePercentage}% 100%)`,
                      }}
                    />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                      <p className="text-xl font-bold">{average.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground">Meta: {idespMeta}%</p>
                    </div>
                  </div>
                  <p className="text-sm mt-3 text-muted-foreground">
                    {average >= idespMeta
                      ? '✅ A turma atingiu a meta IDESP!'
                      : `⚠️ Faltam ${(idespMeta - average).toFixed(1)} pontos percentuais para a meta.`}
                  </p>
                </CardContent>
              </Card>

              {/* AI Insights */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      Sugestões Pedagógicas (Insight IA)
                    </CardTitle>
                    <Button size="sm" onClick={generateInsights} disabled={loadingInsights}>
                      {loadingInsights ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      Gerar Insights
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!insights ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Clique em "Gerar Insights" para receber sugestões pedagógicas baseadas nos dados.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{insights.overallAnalysis}</p>
                      </div>

                      {insights.urgentActions?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">🚨 Ações Urgentes</h4>
                          <div className="space-y-2">
                            {insights.urgentActions.map((a, i) => (
                              <div key={i} className="p-2 border rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Badge variant={a.priority === 'alta' ? 'destructive' : 'outline'} className="text-xs">
                                    {a.priority}
                                  </Badge>
                                  <span className="font-medium text-sm">{a.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {insights.strengths?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">✅ Pontos Fortes</h4>
                          <ul className="list-disc ml-5 text-sm space-y-1">
                            {insights.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}

                      {insights.recommendations?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">📋 Recomendações</h4>
                          <ul className="list-disc ml-5 text-sm space-y-1">
                            {insights.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PRINT REPORT */}
          <TabsContent value="report">
            <div className="no-print mb-4">
              <Button variant="outline" onClick={() => { setIsExporting(true); setTimeout(() => window.print(), 100); }}><Printer size={16} className="mr-2" />Imprimir Relatório</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div
                  ref={printRef}
                  className="bg-white text-black p-8 max-w-[210mm] mx-auto"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: 1.6 }}
                >
                  {/* Report Header */}
                  <div className="text-center mb-6 border-b-2 border-black pb-3">
                    <h1 className="text-lg font-bold uppercase">Relatório de Resultados</h1>
                    <h2 className="text-base mt-1">{selectedSim?.title}</h2>
                    <p className="text-xs mt-1">{selectedSim?.subject_area} — {selectedSim?.grade}</p>
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Alunos', value: computedStudents.length },
                      { label: 'Média', value: `${average.toFixed(1)}%` },
                      { label: 'Maior', value: `${highest.toFixed(1)}%` },
                      { label: 'Menor', value: `${lowest.toFixed(1)}%` },
                    ].map(kpi => (
                      <div key={kpi.label} className="text-center border border-black p-2">
                        <p className="text-lg font-bold">{kpi.value}</p>
                        <p className="text-[9pt]">{kpi.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Distribution Table */}
                  <h3 className="font-bold text-sm mb-2 uppercase">Distribuição por Proficiência</h3>
                  <table className="w-full border-collapse mb-6" style={{ fontSize: '10pt' }}>
                    <thead>
                      <tr>
                        <th className="border border-black p-1 text-left">Nível</th>
                        <th className="border border-black p-1 text-center">Alunos</th>
                        <th className="border border-black p-1 text-center">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distribution.map(d => (
                        <tr key={d.key}>
                          <td className="border border-black p-1">{d.label}</td>
                          <td className="border border-black p-1 text-center">{d.count}</td>
                          <td className="border border-black p-1 text-center">
                            {computedStudents.length > 0 ? ((d.count / computedStudents.length) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Student List */}
                  <h3 className="font-bold text-sm mb-2 uppercase">Desempenho Individual</h3>
                  <table className="w-full border-collapse" style={{ fontSize: '10pt' }}>
                    <thead>
                      <tr>
                        <th className="border border-black p-1 text-left">Nº</th>
                        <th className="border border-black p-1 text-left">Nome</th>
                        <th className="border border-black p-1 text-center">Acertos</th>
                        <th className="border border-black p-1 text-center">%</th>
                        <th className="border border-black p-1 text-center">Nível</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedStudents.map((s, i) => (
                        <tr key={i}>
                          <td className="border border-black p-1">{i + 1}</td>
                          <td className="border border-black p-1">{s.student_name}</td>
                          <td className="border border-black p-1 text-center">{s.correct_count}/{totalQuestions}</td>
                          <td className="border border-black p-1 text-center">{s.percentage.toFixed(1)}%</td>
                          <td className="border border-black p-1 text-center">{s.proficiency.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* AI Insights in print */}
                  {insights && (
                    <div className="mt-6 border-t-2 border-black pt-4" style={{ pageBreakBefore: 'auto' }}>
                      <h3 className="font-bold text-sm mb-2 uppercase">Sugestões Pedagógicas</h3>
                      <p className="text-sm mb-3">{insights.overallAnalysis}</p>
                      {insights.recommendations?.length > 0 && (
                        <ul className="list-disc ml-5 text-sm space-y-1">
                          {insights.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="mt-8 text-center text-[8pt] text-gray-500 border-t pt-2">
                    <p>Gerado por EduCreator — {new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Print-only report */}
      <div className="print-only">
        {selectedSim && computedStudents.length > 0 && (
          <div
            className="bg-white text-black p-8"
            style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', color: '#000' }}
          >
            <div className="text-center mb-6 border-b-2 border-black pb-3">
              <h1 className="text-lg font-bold uppercase">Relatório de Resultados</h1>
              <h2 className="text-base mt-1">{selectedSim.title}</h2>
              <p className="text-xs">{selectedSim.subject_area} — {selectedSim.grade}</p>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Alunos', value: computedStudents.length },
                { label: 'Média', value: `${average.toFixed(1)}%` },
                { label: 'Maior', value: `${highest.toFixed(1)}%` },
                { label: 'Menor', value: `${lowest.toFixed(1)}%` },
              ].map(kpi => (
                <div key={kpi.label} className="text-center border border-black p-2">
                  <p className="text-lg font-bold">{kpi.value}</p>
                  <p className="text-[9pt]">{kpi.label}</p>
                </div>
              ))}
            </div>
            <table className="w-full border-collapse" style={{ fontSize: '10pt' }}>
              <thead>
                <tr>
                  <th className="border border-black p-1 text-left">Nº</th>
                  <th className="border border-black p-1 text-left">Nome</th>
                  <th className="border border-black p-1 text-center">Acertos</th>
                  <th className="border border-black p-1 text-center">%</th>
                  <th className="border border-black p-1 text-center">Nível</th>
                </tr>
              </thead>
              <tbody>
                {computedStudents.map((s, i) => (
                  <tr key={i}>
                    <td className="border border-black p-1">{i + 1}</td>
                    <td className="border border-black p-1">{s.student_name}</td>
                    <td className="border border-black p-1 text-center">{s.correct_count}/{totalQuestions}</td>
                    <td className="border border-black p-1 text-center">{s.percentage.toFixed(1)}%</td>
                    <td className="border border-black p-1 text-center">{s.proficiency.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ExportLoadingOverlay isOpen={isExporting} />
    </div>
  );
}
