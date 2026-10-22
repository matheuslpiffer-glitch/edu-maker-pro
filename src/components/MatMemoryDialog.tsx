import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, FileText, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Fact = { id: string; category: string; memory_fact: string; created_at: string };
type Doc = { id: string; name: string; created_at: string };

const CATEGORIES = [
  { id: 'estilo', label: 'Jeito de ensinar', empty: 'Conte ao Mat suas séries, disciplinas e formato preferido; ele guarda sozinho.' },
  { id: 'turma', label: 'Turmas', empty: 'Fale sobre suas turmas (dificuldades, resultados) e o Mat lembra nas próximas criações.' },
  { id: 'correcao', label: 'Correções', empty: 'Quando você corrige uma resposta do Mat, a regra aparece aqui.' },
];

export default function MatMemoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [f, d] = await Promise.all([
      supabase.from('user_pedagogical_memory').select('id, category, memory_fact, created_at').order('created_at', { ascending: false }),
      supabase.from('mat_documents').select('id, name, created_at').order('created_at', { ascending: false }),
    ]);
    setFacts((f.data as Fact[]) ?? []);
    setDocs((d.data as Doc[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const addFact = async (category: string) => {
    const text = draft[category]?.trim();
    if (!text) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('user_pedagogical_memory').insert({ user_id: user.id, category, memory_fact: text.slice(0, 300) });
    if (error) { toast.error('Não foi possível guardar.'); return; }
    setDraft((p) => ({ ...p, [category]: '' }));
    load();
  };

  const removeFact = async (id: string) => {
    await supabase.from('user_pedagogical_memory').delete().eq('id', id);
    setFacts((p) => p.filter((f) => f.id !== id));
  };
  const removeDoc = async (id: string) => {
    await supabase.from('mat_documents').delete().eq('id', id);
    setDocs((p) => p.filter((d) => d.id !== id));
  };
  const useDoc = (d: Doc) => {
    window.dispatchEvent(new CustomEvent('mat-use-document', { detail: { id: d.id, name: d.name } }));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>O que o Mat aprendeu</DialogTitle>
          <DialogDescription>O Mat aprende sozinho com as conversas. Você pode adicionar, apagar ou reutilizar o que ele guardou.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="estilo">
            <TabsList className="grid grid-cols-4 w-full">
              {CATEGORIES.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.label}</TabsTrigger>)}
              <TabsTrigger value="docs">Documentos</TabsTrigger>
            </TabsList>
            {CATEGORIES.map((c) => {
              const list = facts.filter((f) => f.category === c.id);
              return (
                <TabsContent key={c.id} value={c.id} className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar algo para o Mat lembrar..."
                      value={draft[c.id] ?? ''}
                      onChange={(e) => setDraft((p) => ({ ...p, [c.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addFact(c.id)}
                    />
                    <Button size="icon" onClick={() => addFact(c.id)} aria-label="Adicionar"><Plus className="h-4 w-4" /></Button>
                  </div>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">{c.empty}</p>
                  ) : list.map((f) => (
                    <div key={f.id} className="flex items-start gap-2 rounded-lg border p-3">
                      <p className="flex-1 text-sm">{f.memory_fact}</p>
                      <Button variant="ghost" size="icon" onClick={() => removeFact(f.id)} aria-label="Apagar"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </TabsContent>
              );
            })}
            <TabsContent value="docs" className="space-y-3">
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Os arquivos que você envia ao Mat ficam guardados aqui para usar de novo sem reenviar.</p>
              ) : docs.map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-lg border p-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'dd/MM/yyyy')}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => useDoc(d)}>Usar nesta conversa</Button>
                  <Button variant="ghost" size="icon" onClick={() => removeDoc(d.id)} aria-label="Apagar"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
