import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Users, Search, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
}

interface BankInfo {
  id: string;
  subject: string;
  topic: string;
  grade: string;
}

export default function ResultadosAlunos() {
  const { toast } = useToast();
  const [results, setResults] = useState<ActivityResult[]>([]);
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBank, setFilterBank] = useState('all');
  const [filterClass, setFilterClass] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load results
      const { data: resData } = await supabase
        .from('student_activity_results')
        .select('*')
        .eq('teacher_user_id', user.id)
        .order('created_at', { ascending: false });

      setResults((resData as any[]) || []);

      // Load banks for filter labels
      const { data: bankData } = await supabase
        .from('question_banks')
        .select('id, subject, topic, grade')
        .eq('user_id', user.id);

      setBanks((bankData as any[]) || []);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar resultados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('student_activity_results').delete().eq('id', id);
    setResults(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Resultado removido.' });
  };

  const uniqueClasses = useMemo(() => {
    const classes = new Set(results.map(r => r.student_class).filter(Boolean));
    return Array.from(classes).sort();
  }, [results]);

  const uniqueBanks = useMemo(() => {
    const bankIds = new Set(results.map(r => r.bank_id));
    return banks.filter(b => bankIds.has(b.id));
  }, [results, banks]);

  const filtered = useMemo(() => {
    return results.filter(r => {
      if (search && !r.student_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterBank !== 'all' && r.bank_id !== filterBank) return false;
      if (filterClass !== 'all' && r.student_class !== filterClass) return false;
      return true;
    });
  }, [results, search, filterBank, filterClass]);

  const getBankLabel = (bankId: string) => {
    const b = banks.find(b => b.id === bankId);
    return b ? `${b.subject} — ${b.topic}` : bankId.slice(0, 8);
  };

  // Chart data: average by bank
  const chartData = useMemo(() => {
    const byBank: Record<string, { total: number; count: number; label: string }> = {};
    filtered.filter(r => r.status === 'corrigido').forEach(r => {
      if (!byBank[r.bank_id]) byBank[r.bank_id] = { total: 0, count: 0, label: getBankLabel(r.bank_id) };
      byBank[r.bank_id].total += r.percentage;
      byBank[r.bank_id].count++;
    });
    return Object.values(byBank).map(b => ({
      label: b.label.length > 30 ? b.label.slice(0, 30) + '…' : b.label,
      average: Math.round(b.total / b.count),
    }));
  }, [filtered, banks]);

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
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
          <BarChart3 size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Resultados e Desempenho</h1>
          <p className="text-sm text-muted-foreground">Acompanhe as respostas dos alunos em tempo real</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black text-primary">{results.length}</p>
          <p className="text-xs text-muted-foreground">Respostas Recebidas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black text-foreground">{uniqueClasses.length}</p>
          <p className="text-xs text-muted-foreground">Turmas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{results.filter(r => r.status === 'corrigido').length}</p>
          <p className="text-xs text-muted-foreground">Corrigidas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-black text-amber-600">{results.filter(r => r.status === 'aguardando_revisao').length}</p>
          <p className="text-xs text-muted-foreground">Aguardando Revisão</p>
        </div>
      </div>

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
                    className={`h-full rounded-full transition-all ${d.average >= 70 ? 'bg-emerald-500' : d.average >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
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
        <Select value={filterBank} onValueChange={setFilterBank}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Atividade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as atividades</SelectItem>
            {uniqueBanks.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.subject} — {b.topic?.slice(0, 30)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Results Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">Nenhum resultado encontrado. Compartilhe atividades com seus alunos usando o botão "Link do Aluno".</p>
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
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.student_name}</TableCell>
                  <TableCell>{r.student_class || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{getBankLabel(r.bank_id)}</TableCell>
                  <TableCell className="text-center font-bold">
                    {r.status === 'corrigido' ? (
                      <span className={r.percentage >= 70 ? 'text-emerald-600' : r.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}>
                        {r.score}/{r.total_questions}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={r.status === 'corrigido' ? 'default' : 'secondary'} className="text-[10px]">
                      {r.status === 'corrigido' ? 'Corrigido' : 'Aguardando Revisão'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground">EduCreator Pro — Por Matheus Lima Piffer</p>
    </div>
  );
}
