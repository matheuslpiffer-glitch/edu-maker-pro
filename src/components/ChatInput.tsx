import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  useCallback,
  type ReactNode,
} from 'react';
import {
  Plus,
  Search,
  Send,
  Mic,
  X,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Loader2,
  Wand2,
  Globe,
  Presentation,
} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ChatAction {
  id: string;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  text: string;
}

export interface ChatInputPayload {
  /** The visible text the user typed. */
  text: string;
  /** The id of the selected action chip (e.g. "pei"), or null. */
  action: string | null;
  /** Image files held as attachments for vision. Documents are processed
   *  immediately via `onFileProcess` and are NOT included here. */
  files: File[];
  /** Whether the web-search toggle is on. */
  webSearch: boolean;
}

export interface ChatInputHandle {
  /** Programmatically set the input text (e.g. quick-action buttons). */
  setInput: (text: string) => void;
  /** Focus the textarea. */
  focus: () => void;
  /** Clear text, chips, attachments and search toggle. */
  reset: () => void;
}

export interface ChatInputProps {
  /** Called when the user sends a message. */
  onSendMessage: (payload: ChatInputPayload) => void;
  /** Disable the whole composer (e.g. while AI is streaming). */
  disabled?: boolean;
  /** Placeholder for the textarea. */
  placeholder?: string;
  /** Action menu entries. Defaults to the pedagogical MAT_ACTIONS set. */
  actions?: ChatAction[];
  /** Hide the pedagogical action menu (student mode). */
  hideActions?: boolean;
  /** Immediate handler for non-image documents (PDF/DOCX/CSV/XLSX). */
  onFileProcess?: (file: File) => void;
  /** True while a document is being processed upstream. */
  isUploading?: boolean;
  /** Click handler for the ✨ prompt-optimization button. Receives the current text. */
  onOptimizePrompt?: (text: string) => void;
  isOptimizing?: boolean;
  /** Wider spacing/centering for the full-page chat layout. */
  fullPage?: boolean;
  /** Extra className on the root wrapper. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Default actions (EduCreator pedagogical templates)                 */
/* ------------------------------------------------------------------ */

export const MAT_ACTIONS: ChatAction[] = [
  { id: 'resumir', label: 'Resumir Documento', category: 'Ações Rámpidas', icon: FileText, color: 'text-blue-500', text: 'Resuma este documento focando nos pontos pedagógicos e objetivos de aprendizagem.' },
  { id: 'melhorar', label: 'Melhore este Texto', category: 'Ações Rámpidas', icon: Wand2, color: 'text-amber-500', text: 'Melhore este texto pedagógico, tornando-o mais claro, formal e alinhado com a BNCC.' },
  { id: 'gabarito', label: 'Corrigir/Gabaritar Prova', category: 'Pedagógico', icon: FileText, color: 'text-emerald-500', text: 'Analise esta prova e forneça o gabarito comentado com nível de dificuldade e habilidades.' },
  { id: 'video', label: 'Criar Vídeo Educacional (10s)', category: 'Mídia', icon: FileText, color: 'text-rose-500', text: 'Planeje um vídeo educacional cinematográfico de 10 segundos em Português (PT-BR), com narração e legenda em PT-BR. Me peça o tema e a imagem de referência opcional.' },
  { id: 'planilha', label: 'Diagnóstico de Planilha', category: 'Gestão', icon: FileSpreadsheet, color: 'text-green-600', text: 'Analise esta planilha de notas/frequência e gere um relatório institucional com: identificação de alunos em risco, habilidades da BNCC com defasagem e sugestão de plano de recomposição de aprendizagem.' },
  { id: 'pei', label: 'Gerar PEI / Adaptação', category: 'Pedagógico', icon: FileText, color: 'text-indigo-500', text: 'Elabore e adapte este conteúdo para o Plano de Desenvolvimento Individualizado (PEI) em 3 níveis de suporte pedagógico (Alto, Médio e Autonomia) focando em acessibilidade.' },
  { id: 'infografico', label: 'Criar Folder Ilustrativo', category: 'Mídia', icon: Presentation, color: 'text-cyan-500', text: 'Crie um infográfico/folder ilustrativo passo a passo sobre este tema, com títulos em CAIXA ALTA, ícones pedagógicos e dicas práticas.' },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

interface Attachment {
  file: File;
  preview: string;
  kind: 'image' | 'document';
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const autoGrow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>((props, ref) => {
  const {
    onSendMessage,
    disabled = false,
    placeholder = 'Pergunte ao Mat... (ou digite /)',
    actions = MAT_ACTIONS,
    hideActions = false,
    onFileProcess,
    isUploading = false,
    onOptimizePrompt,
    isOptimizing = false,
    fullPage = false,
    className,
  } = props;
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeChip, setActiveChip] = useState<ChatAction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  /* ----- imperative handle --------------------------------------- */
  useImperativeHandle(
    ref,
    () => ({
      setInput: (text: string) => {
        setInput(text);
        requestAnimationFrame(() => autoGrow(inputRef.current));
      },
      focus: () => inputRef.current?.focus(),
      reset: () => {
        setInput('');
        setAttachments([]);
        setActiveChip(null);
        setWebSearch(false);
        if (inputRef.current) inputRef.current.style.height = 'auto';
      },
    }),
    [],
  );

  /* ----- speech recognition -------------------------------------- */
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let interim = '';
      let finalT = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalT += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (finalT || interim) {
        setInput((prev) => prev + (finalT || interim));
        requestAnimationFrame(() => autoGrow(inputRef.current));
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }
    if (isListening) recognitionRef.current.stop();
    else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, [isListening]);

  /* ----- file handling ------------------------------------------- */
  const addFile = useCallback(
    async (file: File) => {
      if (file.type.startsWith('image/')) {
        const preview = await fileToDataUrl(file);
        setAttachments((prev) => [...prev, { file, preview, kind: 'image' }]);
      } else {
        // Documents / spreadsheets are processed immediately upstream.
        onFileProcess?.(file);
      }
    },
    [onFileProcess],
  );

  const openFilePicker = (accept: string) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) await addFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    fileInputRef.current.click();
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-slate-100');
    const file = e.dataTransfer.files?.[0];
    if (file) await addFile(file);
  };

  /* ----- send ---------------------------------------------------- */
  const canSend = !disabled && (input.trim() !== '' || attachments.length > 0 || !!activeChip);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const text = input.trim();
    const files = attachments.map((a) => a.file);
    onSendMessage({
      text,
      action: activeChip?.id ?? null,
      files,
      webSearch,
    });
    setInput('');
    setAttachments([]);
    setActiveChip(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }, [canSend, input, attachments, activeChip, webSearch, onSendMessage]);

  /* ----- filtering ----------------------------------------------- */
  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(actionSearch.toLowerCase()),
  );

  return (
    <div className={cn('bg-white border-t border-slate-100', fullPage ? 'px-4 sm:px-8 py-4' : 'px-6 py-4', className)}>
      <div className={cn(fullPage && 'mx-auto w-full max-w-3xl')}>
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
        onDrop={onDrop}
      >
        <input type="file" ref={fileInputRef} className="hidden" />

        {/* Chips & previews */}
        {(activeChip || attachments.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
            {activeChip && (
              <div className="flex items-center gap-1.5 bg-slate-200/80 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-300">
                <activeChip.icon className={cn('h-3.5 w-3.5', activeChip.color)} />
                <span>{activeChip.label}</span>
                <button type="button" onClick={() => setActiveChip(null)} className="ml-1 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {attachments.map((att, i) => (
              <div key={i} className="relative group">
                {att.kind === 'image' ? (
                  <img
                    src={att.preview}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-lg border border-slate-200">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="max-w-[120px] truncate">{att.file.name}</span>
                  </div>
                )}
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 bg-white text-slate-900 rounded-full p-1 shadow-md border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <Plus className="h-3 w-3 rotate-45" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Composer row */}
        <div className="relative flex items-end gap-2 w-full">
          {/* Plus / actions popover */}
          {!hideActions && (
            <Popover.Root
              open={menuOpen}
              onOpenChange={(o) => {
                setMenuOpen(o);
                if (!o) setActionSearch('');
              }}
            >
              <Popover.Trigger asChild>
                <button
                  disabled={disabled || isUploading}
                  className={cn(
                    'mb-1 h-8 w-8 rounded-lg flex items-center justify-center transition-all shrink-0 border border-slate-200',
                    menuOpen
                      ? 'bg-slate-200 text-slate-900 rotate-45'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900',
                  )}
                  title="Anexar arquivos"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-50 w-72 max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-2 animate-in fade-in zoom-in duration-200"
                  sideOffset={8}
                  align="start"
                >
                  <div className="relative mb-2">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={actionSearch}
                      onChange={(e) => setActionSearch(e.target.value)}
                      placeholder="Buscar ação ou recurso..."
                      className="w-full bg-slate-50 text-sm text-slate-700 pl-9 pr-3 py-1.5 rounded-xl outline-none border border-slate-100 focus:border-slate-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1 pb-2 mb-2 border-b border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                      Criar & Analisar
                    </div>
                    {filteredActions.map((action) => (
                      <Popover.Close asChild key={action.id}>
                        <button
                          onClick={() => {
                            setActiveChip(action);
                            setInput((prev) => (prev.trim() === '/' ? '' : prev));
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
                        >
                          <action.icon className={cn('h-4 w-4 shrink-0', action.color)} />
                          <span>{action.label}</span>
                        </button>
                      </Popover.Close>
                    ))}
                    {filteredActions.length === 0 && (
                      <div className="text-xs text-slate-400 px-3 py-2 text-center">
                        Nenhuma ação encontrada
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => openFilePicker('.png,.jpg,.jpeg,.webp')}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <ImageIcon className="h-4 w-4 text-blue-500" />
                      <span>🖼️ Anexar Imagem</span>
                    </button>
                    <button
                      onClick={() => openFilePicker('.pdf,.docx,.txt')}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <FileText className="h-4 w-4 text-orange-500" />
                      <span>📄 Enviar Documento (PDF...)</span>
                    </button>
                    <button
                      onClick={() => openFilePicker('.csv,.xlsx')}
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
          )}

          {isUploading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 mb-2 ml-1" />}

          {/* Textarea */}
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              const val = e.target.value;
              setInput(val);
              if (val === '/') {
                setMenuOpen(true);
              }
              autoGrow(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 max-h-[160px] min-h-[40px] bg-transparent border-none focus:ring-0 text-slate-900 text-sm placeholder:text-slate-400 resize-none py-2.5 scrollbar-none"
          />

          <div className="flex items-center gap-1.5 mb-1 shrink-0">
             {onOptimizePrompt && (
                <button
                  type="button"
                  onClick={() => onOptimizePrompt(input)}
                  disabled={disabled || isOptimizing || !input.trim()}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center rounded-lg transition-all border border-slate-200",
                    isOptimizing 
                      ? "bg-slate-100 text-slate-400" 
                      : "bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                  )}
                  title="Otimizar prompt pedagógico ✨"
                >
                  {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4.5 w-4.5" />}
                </button>
              )}

            <button
              type="button"
              onClick={() => setWebSearch(!webSearch)}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg transition-all border shrink-0',
                webSearch
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
              )}
              title="Pesquisa na Web"
            >
              <Globe className="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg transition-all border shrink-0',
                isListening
                  ? 'bg-red-500 border-red-500 text-white animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
              )}
              title="Falar com Mat"
            >
              <Mic className="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg transition-all shrink-0',
                canSend
                  ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed',
              )}
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
      
      {!fullPage && (
        <p className="mt-2 text-[10px] text-slate-400 text-center font-medium uppercase tracking-widest">
          Piffer EduTech — Inteligência Evolutiva
        </p>
      )}
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;
