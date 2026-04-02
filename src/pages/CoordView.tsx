import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2, BarChart3, Users, AlertTriangle, Zap, FileText, PieChart, TrendingUp, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface EssaySub {
  id: string;
  student_name: string;
  student_class: string;
  banca: string;
  status: string;
  total_score: number | null;
  teacher_validated: boolean | null;
  scores: any;
  suggestions: string;
  corrected_at: string | null;
  created_at: string;
  teacher_user_id: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(142 76% 36%)', 'hsl(48 96% 53%)', 'hsl(262 83% 58%)'];

export default function CoordView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<EssaySub[]>([]);
  const [simulatorResults, setSimulatorResults] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterBanca, setFilterBanca] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [essayRes, simRes] = await Promise.all([
      supabase.from('essay_submissions').select('*').eq('teacher_user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('student_results').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ]);
    if (essayRes.data) setSubmissions(essayRes.data as unknown as EssaySub[]);
    if (simRes.data) setSimulatorResults(simRes.data);
    setLoading(false);
  };

  // ── Derived data ──
  const classes = useMemo(() => {
    const set = new Set(submissions.map(s => s.student_class).filter(Boolean));
    return Array.from(set).sort();
  }, [submissions]);

  const filtered = useMemo(() => {
    let f = submissions;
    if (filterClass !== 'all') f = f.filter(s => s.student_class === filterClass);
    if (filterBanca !== 'all') f = f.filter(s => s.banca === filterBanca);
    return f;
  }, [submissions, filterClass, filterBanca]);

  const corrected = filtered.filter(s => s.status === 'corrected');
  const pending = filtered.filter(s => s.status === 'submitted' || (s.status === 'corrected' && !s.teacher_validated));
  const released = filtered.filter(s => s.status === 'corrected' && s.teacher_validated);

  // ── Top 5 common errors ──
  const topErrors = useMemo(() => {
    const errorMap: Record<string, number> = {};
    corrected.forEach(s => {
      const comps = s.scores?.competencies as any[] | undefined;
      if (!comps) return;
      comps.forEach((c: any) => {
        const pct = c.max > 0 ? (c.score / c.max) * 100 : 100;
        if (pct < 60) {
          const name = c.name || 'Desconhecida';
          errorMap[name] = (errorMap[name] || 0) + 1;
        }
      });
    });
    return Object.entries(errorMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => {
        const total = corrected.length || 1;
        const pct = Math.round((count / total) * 100);
        return { name, count, pct, status: pct >= 40 ? 'critical' : pct >= 20 ? 'warning' : 'ok' };
      });
  }, [corrected]);

  // ── Score distribution by banca ──
  const bancaDistribution = useMemo(() => {
    const map: Record<string, { total: number; count: number; scores: number[] }> = {};
    corrected.forEach(s => {
      if (!s.total_score) return;
      if (!map[s.banca]) map[s.banca] = { total: 0, count: 0, scores: [] };
      map[s.banca].total += s.total_score;
      map[s.banca].count += 1;
      map[s.banca].scores.push(s.total_score);
    });
    return Object.entries(map).map(([banca, d]) => ({
      name: banca,
      media: Math.round(d.total / d.count),
      count: d.count,
    }));
  }, [corrected]);

  // ── Pie chart data ──
  const pieData = useMemo(() => {
    const ranges = [
      { name: '0-200', min: 0, max: 200, count: 0 },
      { name: '201-400', min: 201, max: 400, count: 0 },
      { name: '401-600', min: 401, max: 600, count: 0 },
      { name: '601-800', min: 601, max: 800, count: 0 },
      { name: '801-1000', min: 801, max: 1000, count: 0 },
    ];
    corrected.forEach(s => {
      const score = s.total_score || 0;
      const r = ranges.find(r => score >= r.min && score <= r.max);
      if (r) r.count++;
    });
    return ranges.filter(r => r.count > 0);
  }, [corrected]);

  // ── Efficiency metrics ──
  const avgDevolutiva = useMemo(() => {
    const withDates = released.filter(s => s.corrected_at && s.created_at);
    if (!withDates.length) return 0;
    const totalDays = withDates.reduce((acc, s) => {
      const diff = (new Date(s.corrected_at!).getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return acc + Math.max(0, diff);
    }, 0);
    return Math.round((totalDays / withDates.length) * 10) / 10;
  }, [released]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Dashboard do Coordenador
          </h1>
          <p className="text-sm text-muted-foreground">Relatório de Evolução Pedagógica — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Turma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Turmas</SelectItem>
              {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterBanca} onValueChange={setFilterBanca}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Banca" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="ENEM">ENEM</SelectItem>
              <SelectItem value="FUVEST">FUVEST</SelectItem>
              <SelectItem value="VUNESP">VUNESP</SelectItem>
              <SelectItem value="UNICAMP">UNICAMP</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Redações Totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{pending.length}</p>
            <p className="text-xs text-muted-foreground">Pendentes de Liberação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{released.length}</p>
            <p className="text-xs text-muted-foreground">Correções Liberadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-3xl font-bold">{avgDevolutiva}</p>
            </div>
            <p className="text-xs text-muted-foreground">Dias (Média Devolutiva)</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Errors + Pie Chart */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Top 5 Lacunas de Aprendizagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topErrors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma correção disponível para análise.</p>
            ) : topErrors.map((e, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{e.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{e.pct}% falha</span>
                    <Badge variant={e.status === 'critical' ? 'destructive' : e.status === 'warning' ? 'secondary' : 'default'} className="text-[10px]">
                      {e.status === 'critical' ? '🔴 Crítico' : e.status === 'warning' ? '🟡 Atenção' : '🟢 Bom'}
                    </Badge>
                  </div>
                </div>
                <Progress value={e.pct} className="h-2" />
              </div>
            ))}
            {topErrors.length > 0 && topErrors[0].status === 'critical' && (
              <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Sugestão da IA Doutora:</strong> Notei recorrência alta em <strong>{topErrors[0].name}</strong>. 
                  Sugiro disparar uma Atividade Lúdica de Caça-Erros para todas as turmas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Distribuição de Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes.</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer>
                  <RechartsPie>
                    <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }) => `${name}: ${count}`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance by Banca */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Performance por Banca
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bancaDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados de redações corrigidas.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={bancaDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="media" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Média" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-3">
            {bancaDistribution.map((b, i) => (
              <Badge key={i} variant="outline" className="gap-1">
                {b.name}: <strong>{b.media}</strong> <span className="text-muted-foreground text-[10px]">({b.count} redações)</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending List */}
      {pending.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" /> Redações Pendentes de Liberação ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pending.slice(0, 20).map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                  <div>
                    <span className="font-medium">{s.student_name || 'Sem nome'}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{s.student_class} • {s.banca}</span>
                  </div>
                  <Badge variant={s.status === 'corrected' ? 'secondary' : 'outline'} className="text-[10px]">
                    {s.status === 'corrected' ? 'IA: Rascunho' : 'Aguardando Correção'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Dashboard do Coordenador — EduCreator Pro | Coord. Matheus Lima Piffer
      </p>
    </div>
  );
}
