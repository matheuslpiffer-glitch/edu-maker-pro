import { useState } from 'react';
import { UserPlus, Loader2, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  arr.forEach((n) => (out += chars[n % chars.length]));
  return `${out}@2026!`;
}

interface Props {
  onCreated?: () => void;
}

export default function CreateUserAccessCard({ onCreated }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(randomPassword());
  const [role, setRole] = useState('user');
  const [plan, setPlan] = useState('pro');
  const [trialDays, setTrialDays] = useState('15');
  const [credits, setCredits] = useState('9999');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!email.trim() || password.length < 8) {
      toast.error('Informe um e-mail válido e uma senha com pelo menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          role,
          plan,
          trialDays: Number(trialDays),
          credits: Number(credits),
        },
      });

      const message = (data as any)?.error;
      if (error || message) {
        toast.error(message || 'Não foi possível criar o acesso.');
        return;
      }

      toast.success(`Acesso criado para ${email.trim()}`);
      setDisplayName('');
      setEmail('');
      setPassword(randomPassword());
      onCreated?.();
    } catch (e) {
      toast.error('Falha ao criar o acesso. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async () => {
    await navigator.clipboard.writeText(`Login: ${email}\nSenha: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Criar acesso
        </CardTitle>
        <CardDescription>
          Crie contas de professor ou aluno diretamente aqui, já com plano e período de teste definidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nu-name">Nome</Label>
            <Input
              id="nu-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Prof. Luciano"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nu-email">E-mail (login)</Label>
            <Input
              id="nu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="professor@educreatorpro.com"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nu-pass">Senha provisória</Label>
            <div className="flex gap-2">
              <Input id="nu-pass" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="button" variant="outline" onClick={() => setPassword(randomPassword())}>
                Gerar
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={copyCredentials} title="Copiar login e senha">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Senhas presentes em vazamentos públicos são recusadas — use o botão Gerar em caso de dúvida.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Professor</SelectItem>
                <SelectItem value="student">Aluno</SelectItem>
                <SelectItem value="admin">Coordenação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pro">Pro (acesso total)</SelectItem>
                <SelectItem value="free">Grátis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nu-days">Dias de acesso</Label>
            <Input
              id="nu-days"
              type="number"
              min={1}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              disabled={plan === 'free'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nu-credits">Créditos</Label>
            <Input
              id="nu-credits"
              type="number"
              min={1}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleCreate} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
          Criar acesso
        </Button>
      </CardContent>
    </Card>
  );
}
