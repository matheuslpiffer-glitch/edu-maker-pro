import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Eye, ArrowLeft } from 'lucide-react';
import AppSidebar from './AppSidebar';
import { useStudentMode } from '@/hooks/useStudentMode';
import { useRole } from '@/hooks/useRole';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isStudentMode, setStudentMode } = useStudentMode();
  const { isTeacher } = useRole();
  const navigate = useNavigate();

  /* Teacher previewing as student */
  const isPreviewMode = isStudentMode && isTeacher;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden overflow-y-auto bg-slate-50 max-w-full">
        {/* Preview banner */}
        {isPreviewMode && (
          <div className="bg-amber-500 text-amber-950 text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 no-print shrink-0">
            <Eye size={16} />
            <span>Você está no <strong>Modo Visualização de Aluno</strong>.</span>
            <button onClick={toggleStudentMode} className="underline font-bold hover:text-amber-800 ml-1 inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Voltar ao Painel do Professor
            </button>
          </div>
        )}
        <header className="lg:hidden flex items-center h-14 px-4 border-b border-slate-200 bg-white no-print shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <Menu size={22} className="text-slate-600" />
          </button>
          <span className="ml-3 font-bold text-lg text-slate-900">EduCreator</span>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
        <footer className="text-center text-xs text-muted-foreground py-3 border-t no-print">
          EduCreator Pro | Gestão Pedagógica: Matheus Lima Piffer
        </footer>
      </div>
    </div>
  );
}
