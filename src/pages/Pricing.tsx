import { Link } from 'react-router-dom';
import { Check, Sparkles, Building2, Zap, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/useCredits';

const WA_PRO = 'https://wa.me/5519981636948?text=Quero%20assinar%20o%20EduCreator%20Pro';
const WA_ESCOLA = 'https://wa.me/5519981636948?text=Quero%20saber%20sobre%20o%20plano%20Escola';

interface PlanProps {
  name: string;
  price: string;
  period?: string;
  yearly?: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref?: string;
  ctaDisabled?: boolean;
  highlight?: boolean;
  icon: React.ReactNode;
}

function PlanCard({ name, price, period, yearly, description, features, cta, ctaHref, ctaDisabled, highlight, icon }: PlanProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-3xl p-6 sm:p-8 border backdrop-blur-sm transition-all duration-300',
        highlight
          ? 'bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-blue-600/20 border-indigo-400/40 shadow-[0_0_60px_-15px_rgba(99,102,241,0.5)] lg:scale-105 lg:-translate-y-2'
          : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600',
      )}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-lg">
          ⭐ Mais Popular
        </div>
      )}
      <div className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center mb-4',
        highlight ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-slate-800 text-slate-300'
      )}>
        {icon}
      </div>
      <h3 className="text-xl font-black text-white">{name}</h3>
      <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{description}</p>

      <div className="mt-5 mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-white">{price}</span>
          {period && <span className="text-sm text-slate-400 font-medium">/{period}</span>}
        </div>
        {yearly && <p className="text-xs text-slate-500 mt-1">ou {yearly}</p>}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
            <Check size={16} className={cn('mt-0.5 shrink-0', highlight ? 'text-indigo-400' : 'text-emerald-400')} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {ctaHref && !ctaDisabled ? (
        <Button
          asChild
          size="lg"
          className={cn(
            'w-full font-bold',
            highlight
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
          )}
        >
          <a href={ctaHref} target="_blank" rel="noopener noreferrer">{cta}</a>
        </Button>
      ) : (
        <Button size="lg" disabled className="w-full font-bold bg-slate-800 text-slate-500 cursor-not-allowed">
          {cta}
        </Button>
      )}
    </div>
  );
}

export default function Pricing() {
  const { isPro, loading, credits, freeLimit } = useCredits();
  const isFree = !loading && !isPro;
  const safeCredits = Math.max(0, credits ?? 0);
  const low = isFree && safeCredits <= 2;

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
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border',
                  low
                    ? 'bg-red-500/10 text-red-300 border-red-400/30 animate-pulse'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-400/20',
                )}
              >
                {low ? <AlertTriangle size={14} /> : <Zap size={14} />}
                <span>Seu plano: Grátis · {safeCredits}/{freeLimit} créditos</span>
              </div>
            )}
          </div>
        )}

        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-5">
            <Sparkles size={14} /> Planos & Preços
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Potencialize sua sala de aula
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Escolha o plano ideal para o seu uso. Comece grátis e evolua quando precisar de mais poder de IA.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          <PlanCard
            name="Grátis"
            price="R$ 0"
            period="mês"
            description="Para conhecer a plataforma."
            icon={<Zap size={22} />}
            features={[
              '10 créditos por mês',
              'Acesso às ferramentas básicas',
              'Banco de questões',
              'Suporte por e-mail',
            ]}
            cta={isFree ? 'Plano atual' : 'Começar grátis'}
            ctaDisabled={isFree}
          />

          <PlanCard
            name="Pro"
            price="R$ 19,90"
            period="mês"
            yearly="R$ 238,80/ano"
            description="Para professores que usam IA todos os dias."
            icon={<Sparkles size={22} />}
            highlight
            features={[
              'Créditos para uso intenso (ilimitado prático)',
              'Todas as ferramentas de IA',
              'Correção de redação ilimitada',
              'Simulados, mapas mentais e slides',
              'Mat PhD — Assistente Pedagógico IA',
              'Suporte prioritário',
            ]}
            cta={isPro ? 'Plano atual' : 'Assinar Pro'}
            ctaHref={isPro ? undefined : WA_PRO}
            ctaDisabled={isPro}
          />

          <PlanCard
            name="Escola"
            price="Sob consulta"
            description="Para escolas e redes de ensino."
            icon={<Building2 size={22} />}
            features={[
              'Acesso para vários professores',
              'Painel de coordenação',
              'Implantação e treinamento',
              'Suporte dedicado',
              'Logo e marca personalizados',
            ]}
            cta="Falar com a equipe"
            ctaHref={WA_ESCOLA}
          />
        </div>

        <div className="mt-16 text-center text-xs text-slate-500">
          <p>Pagamento via PIX, cartão ou boleto. Sem fidelidade. Cancele quando quiser.</p>
          <p className="mt-1">Dúvidas? Fale com a gente no WhatsApp pelos botões acima.</p>
        </div>
      </div>
    </div>
  );
}