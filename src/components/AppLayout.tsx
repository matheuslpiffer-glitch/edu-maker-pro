import { useState } from 'react';
import { Menu } from 'lucide-react';
import AppSidebar from './AppSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden overflow-y-auto bg-slate-50 max-w-full">
        <header className="lg:hidden flex items-center h-14 px-4 border-b border-slate-200 bg-white no-print shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <Menu size={22} className="text-slate-600" />
          </button>
          <span className="ml-3 font-bold text-lg text-slate-900">EduCreator</span>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
