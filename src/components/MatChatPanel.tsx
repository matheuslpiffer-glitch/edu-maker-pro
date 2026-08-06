import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, FileUp, FileDown, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { latexToUnicode } from '@/lib/latex-to-unicode';
import defaultAvatar from '@/assets/mat-avatar-closeup.png';
import { useMatAvatar } from '@/hooks/useMatAvatar';
import { useStudentMode } from '@/hooks/useStudentMode';
import { supabase } from '@/integrations/supabase/client';

export type Msg = { role: 'user' | 'assistant'; content: string };

/** Converte qualquer LaTeX que escape do prompt em Unicode legível (padrão da plataforma). */
export function renderMathAsUnicode(text: string): string {
  const converted = latexToUnicode(text);
  // Remove cifrões órfãos deixados por LaTeX malformado, preservando "R$ 50,00"
  return converted.replace(/(^|[^R])\$(?!\s?\d)/g, '$1');
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mat-chat`;

export const TEACHER_GREETING = 'Olá, professor(a)! 👋 Sou o **Mat**, seu consultor pedagógico **EduCreator Pro**. Vamos planejar sua avaliação? Selecione a **série** e **disciplina** ou me diga qual **Habilidade da BNCC** você deseja cobrar hoje. Posso ajudar com **Descritores e Matrizes de Referência**, **Matriz de Referência** e muito mais! 📚\n\n_Desenvolvido por Matheus Lima Piffer._';

export const STUDENT_GREETING = 'Oi! 👋 Sou o **Mat**, seu tutor digital no **EduCreator Pro**. Se tiver dúvida em alguma questão que errou, **clique nela** e eu te explico o conceito por trás da resposta correta! Também posso sugerir materiais de estudo e te ajudar a revisar conteúdos. 📚\n\n_Desenvolvido por Matheus Lima Piffer._';

interface MatChatPanelProps {
  /** Renders wider spacing/typography for the full page layout */
  fullPage?: boolean;
  /** Exposes the reset handler to the parent (header buttons) */
  onRegisterReset?: (reset: () => void) => void;
  className?: string;
}

/** Shared avatar bubble — shows the whole picture (never cropped) */
export function MatAvatar({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { customAvatar } = useMatAvatar();
  const src = customAvatar || defaultAvatar;
  const dim = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
  return (
    <div className={cn(dim, 'rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200 shrink-0 flex items-center justify-center', className)}>
      <img src={src} alt="Mat" className="w-full h-full object-contain" />
    </div>
  );
}

export default function MatChatPanel({ fullPage = false, onRegisterReset, className }: MatChatPanelProps) {
  const { isStudentMode } = useStudentMode();
  const greeting = isStudentMode ? STUDENT_GREETING : TEACHER_GREETING;
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const reset = useCallback(() => {
    setMessages([{ role: 'assistant', content: greeting }]);
  }, [greeting]);

  useEffect(() => {
    onRegisterReset?.(reset);
  }, [onRegisterReset, reset]);

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

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      upsertAssistant('Sua sessão expirou. Faça login novamente para conversar com o Mat.');
      setIsLoading(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
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
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          upsertAssistant('Desculpe, estou com dificuldades técnicas no momento. Tente novamente em instantes! 🔧');
        } else {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
        }
      }
    }

    setIsLoading(false);
    inputRef.current?.focus();
  }, [input, isLoading, messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const userMsg: Msg = { role: 'user', content: `📎 Arquivo enviado: ${file.name}` };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(((reader.result as string).split(',')[1]) || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/adapt-vision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fileBase64: base64,
          fileMime: file.type,
          aeeProfileLabels: "adaptação geral",
          aeeTopic: "Arquivo enviado pelo chat",
          aeeMode: "adaptar_antigas"
        }),
      });

      if (!resp.ok) throw new Error('Falha ao processar arquivo');
      const data = await resp.json();
      
      const assistantMsg: Msg = { 
        role: 'assistant', 
        content: `Recebi seu arquivo! Ele contém ${data.questions?.length || 0} questões/blocos de conteúdo. Como você gostaria que eu adaptasse esse material? Me diga a **série** e a **necessidade específica (AEE)**.` 
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, tive um erro ao ler esse arquivo. Tente um PDF ou imagem mais legível.' }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadAsPdf = async (content: string) => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.createElement('div');
      element.style.padding = '20mm';
      element.style.fontFamily = 'Arial, sans-serif';
      
      // Basic formatting for the PDF content
      const formattedContent = content
        .replace(/\n/g, '<br/>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')
        .replace(/## (.*?)(\n|$)/g, '<h2>$1</h2>')
        .replace(/# (.*?)(\n|$)/g, '<h1>$1</h1>');

      element.innerHTML = `
        <div style="text-align:center;border-bottom:2px solid #0891b2;margin-bottom:20px;padding-bottom:10px;">
          <h1 style="margin:0;color:#0F172A;">EduCreator Pro</h1>
          <p style="margin:5px 0 0;font-size:12px;color:#64748b;">Material Gerado via Assistente Mat</p>
        </div>
        <div style="font-size:12pt;line-height:1.5;">${formattedContent}</div>
        <div style="margin-top:30px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:10px;">
          Desenvolvido por Matheus Lima Piffer
        </div>
      `;

      const opt = {
        margin: 10,
        filename: 'mat-documento.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Error:', err);
    }
  };

  return (
    <div className={cn('flex flex-col min-h-0 flex-1 bg-white', className)}>
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent',
          fullPage ? 'px-4 sm:px-8 py-8 space-y-8' : 'px-6 py-8 space-y-8',
        )}
      >
        <div className={cn(fullPage ? 'mx-auto w-full max-w-3xl space-y-8' : 'space-y-8')}>
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-4 max-w-[90%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
              {msg.role === 'assistant' && <MatAvatar size="sm" />}
              <div className={cn('text-sm leading-relaxed px-1 py-1', msg.role === 'user' ? 'bg-slate-50 rounded-2xl px-4 py-3' : 'text-slate-700 w-full')}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-50">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      {renderMathAsUnicode(msg.content)}
                    </ReactMarkdown>
                    {msg.content.length > 100 && (
                      <button 
                        onClick={() => downloadAsPdf(msg.content)}
                        className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors no-print"
                      >
                        <FileDown className="h-3 w-3" />
                        Baixar em PDF
                      </button>
                    )}
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-4">
              <MatAvatar size="sm" />
              <div className="flex items-center gap-1 py-2">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={cn('bg-white border-t border-slate-100', fullPage ? 'px-4 sm:px-8 py-4' : 'px-6 py-4')}>
        <div className={cn(fullPage && 'mx-auto w-full max-w-3xl')}>
          <div className="relative flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300 transition-all p-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="mb-1 h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors shrink-0"
              title="Subir arquivo"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Pergunte ao Mat..."
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-800 placeholder:text-slate-400 px-3 py-2.5 resize-none min-h-[40px] max-h-[160px]"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="mb-1 h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
              aria-label="Enviar mensagem"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            O Mat pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
