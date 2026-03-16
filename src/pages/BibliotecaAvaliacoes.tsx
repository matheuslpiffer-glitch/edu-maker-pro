import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exportToPDF } from '@/lib/export';
import PisaPrintPreview from '@/components/PisaPrintPreview';
import React from 'react';
import {
  Loader2, Search, FolderOpen, Folder, Trash2, FileDown, Eye,
  Share2, ChevronRight, CheckSquare, X, Library
} from 'lucide-react';

interface PisaSimulator {
  id: string;
  title: string;
  proficiency_level: number;
  competency: string;
  questions: any[];
  student_results: any[];
  created_at: string;
  class_name: string;
  bimester: number;
  institution_name: string;
}

const COMPETENCY_LABELS: Record<string, string> = {
  letramento_matematico: 'Letramento Matemático',
  letramento_leitura: 'Letramento em Leitura',
  letramento_cientifico: 'Letramento Científico',
  letramento_financeiro: 'Letramento Financeiro',
  pensamento_critico: 'Pensamento Crítico e Criativo',
};

function getMonthYear(dateStr: string) {
  const d = new Date(dateStr);
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getType(level: number) {
  return level >= 5 ? 'Elite' : 'PISA';
}

export default function BibliotecaAvaliacoes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [folderView, setFolderView] = useState<'month' | 'turma' | 'type'>('month');
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewSim, setPreviewSim] = useState<PisaSimulator | null>(null);
  const [pdfSim, setPdfSim] = useState<PisaSimulator | null>(null);
  const pdfRef = React.useRef<HTMLDivElement>(null);

  const { data: simulators = [], isLoading } = useQuery({
    queryKey: ['biblioteca-pisa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pisa_simulators')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        questions: Array.isArray(s.questions) ? s.questions : [],
        student_results: Array.isArray(s.student_results) ? s.student_results : [],
        class_name: s.class_name || '',
        bimester: s.bimester || 1,
        institution_name: s.institution_name || '',
      })) as PisaSimulator[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase.from('pisa_simulators').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biblioteca-pisa'] });
      setSelected(new Set());
      toast({ title: 'Avaliações excluídas com sucesso.' });
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return simulators;
    const q = search.toLowerCase();
    return simulators.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (COMPETENCY_LABELS[s.competency] || '').toLowerCase().includes(q) ||
      s.questions.some((qq: any) => (qq.skill21 || '').toLowerCase().includes(q))
    );
  }, [simulators, search]);

  const folders = useMemo(() => {
    const map: Record<string, PisaSimulator[]> = {};
    filtered.forEach(s => {
      let key = '';
      if (folderView === 'month') key = getMonthYear(s.created_at);
      else if (folderView === 'turma') key = s.class_name || 'Sem Turma';
      else key = getType(s.proficiency_level);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, folderView]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(s => s.id)));
  };

  const handleBatchDelete = () => {
    if (selected.size === 0) return;
    deleteMutation.mutate(Array.from(selected));
  };

  const handleBatchExport = async () => {
    if (selected.size === 0) return;
    for (const id of selected) {
      const sim = simulators.find(s => s.id === id);
      if (sim) {
        setPdfSim(sim);
        await new Promise(resolve => setTimeout(resolve, 600));
        if (pdfRef.current) {
          await exportToPDF(pdfRef.current, sim.title || 'simulado');
        }
      }
    }
    setPdfSim(null);
    toast({ title: `${selected.size} PDF(s) exportados.` });
  };

  const handleShare = (sim: PisaSimulator) => {
    const url = `${window.location.origin}/pisa-aluno/${sim.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link copiado!', description: 'Envie para os alunos.' });
    });
  };

  const handleExportPDF = async (sim: PisaSimulator) => {
    setPdfSim(sim);
    setTimeout(async () => {
      if (pdfRef.current) {
        await exportToPDF(pdfRef.current, sim.title || 'simulado-pisa');
        setPdfSim(null);
      }
    }, 500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Library className="h-8 w-8 text-primary" />
          Biblioteca de Avaliações
        </h1>
        <p className="text-muted-foreground mt-1">Organize, busque e exporte seus simulados PISA e Elite.</p>
      </div>

      {/* Search + Folder Toggles */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título ou habilidade OCDE..."
            className="pl-10 min-h-[44px]"
          />
        </div>
        <div className="flex gap-2">
          {([['month', 'Mês/Ano'], ['turma', 'Turma'], ['type', 'Tipo']] as const).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={folderView === key ? 'default' : 'outline'}
              onClick={() => { setFolderView(key); setOpenFolder(null); }}
              className="min-h-[44px]"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Batch Actions */}
      {selected.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-3 p-3">
            <Badge variant="secondary">{selected.size} selecionada(s)</Badge>
            <Button size="sm" variant="outline" onClick={selectAll}>
              <CheckSquare className="h-4 w-4 mr-1" />
              {selected.size === filtered.length ? 'Desmarcar' : 'Selecionar Tudo'}
            </Button>
            <Button size="sm" variant="outline" className="text-cyan-700 border-cyan-300 hover:bg-cyan-50" onClick={handleBatchExport}>
              <FileDown className="h-4 w-4 mr-1" /> Exportar em Lote
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBatchDelete} disabled={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Folder List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : folders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma avaliação encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {folders.map(([folderName, sims]) => {
            const isOpen = openFolder === folderName;
            return (
              <Card key={folderName}>
                <button
                  onClick={() => setOpenFolder(isOpen ? null : folderName)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors rounded-t-lg"
                >
                  {isOpen
                    ? <FolderOpen className={`h-6 w-6 ${isMobile ? 'h-8 w-8' : ''} text-primary`} />
                    : <Folder className={`h-6 w-6 ${isMobile ? 'h-8 w-8' : ''} text-primary`} />
                  }
                  <span className={`font-semibold flex-1 text-left ${isMobile ? 'text-base' : 'text-sm'}`}>{folderName}</span>
                  <Badge variant="outline">{sims.length}</Badge>
                  <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                  <CardContent className="pt-0 space-y-2">
                    {sims.map(sim => (
                      <div key={sim.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                        <Checkbox
                          checked={selected.has(sim.id)}
                          onCheckedChange={() => toggleSelect(sim.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{sim.title}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px]">Nível {sim.proficiency_level}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{COMPETENCY_LABELS[sim.competency] || sim.competency}</Badge>
                            {sim.class_name && <Badge variant="outline" className="text-[10px]">{sim.class_name}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(sim.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewSim(sim)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50" onClick={() => handleExportPDF(sim)}>
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleShare(sim)}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewSim} onOpenChange={() => setPreviewSim(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewSim?.title}</DialogTitle>
          </DialogHeader>
          {previewSim && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>Nível {previewSim.proficiency_level}</Badge>
                <Badge variant="secondary">{COMPETENCY_LABELS[previewSim.competency]}</Badge>
                <Badge variant="outline">{previewSim.questions.length} questões</Badge>
              </div>
              {previewSim.questions.map((q: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold text-sm">Questão {i + 1}</p>
                    {q.scenario && <p className="text-sm italic text-muted-foreground bg-muted/50 p-2 rounded">{q.scenario}</p>}
                    <p className="text-sm">{q.content}</p>
                    {q.options?.map((opt: any) => (
                      <p key={opt.letter} className={`text-sm ${opt.isCorrect ? 'font-semibold text-cyan-700' : ''}`}>({opt.letter}) {opt.text}</p>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden PDF Preview */}
      {pdfSim && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PisaPrintPreview
            ref={pdfRef}
            title={pdfSim.title}
            proficiencyLevel={pdfSim.proficiency_level}
            competency={pdfSim.competency}
            questions={pdfSim.questions}
            institutionName={pdfSim.institution_name}
            showAnswerKey={true}
          />
        </div>
      )}
    </div>
  );
}
