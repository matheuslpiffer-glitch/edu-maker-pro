import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  FileText, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search, 
  FilterX 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Assessment {
  id: string;
  title: string;
  institution_name: string;
  teacher_name: string;
  assessment_date: string;
  class_name: string;
  question_ids: string[];
  created_at: string;
}

export default function Assessments() {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAssessments((data as Assessment[]) || []);
    } catch (error) {
      console.error('Error loading assessments:', error);
      toast({ title: 'Erro ao carregar provas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if (error) throw error;
      
      setAssessments(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Prova excluída com sucesso' });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast({ title: 'Erro ao excluir prova', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if it's a valid date
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Minhas Provas</h1>
          <p className="text-sm text-muted-foreground">{assessments.length} provas criadas</p>
        </div>
        <Link to="/provas/nova">
          <Button><Plus className="h-4 w-4 mr-2" />Nova Prova</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : assessments.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Nenhuma prova criada ainda.</p>
          <Link to="/provas/nova"><Button variant="outline" className="mt-4">Criar Primeira Prova</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map(a => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{a.title || 'Sem título'}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    {a.institution_name && <span>{a.institution_name}</span>}
                    {a.teacher_name && <span>Prof. {a.teacher_name}</span>}
                    {a.class_name && <span>Turma: {a.class_name}</span>}
                    {a.assessment_date && <span>{formatDate(a.assessment_date)}</span>}
                    <span>{(a.question_ids as string[])?.length || 0} questões</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link to={`/provas/${a.id}`}>
                    <Button variant="ghost" size="sm" disabled={deletingId === a.id}>
                      <Pencil size={16} />
                    </Button>
                  </Link>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={deletingId === a.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingId === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza que deseja excluir esta prova?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A prova será removida permanentemente de nossos servidores.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(a.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sim, excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
