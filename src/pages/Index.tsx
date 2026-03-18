import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, FileText, Layers, Sparkles, Presentation, Paperclip, Send, Landmark, Cpu, Accessibility, PenLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentMode } from '@/hooks/useStudentMode';
import { Badge } from '@/components/ui/badge';

export default function Index() {
  const { isStudentMode } = useStudentMode();
  const [stats, setStats] = useState({ questions: 0, assessments: 0, subjects: 0 });
  const [omniPrompt, setOmniPrompt] = useState('');

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

  const coreEngines = [
    { to: '/vestibulares', icon: Landmark, label: 'Vestibulares & ENEM', desc: 'FUVEST, UNICAMP, ENEM, Federais e mais', gradient: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/20' },
    { to: '/tecnicos', icon: Cpu, label: 'Técnicos & IFs', desc: 'ETEC, IFs, Cotuca, SENAI e vestibulinhos', gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
    { to: '/inclusao', icon: Accessibility, label: 'Inclusão AEE', desc: 'TEA, TDAH, DI e Deficiência Visual', gradient: 'from-cyan-500 to-teal-500', shadow: 'shadow-cyan-500/20' },
    { to: '/redacao', icon: PenLine, label: 'Redação Elite', desc: 'Temas, correção e simulação ENEM', gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20' },
    { to: '/eduslides', icon: Presentation, label: 'Aulas & Slides', desc: 'Roteiros e apresentações com IA', gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
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

      <div className="relative z-10">
        {/* Hero Banner */}
        <div className="bg-[#0F172A] rounded-[3rem] p-8 sm:p-10 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/15 to-cyan-600/10 pointer-events-none" />
          <div className="relative z-10">
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] uppercase tracking-widest font-bold mb-4">
              EduCreator Pro 2026
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Olá, Professor! 👋
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-lg">
              Crie provas, simulados, aulas e materiais inclusivos com inteligência artificial. Escolha um motor abaixo e comece em segundos.
            </p>
          </div>
        </div>

        {/* Omni-Prompt */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-2 flex items-center gap-2 transition-all duration-300 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:shadow-[0_8px_40px_rgb(99,102,241,0.08)]">
            <div className="pl-3 shrink-0">
              <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
            </div>
            <input
              type="text"
              value={omniPrompt}
              onChange={e => setOmniPrompt(e.target.value)}
              placeholder="Cria uma prova FUVEST de Biologia sobre Genética para 3ª série..."
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-700 placeholder:text-slate-400 py-3 px-2"
            />
            <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <Paperclip className="h-4 w-4" />
            </button>
            <button className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:scale-105">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 5 Core Engines */}
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

        {/* Mission Statement */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-[3.5rem] border border-slate-200/60 p-8 sm:p-10 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-3">Nossa Missão</p>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
            "Democratizar a alta performance acadêmica e a inclusão pedagógica através da Inteligência Artificial, capacitando professores e alunos com ferramentas de elite para os desafios nacionais brasileiros."
          </p>
        </div>

        {/* Credits */}
        <div className="text-center py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Idealizador e Criador: <span className="text-slate-600">Matheus Lima Piffer</span>
          </p>
          <p className="text-[9px] text-slate-300 mt-1">© {new Date().getFullYear()} EduCreator Pro — Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}
