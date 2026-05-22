import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2, Trophy, BarChart3, Users, AlertTriangle, Award, FileDown, TrendingUp, Star, Gem } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ExportLoadingOverlay } from '@/components/ExportLoadingOverlay';

// ── Types ──
interface EssaySub {
  id: string;
  student_name: string;
  student_class: string;
  banca: string;
  status: string;
  total_score: number | null;
  scores: any;
  teacher_validated: boolean | null;
  corrected_at: string | null;
  created_at: string;
  proposal_theme: string;
  suggestions: string | null;
}

interface StudentResult {
  id: string;
  student_name: string;
  student_class: string;
  percentage: number;
  proficiency_level: string;
  simulator_id: string;
  correct_count: number;
  total_questions: number;
  created_at: string;
}

interface MeritStudent {
  name: string;
  turma: string;
  notaV1: number;
  notaV2: number;
  improvement: number;
  skill: string;
  banca: string;
}

interface LearningGap {
  skill: string;
  failRate: number;
}

// ── Certificate Component ──
function MeritCertificate({ student, onClose }: { student: MeritStudent; onClose: () => void }) {
  const certRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (!certRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, logging: false });
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfW = 297;
      const pdfH = 210;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save(`Certificado_Merito_${student.name.replace(/\s+/g, '_')}.pdf`);
      toast.success('Certificado gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl space-y-4">
        {/* Certificate preview */}
        <div
          ref={certRef}
          className="relative mx-auto bg-gradient-to-br from-amber-50 via-white to-amber-50 p-12 text-center"
          style={{ width: '842px', height: '595px', border: '6px solid #d4a853', borderRadius: '8px' }}
        >
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] text-8xl font-black tracking-widest text-amber-900 select-none pointer-events-none" style={{ transform: 'rotate(-30deg)' }}>
            EDUCREATOR PRO
          </div>

          {/* Gold corners */}
          <div className="absolute top-3 left-3 w-16 h-16 border-t-4 border-l-4 border-amber-500 rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-16 h-16 border-t-4 border-r-4 border-amber-500 rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-16 h-16 border-b-4 border-l-4 border-amber-500 rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-16 h-16 border-b-4 border-r-4 border-amber-500 rounded-br-lg" />

          <div className="flex flex-col items-center justify-center h-full relative z-10 space-y-3">
            <Trophy className="h-12 w-12 text-amber-600" />
            <h1 className="text-3xl font-bold text-amber-800 tracking-wide">CERTIFICADO DE MÉRITO ACADÊMICO</h1>
            <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
            <p className="text-base text-gray-700 max-w-lg">
              Certificamos que o(a) aluno(a) <strong className="text-amber-900">{student.name}</strong>, da turma <strong>{student.turma}</strong>,
              demonstrou excelência pedagógica e resiliência acadêmica ao atingir o nível de <strong className="text-amber-700">EVOLUÇÃO ELITE</strong> no ciclo de redação de Abril/2026.
            </p>
            <div className="grid grid-cols-3 gap-6 mt-2 text-sm">
              <div className="text-center">
                <p className="text-gray-500">Nota Original</p>
                <p className="text-2xl font-bold text-red-500">{student.notaV1}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Nota Reescrita</p>
                <p className="text-2xl font-bold text-emerald-600">{student.notaV2} 🚀</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Evolução</p>
                <p className="text-2xl font-bold text-amber-600">+{student.improvement.toFixed(0)}%</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Habilidade Superada: <strong>{student.skill}</strong>
            </p>
            <p className="italic text-sm text-gray-500 max-w-md">
              "A persistência é o caminho do êxito. Parabéns por dominar a arte da escrita e elevar seu padrão técnico!"
            </p>
            <div className="flex justify-between w-full px-16 mt-4 text-xs text-gray-500">
              <span>Data: 02 de Abril de 2026</span>
              <span>Assinatura Digital: Matheus Lima Piffer (Coordenação Pedagógica)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handleDownload} disabled={generating} className="bg-amber-600 hover:bg-amber-700 text-white">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
            Baixar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Pie chart colors ──
const SCORE_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];

export default function CoordView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [essays, setEssays] = useState<EssaySub[]>([]);
  const [simResults, setSimResults] = useState<StudentResult[]>([]);
  const [filterClass, setFilterClass] = useState('all');
  const [filterBanca, setFilterBanca] = useState('all');
  const [search, setSearch] = useState('');
  const [certStudent, setCertStudent] = useState<MeritStudent | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [pageMerit, setPageMerit] = useState(1);
  const [pagePending, setPagePending] = useState(1);
  const itemsPerPage = 10;

  // Load data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [essayRes, simRes] = await Promise.all([
        supabase.from('essay_submissions').select('*').eq('teacher_user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('student_results').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setEssays((essayRes.data || []) as any);
      setSimResults((simRes.data || []) as any);
      setLoading(false);
    })();
  }, [user]);

  // Derived data
  const uniqueClasses = useMemo(() => {
    const s = new Set<string>();
    essays.forEach(e => e.student_class && s.add(e.student_class));
    simResults.forEach(r => r.student_class && s.add(r.student_class));
    return Array.from(s).sort();
  }, [essays, simResults]);

  const filtered = useMemo(() => {
    let e = essays;
    const q = search.trim().toLowerCase();
    if (q) {
      e = e.filter(x => x.student_name?.toLowerCase().includes(q));
    }
    if (filterClass !== 'all') e = e.filter(x => x.student_class === filterClass);
    if (filterBanca !== 'all') e = e.filter(x => x.banca === filterBanca);
    return e;
  }, [essays, filterClass, filterBanca, search]);

  // KPIs
  const totalEssays = filtered.length;
  const pending = filtered.filter(e => !e.teacher_validated).length;
  const released = filtered.filter(e => e.teacher_validated).length;
  const avgScore = useMemo(() => {
    const scored = filtered.filter(e => e.total_score && e.total_score > 0);
    if (!scored.length) return 0;
    return scored.reduce((a, b) => a + (b.total_score || 0), 0) / scored.length;
  }, [filtered]);

  // Turnaround
  const avgTurnaround = useMemo(() => {
    const validated = filtered.filter(e => e.corrected_at && e.created_at);
    if (!validated.length) return 0;
    const total = validated.reduce((acc, e) => {
      const diff = new Date(e.corrected_at!).getTime() - new Date(e.created_at).getTime();
      return acc + diff / (1000 * 60 * 60 * 24);
    }, 0);
    return total / validated.length;
  }, [filtered]);

  // Top 5 learning gaps
  const learningGaps: LearningGap[] = useMemo(() => {
    const compMap: Record<string, { fail: number; total: number }> = {};
    filtered.forEach(e => {
      const scores = e.scores as any;
      if (!scores?.competencies) return;
      (scores.competencies as any[]).forEach(c => {
        if (!compMap[c.name]) compMap[c.name] = { fail: 0, total: 0 };
        compMap[c.name].total++;
        if (c.score < c.max * 0.6) compMap[c.name].fail++;
      });
    });
    return Object.entries(compMap)
      .map(([skill, v]) => ({ skill, failRate: v.total ? Math.round((v.fail / v.total) * 100) : 0 }))
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 5);
  }, [filtered]);

  // Score distribution for pie chart
  const scoreDistribution = useMemo(() => {
    const buckets = [
      { name: '< 400', value: 0 },
      { name: '400-600', value: 0 },
      { name: '600-800', value: 0 },
      { name: '> 800', value: 0 },
    ];
    filtered.filter(e => e.total_score).forEach(e => {
      const s = e.total_score || 0;
      if (s < 400) buckets[0].value++;
      else if (s < 600) buckets[1].value++;
      else if (s < 800) buckets[2].value++;
      else buckets[3].value++;
    });
    return buckets.filter(b => b.value > 0);
  }, [filtered]);

  // Banca bar chart
  const bancaData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filtered.filter(e => e.total_score).forEach(e => {
      if (!map[e.banca]) map[e.banca] = { total: 0, count: 0 };
      map[e.banca].total += e.total_score || 0;
      map[e.banca].count++;
    });
    return Object.entries(map).map(([banca, v]) => ({ banca, media: Math.round(v.total / v.count) }));
  }, [filtered]);

  // Merit students: those with V2 > V1 + 15%
  const meritStudents: MeritStudent[] = useMemo(() => {
    const byStudent: Record<string, EssaySub[]> = {};
    filtered.filter(e => e.teacher_validated && e.total_score).forEach(e => {
      const key = `${e.student_name}__${e.student_class}`;
      if (!byStudent[key]) byStudent[key] = [];
      byStudent[key].push(e);
    });

    const result: MeritStudent[] = [];
    Object.entries(byStudent).forEach(([, subs]) => {
      if (subs.length < 2) return;
      const sorted = [...subs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const v1 = first.total_score || 0;
      const v2 = last.total_score || 0;
      if (v1 > 0 && v2 > v1 * 1.15) {
        const scores = last.scores as any;
        const bestComp = scores?.competencies?.sort((a: any, b: any) => (b.score / b.max) - (a.score / a.max))?.[0];
        result.push({
          name: last.student_name,
          turma: last.student_class,
          notaV1: v1,
          notaV2: v2,
          improvement: ((v2 - v1) / v1) * 100,
          skill: bestComp?.name || 'Evolução Geral',
          banca: last.banca,
        });
      }
    });
    return result.sort((a, b) => b.improvement - a.improvement);
  }, [filtered]);

  const simSummary = useMemo(() => {
    if (!simResults.length) return null;
    const avg = simResults.reduce((a, b) => a + b.percentage, 0) / simResults.length;
    const advanced = simResults.filter(r => r.proficiency_level === 'avancado').length;
    const belowBasic = simResults.filter(r => r.proficiency_level === 'abaixo_basico').length;
    return { avg, advanced, belowBasic, total: simResults.length };
  }, [simResults]);

  const pendingEssays = useMemo(() => {
    return filtered.filter(e => !e.teacher_validated);
  }, [filtered]);

  // Export PDF report
  const handleExportReport = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgW = 190;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgW, imgH);
      pdf.save('Relatorio_Coordenacao_Abril2026.pdf');
      toast.success('✅ Relatório exportado com sucesso!');
    } catch (err) {
      console.error('[handleExportReport] error:', err);
      toast.error('Erro ao gerar relatório');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Painel do Coordenador
          </h1>
          <p className="text-sm text-muted-foreground">Relatório de Evolução Pedagógica — Abril/2026</p>
        </div>
        <div className="flex gap-2 flex-wrap flex-1 justify-end">
          <Input 
            placeholder="Buscar aluno..." 
            className="w-full md:w-48"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Turma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Turmas</SelectItem>
              {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterBanca} onValueChange={setFilterBanca}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Banca" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {['Banca Nacional', 'Banca Acadêmica', 'Avaliação Técnica', 'Banca de Excelência'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportReport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileDown className="h-4 w-4 mr-1" />} Exportar PDF
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Redações', value: totalEssays, icon: <Users className="h-5 w-5" />, color: 'text-primary' },
            { label: 'Pendentes', value: pending, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-amber-500' },
            { label: 'Liberadas', value: released, icon: <Award className="h-5 w-5" />, color: 'text-emerald-500' },
            { label: 'Média Geral', value: avgScore.toFixed(0), icon: <TrendingUp className="h-5 w-5" />, color: 'text-primary' },
            { label: 'Devolutiva (dias)', value: avgTurnaround.toFixed(1), icon: <BarChart3 className="h-5 w-5" />, color: 'text-blue-500' },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <div className={`flex justify-center mb-1 ${kpi.color}`}>{kpi.icon}</div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-4">
          {scoreDistribution.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Notas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={scoreDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {scoreDistribution.map((_, i) => <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {bancaData.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Média por Banca</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bancaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="banca" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="media" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Learning gaps */}
        {learningGaps.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Top 5 Lacunas de Aprendizagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {learningGaps.map((g, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm w-48 truncate font-medium">{g.skill}</span>
                  <Progress value={g.failRate} className="flex-1" />
                  <Badge variant={g.failRate > 35 ? 'destructive' : g.failRate > 20 ? 'secondary' : 'default'}>
                    {g.failRate}%
                  </Badge>
                </div>
              ))}
              {learningGaps[0] && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-sm text-amber-800 dark:text-amber-200">
                  💡 <strong>Sugestão da IA Doutora:</strong> Detectada recorrência em "{learningGaps[0].skill}" ({learningGaps[0].failRate}%).
                  Sugere-se disparar uma Atividade Lúdica de Caça-Erros focada nesta habilidade para todas as turmas.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Merit Leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> 🏆 Alunos Destaque — Mural da Fama
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meritStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum aluno atingiu evolução de +15% ainda. Continue acompanhando!
              </p>
            ) : (
              <div className="space-y-2">
                {meritStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">Turma {s.turma} • {s.banca}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="text-red-400">{s.notaV1}</span>
                        <span className="mx-1">→</span>
                        <span className="text-emerald-600 font-bold">{s.notaV2}</span>
                        <Badge className="ml-2 bg-amber-500 text-white">+{s.improvement.toFixed(0)}%</Badge>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setCertStudent(s)}>
                        <Gem className="h-3 w-3 mr-1" /> Certificado
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending essays */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Redações Pendentes de Validação</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.filter(e => !e.teacher_validated).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma redação pendente. 🎉</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filtered.filter(e => !e.teacher_validated).slice(0, 20).map(e => (
                  <div key={e.id} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div>
                      <span className="font-medium">{e.student_name || 'Anônimo'}</span>
                      <span className="text-muted-foreground ml-2">• {e.student_class} • {e.banca}</span>
                    </div>
                    <Badge variant="secondary">{e.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sim results summary */}
      {simResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> Performance nos Simulados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{simResults.length}</p>
                <p className="text-xs text-muted-foreground">Resultados</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(simResults.reduce((a, b) => a + b.percentage, 0) / simResults.length).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Média Geral</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-500">
                  {simResults.filter(r => r.proficiency_level === 'avancado').length}
                </p>
                <p className="text-xs text-muted-foreground">Avançados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">
                  {simResults.filter(r => r.proficiency_level === 'abaixo_basico').length}
                </p>
                <p className="text-xs text-muted-foreground">Abaixo Básico</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-center text-muted-foreground">
        EDUFLOW INDUSTRIAL | Coordenação Pedagógica: Matheus Lima Piffer | Abril/2026
      </p>

      {/* Certificate modal */}
      {certStudent && <MeritCertificate student={certStudent} onClose={() => setCertStudent(null)} />}
      <ExportLoadingOverlay isOpen={exporting} />
    </div>
  );
}
