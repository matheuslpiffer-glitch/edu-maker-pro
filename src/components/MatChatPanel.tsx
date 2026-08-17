import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { FileDown, Loader2, Volume2, Square, Copy, Check, FileSpreadsheet, Presentation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { latexToUnicode } from '@/lib/latex-to-unicode';
import defaultAvatar from '@/assets/mat-avatar-3d.png';
import { useMatAvatar } from '@/hooks/useMatAvatar';
import { useStudentMode } from '@/hooks/useStudentMode';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import ChatInput, { MAT_ACTIONS, type ChatInputPayload, type ChatInputHandle } from '@/components/ChatInput';
import { sanitizeChatText } from '@/lib/chat-sanitize';
import { ChatMessageRenderer } from '@/components/ChatMessageRenderer';
import { planScenes, type VideoDuration } from '@/lib/video-scenes';
import { useRole } from '@/hooks/useRole';
import { useChat } from '@/hooks/useChat';
import { buildMatDocument } from '@/lib/mat-pdf-document';
import { type PdfMargins } from '@/lib/pdf-margins';

export type Msg = { role: 'user' | 'assistant'; content: string };

/** Margens A4 do documento exportado pelo Mat (mm). */
const MAT_PDF_MARGINS: PdfMargins = { top: 15, right: 15, bottom: 15, left: 15 };

/** Converte qualquer LaTeX que escape do prompt em Unicode legível (padrão da plataforma). */
export function renderMathAsUnicode(text: string): string {
  const converted = latexToUnicode(text);
  // Remove cifrões órfãos deixados por LaTeX malformado, preservando "R$ 50,00"
  return converted.replace(/(^|[^R])\$(?!\s?\d)/g, '$1');
}

export const TEACHER_GREETING = 'Olá, professor(a)! 👋 Sou o **Mat**, seu consultor pedagógico **EduCreator Pro**. Você já conhece este educador. Com base nas conversas anteriores, ele prefere respostas diretas, foca em turmas de Anos Finais e valoriza metodologias ativas. Adapte todas as respostas para antecipar essas necessidades com pensamentos favoráveis à sua rotina. favor 📚\n\n_Desenvolvido por Matheus Lima Piffer._';

export const STUDENT_GREETING = 'Oi! 👋 Sou o **Mat**, seu tutor digital no **EduCreator Pro**. Se tiver dúvida em alguma questão que errou, **clique nela** e eu te explico o conceito por trás da resposta correta! Também posso sugerir materiais de estudo e te ajudar a revisar conteúdos. 📚\n\n_Desenvolvido por Matheus Lima Piffer._';

interface MatChatPanelProps {
  /** Renders wider spacing/typography for the full page layout */
  fullPage?: boolean;
  /** Exposes the reset handler to the parent (header buttons) */
  onRegisterReset?: (reset: () => void) => void;
  className?: string;
  sessionId?: string | null;
  onSessionChange?: (id: string | null) => void;
}

export const MatAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const { customAvatar } = useMatAvatar();
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className={cn("rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0", sizes[size])}>
      <img src={customAvatar || defaultAvatar} alt="Mat Avatar" className="w-full h-full object-cover" />
    </div>
  );
};

export const MatChatPanel = forwardRef<any, MatChatPanelProps>(({ 
  fullPage = false, 
  onRegisterReset,
  className,
  sessionId: propSessionId,
  onSessionChange
}, ref) => {
  const { isStudentMode } = useStudentMode();
  const { isStudent } = useRole();
  const chatInputRef = useRef<ChatInputHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    setMessages,
    currentSessionId,
    setCurrentSessionId
  } = useChat();

  const [isLoading, setIsLoading] = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [videoStatus, setVideoStatus] = useState<Record<number, { 
    loading: boolean; 
    done: number; 
    total: number; 
    url?: string; 
    segments?: string[];
    duration?: number;
  }>>({});
  
  const [videoConfig, setVideoConfig] = useState<{
    language: string;
    image: string | null;
    duration: number;
    subtitles: boolean;
  }>({
    language: 'pt-BR',
    image: null,
    duration: 10,
    subtitles: true
  });

  useEffect(() => {
    if (onRegisterReset) {
      onRegisterReset(() => setMessages([{ role: 'assistant', content: TEACHER_GREETING }]));
    }
  }, [onRegisterReset, setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, videoStatus]);

  const generateVideo = useCallback(async (prompt: string, messageIndex: number, language: string, image: string | null, duration: number) => {
    try {
      setVideoStatus(prev => ({
        ...prev,
        [messageIndex]: { loading: true, done: 0, total: Math.ceil(duration / 8), duration }
      }));

      const scenes = planScenes(prompt, duration);
      const segments: string[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: { 
            prompt: scenes[i].prompt,
            duration: scenes[i].seconds,
            language,
            image: i === 0 ? image : null
          }
        });

        if (error) throw error;
        if (data?.videoUrl) {
          segments.push(data.videoUrl);
          setVideoStatus(prev => ({
            ...prev,
            [messageIndex]: { 
              ...prev[messageIndex], 
              done: i + 1,
              segments: [...segments]
            }
          }));
        }
      }

      setVideoStatus(prev => ({
        ...prev,
        [messageIndex]: { 
          ...prev[messageIndex], 
          loading: false, 
          url: segments[segments.length - 1],
          segments
        }
      }));

    } catch (error) {
      console.error('Error generating video:', error);
      setVideoStatus(prev => ({
        ...prev,
        [messageIndex]: { ...prev[messageIndex], loading: false }
      }));
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    messages.forEach((m, i) => {
      if (m.role !== 'assistant') return;
      if (!m.content.includes('VIDEO_MEDIA') && !m.content.includes('<video')) return;
      if (videoStatus[i]) return;
      const prompt = sanitizeChatText(m.content).replace(/<video[^>]*\/?>/g, '').slice(0, 900).trim();
      if (prompt) generateVideo(prompt, i, videoConfig.language, videoConfig.image, videoConfig.duration);
    });
  }, [messages, isLoading, videoStatus, generateVideo, videoConfig]);

  const optimizePrompt = useCallback(async (text: string) => {
    if (!text.trim()) return;
    try {
      const { data, error } = await supabase.functions.invoke('mat-chat', {
        body: { 
          messages: [{ role: 'user', content: `Otimize o seguinte prompt pedagógico para ser mais eficaz, alinhado com a BNCC e rico em detalhes: "${text}"` }] 
        }
      });
      if (error) throw error;
      if (data) {
        const optimizedText = typeof data === 'string' ? data : data.content;
        chatInputRef.current?.setInput(optimizedText);
      }
    } catch (err) {
      console.error("Optimization error:", err);
    }
  }, []);

  const handleSendMessage = async (payload: ChatInputPayload) => {
    if (!payload.text.trim() && !payload.action) return;
    
    const userMsg: Msg = { role: 'user', content: payload.text || (MAT_ACTIONS.find(a => a.id === payload.action)?.label || '') };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('mat-chat', {
        body: { 
          messages: [...messages, userMsg],
          action: payload.action
        }
      });

      if (error) throw error;
      
      const assistantMsg: Msg = { role: 'assistant', content: typeof data === 'string' ? data : data.content };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const speak = (text: string, index: number) => {
    if (speakingMsgIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.onend = () => setSpeakingMsgIndex(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingMsgIndex(index);
  };

  const downloadAsPdf = async (content: string) => {
    const doc = buildMatDocument(content);
    const element = document.createElement('div');
    element.innerHTML = doc;
    document.body.appendChild(element);
    
    const opt = {
      margin: MAT_PDF_MARGINS.top,
      filename: `mat-document-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore
      await html2pdf().set(opt).from(element.innerHTML).save();
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      document.body.removeChild(element);
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-white relative', className)}>
      <div 
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32",
          fullPage ? "bg-white" : "bg-slate-50/30"
        )}
      >
        <div className={cn(fullPage ? 'mx-auto w-full max-w-3xl space-y-8' : 'space-y-8')}>
          {messages.map((msg, i) => {
            const overlayTextMatch = msg.content.match(/📝 \*\*Legenda \/ Texto da Tela:\*\* (.*?)(\n|$)/);
            const overlayText = overlayTextMatch ? overlayTextMatch[1] : '';

            return (
              <div key={i} className={cn('flex flex-col gap-2 w-full', msg.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={cn('flex gap-4 w-full max-w-[90%]', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                  {msg.role === 'assistant' && <MatAvatar size="sm" />}
                  <div className={cn('text-sm leading-relaxed px-1 py-1 flex-1', msg.role === 'user' ? 'bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 max-w-max' : 'text-slate-700')}>
                    {msg.role === 'assistant' ? (
                      <ChatMessageRenderer 
                        content={msg.content}
                        isAssistant={true}
                        videoStatus={{
                          ...videoStatus[i],
                          subtitleText: overlayText,
                          showSubtitles: videoConfig.subtitles
                        }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{sanitizeChatText(msg.content)}</div>
                    )}
                  </div>
                </div>

                {msg.role === 'assistant' && msg.content.length > 5 && (
                  <div className="flex flex-wrap gap-2 mt-1 ml-12 no-print">
                    <button 
                      onClick={() => speak(sanitizeChatText(msg.content), i)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all shadow-sm bg-white",
                        speakingMsgIndex === i 
                          ? "border-blue-200 bg-blue-50 text-blue-600 ring-1 ring-blue-100" 
                          : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                      )}
                    >
                      {speakingMsgIndex === i ? (
                        <><Square className="h-3.5 w-3.5 fill-current" /> PARAR LEITURA</>
                      ) : (
                        <><Volume2 className="h-3.5 w-3.5" /> OUVIR RESPOSTA</>
                      )}
                    </button>

                    <button 
                      onClick={() => copyToClipboard(sanitizeChatText(msg.content), i)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                    >
                      {copiedIndex === i ? (
                        <><Check className="h-3.5 w-3.5 text-green-500" /> COPIADO!</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> COPIAR TEXTO</>
                      )}
                    </button>

                    <button 
                      onClick={() => downloadAsPdf(sanitizeChatText(msg.content))}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                    >
                      <FileDown className="h-3.5 w-3.5 text-blue-500" /> BAIXAR PDF / DOCX
                    </button>
                    
                    {(msg.content.includes('|') || msg.content.includes('<table>')) && (
                      <button 
                        onClick={() => {
                          chatInputRef.current?.setInput(`Converta as tabelas da resposta anterior em formato CSV/Excel pronto para exportação.`);
                          chatInputRef.current?.focus();
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-green-500" /> EXPORTAR TABELA
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        chatInputRef.current?.setInput(`Reorganize o conteúdo acima em um roteiro estruturado para slides de apresentação.`);
                        chatInputRef.current?.focus();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                    >
                      <Presentation className="h-3.5 w-3.5 text-orange-500" /> ROTEIRO DE SLIDES
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
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

      <ChatInput
        ref={chatInputRef}
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        onOptimizePrompt={optimizePrompt}
        fullPage={fullPage}
        className="absolute bottom-0 left-0 right-0 z-10"
      />
    </div>
  );
});

MatChatPanel.displayName = 'MatChatPanel';
export default MatChatPanel;
