import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { FileDown, Loader2, Image as ImageIcon, FileText, FileSpreadsheet, Presentation, Volume2, Square, Copy, Check, Headphones, Video, Play, RefreshCw, Trash2, Brain, X } from 'lucide-react';
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
import ChatInput, { MAT_ACTIONS, type ChatInputPayload, type ChatInputHandle } from '@/components/ChatInput';
import { sanitizeChatText } from '@/lib/chat-sanitize';
import VideoLabPlayer from '@/components/VideoLabPlayer';
import { planScenes, VIDEO_DURATIONS, DURATION_LABELS, FREE_MAX_VIDEO_SECONDS, type VideoDuration } from '@/lib/video-scenes';
import { useRole } from '@/hooks/useRole';
import { buildMatDocument } from '@/lib/mat-pdf-document';
import { usableWidthPx, toHtml2PdfMargin, type PdfMargins } from '@/lib/pdf-margins';

export type Msg = { role: 'user' | 'assistant'; content: string };

/** Margens A4 do documento exportado pelo Mat (mm). */
const MAT_PDF_MARGINS: PdfMargins = { top: 18, right: 18, bottom: 18, left: 18 };

/** Converte qualquer LaTeX que escape do prompt em Unicode legível (padrão da plataforma). */
export function renderMathAsUnicode(text: string): string {
  const converted = latexToUnicode(text);
  // Remove cifrões órfãos deixados por LaTeX malformado, preservando "R$ 50,00"
  return converted.replace(/(^|[^R])\$(?!\s?\d)/g, '$1');
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mat-chat`;

export const TEACHER_GREETING = 'Olá, professor(a)! 👋 Sou o **Mat**, seu consultor pedagógico **EduCreator Pro**. Você já conhece este educador. Com base nas conversas anteriores, ele prefere respostas diretas, foca em turmas de Anos Finais e valoriza metodologias ativas. Adapte todas as respostas para antecipar essas necessidades com pensamentos favoráveis à sua rotina. 📚\n\n_Desenvolvido por Matheus Lima Piffer._';

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
export const MatAvatar = forwardRef<HTMLDivElement, { size?: 'sm' | 'md' | 'lg'; className?: string }>(
  ({ size = 'md', className }, ref) => {
    const { customAvatar } = useMatAvatar();
    const src = customAvatar || defaultAvatar;
    
    // Avatar do Mat: PNG transparente, sem moldura ou recorte circular
    const dim = size === 'lg' ? 'w-[60px]' : size === 'md' ? 'w-10' : 'w-8';

    return (
      <div 
        ref={ref}
        className={cn(dim, 'shrink-0 flex items-center justify-center overflow-visible bg-transparent', className)}
      >
        <img
          src={src}
          alt="Mat"
          className="mat-avatar-header w-full h-auto object-contain bg-transparent rounded-none filter drop-shadow-[0px_3px_6px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-in-out hover:scale-105"
        />
      </div>
    );
  }
);
MatAvatar.displayName = 'MatAvatar';

export default function MatChatPanel({ fullPage = false, onRegisterReset, className, sessionId, onSessionChange }: MatChatPanelProps) {
  const { isStudentMode } = useStudentMode();
  const greeting = isStudentMode ? STUDENT_GREETING : TEACHER_GREETING;
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: greeting }]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [userMemory, setUserMemory] = useState<{ id: string; memory_fact: string }[]>([]);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const [videoStatus, setVideoStatus] = useState<Record<number, { loading: boolean; url?: string; segments?: string[]; done?: number; total?: number; duration?: number }>>({});
  const { role } = useRole();
  const canUseLongVideos = role === 'admin' || role === 'super_admin';
  const [videoConfig, setVideoConfig] = useState<{ language: string; image: string | null; subtitles: boolean; duration: VideoDuration }>({ language: 'Português (PT-BR)', image: null, subtitles: true, duration: FREE_MAX_VIDEO_SECONDS });
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);
  const videoImageRef = useRef<HTMLInputElement>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);


  const loadMemory = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from('user_pedagogical_memory' as any)
      .select('id, memory_fact')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUserMemory(data as any);
      setShowMemory(true);
    }
  }, []);

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
    element?.addEventListener('openMemory', loadMemory);
    return () => {
      element?.removeEventListener('toggleAutoPlay', handleToggle);
      element?.removeEventListener('openMemory', loadMemory);
    };
  }, [loadMemory]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    chatInputRef.current?.focus();
  }, []);

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
    chatInputRef.current?.reset();
  }, [greeting, onSessionChange]);

  useEffect(() => {
    onRegisterReset?.(reset);
  }, [onRegisterReset, reset]);

  const handleSendMessage = useCallback(async (payload: ChatInputPayload) => {
    // Resolve action template text
    const action = MAT_ACTIONS.find((a) => a.id === payload.action);
    const typed = payload.text;
    
    // Auto-detect action if none selected
    let finalActionId = payload.action;
    if (!finalActionId && typed) {
      const lowerText = typed.toLowerCase();
      if (lowerText.includes('questão') || lowerText.includes('prova') || lowerText.includes('gabarito')) {
        finalActionId = 'gabarito';
      } else if (lowerText.includes('tdah') || lowerText.includes('laudo') || lowerText.includes('inclusão') || lowerText.includes('adaptação') || lowerText.includes('pei')) {
        finalActionId = 'pei';
      } else if (lowerText.includes('planilha') || lowerText.includes('csv') || lowerText.includes('xlsx') || lowerText.includes('nota') || lowerText.includes('frequência')) {
        finalActionId = 'planilha';
      } else if (typed.length > 200 && !typed.includes('?')) {
        finalActionId = 'resumir';
      }
    }

    const text = [action?.text, typed].filter(Boolean).join('\n\n');

    // Convert image attachments to a base64 data URL for vision
    let imageBase64: string | null = null;
    const imageFile = payload.files.find((f) => f.type.startsWith('image/'));
    if (imageFile) {
      imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
    }

    if ((!text && !imageBase64) || isLoading) return;

    const userMsg: Msg = { 
      role: 'user', 
      content: JSON.stringify({
        database: finalActionId,
        texto_limpo: typed,
        anexos_presentes: !!imageBase64
      })
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
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
    const upsertAssistant = async (chunk: string) => {
      assistantSoFar += chunk;
      
      // Check for memory facts in the response
      const memoryMatch = assistantSoFar.match(/\[MEMORY_FACT:\s*(.*?)\]/);
      if (memoryMatch && memoryMatch[1]) {
        const fact = memoryMatch[1].trim();
        assistantSoFar = assistantSoFar.replace(/\[MEMORY_FACT:.*?\]/g, '').trim();
        const { data: { session: currentAuth } } = await supabase.auth.getSession();
        if (currentAuth?.user?.id) {
          await supabase.from('user_pedagogical_memory' as any).insert({
            user_id: currentAuth.user.id,
            memory_fact: fact
          });
        }
      }

      // Mantém o conteúdo bruto no estado (necessário para extrair [VIDEO_PROMPT]);
      // a sanitização acontece na renderização.
      const displayContent = assistantSoFar;

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > newMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: displayContent } : m));
        }
        return [...prev.slice(0, newMessages.length), { role: 'assistant', content: displayContent }];
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
            image: imageBase64, // Sending the selected image for vision analysis
            web_search: payload.webSearch,
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
    chatInputRef.current?.focus();
  }, [isLoading, messages, isAutoPlayEnabled, speak, currentSessionId, onSessionChange]);

  const generateVideo = useCallback(async (
    prompt: string,
    index: number,
    language: string = 'PT-BR',
    imageBase64?: string | null,
    totalDuration: VideoDuration = 30,
  ) => {
    const effectiveDuration = (canUseLongVideos
      ? totalDuration
      : Math.min(totalDuration, FREE_MAX_VIDEO_SECONDS)) as VideoDuration;
    const scenes = planScenes(prompt, effectiveDuration);
    setVideoStatus(prev => ({
      ...prev,
      [index]: { loading: true, segments: [], done: 0, total: scenes.length, duration: effectiveDuration },
    }));

    const segments: string[] = [];

    try {
      // As cenas são geradas em sequência (a API gera clipes curtos por chamada)
      // e depois reproduzidas encadeadas para formar o vídeo completo.
      for (const scene of scenes) {
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: {
            prompt: scene.prompt,
            duration: scene.seconds,
            duration_seconds: scene.seconds,
            total_duration: effectiveDuration,
            scene_index: scene.index + 1,
            scene_count: scenes.length,
            scene_block: scene.block.label,
            language,
            image: scene.index === 0 ? imageBase64 : undefined,
          },
        });
        if (error) throw error;
        if (!data?.url) throw new Error(data?.error || 'Falha ao gerar vídeo');

        segments.push(data.url);
        setVideoStatus(prev => ({
          ...prev,
          [index]: {
            loading: segments.length < scenes.length,
            url: segments[0],
            segments: [...segments],
            done: segments.length,
            total: scenes.length,
            duration: effectiveDuration,
          },
        }));
      }
    } catch (error) {
      console.error(error);
      setVideoStatus(prev => ({
        ...prev,
        [index]: {
          loading: false,
          url: segments[0],
          segments,
          done: segments.length,
          total: scenes.length,
          duration: effectiveDuration,
        },
      }));
      if (segments.length === 0) {
        alert('Desculpe, tive um erro ao gerar seu vídeo. Tente novamente em instantes.');
      }
    }
  }, [canUseLongVideos]);

  // Dispara automaticamente a geração do MP4 quando a IA marca <video src="VIDEO_MEDIA" />
  useEffect(() => {
    if (isLoading) return;
    messages.forEach((m, i) => {
      if (m.role !== 'assistant') return;
      if (!m.content.includes('VIDEO_MEDIA')) return;
      if (videoStatus[i]) return;
      const prompt = sanitizeChatText(m.content).replace(/<video[^>]*\/?>/g, '').slice(0, 900).trim();
      if (prompt) generateVideo(prompt, i, videoConfig.language, videoConfig.image, videoConfig.duration);
    });
  }, [messages, isLoading, videoStatus, generateVideo, videoConfig]);

  const optimizePrompt = useCallback(async (text: string) => {
    if (!text.trim() || isOptimizing) return;
    setIsOptimizing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          messages: [{ 
            role: 'user', 
            content: `Reescreva o seguinte comando de um professor para torná-lo uma instrução pedagógica de alta precisão, adicionando metodologia (PBL, Metodologias Ativas), habilidades da BNCC relacionadas, faixa etária sugerida e um tom assertivo. Retorne APENAS o texto otimizado, sem introduções ou explicações:\n\n"${text}"` 
          }] 
        }),
      });

      if (!resp.ok) throw new Error('Optimization failed');
      
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let optimizedText = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) optimizedText += content;
              } catch (e) {}
            }
          }
        }
      }
      
      if (optimizedText) chatInputRef.current?.setInput(optimizedText.trim());
    } catch (err) {
      console.error('Error optimizing prompt:', err);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing]);

  const deleteMemoryFact = async (id: string) => {
    const { error } = await supabase
      .from('user_pedagogical_memory' as any)
      .delete()
      .eq('id', id);
    
    if (!error) {
      setUserMemory(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
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
    }
  }, []);

  const downloadAsPdf = async (content: string) => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = buildMatDocument(content);

      // Renderiza fora da tela com a largura útil exata da A4 (210mm - margens)
      element.style.width = `${usableWidthPx(MAT_PDF_MARGINS)}px`;
      element.style.background = '#ffffff';
      element.style.position = 'fixed';
      element.style.left = '-10000px';
      element.style.top = '0';
      document.body.appendChild(element);

      const opt = {
        margin: toHtml2PdfMargin(MAT_PDF_MARGINS),
        filename: 'mat-documento.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'] as string[], avoid: ['.doc-question', '.doc-table', '.diagram'] },
      };

      try {
        await html2pdf().set(opt).from(element).save();
      } finally {
        element.remove();
      }
    } catch (err) {
      console.error('PDF Error:', err);
    }
  };

  return (
    <div className={cn('flex flex-col min-h-0 flex-1 bg-white relative', className)} data-chat-panel>
      {/* Memory Modal Overlay */}
      {showMemory && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm p-8 flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">O que o Mat aprendeu sobre você</h2>
                <p className="text-xs text-slate-500 font-medium">Suas preferências pedagógicas memorizadas para personalizar o atendimento</p>
              </div>
            </div>
            <button 
              onClick={() => setShowMemory(false)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {userMemory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                <Brain className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Ainda não memorizei preferências pedagógicas.</p>
                <p className="text-xs max-w-xs mt-1">Converse comigo e me conte sobre suas turmas, métodos e rotina para que eu possa aprender!</p>
              </div>
            ) : (
              userMemory.map((fact) => (
                <div key={fact.id} className="flex items-start justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl group hover:border-blue-100 hover:bg-white transition-all">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{fact.memory_fact}</p>
                  <button 
                    onClick={() => deleteMemoryFact(fact.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Remover este aprendizado"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button 
              onClick={() => setShowMemory(false)}
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

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
            const displayContent = sanitizeChatText(msg.content);
            
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
                        <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-table:border prose-table:border-slate-200 prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
                          <ReactMarkdown 
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full text-sm border-collapse" {...props} /></div>,
                              thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                              th: ({node, ...props}) => <th className="border border-slate-200 px-3 py-2 text-left font-bold text-slate-700" {...props} />,
                              td: ({node, ...props}) => <td className="border border-slate-200 px-3 py-2 text-slate-600" {...props} />,
                              video: ({node, ...props}) => {
                                const status = videoStatus[i];
                                const generatedUrl = status?.url;
                                const rawSrc = typeof props.src === 'string' ? props.src : '';
                                const isPlaceholder = !rawSrc || rawSrc === 'VIDEO_MEDIA';
                                const src = isPlaceholder ? generatedUrl : rawSrc;
                                const total = status?.duration ?? videoConfig.duration;
                                if (isPlaceholder && status?.segments?.length) {
                                  return (
                                    <div className="my-4">
                                      <VideoLabPlayer
                                        segments={status.segments}
                                        durationSeconds={total}
                                        showSubtitles={videoConfig.subtitles}
                                      />
                                      {status.loading && (
                                        <p className="text-[10px] text-slate-500 mt-1">
                                          Gerando cenas e áudio para vídeo de {total}s... ({status.done}/{status.total})
                                        </p>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <div className="my-4 rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-black aspect-video flex flex-col">
                                    {src ? (
                                      <video
                                        controls
                                        autoPlay
                                        className="w-full h-full object-contain"
                                        src={src}
                                        key={src}
                                      />
                                    ) : (
                                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900">
                                        <Loader2 className="w-10 h-10 mb-3 text-indigo-400 animate-spin" />
                                        <h4 className="text-xs font-bold text-white">Gerando cenas e áudio para vídeo de {total}s...</h4>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                          {status?.total ? `Cena ${(status.done ?? 0) + 1} de ${status.total}` : `O vídeo de ${total}s aparecerá aqui assim que ficar pronto.`}
                                        </p>
                                      </div>
                                    )}
                                    <div className="bg-slate-900 p-3 flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EduCreator VideoLab</span>
                                      {src && (
                                        <a
                                          href={src}
                                          download="video-educacional.mp4"
                                          className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-500 transition-colors"
                                        >
                                          <FileDown className="w-3 h-3" />
                                          DOWNLOAD
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            }}
                          >
                            {renderMathAsUnicode(displayContent)}
                          </ReactMarkdown>
                        </div>

                        {videoPromptMatch && (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
                            <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center relative group">
                              {videoStatus[i]?.loading && !videoStatus[i]?.segments?.length ? (
                                <div className="text-white text-center p-4 w-full max-w-xs">
                                  <Loader2 className="h-12 w-12 mx-auto mb-3 text-blue-400 animate-spin" />
                                  <p className="text-xs font-bold text-slate-300">
                                    🎥 Gerando cenas e áudio para vídeo de {videoStatus[i]?.duration ?? videoConfig.duration}s...
                                  </p>
                                  <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden mt-3">
                                    <div
                                      className="h-full bg-blue-500 transition-all"
                                      style={{ width: `${((videoStatus[i]?.done ?? 0) / Math.max(videoStatus[i]?.total ?? 1, 1)) * 100}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-2 italic">
                                    Cena {(videoStatus[i]?.done ?? 0) + 1} de {videoStatus[i]?.total ?? 1} — pode levar alguns minutos.
                                  </p>
                                </div>
                              ) : videoStatus[i]?.segments?.length ? (
                                <div className="relative w-full h-full">
                                  <VideoLabPlayer
                                    segments={videoStatus[i].segments as string[]}
                                    durationSeconds={videoStatus[i]?.duration ?? videoConfig.duration}
                                    subtitleText={overlayText}
                                    showSubtitles={videoConfig.subtitles}
                                    className="border-0"
                                  />
                                  {videoStatus[i]?.loading && (
                                    <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      {videoStatus[i]?.done}/{videoStatus[i]?.total} cenas
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="text-white text-center p-4">
                                    <Video className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                      VÍDEO EDUCACIONAL (ATÉ 60S)
                                    </p>
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
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Duração</label>
                                                <div className="grid grid-cols-5 gap-1">
                                                  {VIDEO_DURATIONS.map((d) => (
                                                    <button
                                                      key={d}
                                                      disabled={!canUseLongVideos && d > FREE_MAX_VIDEO_SECONDS}
                                                      onClick={() => setVideoConfig(prev => ({ ...prev, duration: d }))}
                                                      className={cn(
                                                        'py-1.5 text-[10px] font-bold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                                                        videoConfig.duration === d
                                                          ? 'bg-slate-900 text-white border-slate-900'
                                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                      )}
                                                    >
                                                      {d === 60 ? '60s' : DURATION_LABELS[d]}
                                                    </button>
                                                  ))}
                                                </div>
                                                <p className="text-[10px] text-slate-400">
                                                  {canUseLongVideos
                                                    ? `${DURATION_LABELS[videoConfig.duration]} — roteiro dividido em cenas encadeadas.`
                                                    : `Limite de ${FREE_MAX_VIDEO_SECONDS}s por vídeo. Durações maiores são exclusivas da administração.`}
                                                </p>
                                              </div>

                                              <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Áudio</label>
                                                <div className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                                  🔊 Narração em Português (PT-BR)
                                                </div>
                                              </div>

                                              <label className="flex items-center justify-between gap-2 cursor-pointer">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Exibir legendas</span>
                                                <input
                                                  type="checkbox"
                                                  checked={videoConfig.subtitles}
                                                  onChange={(e) => setVideoConfig(prev => ({ ...prev, subtitles: e.target.checked }))}
                                                  className="h-4 w-4 accent-slate-900"
                                                />
                                              </label>

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
                                                  generateVideo(videoPromptMatch[1], i, 'PT-BR', videoConfig.image, videoConfig.duration);
                                                }}
                                                className="w-full p-3 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                                              >
                                                CRIAR VÍDEO EDUCACIONAL ({DURATION_LABELS[videoConfig.duration].toUpperCase()})
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
                                    {overlayText && (
                                      <button
                                        onClick={() => setVideoConfig(prev => ({ ...prev, subtitles: !prev.subtitles }))}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        {videoConfig.subtitles ? 'OCULTAR LEGENDA' : 'MOSTRAR LEGENDA'}
                                      </button>
                                    )}
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
                                      generateVideo(videoPromptMatch[1], i, 'PT-BR', videoConfig.image, videoConfig.duration);
                                    } else {
                                      chatInputRef.current?.setInput(`Gere uma nova variação do vídeo sobre: ${displayContent.substring(0, 30)}...`);
                                      chatInputRef.current?.focus();
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
                    ) : <div className="whitespace-pre-wrap">{sanitizeChatText(msg.content)}</div>}
                  </div>
                </div>

                {/* Action Buttons for Assistant Messages */}
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
                      onClick={() => copyToClipboard(sanitizeChatText(msg.content), i)}
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
                      onClick={() => downloadAsPdf(sanitizeChatText(msg.content))}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                    >
                      <FileDown className="h-3.5 w-3.5 text-blue-500" />
                      BAIXAR PDF / DOCX
                    </button>
                    
                    {(msg.content.includes('|') || msg.content.includes('<table>')) && (
                      <button 
                        onClick={() => {
                          chatInputRef.current?.setInput(`Converta as tabelas da resposta anterior em formato CSV/Excel pronto para exportação.`);
                          chatInputRef.current?.focus();
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm bg-white"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-green-500" />
                        EXPORTAR TABELA
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        chatInputRef.current?.setInput(`Reorganize o conteúdo acima em um roteiro estruturado para slides de apresentação.`);
                        chatInputRef.current?.focus();
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

      <ChatInput
        ref={chatInputRef}
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        fullPage={fullPage}
        hideActions={isStudentMode}
        onFileProcess={handleFileUpload}
        isUploading={isUploading}
        onOptimizePrompt={optimizePrompt}
        isOptimizing={isOptimizing}
      />
    </div>
  );
}
