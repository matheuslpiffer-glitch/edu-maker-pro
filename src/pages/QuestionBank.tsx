import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Loader2, BookOpen, ListChecks, AlignLeft, Search, ShoppingCart, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SubjectSelect from '@/components/SubjectSelect';
import { getSubjectIcon } from '@/lib/subjects-data';
import { useSavedQuestionsBank, SavedQuestion } from '@/hooks/useSavedQuestionsBank';

const COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700', indigo: 'bg-indigo-100 text-indigo-700',
  purple: 'bg-purple-100 text-purple-700', cyan: 'bg-cyan-100 text-cyan-700',
  orange: 'bg-orange-100 text-orange-700', pink: 'bg-pink-100 text-pink-700',
};

const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-cyan-100 text-cyan-700', medium: 'bg-amber-100 text-amber-700', hard: 'bg-rose-100 text-rose-700',
};

const BANCA_COLORS: Record<string, string> = {
  'Simulado': 'bg-indigo-100 text-indigo-700',
  'AEE': 'bg-violet-100 text-violet-700',
  'Jogos': 'bg-purple-100 text-purple-700',
  'ETEC': 'bg-emerald-100 text-emerald-700',
  'Banca Padrão Nacional': 'bg-amber-100 text-amber-700',
};

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

interface Subject { id: string; name: string; color: string; }
interface Question {
  id: string; subject_id: string; type: string; content: string; difficulty: string; topic: string; created_at: string;
  options: any[];
}

export default function QuestionBank() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { questions: savedQuestions, removeQuestion: removeSaved } = useSavedQuestionsBank();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterBanca, setFilterBanca] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('auto');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const load = async () => {
    const [qRes, sRes] = await Promise.all([
      supabase.from('questions').select('*').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
    ]);
    setQuestions((qRes.data as Question[]) || []);
    setSubjects((sRes.data as Subject[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    await supabase.from('questions').delete().eq('id', id);
    load();
    toast({ title: 'Questão excluída' });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Unique bancas from saved questions
  const allBancas = useMemo(() => {
    const set = new Set(savedQuestions.map(q => q.banca).filter(b => b && b.trim() !== ''));
    return Array.from(set).sort();
  }, [savedQuestions]);

  // Filtered manual questions
  const filteredManual = useMemo(() => {
    return questions.filter(q => {
      if (filterSubject !== 'all' && q.subject_id !== filterSubject) return false;
      if (filterType !== 'all' && q.type !== filterType) return false;
      if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const text = stripHtml(q.content).toLowerCase();
        if (!text.includes(term) && !q.topic?.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [questions, filterSubject, filterType, filterDifficulty, searchTerm]);

  // Filtered auto-saved questions
  const filteredAuto = useMemo(() => {
    return savedQuestions.filter(q => {
      if (filterBanca !== 'all' && q.banca !== filterBanca) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const text = stripHtml(q.conteudo).toLowerCase();
        if (!text.includes(term) && !q.tema?.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [savedQuestions, filterBanca, searchTerm]);

  const handleMontarProva = () => {
    // Collect selected content from both tabs
    const selectedContent: string[] = [];
    selectedIds.forEach(id => {
      const autoQ = savedQuestions.find(q => q.id === id);
      if (autoQ) {
        selectedContent.push(autoQ.conteudo);
        return;
      }
      const manualQ = questions.find(q => q.id === id);
      if (manualQ) selectedContent.push(manualQ.content);
    });

    if (selectedContent.length === 0) return;

    // Store in sessionStorage for the preview page to pick up
    sessionStorage.setItem('provaCustomContent', JSON.stringify(selectedContent));
    navigate('/provas/nova?fromBank=true');
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Super Biblioteca</p>
            <h1 className="text-2xl font-bold text-foreground">Banco de Questões</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/questoes/nova">
            <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Nova Questão</Button>
          </Link>
        </div>
      </div>

      {/* Cart / Montar Prova Button */}
      <Button
        onClick={handleMontarProva}
        disabled={selectedIds.size === 0}
        size="lg"
        className="w-full mb-4 rounded-2xl text-white shadow-lg transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        MONTAR PROVA COM SELECIONADAS ({selectedIds.size})
      </Button>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por tema, conteúdo ou banca..."
          className="pl-10 rounded-2xl bg-white border-slate-200"
        />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('auto')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'auto'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-muted-foreground hover:border-teal-300'
          }`}
        >
          🤖 Auto-Salvas ({savedQuestions.length})
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'manual'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-muted-foreground hover:border-teal-300'
          }`}
        >
          ✍️ Manuais ({questions.length})
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            {activeTab === 'manual' && (
              <>
                <div className="w-52">
                  <SubjectSelect value={filterSubject} onValueChange={setFilterSubject} subjects={subjects} placeholder="Disciplina" showAll />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="multiple-choice">Múltipla Escolha</SelectItem>
                    <SelectItem value="essay">Dissertativa</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Dificuldade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            {activeTab === 'auto' && allBancas.length > 0 && (
              <Select value={filterBanca} onValueChange={setFilterBanca}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por Banca" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Bancas</SelectItem>
                  {allBancas.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AUTO-SAVED TAB */}
      {activeTab === 'auto' && (
        filteredAuto.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhuma questão auto-salva ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Gere simulados, jogos ou atividades AEE para popular automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAuto.map(q => {
              const isSelected = selectedIds.has(q.id);
              return (
                <Card key={q.id} className={`transition-all cursor-pointer ${isSelected ? 'ring-2 ring-teal-500 shadow-md' : 'hover:shadow-md'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(q.id)}
                        className="mt-1 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BANCA_COLORS[q.banca] || 'bg-slate-100 text-slate-700'}`}>
                            {q.banca}
                          </span>
                          <Badge variant="outline" className="text-xs">{q.tipo}</Badge>
                          {q.tema && <span className="text-xs text-muted-foreground">📌 {q.tema}</span>}
                        </div>
                        <p className="text-sm text-foreground line-clamp-3">{stripHtml(q.conteudo)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(q.dataCriacao).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeSaved(q.id)} className="text-destructive hover:text-destructive shrink-0">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* MANUAL TAB */}
      {activeTab === 'manual' && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredManual.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhuma questão encontrada.</p>
            <Link to="/questoes/nova"><Button variant="outline" className="mt-4">Criar Primeira Questão</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredManual.map(q => {
              const subject = subjects.find(s => s.id === q.subject_id);
              const isSelected = selectedIds.has(q.id);
              return (
                <Card key={q.id} className={`transition-all ${isSelected ? 'ring-2 ring-teal-500 shadow-md' : 'hover:shadow-md'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(q.id)}
                        className="mt-1 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {subject && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COLOR_CLASSES[subject.color] || COLOR_CLASSES.blue}`}>
                              {getSubjectIcon(subject.name)} {subject.name}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs gap-1">
                            {q.type === 'multiple-choice' ? <ListChecks size={12} /> : <AlignLeft size={12} />}
                            {q.type === 'multiple-choice' ? 'Múltipla Escolha' : 'Dissertativa'}
                          </Badge>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
                            {DIFFICULTY_LABELS[q.difficulty]}
                          </span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">{stripHtml(q.content)}</p>
                        {q.topic && <p className="text-xs text-muted-foreground mt-1">Tópico: {q.topic}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Link to={`/questoes/${q.id}/editar`}>
                          <Button variant="ghost" size="sm"><Pencil size={16} /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)} className="text-destructive hover:text-destructive">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
