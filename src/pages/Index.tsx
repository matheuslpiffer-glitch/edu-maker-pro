import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  BookOpen, FileText, Layers, Sparkles, Presentation,
  Landmark, Cpu, Accessibility, PenLine, ScanLine,
  Brain, CalendarDays, Map, Gamepad2, Library,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentMode } from '@/hooks/useStudentMode';
import { Badge } from '@/components/ui/badge';
import WelcomeModal from '@/components/WelcomeModal';

export default function Index() {
  const { isStudentMode } = useStudentMode();
  const [stats, setStats] = useState({ questions: 0, assessments: 0, subjects: 0 });

  useEffect(() => {
    async function load() {
      const [q, a, s] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('assessments').select('id', { count: 'exact', head: true }),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
      ]);
      setStats({ questions: q.count || 0, assessments: a.count || 0, subjects: s.count || 0 });
    }
    load();
  }, []);

  if (isStudentMode) return <Navigate to="/portal-aluno" replace />;

  const heroCard = {
    to: '/redacao/elite',
    icon: ScanLine,
    label: 'Scanner Super IA de Elite',
    desc: 'Escaneie a redação, a IA decifra o garrancho, corrige e gera o PDF profissional Piffer EduTech.',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    shadow: 'shadow-purple-500/30',
  };

  const coreEngines = [
    { to: '/vestibulares', icon: Landmark, label: 'Vestibulares & Seleções', desc: 'ENEM, UNICAMP, FUVEST, VUNESP', gradient: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { to: '/tecnicos', icon: Cpu, label: 'Técnicos & Institutos', desc: 'IFs, vestibulinhos e técnicos', gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { to: '/inclusao', icon: Accessibility, label: 'Inclusão AEE', desc: 'TEA, TDAH, DI e Deficiência Visual', gradient: 'from-cyan-500 to-teal-500', shadow: 'shadow-cyan-500/20' },
    { to: '/redacao', icon: PenLine, label: 'Redação Elite', desc: 'Temas, correção e simulação oficial', gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20' },
    { to: '/eduslides', icon: Presentation, label: 'Aulas & Slides', desc: 'Roteiros e apresentações com IA', gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
    { to: '/mapa-mental', icon: Map, label: 'Infográficos & Mapas', desc: 'Mapas mentais e infográficos visuais', gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
    { to: '/planejamento', icon: CalendarDays, label: 'Planejamento 360°', desc: 'Planos de aula alinhados à BNCC', gradient: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/20' },
    { to: '/jogos', icon: Gamepad2, label: 'Game Factory', desc: 'Jogos pedagógicos interativos', gradient: 'from-lime-500 to-green-600', shadow: 'shadow-lime-500/20' },
    { to: '/biblioteca', icon: Library, label: 'Minha Biblioteca', desc: 'Todos os materiais salvos', gradient: 'from-slate-500 to-gray-600', shadow: 'shadow-slate-500/20' },
  ];

  const statCards = [
    { label: 'Questões', value: stats.questions, icon: BookOpen, gradient: 'from-indigo-500 to-blue-600' },
    { label: 'Provas', value: stats.assessments, icon: FileText, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Disciplinas', value: stats.subjects, icon: Layers, gradient: 'from-cyan-500 to-blue-600' },
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
              EduCreator Pro 2026 — Piffer EduTech
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Olá, Professor! 👋
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-lg">
              Crie provas, simulados, aulas e materiais inclusivos com inteligência artificial. Escolha um motor abaixo e comece em segundos.
            </p>
          </div>
        </div>

        {/* HERO CARD — Scanner Super IA */}
        <div className="mb-8">
          <Link to={heroCard.to}>
            <div className={`relative bg-gradient-to-br ${heroCard.gradient} rounded-[2rem] p-8 sm:p-10 text-white shadow-2xl ${heroCard.shadow} hover:scale-[1.01] transition-all duration-300 cursor-pointer group overflow-hidden`}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-40" />
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform shrink-0">
                  <heroCard.icon size={40} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={16} className="text-yellow-300" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/70">Motor Principal</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{heroCard.label}</h2>
                  <p className="text-sm text-white/70 mt-1 max-w-md">{heroCard.desc}</p>
                </div>
                <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                  <Brain size={28} className="text-white/60" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Core Engines Grid */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Motores de Elite</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreEngines.map(engine => (
              <Link key={engine.to} to={engine.to}>
                <div className="bg-white/90 backdrop-blur-2xl rounded-[24px] border border-slate-200/60 p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer group min-h-[140px] flex flex-col">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${engine.gradient} shadow-lg ${engine.shadow} group-hover:scale-110 transition-transform`}>
                    <engine.icon size={22} className="text-white" />
                  </div>
                  <p className="font-black text-slate-800 mt-4 text-sm">{engine.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{engine.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map(s => (
            <div key={s.label} className="bg-white/90 backdrop-blur-2xl rounded-[24px] border border-slate-200/60 p-5 flex items-center gap-4 shadow-sm">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} shadow-lg`}>
                <s.icon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-400 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Piffer EduTech */}
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
