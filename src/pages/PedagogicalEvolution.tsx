import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Download, Printer, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart, Legend,
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Simulator {
  id: string;
  title: string;
  exam_type: string;
  subject_area: string;
  grade: string;
  questions: any[];
  created_at: string;
}

interface StudentResult {
  id: string;
  simulator_id: string;
  student_name: string;
  correct_count: number;
  total_questions: number;
  percentage: number;
  proficiency_level: string;
}

interface TimePoint {
  label: string;
  simulatorId: string;
  date: string;
  average: number;
  abaixo_basico: number;
  basico: number;
  proficiente: number;
  avancado: number;
  studentCount: number;
}

const EXAM_LABELS: Record<string, string> = {
  saresp: 'Avaliação Paulista', prova_paulista: 'Prova Paulista',
  ade: 'ADE', saeb: 'SAEB',
};

const PROFICIENCY_COLORS = {
  abaixo_basico: 'hsl(0, 72%, 51%)',
  basico: 'hsl(38, 92%, 50%)',
  proficiente: 'hsl(239, 84%, 67%)',
  avancado: 'hsl(217, 91%, 60%)',
};

export default function PedagogicalEvolution() {
  const { user } = useAuth();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [simulators, setSimulators] = useState<Simulator[]>([]);
  const [allResults, setAllResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [idespMeta, setIdespMeta] = useState(60);
  const [selectedStudent, setSelectedStudent] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [simRes, resRes] = await Promise.all([
      supabase.from('simulators').select('*').order('created_at', { ascending: true }),
      supabase.from('student_results').select('*'),
    ]);
    setSimulators((simRes.data as unknown as Simulator[]) || []);
    setAllResults((resRes.data as unknown as StudentResult[]) || []);
    setLoading(false);
  };

  // Filter simulators
  const filteredSims = simulators.filter(s => {
    if (filterSubject !== 'all' && s.subject_area !== filterSubject) return false;
    if (filterGrade !== 'all' && s.grade !== filterGrade) return false;
    return true;
  });

  const subjects = [...new Set(simulators.map(s => s.subject_area).filter(s => s && s.trim() !== ''))];
  const grades = [...new Set(simulators.map(s => s.grade).filter(s => s && s.trim() !== ''))];

  // All student names across filtered simulators
  const filteredSimIds = new Set(filteredSims.map(s => s.id));
  const filteredResults = allResults.filter(r => filteredSimIds.has(r.simulator_id));
  const studentNames = [...new Set(filteredResults.map(r => r.student_name).filter(n => n && n.trim() !== ''))].sort();

  // Build time series data
  const timeSeriesData: TimePoint[] = filteredSims.map(sim => {
    let results = allResults.filter(r => r.simulator_id === sim.id);
    if (selectedStudent !== 'all') {
      results = results.filter(r => r.student_name === selectedStudent);
    }

    const avg = results.length > 0
      ? results.reduce((sum, r) => sum + Number(r.percentage), 0) / results.length
      : 0;

    const dist = { abaixo_basico: 0, basico: 0, proficiente: 0, avancado: 0 };
    results.forEach(r => {
      const key = r.proficiency_level as keyof typeof dist;
      if (key in dist) dist[key]++;
    });

    const examLabel = EXAM_LABELS[sim.exam_type] || sim.exam_type;
    const dateStr = new Date(sim.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

    return {
      label: `${examLabel} (${dateStr})`,
      simulatorId: sim.id,
      date: sim.created_at,
      average: Math.round(avg * 10) / 10,
      ...dist,
      studentCount: results.length,
    };
  }).filter(tp => tp.studentCount > 0);

  // Compute overall trend
  const firstAvg = timeSeriesData.length > 0 ? timeSeriesData[0].average : 0;
  const lastAvg = timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1].average : 0;
  const trend = lastAvg - firstAvg;

  // Student comparison table
  const studentComparison = selectedStudent === 'all'
    ? studentNames.slice(0, 50).map(name => {
        const studentResults = filteredResults
          .filter(r => r.student_name === name)
          .sort((a, b) => {
            const simA = simulators.find(s => s.id === a.simulator_id);
            const simB = simulators.find(s => s.id === b.simulator_id);
            return (simA?.created_at || '').localeCompare(simB?.created_at || '');
          });
        const first = studentResults[0];
        const last = studentResults[studentResults.length - 1];
        return {
          name,
          firstPct: first ? Number(first.percentage) : 0,
          lastPct: last ? Number(last.percentage) : 0,
          delta: last && first ? Number(last.percentage) - Number(first.percentage) : 0,
          count: studentResults.length,
        };
      })
    : [];

  const handlePDF = async () => {
    if (!reportRef.current) return;
    toast({ title: 'Gerando PDF de Evolução...' });

    const canvas = await html2canvas(reportRef.current, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const MARGIN = 15;
    const imgW = 210 - MARGIN * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    pdf.addImage(imgData, 'PNG', MARGIN, MARGIN, imgW, Math.min(imgH, 297 - MARGIN * 2));
    pdf.save('evolucao-pedagogica.pdf');
    toast({ title: 'PDF gerado!' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 no-print">
        <TrendingUp className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Evolução Pedagógica 2026</h1>
      </div>

      {/* Filters */}
      <Card className="mb-4 no-print">
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2 min-w-[160px]">
              <Label>Disciplina</Label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[140px]">
              <Label>Série</Label>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[180px]">
              <Label>Aluno</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos (média da turma)</SelectItem>
                  {studentNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-28">
              <Label>Meta MMR (%)</Label>
              <Input type="number" min={0} max={100} value={idespMeta} onChange={e => setIdespMeta(+e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {timeSeriesData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum dado de resultado encontrado. Lance notas na Análise de Resultados primeiro.</p>
        </div>
      ) : (
        <>
          {/* Export buttons */}
          <div className="flex gap-2 mb-4 no-print">
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-2" />Imprimir</Button>
            <Button variant="outline" size="sm" onClick={handlePDF}><Download size={16} className="mr-2" />PDF de Evolução</Button>
          </div>

          {/* Report content (for PDF capture) */}
          <div ref={reportRef} className="space-y-4">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Avaliações</p>
                  <p className="text-2xl font-bold">{timeSeriesData.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Média Atual</p>
                  <p className="text-2xl font-bold">{lastAvg.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Evolução</p>
                  <p className={`text-2xl font-bold ${trend >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {trend >= 0 ? '+' : ''}{trend.toFixed(1)}pp
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">vs Meta MMR</p>
                  <p className={`text-2xl font-bold ${lastAvg >= idespMeta ? 'text-primary' : 'text-destructive'}`}>
                    {lastAvg >= idespMeta ? '✅' : '⚠️'} {(lastAvg - idespMeta).toFixed(1)}pp
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Trend Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendência de Proficiência Média
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <ReferenceLine
                      y={idespMeta}
                      stroke="hsl(38, 92%, 50%)"
                      strokeDasharray="8 4"
                      strokeWidth={2}
                      label={{ value: `Meta MMR: ${idespMeta}%`, position: 'right', fontSize: 11, fill: 'hsl(38, 92%, 50%)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="hsl(239, 84%, 67%)"
                      strokeWidth={3}
                      dot={{ r: 5, fill: 'hsl(239, 84%, 67%)' }}
                      name="Média"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stacked Area: proficiency distribution over time */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Distribuição de Proficiência ao Longo do Ano</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="avancado" stackId="1" fill={PROFICIENCY_COLORS.avancado} stroke={PROFICIENCY_COLORS.avancado} name="Avançado" />
                    <Area type="monotone" dataKey="proficiente" stackId="1" fill={PROFICIENCY_COLORS.proficiente} stroke={PROFICIENCY_COLORS.proficiente} name="Proficiente" />
                    <Area type="monotone" dataKey="basico" stackId="1" fill={PROFICIENCY_COLORS.basico} stroke={PROFICIENCY_COLORS.basico} name="Básico" />
                    <Area type="monotone" dataKey="abaixo_basico" stackId="1" fill={PROFICIENCY_COLORS.abaixo_basico} stroke={PROFICIENCY_COLORS.abaixo_basico} name="Abaixo do Básico" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Student comparison table (only if viewing all students) */}
            {selectedStudent === 'all' && studentComparison.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Comparação Longitudinal por Aluno</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Aluno</th>
                          <th className="text-center p-2">1ª Avaliação</th>
                          <th className="text-center p-2">Última</th>
                          <th className="text-center p-2">Evolução</th>
                          <th className="text-center p-2">Avaliações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentComparison.sort((a, b) => b.delta - a.delta).map(s => (
                          <tr key={s.name} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{s.name}</td>
                            <td className="p-2 text-center">{s.firstPct.toFixed(1)}%</td>
                            <td className="p-2 text-center">{s.lastPct.toFixed(1)}%</td>
                            <td className="p-2 text-center">
                              <Badge
                                variant="outline"
                                className={`text-xs ${s.delta >= 0 ? 'border-primary text-primary' : 'border-destructive text-destructive'}`}
                              >
                                {s.delta >= 0 ? '+' : ''}{s.delta.toFixed(1)}pp
                              </Badge>
                            </td>
                            <td className="p-2 text-center text-muted-foreground">{s.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Print-only */}
      <div className="print-only">
        <div className="bg-white text-black p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt' }}>
          <div className="text-center mb-4 border-b-2 border-black pb-3">
            <h1 className="text-lg font-bold uppercase">Relatório de Evolução Pedagógica 2026</h1>
            <p className="text-xs mt-1">
              {filterSubject !== 'all' ? filterSubject : 'Todas as Disciplinas'} — {filterGrade !== 'all' ? filterGrade : 'Todas as Séries'}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Avaliações', value: timeSeriesData.length },
              { label: 'Média Atual', value: `${lastAvg.toFixed(1)}%` },
              { label: 'Evolução', value: `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}pp` },
              { label: 'vs Meta MMR', value: `${(lastAvg - idespMeta).toFixed(1)}pp` },
            ].map(k => (
              <div key={k.label} className="text-center border border-black p-2">
                <p className="text-base font-bold">{k.value}</p>
                <p className="text-[9pt]">{k.label}</p>
              </div>
            ))}
          </div>
          {selectedStudent === 'all' && studentComparison.length > 0 && (
            <>
              <h3 className="font-bold text-sm mb-2 uppercase">Evolução por Aluno</h3>
              <table className="w-full border-collapse" style={{ fontSize: '10pt' }}>
                <thead>
                  <tr>
                    <th className="border border-black p-1 text-left">Aluno</th>
                    <th className="border border-black p-1 text-center">1ª Aval.</th>
                    <th className="border border-black p-1 text-center">Última</th>
                    <th className="border border-black p-1 text-center">Evolução</th>
                  </tr>
                </thead>
                <tbody>
                  {studentComparison.sort((a, b) => b.delta - a.delta).map(s => (
                    <tr key={s.name}>
                      <td className="border border-black p-1">{s.name}</td>
                      <td className="border border-black p-1 text-center">{s.firstPct.toFixed(1)}%</td>
                      <td className="border border-black p-1 text-center">{s.lastPct.toFixed(1)}%</td>
                      <td className="border border-black p-1 text-center">{s.delta >= 0 ? '+' : ''}{s.delta.toFixed(1)}pp</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <div className="mt-6 text-center text-[8pt] text-gray-500 border-t pt-2">
            <p>Gerado por EduCreator — {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
