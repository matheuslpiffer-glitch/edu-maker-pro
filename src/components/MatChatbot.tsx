import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import matAvatar from '@/assets/mat-avatar.png';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mat-chat`;

export default function MatChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Olá! 👋 Sou o **Mat AI**, assistente inteligente do EduCreator Pro, criado por Matheus Lima Piffer. Como posso te ajudar hoje?' },
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

    // Exponential backoff
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
        break; // success
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
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[420px] max-h-[70vh] flex flex-col bg-white/80 backdrop-blur-2xl border border-slate-200/60 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200/50 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-[2.5rem]">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white">Mat AI</h3>
              <p className="text-[10px] text-white/60">Assistente Inteligente</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[200px] max-h-[50vh]">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[1.25rem] rounded-br-lg shadow-md shadow-indigo-500/15'
                    : 'bg-slate-100/80 text-slate-800 rounded-[1.25rem] rounded-bl-lg shadow-sm'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-slate max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-slate-100/80 rounded-[1.25rem] rounded-bl-lg px-5 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium mr-1">Mat está digitando</span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-slate-200/50">
            <div className="flex items-center gap-2 bg-slate-100/60 rounded-2xl p-1.5">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Pergunte ao Mat..."
                className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-700 placeholder:text-slate-400 px-3 py-2"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all disabled:opacity-40 disabled:scale-100 disabled:shadow-none shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center text-[9px] text-slate-400 mt-2">
              Powered by Matheus Lima Piffer AI Engine
            </p>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'fixed bottom-6 right-4 sm:right-6 z-[60] flex items-center gap-2 px-4 h-14 rounded-full transition-all duration-300 no-print',
          open
            ? 'bg-slate-800 hover:bg-slate-700 shadow-lg shadow-slate-900/20 scale-90'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 shadow-md shadow-indigo-500/20'
        )}
      >
        <div className={cn('transition-transform duration-300', open ? 'rotate-90' : 'rotate-0')}>
          {open ? <X className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
        </div>
        {!open && (
          <>
            <span className="text-sm font-bold text-white hidden sm:inline">Mat AI</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
            </span>
          </>
        )}
      </button>
    </>
  );
}
