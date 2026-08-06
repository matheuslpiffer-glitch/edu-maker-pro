import { useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Settings, Maximize2 } from 'lucide-react';
import defaultAvatar from '@/assets/mat-avatar-closeup.png';
import { useMatAvatar } from '@/hooks/useMatAvatar';
import MatAvatarEditor from '@/components/MatAvatarEditor';
import MatAvatarArtwork from '@/components/MatAvatarArtwork';
import MatChatPanel, { MatAvatar } from '@/components/MatChatPanel';

export default function MatChatbot() {
  const { customAvatar, zoom, offsetX, offsetY, saveAvatar, clearAvatar } = useMatAvatar();
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const avatarSrc = customAvatar || defaultAvatar;
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const resetRef = useRef<(() => void) | null>(null);

  const registerReset = useCallback((reset: () => void) => {
    resetRef.current = reset;
  }, []);

  // On the dedicated chat page the widget is redundant
  if (location.pathname === '/mat-chat') return null;

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[500px] h-[75vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <MatAvatar size="sm" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Mat</h3>
                <p className="text-[10px] text-slate-500 font-medium">EduCreator AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setOpen(false); navigate('/mat-chat'); }}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                title="Abrir em tela cheia"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => resetRef.current?.()}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                title="Limpar chat"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider">Limpar</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <MatChatPanel onRegisterReset={registerReset} />
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-[60] no-print">
        <button
          onClick={() => setOpen(prev => !prev)}
          className="relative flex items-center justify-center transition-all duration-300 focus:outline-none"
        >
          {open ? (
            <div className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 shadow-lg flex items-center justify-center transition-all">
              <X className="h-5 w-5 text-white" />
            </div>
          ) : (
            <div className="relative">
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-110 transition-all duration-300">
                <div className="w-full h-full rounded-full overflow-hidden bg-white">
                  <MatAvatarArtwork src={avatarSrc} alt="Mat" zoom={zoom} offsetX={offsetX} offsetY={offsetY} />
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowAvatarEditor(true); }}
                className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <Settings className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
              <span className="absolute top-0 right-0 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 ring-2 ring-white shadow-md" />
              </span>
            </div>
          )}
        </button>
      </div>

      <MatAvatarEditor
        open={showAvatarEditor}
        onClose={() => setShowAvatarEditor(false)}
        currentAvatar={customAvatar}
        currentZoom={zoom}
        currentOffsetX={offsetX}
        currentOffsetY={offsetY}
        onSave={saveAvatar}
        onReset={clearAvatar}
      />
    </>
  );
}
