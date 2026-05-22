import { useState, useEffect, useMemo } from 'react';
import { Library, Search, Link2, Eye, Trash2, Loader2, CalendarDays, QrCode, Share2 } from 'lucide-react';
import QRCodeModal from '@/components/QRCodeModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { buildPublicAppUrl } from '@/lib/public-links';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface BankItem {
  id: string;
  subject: string;
  topic: string;
  grade: string;
  purpose: string;
  question_type: string;
  institution_name: string;
  questions: any[];
  created_at: string;
  _source: 'bank';
}

interface SimItem {
  id: string;
  title: string;
  subject_area: string;
  grade: string;
  exam_type: string;
  institution_name: string;
  questions: any[];
  created_at: string;
  _source: 'simulator';
}

type LibItem = BankItem | SimItem;
type TabCategory = 'todos' | 'simulados' | 'avaliacoes' | 'aee' | 'multidisciplinar';

function purposeToCategory(purpose: string): TabCategory {
  if (purpose.includes('aee') || purpose.includes('inclusao')) return 'aee';
  if (purpose.includes('simulado_semanal') || purpose.includes('multidisciplinar')) return 'multidisciplinar';
  if (purpose.includes('alta_performance') || purpose.includes('saresp') || purpose.includes('saeb') || purpose.includes('prova_paulista') || purpose.includes('simulad')) return 'simulados';
  if (purpose.includes('diagnostica') || purpose.includes('avaliacao') || purpose.includes('gabarito')) return 'avaliacoes';
  return 'simulados';
}

function getItemLabel(item: LibItem) {
  if (item._source === 'simulator') return (item as SimItem).title || `${(item as SimItem).subject_area} — ${(item as SimItem).exam_type}`;
  const b = item as BankItem;
  return `${b.subject} — ${b.topic}`;
}

function getItemCategory(item: LibItem): TabCategory {
  if (item._source === 'simulator') return 'simulados';
  return purposeToCategory((item as BankItem).purpose);
}

function getSharePath(item: LibItem) {
  return item._source === 'simulator' ? `/simulado/${item.id}` : `/atividade/${item.id}`;
}

export default function MinhaBiblioteca() {
  const { toast } = useToast();
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [sims, setSims] = useState<SimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabCategory>('todos');
  const [previewItem, setPreviewItem] = useState<LibItem | null>(null);
  const [qrItem, setQrItem] = useState<LibItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => { setCurrentPage(1); }, [search, tab]);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [bankRes, simRes] = await Promise.all([
        supabase.from('question_banks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('simulators').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setBanks((bankRes.data || []).map((b: any) => ({ ...b, _source: 'bank' as const })));
      setSims((simRes.data || []).map((s: any) => ({ ...s, _source: 'simulator' as const })));
    } catch {
      toast({ title: 'Erro ao carregar biblioteca', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const allItems: LibItem[] = useMemo(() => {
    return [...banks, ...sims].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [banks, sims]);

  const handleDelete = async (item: LibItem) => {
    if (item._source === 'simulator') {
      await supabase.from('simulators').delete().eq('id', item.id);
      setSims(prev => prev.filter(i => i.id !== item.id));
    } else {
      await supabase.from('question_banks').delete().eq('id', item.id);
      setBanks(prev => prev.filter(i => i.id !== item.id));
    }
    toast({ title: 'Atividade removida da biblioteca.' });
  };

  const handleCopyLink = (item: LibItem) => {
    const url = buildPublicAppUrl(getSharePath(item));
    navigator.clipboard.writeText(url);
    toast({ title: '🔗 Link copiado!', description: 'Envie para sua turma.' });
  };

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      if (search) {
        const q = search.toLowerCase();
        const label = getItemLabel(item).toLowerCase();
        const grade = item.grade?.toLowerCase() || '';
        if (!label.includes(q) && !grade.includes(q)) return false;
      }
      if (tab !== 'todos' && getItemCategory(item) !== tab) return false;
      return true;
    });
  }, [allItems, search, tab]);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const countByCategory = (cat: TabCategory) => {
    if (cat === 'todos') return allItems.length;
    return allItems.filter(i => getItemCategory(i) === cat).length;
  };

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
          <Library size={24} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Minha Biblioteca</h1>
          <p className="text-sm text-muted-foreground">Reutilize seus materiais em diferentes salas — por Matheus Lima Piffer</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por disciplina, tema ou série..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as TabCategory)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="todos">Todos ({countByCategory('todos')})</TabsTrigger>
          <TabsTrigger value="simulados">Simulados ({countByCategory('simulados')})</TabsTrigger>
          <TabsTrigger value="multidisciplinar">Multi ({countByCategory('multidisciplinar')})</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações ({countByCategory('avaliacoes')})</TabsTrigger>
          <TabsTrigger value="aee">AEE ({countByCategory('aee')})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Library className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Nenhuma atividade encontrada. Crie simulados ou avaliações para vê-los aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginated.map(item => (
                <div key={`${item._source}-${item.id}`} className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-foreground truncate">{getItemLabel(item)}</h3>
                      <Badge variant="secondary" className="text-[10px]">{item.grade}</Badge>
                      <Badge variant="outline" className="text-[10px]">{item._source === 'simulator' ? 'Simulado' : 'Atividade'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarDays size={12} /> {formatDate(item.created_at)}</span>
                      <span>{(item.questions as any[])?.length || 0} questões</span>
                      {item.institution_name && <span>{item.institution_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Universal Share Button */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" className="gap-1.5">
                          <Share2 size={14} /> Enviar para Aluno
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3 space-y-2">
                        <Button size="sm" variant="outline" className="w-full gap-2 justify-start" onClick={() => handleCopyLink(item)}>
                          <Link2 size={14} /> Copiar Link Aberto
                        </Button>
                        <Button size="sm" variant="outline" className="w-full gap-2 justify-start" onClick={() => setQrItem(item)}>
                          <QrCode size={14} /> Gerar QR Code
                        </Button>
                      </PopoverContent>
                    </Popover>
                    <Button size="sm" variant="outline" onClick={() => setPreviewItem(item)} className="gap-1.5">
                      <Eye size={14} /> Ver
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item)} className="text-destructive hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewItem ? getItemLabel(previewItem) : ''}</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                <Badge variant="secondary">{previewItem.grade}</Badge>
                <Badge variant="outline">{previewItem._source === 'simulator' ? 'Simulado' : 'Atividade'}</Badge>
                <span>{formatDate(previewItem.created_at)}</span>
              </div>
              <div className="space-y-4">
                {(previewItem.questions as any[])?.map((q: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-xs font-bold text-primary">Questão {i + 1} {q.skillCode ? `• ${q.skillCode}` : ''}</p>
                    <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: q.content }} />
                    {q.options?.length > 0 && (
                      <div className="space-y-1 pl-2">
                        {q.options.map((o: any) => (
                          <p key={o.letter} className={`text-sm ${o.isCorrect ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                            <strong>{o.letter})</strong> {o.text} {o.isCorrect && '✓'}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={() => handleCopyLink(previewItem)} className="w-full gap-2">
                <Link2 size={16} /> Copiar Link do Aluno
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {qrItem && (
        <QRCodeModal
          open={!!qrItem}
          onOpenChange={(open) => { if (!open) setQrItem(null); }}
          url={getSharePath(qrItem)}
          title={getItemLabel(qrItem)}
        />
      )}
    </div>
  );
}
