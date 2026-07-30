import { Link, Navigate } from 'react-router-dom';
import {
  ScanLine, Sparkles, BookOpen, FileText, Layers,
  Accessibility, Trophy, ClipboardList, Library,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentMode } from '@/hooks/useStudentMode';
import { Badge } from '@/components/ui/badge';
import WelcomeModal from '@/components/WelcomeModal';
import { useQuery } from '@tanstack/react-query';

export default function Index() {
  const { isStudentMode } = useStudentMode();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [q, a, s] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('assessments').select('id', { count: 'exact', head: true }),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
      ]);
      return {
        questions: q.count || 0,
        assessments: a.count || 0,
        subjects: s.count || 0,
      };
    },
    staleTime: 300000, // 5 minutes
  });

  if (isStudentMode) return <Navigate to="/portal-aluno" replace />;

  /* ── Bento featured cards ── */
  const bentoCards = [
    {
      to: '/redacao/elite',
      icon: ScanLine,
      label: 'Redação Elite',
      desc: 'Escaneie, corrija e gere relatórios de redação com inteligência artificial de elite.',
      gradient: 'from-violet-600 via-purple-600 to-indigo-700',
      shadow: 'shadow-purple-500/30',
      span: 'sm:col-span-2',
      iconSize: 44,
      hero: true,
    },
    {
      to: '/alta-performance',
      icon: Trophy,
      label: 'Módulo Alta Performance',
      desc: 'Avaliações de alta performance com questões inteligentes e relatórios detalhados.',
      gradient: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20',
      span: '',
      iconSize: 28,
      hero: false,
    },
    {
      to: '/simuladores',
      icon: ClipboardList,
      label: 'Simuladores Elite',
      desc: 'Simulados completos para todos os anos e disciplinas, com folha de respostas e gabarito.',
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      span: '',
      iconSize: 28,
      hero: false,
    },
    {
      to: '/inclusao',
      icon: Accessibility,
      label: 'Inclusão (AEE)',
      desc: 'Materiais adaptados e acessíveis para alunos com necessidades especiais.',
      gradient: 'from-cyan-500 to-teal-500',
      shadow: 'shadow-cyan-500/20',
      span: '',
      iconSize: 28,
      hero: false,
    },
    {
      to: '/minha-biblioteca',
      icon: Library,
      label: 'Minha Biblioteca',
      desc: 'Tudo o que você criou em um só lugar: provas, questões, redações e materiais.',
      gradient: 'from-blue-600 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      span: '',
      iconSize: 28,
      hero: false,
    },
  ];

  const statCards = [
    { id: 'questions', label: 'Questões', value: stats?.questions || 0, icon: BookOpen, gradient: 'from-indigo-500 to-blue-600' },
    { id: 'assessments', label: 'Provas', value: stats?.assessments || 0, icon: FileText, gradient: 'from-violet-500 to-purple-600' },
    { id: 'subjects', label: 'Disciplinas', value: stats?.subjects || 0, icon: Layers, gradient: 'from-cyan-500 to-blue-600' },
  ];

  return (
    <div className="relative max-w-6xl mx-auto min-h-screen -m-4 md:-m-6 lg:-m-8 p-6 md:p-8 lg:p-10 overflow-hidden">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[120px]" />
      </div>

      <WelcomeModal role="teacher" />

      <div className="relative z-10">
        {/* Hero Banner */}
        <div className="bg-[#0F172A] rounded-[3rem] p-8 sm:p-10 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/15 to-cyan-600/10 pointer-events-none" />
          <div className="relative z-10">
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] uppercase tracking-widest font-bold mb-4">
              Piffer EduTech — EduCreator Pro 2026
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Olá, Professor! 👋
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-lg">
              Escaneie, corrija e compartilhe relatórios de redação com inteligência artificial de elite.
            </p>
          </div>
        </div>

        {/* ═══ BENTO GRID ═══ */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Acesso Rápido</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bentoCards.map(card => (
              <Link key={card.to + card.label} to={card.to} className={card.span}>
                <div
                  className={`relative rounded-[2rem] p-6 sm:p-8 text-white shadow-xl ${card.shadow} hover:scale-[1.01] transition-all duration-300 cursor-pointer group overflow-hidden bg-gradient-to-br ${card.gradient} ${
                    card.hero ? 'min-h-[260px] flex flex-col justify-end' : 'min-h-[130px]'
                  }`}
                >
                  {/* Dot pattern */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-40" />
                  <div className="relative z-10">
                    {card.hero && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-yellow-300" />
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/70">Motor Principal</span>
                      </div>
                    )}
                    <div className={`flex ${card.hero ? 'h-16 w-16' : 'h-11 w-11'} items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform mb-3`}>
                      <card.icon size={card.iconSize} className="text-white" />
                    </div>
                    <h2 className={`font-black tracking-tight ${card.hero ? 'text-xl sm:text-2xl' : 'text-sm'}`}>{card.label}</h2>
                    <p className={`text-white/70 mt-1 ${card.hero ? 'text-sm max-w-sm' : 'text-xs'}`}>{card.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {statCards.map(s => (
            <div key={s.id} className="bg-white/90 backdrop-blur-2xl rounded-2xl border border-slate-200/60 p-4 flex items-center gap-3 shadow-sm min-h-[76px]">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} shadow-md`}>
                <s.icon size={18} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                {isLoadingStats ? (
                  <div className="h-6 w-12 bg-slate-200 animate-pulse rounded-md mb-1" />
                ) : (
                  <p className="text-xl font-bold text-slate-900 truncate">{s.value}</p>
                )}
                <p className="text-[10px] text-slate-400 font-medium truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-6 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Desenvolvido por <span className="text-slate-600">Matheus Lima Piffer</span>
          </p>
          <p className="text-[9px] text-slate-300">© 2026 Piffer EduTech — Inovação & Estratégia Pedagógica</p>
        </div>
      </div>
    </div>
  );
}
