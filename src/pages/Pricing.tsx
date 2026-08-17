import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles, Building2, Zap, ArrowLeft, AlertTriangle, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { getStripeEnvironment, isPaymentsConfigured } from '@/lib/stripe';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const WA_ESCOLA = 'https://wa.me/5519981636948?text=Quero%20um%20plano%20Escola%20com%20mais%20de%20100%20professores';

export default function Pricing() {
  const { isPro, loading, credits, freeLimit } = useCredits();
  const { user } = useAuth();
  const { subscription, isActive } = useSubscription();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();
  const { toast } = useToast();
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [seats, setSeats] = useState(5);
  const [portalLoading, setPortalLoading] = useState(false);

  const isFree = !loading && !isPro;
  const safeCredits = Math.max(0, credits ?? 0);
  const low = isFree && safeCredits <= 2;
  const paymentsReady = isPaymentsConfigured();

  const startCheckout = (priceId: string, quantity?: number) => {
    if (!user) {
      toast({ title: 'Entre primeiro', description: 'Faça login para assinar.', variant: 'destructive' });
      return;
    }
    if (!paymentsReady) {
      toast({ title: 'Pagamentos em ativação', description: 'O checkout estará disponível em breve.', variant: 'destructive' });
      return;
    }
    // If user already has an active subscription, send them to the portal
    // to upgrade/downgrade instead of creating a second subscription.
    if (isActive) {
      toast({
        title: 'Você já tem uma assinatura ativa',
        description: 'Abrindo o portal para trocar de plano…',
      });
      openPortal();
      return;
    }
    openCheckout({
      priceId,
      quantity,
      customerEmail: user.email ?? undefined,
      userId: user.id,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  const openPortal = async () => {
    if (!user || !paymentsReady) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/planos` },
      });
      if (error || !data?.url) throw new Error(error?.message || 'Falha ao abrir portal');
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message ?? 'Não foi possível abrir o portal.', variant: 'destructive' });
    } finally {
      setPortalLoading(false);
    }
  };

  const escolaUnitMonthly = 14.9;
  const escolaUnitYearly = 149;
  const escolaTotal = interval === 'month'
    ? (escolaUnitMonthly * seats).toFixed(2).replace('.', ',')
    : (escolaUnitYearly * seats).toFixed(2).replace('.', ',');

  return (
    <div className="min-h-screen -m-4 md:-m-6 lg:-m-8 bg-gradient-to-br from-[#0a0e27] via-[#0F172A] to-[#1a1247] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link to="/dashboard-professor" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </Link>

        {!loading && (
          <div className="flex justify-center mb-6">
            {isPro ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 px-3 py-1.5 text-xs font-black shadow-sm">
                <Sparkles size={14} /> PLANO PRO ATIVO
              </div>
            ) : (
              <div className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border',
                low ? 'bg-red-500/10 text-red-300 border-red-400/30 animate-pulse' : 'bg-indigo-500/10 text-indigo-300 border-indigo-400/20',
              )}>
                {low ? <AlertTriangle size={14} /> : <Zap size={14} />}
                <span>Seu plano: Grátis · {safeCredits}/{freeLimit} créditos</span>
              </div>
            )}
          </div>
        )}

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-5">
            <Sparkles size={14} /> Planos & Preços
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Potencialize sua sala de aula
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Escolha o plano ideal. Comece grátis e evolua quando precisar de mais poder de IA.
          </p>
        </div>

        {!paymentsReady && (
          <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-center gap-2">
            <AlertTriangle size={16} /> O checkout está em ativação. Em breve você poderá assinar diretamente por aqui.
          </div>
        )}

        {isActive && subscription && (
          <div className="mb-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <strong>Assinatura ativa:</strong> {subscription.price_id.replace(/_/g, ' ')}
              {subscription.current_period_end && (
                <> · próxima renovação em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</>
              )}
              {subscription.cancel_at_period_end && ' · cancelamento agendado'}
            </div>
            <Button onClick={openPortal} disabled={portalLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {portalLoading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Settings size={14} className="mr-2" />}
              Gerenciar assinatura
            </Button>
          </div>
        )}

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-900/70 border border-slate-700/60 rounded-full p-1">
            <button
              onClick={() => setInterval('month')}
              className={cn('px-5 py-2 rounded-full text-sm font-bold transition-colors', interval === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white')}
            >
              Mensal
            </button>
            <button
              onClick={() => setInterval('year')}
              className={cn('px-5 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2', interval === 'year' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white')}
            >
              Anual <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full">-17%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* GRÁTIS */}
          <div className="relative flex flex-col rounded-3xl p-6 sm:p-8 border bg-slate-900/60 border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-slate-800 text-slate-300">
              <Zap size={22} />
            </div>
            <h3 className="text-xl font-black text-white">Grátis</h3>
            <p className="text-xs text-slate-400 mt-1 min-h-[32px]">Para conhecer a plataforma.</p>
            <div className="mt-5 mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">R$ 0</span>
                <span className="text-sm text-slate-400 font-medium">/mês</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {['6 créditos por mês', 'Acesso às ferramentas básicas', 'Banco de questões', 'Suporte por e-mail'].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" disabled className="w-full font-bold bg-slate-800 text-slate-500 cursor-not-allowed">
              {isFree ? 'Plano atual' : 'Começar grátis'}
            </Button>
          </div>

          {/* PRO */}
          <div className="relative flex flex-col rounded-3xl p-6 sm:p-8 border bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-blue-600/20 border-indigo-400/40 shadow-[0_0_60px_-15px_rgba(99,102,241,0.5)] lg:scale-105 lg:-translate-y-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-lg">
              ⭐ Mais Popular
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Sparkles size={22} />
            </div>
            <h3 className="text-xl font-black text-white">Pro</h3>
            <p className="text-xs text-slate-400 mt-1 min-h-[32px]">Para quem usa IA todos os dias.</p>
            <div className="mt-5 mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">R$ {interval === 'month' ? '29,90' : '358,80'}</span>
                <span className="text-sm text-slate-400 font-medium">/{interval === 'month' ? 'mês' : 'ano'}</span>
              </div>
              {interval === 'month' && <p className="text-xs text-slate-500 mt-1">ou R$ 358,80/ano</p>}
              {interval === 'year' && <p className="text-xs text-emerald-400 mt-1">Economize ~2 meses</p>}
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Uso ilimitado prático de IA',
                'Todas as ferramentas premium',
                'Correção de redação ilimitada',
                'Simulados, mapas mentais e slides',
                'Mat PhD — Assistente Pedagógico IA',
                'Suporte prioritário',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check size={16} className="mt-0.5 shrink-0 text-indigo-400" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              disabled={isPro}
              onClick={() => startCheckout(interval === 'month' ? 'pro_monthly' : 'pro_yearly')}
              className={cn(
                'w-full font-bold',
                isPro
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30',
              )}
            >
              {isPro ? 'Plano atual' : `Assinar Pro ${interval === 'month' ? 'Mensal' : 'Anual'}`}
            </Button>
          </div>

          {/* ESCOLA */}
          <div className="relative flex flex-col rounded-3xl p-6 sm:p-8 border bg-slate-900/60 border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-slate-800 text-slate-300">
              <Building2 size={22} />
            </div>
            <h3 className="text-xl font-black text-white">Escola</h3>
            <p className="text-xs text-slate-400 mt-1 min-h-[32px]">Por professor — para escolas e redes.</p>
            <div className="mt-5 mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">R$ {escolaTotal}</span>
                <span className="text-sm text-slate-400 font-medium">/{interval === 'month' ? 'mês' : 'ano'}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                R$ {interval === 'month' ? '14,90' : '149,00'} por professor · {seats} professor{seats > 1 ? 'es' : ''}
              </p>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Professores: <span className="text-white">{seats}</span>
              </label>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>5</span><span>100</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6 flex-1">
              {[
                'Tudo do Pro para cada professor',
                'Painel de coordenação',
                'Suporte dedicado',
                'Logo e marca personalizados',
                'Implantação e treinamento',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              onClick={() => startCheckout(interval === 'month' ? 'escola_monthly' : 'escola_yearly', seats)}
              className="w-full font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 mb-2"
            >
              Assinar Escola
            </Button>
            <a
              href={WA_ESCOLA}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-400 hover:text-slate-200 text-center underline"
            >
              Mais de 100 professores? Fale com a equipe
            </a>
          </div>
        </div>

        <div className="mt-16 text-center text-xs text-slate-500">
          <p>Pagamento via PIX, cartão ou boleto. Sem fidelidade. Cancele quando quiser.</p>
          <p className="mt-1">Dúvidas? Fale com a gente no WhatsApp.</p>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeCheckout(); }}>
        <DialogContent className="max-w-3xl p-0 bg-white overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Finalizar assinatura</DialogTitle>
          </DialogHeader>
          <div className="p-0">
            <PaymentTestModeBanner />
            {checkoutElement}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
