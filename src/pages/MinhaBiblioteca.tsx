import { useState, useEffect, useMemo } from 'react';
import { Library, Search, Link2, Eye, Trash2, Loader2, ClipboardList, FileText, Accessibility, CalendarDays, QrCode } from 'lucide-react';
import QRCodeModal from '@/components/QRCodeModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
}

type TabCategory = 'todos' | 'simulados' | 'avaliacoes' | 'aee' | 'multidisciplinar';

function purposeToCategory(purpose: string): TabCategory {
  if (purpose.includes('aee') || purpose.includes('inclusao')) return 'aee';
  if (purpose.includes('simulado_semanal') || purpose.includes('multidisciplinar')) return 'multidisciplinar';
  if (purpose.includes('alta_performance') || purpose.includes('saresp') || purpose.includes('saeb') || purpose.includes('prova_paulista') || purpose.includes('simulad')) return 'simulados';
  if (purpose.includes('diagnostica') || purpose.includes('avaliacao') || purpose.includes('gabarito')) return 'avaliacoes';
  return 'simulados';
}

export default function MinhaBiblioteca() {
  const { toast } = useToast();
  const [items, setItems] = useState<BankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabCategory>('todos');
  const [previewItem, setPreviewItem] = useState<BankItem | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('question_banks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data as BankItem[]) || []);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar biblioteca', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('question_banks').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Atividade removida da biblioteca.' });
  };

  const handleCopyLink = (id: string) => {
    // Use published domain for student links to avoid Lovable editor/preview redirects
    const origin = window.location.hostname.includes('lovableproject.com')
      ? 'https://edu-maker-pro.lovable.app'
      : window.location.origin;
    const url = `${origin}/atividade/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: '🔗 Link copiado!', description: 'Envie para sua turma.' });
  };

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (search) {
        const q = search.toLowerCase();
        if (!item.subject.toLowerCase().includes(q) && !item.topic.toLowerCase().includes(q) && !item.grade.toLowerCase().includes(q)) return false;
      }
      if (tab !== 'todos') {
        if (purposeToCategory(item.purpose) !== tab) return false;
      }
      return true;
    });
  }, [items, search, tab]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const countByCategory = (cat: TabCategory) => {
    if (cat === 'todos') return items.length;
    return items.filter(i => purposeToCategory(i.purpose) === cat).length;
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
              {filtered.map(item => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-foreground truncate">{item.subject} — {item.topic}</h3>
                      <Badge variant="secondary" className="text-[10px]">{item.grade}</Badge>
                      {item.question_type === 'discursiva' && <Badge variant="outline" className="text-[10px]">Discursiva</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarDays size={12} /> {formatDate(item.created_at)}</span>
                      <span>{(item.questions as any[])?.length || 0} questões</span>
                      {item.institution_name && <span>{item.institution_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleCopyLink(item.id)} className="gap-1.5">
                      <Link2 size={14} /> Link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreviewItem(item)} className="gap-1.5">
                      <Eye size={14} /> Ver
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewItem?.subject} — {previewItem?.topic}</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                <Badge variant="secondary">{previewItem.grade}</Badge>
                <Badge variant="outline">{previewItem.question_type}</Badge>
                {previewItem.institution_name && <Badge variant="outline">{previewItem.institution_name}</Badge>}
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
                          <p key={o.letter} className={`text-sm ${o.isCorrect ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                            <strong>{o.letter})</strong> {o.text} {o.isCorrect && '✓'}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={() => handleCopyLink(previewItem.id)} className="w-full gap-2">
                <Link2 size={16} /> Copiar Link do Aluno
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
