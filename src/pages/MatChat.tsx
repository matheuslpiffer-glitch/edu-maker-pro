import { useCallback, useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { RotateCcw, Headphones, Menu, X, Pencil, Trash2, Calendar, MessageSquare, Plus, Brain } from 'lucide-react';
import MatChatPanel, { MatAvatar } from '@/components/MatChatPanel';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export default function MatChat() {
  const { currentSessionId, setCurrentSessionId, setMessages } = useChat();
  const resetRef = useRef<(() => void) | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const registerReset = useCallback((reset: () => void) => {
    resetRef.current = reset;
  }, []);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading sessions:', error);
      return;
    }
    setSessions(data || []);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const deleteSession = async (id: string) => {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting session:', error);
      return;
    }
    
    if (id === currentSessionId) {
      setCurrentSessionId(null);
      setResetKey(k => k + 1);
    }
    loadSessions();
  };

  const renameSession = async (id: string) => {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title: editingTitle })
      .eq('id', id);
    
    if (error) {
      console.error('Error renaming session:', error);
      return;
    }
    
    setEditingSessionId(null);
    loadSessions();
  };

  const startNewConversation = () => {
    setCurrentSessionId(null);
    setResetKey(k => k + 1);
  };

  const groupSessions = (sessions: ChatSession[]) => {
    const groups: Record<string, ChatSession[]> = {
      'Hoje': [],
      'Ontem': [],
      'Últimos 7 dias': [],
      'Anteriores': []
    };

    const now = startOfDay(new Date());
    const yesterday = subDays(now, 1);
    const lastWeek = subDays(now, 7);

    sessions.forEach(session => {
      const date = new Date(session.created_at);
      if (isToday(date)) groups['Hoje'].push(session);
      else if (isYesterday(date)) groups['Ontem'].push(session);
      else if (date >= lastWeek) groups['Últimos 7 dias'].push(session);
      else groups['Anteriores'].push(session);
    });

    return groups;
  };

  const groupedSessions = groupSessions(sessions);

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 bg-white overflow-hidden">
      {/* Retractable Sidebar */}
      <aside className={cn(
        "bg-slate-50 border-r border-slate-200 transition-all duration-300 flex flex-col no-print",
        isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="p-4 flex flex-col h-full">
          <button
            onClick={startNewConversation}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all shadow-sm mb-6"
          >
            <Plus className="h-4 w-4" />
            Nova conversa
          </button>

          <button
            onClick={() => {
              const chatPanel = document.querySelector('[data-chat-panel]');
              if (chatPanel) {
                // We'll need to expose loadMemory through a custom event or shared state
                const event = new CustomEvent('openMemory');
                chatPanel.dispatchEvent(event);
              }
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-50 border border-blue-100 rounded-lg text-sm font-bold text-blue-700 hover:bg-blue-100 transition-all shadow-sm mb-6"
          >
            <Brain className="h-4 w-4" />
            O que o Mat aprendeu?
          </button>

          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
            {Object.entries(groupedSessions).map(([group, groupSessions]) => (
              groupSessions.length > 0 && (
                <div key={group}>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-2">{group}</h3>
                  <div className="space-y-1">
                    {groupSessions.map(session => (
                      <div
                        key={session.id}
                        className={cn(
                          "group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
                          currentSessionId === session.id ? "bg-white border border-slate-200 shadow-sm" : "hover:bg-slate-200/50"
                        )}
                        onClick={() => setCurrentSessionId(session.id)}
                      >
                        <MessageSquare className="h-4 w-4 text-slate-400 shrink-0" />
                        
                        {editingSessionId === session.id ? (
                          <input
                            autoFocus
                            className="flex-1 bg-white text-xs border border-blue-400 rounded px-1 outline-none"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => renameSession(session.id)}
                            onKeyDown={(e) => e.key === 'Enter' && renameSession(session.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="flex-1 text-xs font-medium text-slate-600 truncate">{session.title}</span>
                        )}

                        <div className="absolute right-1 hidden group-hover:flex items-center gap-0.5 bg-inherit pl-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSessionId(session.id); setEditingTitle(session.title); }}
                            className="p-1 hover:text-blue-600"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                            className="p-1 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 bg-white">
        <header className="flex flex-col border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors lg:hidden"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors hidden lg:block"
              >
                <Menu size={20} />
              </button>
              <MatAvatar size="lg" />
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">Pergunte ao Mat</h1>
                <p className="text-xs text-slate-500 font-medium leading-tight">
                  Consultor pedagógico digital do EduCreator Pro
                </p>
              </div>
            </div>
            <button
              onClick={startNewConversation}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors text-xs font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Nova conversa
            </button>
          </div>
          
          {/* Context Selectors & AutoPlay Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                <span className="text-[10px] uppercase font-black text-slate-400">Etapa</span>
                <select 
                  className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
                  defaultValue="Anos Finais"
                >
                  <option>Educação Infantil</option>
                  <option>Anos Iniciais</option>
                  <option>Anos Finais</option>
                  <option>Ensino Médio</option>
                  <option>EJA / Técnico</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                <span className="text-[10px] uppercase font-black text-slate-400">Foco</span>
                <select 
                  className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
                  defaultValue="Plano de Aula"
                >
                  <option>Plano de Aula</option>
                  <option>Prova / Avaliação</option>
                  <option>Acessibilidade (PEI)</option>
                  <option>Gestão / ATPC</option>
                  <option>Eletivas / Projetos</option>
                </select>
              </div>
            </div>

            <button
              id="autoplay-toggle"
              className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm"
              onClick={() => {
                const chatPanel = document.querySelector('[data-chat-panel]');
                if (chatPanel) {
                  const event = new CustomEvent('toggleAutoPlay');
                  chatPanel.dispatchEvent(event);
                }
              }}
            >
              <Headphones className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Auto-Leitura</span>
              <div className="relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 data-[state=inactive]:bg-slate-200 data-[state=active]:bg-blue-600">
                <span className="pointer-events-none block h-3 w-3 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=inactive]:translate-x-0 data-[state=active]:translate-x-4" />
              </div>
            </button>
          </div>
        </header>

        <MatChatPanel 
          key={resetKey} 
          fullPage 
          onRegisterReset={registerReset} 
          sessionId={currentSessionId}
          onSessionChange={(id) => {
            setCurrentSessionId(id);
            loadSessions();
          }}
        />
      </div>
    </div>
  );
}