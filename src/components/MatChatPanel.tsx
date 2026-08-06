import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, FileUp, FileDown, Loader2, Image as ImageIcon, FileText, FileSpreadsheet, Presentation, Plus, Mic, Volume2, Square, Copy, Check, Headphones, Video, Play, RefreshCw, Pencil, Trash2, Calendar, Sparkles, Brain, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { latexToUnicode } from '@/lib/latex-to-unicode';
import defaultAvatar from '@/assets/mat-avatar-3d.png';
import { useMatAvatar } from '@/hooks/useMatAvatar';
import { useStudentMode } from '@/hooks/useStudentMode';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isYesterday, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  sessionId?: string | null;
  onSessionChange?: (id: string | null) => void;
}

/** Shared avatar — shows the whole picture (PNG transparent, no border) */
export function MatAvatar({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { customAvatar } = useMatAvatar();
  const src = customAvatar || defaultAvatar;
  
  // Avatar do Mat: PNG transparente, sem moldura ou recorte circular
  const dim = size === 'lg' ? 'w-[60px]' : size === 'md' ? 'w-10' : 'w-8';

  return (
    <div className={cn(dim, 'shrink-0 flex items-center justify-center overflow-visible bg-transparent', className)}>
      <img
        src={src}
        alt="Mat"
        className="mat-avatar-header w-full h-auto object-contain bg-transparent rounded-none filter drop-shadow-[0px_3px_6px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-in-out hover:scale-105"
      />
    </div>
  );
}

export default function MatChatPanel({ fullPage = false, onRegisterReset, className, sessionId, onSessionChange }: MatChatPanelProps) {
  const { isStudentMode } = useStudentMode();
  const greeting = isStudentMode ? STUDENT_GREETING : TEACHER_GREETING;
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: greeting }]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const [videoStatus, setVideoStatus] = useState<Record<number, { loading: boolean; url?: string }>>({});
  const [videoConfig, setVideoConfig] = useState<{ language: string; image: string | null }>({ language: 'Português (PT-BR)', image: null });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoImageRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Sync with prop if it changes
  useEffect(() => {
    if (sessionId !== undefined && sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
      if (sessionId) {
        loadSessionMessages(sessionId);
      } else {
        setMessages([{ role: 'assistant', content: greeting }]);
      }
    }
  }, [sessionId, greeting]);

  const loadSessionMessages = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setMessages(data as Msg[]);
      } else {
        setMessages([{ role: 'assistant', content: greeting }]);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      // Fallback to localStorage if offline logic could go here
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleToggle = () => {
      setIsAutoPlayEnabled(prev => {
        const next = !prev;
        const toggleBtn = document.getElementById('autoplay-toggle');
        if (toggleBtn) {
          const span = toggleBtn.querySelector('div > span');
          const div = toggleBtn.querySelector('div');
          if (span && div) {
            div.setAttribute('data-state', next ? 'active' : 'inactive');
            span.setAttribute('data-state', next ? 'active' : 'inactive');
          }
        }
        return next;
      });
    };
    
    const element = document.querySelector('[data-chat-panel]');
    element?.addEventListener('toggleAutoPlay', handleToggle);
    return () => element?.removeEventListener('toggleAutoPlay', handleToggle);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript || interimTranscript) {
          setInput(prev => {
            const newVal = prev + (finalTranscript || interimTranscript);
            // Adjust textarea height
            if (inputRef.current) {
              inputRef.current.style.height = 'auto';
              inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
            }
            return newVal;
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, [isListening]);

  const speak = useCallback((text: string, index: number) => {
    if (!window.speechSynthesis) return;

    if (speakingMsgIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    // Clean text from markdown and extra symbols for better TTS
    const cleanText = text
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`{1,3}.*?`{1,3}/gs, '')
      .replace(/- /g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.onend = () => setSpeakingMsgIndex(null);
    utterance.onerror = () => setSpeakingMsgIndex(null);
    
    synthesisRef.current = utterance;
    setSpeakingMsgIndex(index);
    window.speechSynthesis.speak(utterance);
  }, [speakingMsgIndex]);

  const copyToClipboard = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }, []);

  const reset = useCallback(() => {
    setMessages([{ role: 'assistant', content: greeting }]);
    setCurrentSessionId(null);
    onSessionChange?.(null);
  }, [greeting, onSessionChange]);

  useEffect(() => {
    onRegisterReset?.(reset);
  }, [onRegisterReset, reset]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && !selectedImage) || isLoading) return;

    const userMsg: Msg = { 
      role: 'user', 
      content: selectedImage ? `${text}\n\n[IMAGE_ATTACHED: ${selectedImage.substring(0, 50)}...]` : text 
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;
    let sessionIdToUse = currentSessionId;

    // Create session if it doesn't exist
    if (!sessionIdToUse && userId) {
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({ 
            user_id: userId, 
            title: text.substring(0, 50) + (text.length > 50 ? '...' : '') 
          })
          .select()
          .single();
        
        if (error) throw error;
        sessionIdToUse = data.id;
        setCurrentSessionId(data.id);
        onSessionChange?.(data.id);
      } catch (err) {
        console.error('Error creating session:', err);
      }
    }

    // Save user message to DB
    if (sessionIdToUse) {
      supabase.from('chat_messages').insert({
        session_id: sessionIdToUse,
        role: 'user',
        content: text
      }).then(({ error }) => error && console.error('Error saving user msg:', error));
    }

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

    const handleAutoPlay = (finalContent: string) => {
      if (isAutoPlayEnabled) {
        // Find the index of the message we just added
        setMessages(prev => {
          const index = prev.length - 1;
          // We use a slight timeout to ensure state is settled or we just trigger speak directly
          setTimeout(() => speak(finalContent, index), 100);
          return prev;
        });
      }
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
          body: JSON.stringify({ 
            messages: newMessages,
            image: selectedImage // Sending the selected image for vision analysis
          }),
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

    // Save assistant message to DB
    if (sessionIdToUse && assistantSoFar) {
      supabase.from('chat_messages').insert({
        session_id: sessionIdToUse,
        role: 'assistant',
        content: assistantSoFar
      }).then(({ error }) => error && console.error('Error saving assistant msg:', error));
    }

    setIsLoading(false);
    inputRef.current?.focus();
  }, [input, isLoading, messages, isAutoPlayEnabled, speak]);

  const generateVideo = useCallback(async (prompt: string, index: number, language: string = 'PT-BR', imageBase64?: string | null) => {
    setVideoStatus(prev => ({ ...prev, [index]: { loading: true } }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { prompt, duration: 10, language, image: imageBase64 },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || 'Falha ao gerar vídeo');

      setVideoStatus(prev => ({ 
        ...prev, 
        [index]: { loading: false, url: data.url } 
      }));
    } catch (error) {
      console.error(error);
      setVideoStatus(prev => ({ ...prev, [index]: { loading: false } }));
      alert('Desculpe, tive um erro ao gerar seu vídeo. Tente novamente em instantes.');
    }
  }, []);

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
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Error:', err);
    }
  };

  return (
    <div className={cn('flex flex-col min-h-0 flex-1 bg-white', className)} data-chat-panel>
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent',
          fullPage ? 'px-4 sm:px-8 py-8 space-y-8' : 'px-6 py-8 space-y-8',
        )}
      >
        <div className={cn(fullPage ? 'mx-auto w-full max-w-3xl space-y-8' : 'space-y-8')}>
          {messages.map((msg, i) => {
            const videoPromptMatch = msg.content.match(/\[VIDEO_PROMPT:\s*(.*?)\]/);
            const displayContent = msg.content.replace(/\[VIDEO_PROMPT:.*?\]/g, '').trim();
            
            // Extrair legenda e roteiro se for uma resposta de vídeo
            const overlayTextMatch = msg.content.match(/📝 \*\*Legenda \/ Texto da Tela:\*\* (.*?)(\n|$)/);
            const narrationMatch = msg.content.match(/🎙️ \*\*Roteiro da Narração \(10s\):\*\* (.*?)(\n|$)/s);
            const overlayText = overlayTextMatch ? overlayTextMatch[1] : '';
            const narrationText = narrationMatch ? narrationMatch[1] : '';

            return (
              <div key={i} className={cn('flex flex-col gap-2 w-full', msg.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={cn('flex gap-4 w-full max-w-[90%]', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                  {msg.role === 'assistant' && <MatAvatar size="sm" />}
                  <div className={cn('text-sm leading-relaxed px-1 py-1 flex-1', msg.role === 'user' ? 'bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 max-w-max' : 'text-slate-700')}>
                    {msg.role === 'assistant' ? (
                      <div className="space-y-4">
                        <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-50">
                          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                            {renderMathAsUnicode(displayContent)}
                          </ReactMarkdown>
                        </div>

                        {videoPromptMatch && (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
                            <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center relative group">
                              {videoStatus[i]?.loading ? (
                                <div className="text-white text-center p-4 animate-pulse">
                                  <Loader2 className="h-12 w-12 mx-auto mb-3 text-blue-400 animate-spin" />
                                  <p className="text-xs font-bold text-slate-300">🎥 O Mat está gerando seu vídeo educacional de 10 segundos...</p>
                                  <p className="text-[10px] text-slate-500 mt-2 italic">Isso pode levar de 30 a 60 segundos.</p>
                                </div>
                              ) : videoStatus[i]?.url ? (
                                <div className="relative w-full h-full">
                                  <video 
                                    src={videoStatus[i].url} 
                                    controls 
                                    autoPlay 
                                    loop 
                                    className="w-full h-full object-cover"
                                  />
                                  {overlayText && (
                                    <div className="absolute top-4 left-0 right-0 flex justify-center px-4 pointer-events-none">
                                      <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-bold shadow-xl animate-in fade-in duration-500">
                                        {overlayText}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="text-white text-center p-4">
                                    <Video className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">VÍDEO EDUCACIONAL (10S)</p>
                                    <p className="text-[10px] text-slate-500 mt-1 italic max-w-[240px] truncate mx-auto">
                                      {videoPromptMatch[1]}
                                    </p>
                                  </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                      <Popover.Root>
                                        <Popover.Trigger asChild>
                                          <button className="p-3 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform shadow-lg flex items-center gap-2">
                                            <Play className="h-6 w-6 fill-current" />
                                            <span className="text-xs font-bold pr-1">CONFIGURAR E GERAR</span>
                                          </button>
                                        </Popover.Trigger>
                                        <Popover.Portal>
                                          <Popover.Content className="bg-white p-4 rounded-xl shadow-2xl border border-slate-100 w-72 z-50 animate-in fade-in zoom-in duration-200" sideOffset={5}>
                                            <div className="space-y-4">
                                              <h4 className="text-sm font-bold text-slate-900 border-bottom pb-2 border-slate-50">Configurações do Vídeo</h4>
                                              
                                              <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Idioma</label>
                                                <select 
                                                  value={videoConfig.language}
                                                  onChange={(e) => setVideoConfig(prev => ({ ...prev, language: e.target.value }))}
                                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50"
                                                >
                                                  <option>Português (PT-BR)</option>
                                                  <option>Inglês (EN-US)</option>
                                                  <option>Espanhol (ES)</option>
                                                </select>
                                              </div>

                                              <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Imagem de Referência (Opcional)</label>
                                                <button 
                                                  onClick={() => videoImageRef.current?.click()}
                                                  className="w-full p-2 text-xs rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-slate-600"
                                                >
                                                  {videoConfig.image ? <Check className="h-3 w-3 text-green-500" /> : <ImageIcon className="h-3 w-3" />}
                                                  {videoConfig.image ? 'Imagem Anexada' : 'Anexar Imagem'}
                                                </button>
                                                <input 
                                                  type="file" 
                                                  ref={videoImageRef} 
                                                  className="hidden" 
                                                  accept="image/*"
                                                  onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                      const base64 = await new Promise<string>((resolve) => {
                                                        const reader = new FileReader();
                                                        reader.onload = () => resolve(reader.result as string);
                                                        reader.readAsDataURL(file);
                                                      });
                                                      setVideoConfig(prev => ({ ...prev, image: base64 }));
                                                    }
                                                  }}
                                                />
                                              </div>

                                              <button 
                                                onClick={() => {
                                                  generateVideo(videoPromptMatch[1], i, videoConfig.language.toUpperCase(), videoConfig.image);
                                                }}
                                                className="w-full p-3 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                                              >
                                                CRIAR VÍDEO EDUCACIONAL (10S)
                                              </button>
                                            </div>
                                          </Popover.Content>
                                        </Popover.Portal>
                                      </Popover.Root>
                                    </div>
                                </>
                              )}
                            </div>
                            <div className="p-3 flex items-center justify-between border-t border-slate-200 bg-white">
                              <div className="flex gap-2 items-center">
                                {videoStatus[i]?.url && (
                                  <>
                                    <a 
                                      href={videoStatus[i].url}
                                      download="mat-video-educacional.mp4"
                                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-black hover:bg-slate-800 transition-colors"
                                    >
                                      <FileDown className="h-3.5 w-3.5" />
                                      BAIXAR MP4
                                    </a>
                                    {narrationText && (
                                      <button 
                                        onClick={() => {
                                          const utterance = new SpeechSynthesisUtterance(narrationText);
                                          utterance.lang = 'pt-BR';
                                          window.speechSynthesis.speak(utterance);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-black hover:bg-blue-700 transition-colors"
                                      >
                                        <Headphones className="h-3.5 w-3.5" />
                                        OUVIR EXPLICAÇÃO (PT-BR)
                                      </button>
                                    )}
                                  </>
                                )}
                                <button 
                                  onClick={() => {
                                    if (videoStatus[i]?.url) {
                                      const lang = prompt("Escolha o idioma do vídeo (Português (PT-BR), Inglês (EN-US), Espanhol (ES)):", "Português (PT-BR)");
                                      if (lang) {
                                        generateVideo(videoPromptMatch[1], i, lang.toUpperCase());
                                      }
                                    } else {
                                      setInput(`Gere uma nova variação do vídeo sobre: ${displayContent.substring(0, 30)}...`);
                                      inputRef.current?.focus();
                                    }
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  {videoStatus[i]?.url ? 'GERAR NOVA VERSÃO' : 'GERAR VARIAÇÃO'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : <div className="whitespace-pre-wrap">{msg.content}</div>}
                  </div>
                </div>

                {/* Action Buttons for Assistant Messages */}
                {msg.role === 'assistant' && msg.content.length > 5 && (
                  <div className="flex flex-wrap gap-2 mt-1 ml-12 no-print">
                    <button 
                      onClick={() => speak(msg.content, i)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all shadow-sm bg-white",
                        speakingMsgIndex === i 
                          ? "border-blue-200 bg-blue-50 text-blue-600 ring-1 ring-blue-100" 
                          : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                      )}
                    >
                      {speakingMsgIndex === i ? (
                        <>
                          <Square className="h-3.5 w-3.5 fill-current" />
                          PARAR LEITURA
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" />
                          OUVIR RESPOSTA
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => copyToClipboard(msg.content, i)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                    >
                      {copiedIndex === i ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          COPIADO!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          COPIAR TEXTO
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => downloadAsPdf(msg.content)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                    >
                      <FileDown className="h-3.5 w-3.5 text-blue-500" />
                      BAIXAR PDF / DOCX
                    </button>
                    
                    {(msg.content.includes('|') || msg.content.includes('<table>')) && (
                      <button 
                        onClick={() => {
                          setInput(`Converta as tabelas da resposta anterior em formato CSV/Excel pronto para exportação.`);
                          inputRef.current?.focus();
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-green-500" />
                        EXPORTAR TABELA
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        setInput(`Reorganize o conteúdo acima em um roteiro estruturado para slides de apresentação.`);
                        inputRef.current?.focus();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                    >
                      <Presentation className="h-3.5 w-3.5 text-orange-500" />
                      ROTEIRO DE SLIDES
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
          {/* Quick Action Chips */}
          {!isStudentMode && (
            <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
              {[
                { label: '📄 Resumir Documento', text: 'Resuma este documento focando nos pontos pedagógicos e objetivos de aprendizagem.' },
                { label: '✨ Melhore este Texto', text: 'Melhore este texto pedagógico, tornando-o mais claro, formal e alinhado com a BNCC.' },
                { label: '📝 Corrigir/Gabaritar Prova', text: 'Analise esta prova e forneça o gabarito comentado com nível de dificuldade e habilidades.' },
                { label: '♿ Gerar PEI / Adaptação', text: 'Elabore e adapte este conteúdo para o Plano de Desenvolvimento Individualizado (PEI) em 3 níveis de suporte pedagógico (Alto, Médio e Autonomia) focando em acessibilidade.' },
                { label: '📊 Diagnóstico de Planilha', text: 'Analise esta planilha de notas/frequência e gere um relatório institucional com: identificação de alunos em risco, habilidades da BNCC com defasagem e sugestão de plano de recomposição de aprendizagem.' },
                { label: '👥 Simulador de Gestão', text: 'Ative o modo simulação: encene um atendimento a pais, reunião pedagógica ou banca de projetos para meu treino. Atue como meu interlocutor.' },
                { label: '🎥 Criar Vídeo Educacional (10s)', text: 'Planeje um vídeo educacional cinematográfico de 10 segundos em Português (PT-BR). Me peça o tema e a imagem de referência opcional.' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => {
                    setInput(chip.text);
                    inputRef.current?.focus();
                  }}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div 
            className="relative flex flex-col bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300 transition-all p-2"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-slate-100');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('bg-slate-100');
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('bg-slate-100');
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) {
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.readAsDataURL(file);
                });
                setSelectedImage(base64);
              }
            }}
          >
            {selectedImage && (
              <div className="flex px-3 pt-2">
                <div className="relative group">
                  <img 
                    src={selectedImage} 
                    alt="Preview" 
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-white text-slate-900 rounded-full p-1 shadow-md border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <Plus className="h-3 w-3 rotate-45" />
                  </button>
                </div>
              </div>
            )}
            <div className="relative flex items-end gap-2 w-full">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
              />
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  disabled={isLoading || isUploading}
                  className="mb-1 h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center transition-colors shrink-0 bg-slate-100 border border-slate-200"
                  title="Anexar arquivos"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content 
                  className="z-50 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 animate-in fade-in zoom-in duration-200"
                  sideOffset={8}
                  align="start"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = ".png,.jpg,.jpeg,.webp";
                          fileInputRef.current.onchange = async (e: any) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const base64 = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result as string);
                                reader.readAsDataURL(file);
                              });
                              setSelectedImage(base64);
                            }
                          };
                          fileInputRef.current.click();
                        }
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <ImageIcon className="h-4 w-4 text-blue-500" />
                      <span>🖼️ Anexar Imagem para o Vídeo / Roteiro</span>
                    </button>
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = ".pdf,.docx,.txt";
                          fileInputRef.current.click();
                        }
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <FileText className="h-4 w-4 text-orange-500" />
                      <span>📄 Enviar Documento (PDF...)</span>
                    </button>
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = ".csv,.xlsx";
                          fileInputRef.current.click();
                        }
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      <span>📊 Enviar Planilha (CSV...)</span>
                    </button>
                  </div>
                  <Popover.Arrow className="fill-white" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            {isUploading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 mb-2 ml-1" />}
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
              placeholder={selectedImage ? "O que deseja fazer com esta imagem?..." : "Pergunte ao Mat..."}
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-800 placeholder:text-slate-400 px-3 py-2.5 resize-none min-h-[40px] max-h-[160px]"
            />
            <button
              onClick={toggleListening}
              className={cn(
                "mb-1 h-8 w-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                isListening 
                  ? "bg-red-50 text-red-500 animate-pulse ring-2 ring-red-200" 
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              )}
              title={isListening ? "Parar de ouvir" : "Ditar mensagem"}
            >
              <Mic className={cn("h-4 w-4", isListening && "fill-red-500")} />
            </button>
            <button
              onClick={sendMessage}
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className="mb-1 h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
              aria-label="Enviar mensagem"
            >
              <Send className="h-4 w-4" />
            </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            O Mat pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
