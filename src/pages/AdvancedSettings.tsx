import { useCallback, useEffect, useState } from 'react';
import { useRole } from '@/hooks/useRole';
import { Shield, AlertTriangle, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import CreateUserAccessCard from '@/components/admin/CreateUserAccessCard';

interface UserInfo {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role?: string;
}

export default function AdvancedSettings() {
  const { isSuperAdmin, loading } = useRole();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoadingUsers(true);

    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('id, email, display_name, avatar_url, created_at'),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    const rolesMap = new Map<string, string>();
    (rolesRes.data || []).forEach((r: any) => rolesMap.set(r.user_id, r.role));

    const merged = (profilesRes.data || []).map((p: any) => ({
      ...p,
      role: rolesMap.get(p.id) || 'user',
    }));

    setUsers(merged);
    setLoadingUsers(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (loading) return null;

  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Painel Super ADM</h1>
        <Badge className="bg-amber-500 text-white hover:bg-amber-600">Super Admin</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Utilizadores Registados
          </CardTitle>
          <CardDescription>Lista de todos os utilizadores, seus papéis e informações de perfil</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum utilizador encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Registo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url || ''} />
                          <AvatarFallback className="text-xs">{(u.display_name || u.email || '?')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{u.display_name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.email || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === 'super_admin' ? 'default' : 'secondary'}
                        className={u.role === 'super_admin' ? 'bg-amber-500 text-white' : ''}
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
