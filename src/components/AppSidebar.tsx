import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, Layers, GraduationCap, ChevronLeft, ChevronRight, LogOut, Shield, PenLine, Camera, Presentation, ClipboardList, BarChart3, HelpCircle, BookMarked, Globe, Library, BookText, Puzzle, Landmark, Cpu, Target, Gamepad2, Brain, Users, ScanEye, Accessibility, Download, BookOpenCheck, Trophy, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStudentMode } from '@/hooks/useStudentMode';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const teacherLinks = [
  // PRINCIPAL
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'Principal' },
  { to: '/sobre', icon: BookMarked, label: 'Sobre o Projeto', section: 'Principal' },
  // ESTÚDIOS DE CRIAÇÃO
  { to: '/vestibulares', icon: Landmark, label: 'Vestibulares & ENEM', section: 'Estúdios de Criação' },
  { to: '/tecnicos', icon: Cpu, label: 'Técnicos & IFs', section: 'Estúdios de Criação' },
  { to: '/inclusao', icon: Accessibility, label: 'Inclusão (AEE)', section: 'Estúdios de Criação' },
  { to: '/alta-performance', icon: Trophy, label: 'Módulo Alta Performance', section: 'Estúdios de Criação' },
  { to: '/redacao', icon: PenLine, label: 'Redação Elite', section: 'Estúdios de Criação' },
  { to: '/eduslides', icon: Presentation, label: 'Aulas & Slides', section: 'Estúdios de Criação' },
  // FERRAMENTAS DE GESTÃO
  { to: '/redacao/corretor', icon: Camera, label: 'Corretor IA Redação', section: 'Ferramentas de Gestão' },
  { to: '/corretor-visao', icon: ScanEye, label: 'Corretor de Visão', section: 'Ferramentas de Gestão' },
  { to: '/simuladores', icon: ClipboardList, label: 'Simuladores Elite', section: 'Ferramentas de Gestão' },
  { to: '/literatura', icon: BookText, label: 'Dossiê Literário', section: 'Ferramentas de Gestão' },
  { to: '/jogos', icon: Puzzle, label: 'Fábrica de Jogos', section: 'Ferramentas de Gestão' },
  { to: '/bussola-vocacional', icon: Compass, label: 'Bússola Vocacional', section: 'Ferramentas de Gestão' },
  { to: '/pisa', icon: Globe, label: 'Simulados PISA', section: 'Ferramentas de Gestão' },
  { to: '/questoes', icon: BookOpen, label: 'Banco de Questões', section: 'Ferramentas de Gestão' },
  { to: '/banco-ia', icon: BookOpen, label: 'Banco de Questões IA', section: 'Ferramentas de Gestão' },
  { to: '/provas', icon: FileText, label: 'Minhas Provas', section: 'Ferramentas de Gestão' },
  { to: '/biblioteca', icon: Library, label: 'Biblioteca de Avaliações', section: 'Ferramentas de Gestão' },
  // DOCUMENTAÇÃO
  { to: '/guia', icon: HelpCircle, label: 'Guia do Sistema', section: 'Documentação' },
  { to: '/manual', icon: BookMarked, label: 'Manual do Professor', section: 'Documentação' },
  { to: '/manual-aluno', icon: GraduationCap, label: 'Manual do Aluno', section: 'Documentação' },
  { to: '/referencias', icon: BookOpenCheck, label: 'Referências Bibliográficas', section: 'Documentação' },
];

const studentLinks = [
  { to: '/aluno', icon: LayoutDashboard, label: 'Meu Painel' },
  { to: '/aluno/quiz', icon: Target, label: 'Treino de Vestibular' },
  { to: '/literatura', icon: BookText, label: 'Dossiê Literário' },
  { to: '/jogos', icon: Gamepad2, label: 'Jogos Didáticos' },
  { to: '/aluno/desempenho', icon: BarChart3, label: 'Meu Desempenho' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AppSidebar({ open, onClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isSuperAdmin } = useRole();
  const { isStudentMode, toggleStudentMode, studentLevel, studentXP } = useStudentMode();
  const { canInstall, install } = usePWAInstall();

  const handleToggleMode = () => {
    const wasStudent = isStudentMode;
    toggleStudentMode();
    if (wasStudent) {
      navigate('/');
    }
  };

  const links = isStudentMode ? studentLinks : teacherLinks;

  return (
    <aside
      className={cn(
        'fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 no-print',
        isStudentMode ? 'bg-gradient-to-b from-indigo-950 to-purple-950 text-slate-400' : 'bg-[#0F172A] text-slate-400',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'lg:w-[72px]' : 'lg:w-64',
        'w-64'
      )}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center gap-3 px-4 h-16 shrink-0 sticky top-0 z-10 border-b border-slate-800/50",
        isStudentMode ? 'bg-indigo-950' : 'bg-[#0F172A]'
      )}>
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden transition-transform duration-500 hover:scale-110 hover:rotate-[8deg]",
          isStudentMode
            ? 'bg-gradient-to-br from-pink-500 via-orange-500 to-amber-400 shadow-[0_4px_20px_-4px_rgba(236,72,153,0.4)]'
            : 'bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#475569] shadow-[0_6px_30px_-4px_rgba(99,102,241,0.5),0_0_20px_-2px_rgba(139,92,246,0.3)] hover:shadow-[0_8px_40px_-4px_rgba(99,102,241,0.7),0_0_30px_-2px_rgba(139,92,246,0.5)]'
        )}>
          <span className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 rounded-2xl" />
          <span className="absolute inset-[2px] rounded-xl border border-white/15" />
          {!isStudentMode && <span className="absolute -inset-1 bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-transparent rounded-3xl blur-md -z-10" />}
          {isStudentMode
            ? <Brain size={22} className="text-white relative z-10" strokeWidth={2.5} />
            : (
              <svg viewBox="0 0 48 48" className="w-9 h-9 relative z-10" fill="none">
                <path d="M24 38 L8 30 L8 16 L24 24 Z" fill="url(#sapphire)" opacity="0.9" />
                <path d="M24 38 L40 30 L40 16 L24 24 Z" fill="url(#chrome)" opacity="0.85" />
                <circle cx="24" cy="20" r="8" fill="none" stroke="url(#sapphire)" strokeWidth="2" opacity="0.7" />
                <circle cx="24" cy="20" r="5" fill="none" stroke="url(#chrome)" strokeWidth="1.5" opacity="0.5" />
                <g opacity="0.6">
                  <rect x="23" y="10" width="2" height="3" rx="0.5" fill="url(#chrome)" />
                  <rect x="23" y="27" width="2" height="3" rx="0.5" fill="url(#chrome)" />
                  <rect x="14" y="19" width="3" height="2" rx="0.5" fill="url(#chrome)" />
                  <rect x="31" y="19" width="3" height="2" rx="0.5" fill="url(#chrome)" />
                </g>
                <circle cx="20" cy="12" r="1.2" fill="url(#amethyst)" opacity="0.8" />
                <circle cx="28" cy="10" r="1" fill="url(#amethyst)" opacity="0.6" />
                <circle cx="24" cy="8" r="0.8" fill="url(#amethyst)" opacity="0.5" />
                <circle cx="22" cy="6" r="0.6" fill="url(#amethyst)" opacity="0.4" />
                <circle cx="26" cy="5" r="0.5" fill="url(#amethyst)" opacity="0.3" />
                <rect x="20" y="16" width="8" height="8" rx="1" transform="rotate(45 24 20)" fill="url(#chrome)" opacity="0.4" />
                <defs>
                  <linearGradient id="sapphire" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1e40af" />
                  </linearGradient>
                  <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="50%" stopColor="#cbd5e1" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                  <linearGradient id="amethyst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
              </svg>
            )
          }
        </div>
        {!collapsed && (
          <div className="text-left">
            <h1 className="text-lg font-black tracking-tight text-white leading-none">
              {isStudentMode ? 'Student Edition' : 'EduCreator'}
            </h1>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-0.5">
              {isStudentMode ? 'Modo Aluno' : 'PRO SYSTEMS • BY MATHEUS LIMA PIFFER'}
            </p>
            {!isStudentMode && isSuperAdmin && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0 w-fit mt-1">Super Admin</Badge>
            )}
          </div>
        )}
      </div>

      {/* Mode Toggle — always at top, prominent */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-slate-800/50">
          <button
            onClick={handleToggleMode}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              isStudentMode
                ? 'bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/30'
                : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isStudentMode ? 'bg-pink-500/30' : 'bg-indigo-500/20'
            )}>
              {isStudentMode ? <Users size={14} className="text-pink-400" /> : <Brain size={14} className="text-indigo-400" />}
            </div>
            <span className="text-xs font-semibold text-slate-300 flex-1 text-left">
              {isStudentMode ? 'Modo Aluno' : 'Modo Professor'}
            </span>
            <Switch
              checked={isStudentMode}
              onCheckedChange={handleToggleMode}
              className="scale-75"
            />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 mt-3 space-y-0.5 overflow-y-auto">
        {links.map((link, i) => {
          const isActive = location.pathname === link.to || (link.to !== '/' && link.to !== '/aluno' && link.to !== '/sobre' && location.pathname.startsWith(link.to));
          const section = 'section' in link ? (link as any).section : '';
          const prevSection = i > 0 && 'section' in links[i - 1] ? (links[i - 1] as any).section : '';
          const showSection = !isStudentMode && section && section !== prevSection;
          return (
            <div key={link.to}>
              {showSection && (
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600 px-3 pt-4 pb-1">{section}</p>
              )}
              <Link
                to={link.to}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? isStudentMode
                      ? 'bg-pink-500/10 text-pink-400'
                      : 'bg-indigo-500/10 text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                )}
              >
                <link.icon size={18} />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Super Admin link */}
      {!isStudentMode && isSuperAdmin && (
        <div className="px-2">
          <Link
            to="/configuracoes"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              location.pathname === '/configuracoes'
                ? 'bg-indigo-500/10 text-indigo-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            )}
          >
            <Shield size={18} />
            {!collapsed && <span>Config. Avançadas</span>}
          </Link>
        </div>
      )}

      {/* XP Footer — ONLY in student mode */}
      {!collapsed && isStudentMode && (
        <div className="px-3 py-3 border-t border-slate-800/50">
          <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="font-bold text-slate-300">🏅 Nível {studentLevel}</span>
              <span className="text-orange-400 font-bold">{studentXP} XP</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-400 h-2 rounded-full transition-all shadow-sm shadow-orange-500/20"
                style={{ width: `${Math.min(((studentXP % 500) / 500) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-500 mt-1.5 text-center">
              {500 - (studentXP % 500)} XP para o próximo nível
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-slate-800/50 pt-2 mt-2">
        {canInstall && (
          <button
            onClick={install}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 w-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 hover:from-emerald-500/30 hover:to-teal-500/30"
          >
            <Download size={18} />
            {!collapsed && <span>Instalar App</span>}
          </button>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 transition-all duration-200 w-full"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:text-slate-400 transition-all duration-200 w-full"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
