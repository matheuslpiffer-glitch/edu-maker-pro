import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStudentMode } from '@/hooks/useStudentMode';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Eye, EyeOff, BookOpen, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuthProps {
  preferredPortal?: 'teacher' | 'student';
}

export default function Auth({ preferredPortal }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<'teacher' | 'student' | null>(preferredPortal ?? null);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { isTeacher, isStudent, hasRole, loading: roleLoading } = useRole();
  const { setStudentMode } = useStudentMode();
  const navigate = useNavigate();
  const { toast } = useToast();

  const getErrorMessage = (error: any) => {
    const message = error?.message || String(error);
    if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos';
    if (message.includes('User already registered')) return 'Este e-mail já está cadastrado';
    if (message.includes('Email not confirmed')) return 'Por favor, confirme seu e-mail';
    if (message.includes('Password should be at least 6 characters')) return 'A senha deve ter pelo menos 6 caracteres';
    return message;
  };

  useEffect(() => {
    // Se o auth ainda está carregando a sessão inicial, esperamos
    if (authLoading) return;

    if (!user) {
      setIsChecking(false);
      return;
    }

    if (roleLoading) return;

    if (isTeacher) {
      setStudentMode(false);
      navigate('/dashboard-professor', { replace: true });
    } else if (isStudent) {
      navigate('/portal-aluno', { replace: true });
    } else if (!hasRole) {
      navigate('/', { replace: true });
    }
    
    setIsChecking(false);
  }, [user, authLoading, roleLoading, isTeacher, isStudent, hasRole, navigate, setStudentMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: 'Erro de Autenticação', description: getErrorMessage(error), variant: 'destructive' });
    } else if (isSignUp) {
      toast({ title: 'Conta criada!', description: 'Verifique seu e-mail para confirmar o cadastro.' });
    }
  };

  // Save portal preference for post-OAuth role assignment
  useEffect(() => {
    if (selectedPortal) {
      sessionStorage.setItem('preferred_portal', selectedPortal);
    }
  }, [selectedPortal]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (error) {
      setGoogleLoading(false);
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#f8fafc] dark:bg-slate-950">
      {/* Left Column: Branding and Impact Text (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-center p-12 relative overflow-hidden bg-primary overflow-hidden">
        {/* Decorative elements for the brand column */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-400/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 space-y-8 max-w-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Piffer EduTech</span>
          </div>
          
          <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
            Transforme sua rotina pedagógica com <span className="text-indigo-200">Inteligência Artificial.</span>
          </h1>
          
          <p className="text-xl text-indigo-100 font-medium leading-relaxed max-w-lg">
            Crie avaliações de alta performance e materiais inclusivos em minutos. A tecnologia a serviço do ensino.
          </p>

          <div className="pt-8 flex gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-white font-bold text-2xl">10x</span>
              <span className="text-indigo-200 text-sm">Mais agilidade</span>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="flex flex-col gap-1">
              <span className="text-white font-bold text-2xl">100%</span>
              <span className="text-indigo-200 text-sm">Inclusivo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Auth Form */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {/* Background Decorative Elements for mobile/right side */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none lg:hidden" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none lg:hidden" />

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center space-y-2 lg:hidden">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="bg-primary/10 p-2 rounded-xl">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Piffer EduTech
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium italic">
              "A plataforma inteligente para o educador moderno"
            </p>
          </div>

          <Card className="border-white/20 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-white">
                {isSignUp ? 'Criar nova conta' : 'Acesse sua conta'}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {isSignUp ? 'Junte-se a milhares de educadores' : 'Bem-vindo de volta!'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {/* Portal Selection */}
              {!selectedPortal && (
                <div className="space-y-3">
                  <p className="text-sm text-center text-muted-foreground font-medium">Como deseja acessar?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="py-6 flex flex-col gap-1 h-auto font-bold text-gray-900 border-2 hover:border-yellow-500 hover:shadow-lg transition-all duration-300"
                      style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7)' }}
                      onClick={() => setSelectedPortal('teacher')}
                    >
                      <GraduationCap size={22} className="text-gray-900" />
                      <span className="font-bold text-sm text-gray-900">Acesso Professor</span>
                    </Button>
                    <Button variant="outline" className="py-6 flex flex-col gap-1 h-auto transition-all duration-300 hover:border-primary/50" onClick={() => setSelectedPortal('student')}>
                      <BookOpen size={22} className="text-accent-foreground" />
                      <span className="font-bold text-sm">Acesso Aluno</span>
                    </Button>
                  </div>
                </div>
              )}

              {selectedPortal && (<>
                {/* Google Login */}
                <Button
                  variant="outline"
                  className="w-full gap-2 py-5 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  Entrar com Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-slate-800" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-muted-foreground">ou e-mail</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">E-mail</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="professor@escola.com" required className="rounded-xl border-slate-200 dark:border-slate-700 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="pr-10 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full py-6 text-base font-semibold transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 rounded-xl bg-primary hover:bg-primary/90" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {isSignUp ? 'Criar Minha Conta' : 'Entrar na Plataforma'}
                  </Button>
                </form>
                
                <div className="text-center text-sm space-y-4 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsSignUp(!isSignUp)} 
                    className="text-primary font-semibold hover:text-primary/80 transition-colors"
                  >
                    {isSignUp ? 'Já tem uma conta? Faça login' : 'Ainda não tem conta? Comece agora'}
                  </button>
                  
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      type="button" 
                      onClick={() => setSelectedPortal(null)} 
                      className="text-xs text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1"
                    >
                      ← Trocar tipo de acesso ({selectedPortal === 'teacher' ? 'Professor' : 'Aluno'})
                    </button>
                  </div>
                </div>
              </>)}
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Precisa de ajuda com o acesso? <a href="#" className="text-primary hover:underline font-medium">Entre em contato com o suporte.</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
