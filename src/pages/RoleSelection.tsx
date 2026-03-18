import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onRoleSelected: () => void;
}

export default function RoleSelection({ onRoleSelected }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [autoAssigned, setAutoAssigned] = useState(false);

  // Auto-assign role from session preference (OAuth flow)
  useEffect(() => {
    if (!user || autoAssigned) return;
    const preferred = sessionStorage.getItem('preferred_portal');
    if (preferred === 'teacher' || preferred === 'student') {
      setAutoAssigned(true);
      sessionStorage.removeItem('preferred_portal');
      selectRole(preferred === 'teacher' ? 'user' : 'student');
    }
  }, [user, autoAssigned]);

  const selectRole = async (role: 'user' | 'student') => {
    if (!user) return;
    setLoading(role);
    const { error } = await supabase.from('user_roles').insert({ user_id: user.id, role });
    setLoading(null);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      onRoleSelected();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl space-y-6 text-center">
        <h1 className="text-3xl font-bold">Bem-vindo ao EduCreator Pro</h1>
        <p className="text-muted-foreground">Como você deseja utilizar a plataforma?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer border-2 hover:border-yellow-500 transition-colors hover:shadow-lg"
            onClick={() => selectRole('user')}
          >
            <CardHeader className="items-center pb-2">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-2" style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7)' }}>
                <GraduationCap className="h-8 w-8 text-gray-900" />
              </div>
              <CardTitle className="text-lg">Sou Professor</CardTitle>
              <CardDescription>Crie simulados, provas e acompanhe o desempenho dos alunos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full text-gray-900 font-bold border-0"
                style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7)' }}
                disabled={loading !== null}
                onClick={() => selectRole('user')}
              >
                {loading === 'user' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar como Professor
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-2 hover:border-accent transition-colors"
            onClick={() => selectRole('student')}
          >
            <CardHeader className="items-center pb-2">
              <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-2">
                <BookOpen className="h-8 w-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-lg">Sou Aluno</CardTitle>
              <CardDescription>Realize simulados, revise seus erros e acompanhe sua evolução.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full" disabled={loading !== null} onClick={() => selectRole('student')}>
                {loading === 'student' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar como Aluno
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          Plataforma EduCreator Pro | Desenvolvido por Matheus Lima Piffer
        </p>
      </div>
    </div>
  );
}
