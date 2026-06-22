import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ALL_DEFAULT_SUBJECTS, SUBJECT_CATEGORIES, getSubjectIcon } from '@/lib/subjects-data';

const COLORS = ['blue', 'amber', 'rose', 'indigo', 'purple', 'cyan', 'orange', 'pink'];
const COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  purple: 'bg-purple-100 text-purple-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  orange: 'bg-orange-100 text-orange-700',
  pink: 'bg-pink-100 text-pink-700',
};

interface Subject {
  id: string;
  name: string;
  color: string;
}

export default function Subjects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    setSubjects((data as Subject[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    if (editingId) {
      await supabase.from('subjects').update({ name: name.trim(), color }).eq('id', editingId);
    } else {
      await supabase.from('subjects').insert({ name: name.trim(), color, user_id: user.id });
    }
    setName(''); setColor('blue'); setEditingId(null);
    setSaving(false);
    load();
    toast({ title: editingId ? 'Disciplina atualizada' : 'Disciplina criada' });
  };

  const handleEdit = (s: Subject) => {
    setEditingId(s.id); setName(s.name); setColor(s.color);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('subjects').delete().eq('id', id);
    load();
    toast({ title: 'Disciplina excluída' });
  };

  const handleSeedDefaults = async () => {
    if (!user) return;
    setSeeding(true);
    const existingNames = subjects.map(s => s.name.toLowerCase());
    const toInsert = ALL_DEFAULT_SUBJECTS
      .filter(s => !existingNames.includes(s.name.toLowerCase()))
      .map(s => ({ name: s.name, color: s.color, user_id: user.id }));

    if (toInsert.length === 0) {
      toast({ title: 'Todas as disciplinas da BNCC já estão cadastradas!' });
    } else {
      await supabase.from('subjects').insert(toInsert);
      toast({ title: `${toInsert.length} disciplinas adicionadas!` });
      load();
    }
    setSeeding(false);
  };

  // Group subjects by category for display
  const groupedSubjects = SUBJECT_CATEGORIES.map(cat => ({
    label: cat.label,
    items: subjects.filter(s => cat.subjects.some(cs => cs.name === s.name)),
  })).filter(g => g.items.length > 0);

  const uncategorized = subjects.filter(s =>
    !SUBJECT_CATEGORIES.some(cat => cat.subjects.some(cs => cs.name === s.name))
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Disciplinas</h1>
        <Button variant="outline" onClick={handleSeedDefaults} disabled={seeding}>
          {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Carregar BNCC 2026
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Matemática" />
            </div>
            <div className="w-32">
              <label className="text-sm font-medium mb-1 block">Cor</label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLORS.map(c => (
                    <SelectItem key={c} value={c}>
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${COLOR_CLASSES[c]?.split(' ')[0]}`} />
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {editingId ? 'Atualizar' : 'Adicionar'}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={() => { setEditingId(null); setName(''); }}>Cancelar</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Nenhuma disciplina cadastrada.</p>
          <Button onClick={handleSeedDefaults} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Carregar Disciplinas BNCC 2026
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSubjects.map(group => (
            <div key={group.label}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">{group.label}</h2>
              <div className="space-y-2">
                {group.items.map(s => (
                  <Card key={s.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getSubjectIcon(s.name)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[s.color] || COLOR_CLASSES.blue}`}>
                          {s.name}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Pencil size={16} /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza que deseja excluir esta disciplina?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso pode afetar as questões vinculadas a ela no histórico.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">📁 Personalizadas</h2>
              <div className="space-y-2">
                {uncategorized.map(s => (
                  <Card key={s.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getSubjectIcon(s.name)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[s.color] || COLOR_CLASSES.blue}`}>
                          {s.name}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Pencil size={16} /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza que deseja excluir esta disciplina?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso pode afetar as questões vinculadas a ela no histórico.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
