import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Send, Settings, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import defaultAvatar from '@/assets/mat-avatar-closeup.png';
import { useMatAvatar } from '@/hooks/useMatAvatar';
import MatAvatarEditor from '@/components/MatAvatarEditor';
import MatAvatarArtwork from '@/components/MatAvatarArtwork';
import { useStudentMode } from '@/hooks/useStudentMode';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mat-chat`;

const TEACHER_GREETING = 'Olá, professor(a)! 👋 Sou o **Mat**, seu consultor pedagógico **EduCreator Pro**. Vamos planejar sua avaliação? Selecione a **série** e **disciplina** ou me diga qual **Habilidade da BNCC** você deseja cobrar hoje. Posso ajudar com **Descritores e Matrizes de Referência**, **Matriz de Referência** e muito mais! 📚\n\n_Desenvolvido por Matheus Lima Piffer._';

const STUDENT_GREETING = 'Oi! 👋 Sou o **Mat**, seu tutor digital no **EduCreator Pro**. Se tiver dúvida em alguma questão que errou, **clique nela** e eu te explico o conceito por trás da resposta correta! Também posso sugerir materiais de estudo e te ajudar a revisar conteúdos. 📚\n\n_Desenvolvido por Matheus Lima Piffer._';

export default function MatChatbot() {
  const { customAvatar, zoom, offsetX, offsetY, saveAvatar, clearAvatar } = useMatAvatar();
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const avatarSrc = customAvatar || defaultAvatar;
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { isStudentMode } = useStudentMode();
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: isStudentMode ? STUDENT_GREETING : TEACHER_GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (location.pathname === '/mat-chat') {
      setOpen(true);
    }
  }, [location.pathname]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > newMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev.slice(0, newMessages.length), { role: 'assistant', content: assistantSoFar }];
      });
    };

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        });

        if (resp.status === 429 || resp.status === 402) {
          const data = await resp.json();
          upsertAssistant(data.error || 'Limite de requisições atingido. Tente novamente em instantes.');
          break;
        }

        if (!resp.ok || !resp.body) throw new Error('Stream failed');

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') { streamDone = true; break; }
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
        break;
      } catch (e) {
        attempts++;
        if (attempts >= maxAttempts) {
          upsertAssistant('Desculpe, estou com dificuldades técnicas no momento. Tente novamente em instantes! 🔧');
        } else {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
        }
      }
    }

    setIsLoading(false);
  }, [input, isLoading, messages]);

  return (
    <>
      {/* Chat Window — anchored to bottom-right */}
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[500px] h-[75vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                <img src={avatarSrc} alt="Mat" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Mat</h3>
                <p className="text-[10px] text-slate-500 font-medium">EduCreator AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([{ role: 'assistant', content: isStudentMode ? STUDENT_GREETING : TEACHER_GREETING }])}
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

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-8 bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {messages.map((msg, i) => (
              <div key={i} className={cn(
                'flex gap-4 max-w-[90%]',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              )}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0 ring-1 ring-slate-200">
                    <img src={avatarSrc} alt="Mat" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={cn(
                  'text-sm leading-relaxed px-1 py-1',
                  msg.role === 'user' ? 'bg-slate-50 rounded-2xl px-4 py-3' : 'text-slate-700'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-50">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0 ring-1 ring-slate-200">
                  <img src={avatarSrc} alt="Mat" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-1 py-2">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="px-6 py-4 bg-white border-t border-slate-100">
            <div className="relative flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300 transition-all p-2">
              <textarea
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Pergunte ao Mat..."
                className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-800 placeholder:text-slate-400 px-3 py-2.5 resize-none min-h-[40px] max-h-[120px]"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="mb-1 h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
              O Mat pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </div>
      )}

      {/* Minimized FAB — bottom-right corner */}
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
              {/* Edit button */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowAvatarEditor(true); }}
                className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <Settings className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
              {/* Online indicator */}
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
