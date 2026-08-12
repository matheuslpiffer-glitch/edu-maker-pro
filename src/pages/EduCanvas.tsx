import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sanitizeChatText } from '@/lib/chat-sanitize';
import ChatInput, { type ChatInputPayload } from '@/components/ChatInput';
import { FileText, Sliders, Sparkles, Check, Printer, Copy, ChevronRight, FileDown, Video, Loader2 } from 'lucide-react';

interface CanvasMessage {
  id: number;
  sender: 'ai' | 'user';
  text: string;
  action?: string | null;
  files?: File[];
}

interface CanvasSection {
  id: string;
  title: string;
  content: string;
}

export default function EduCanvasLayout() {
  const { 
    canvasMessages: messages, 
    setCanvasMessages: setMessages,
    canvasDocument,
    setCanvasDocument,
    isCanvasOpen,
    setIsCanvasOpen
  } = useChat();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync canvas state with URL
  useEffect(() => {
    const canvasParam = searchParams.get('canvas');
    if (canvasParam === 'open' && !isCanvasOpen) {
      setIsCanvasOpen(true);
    } else if (canvasParam === 'closed' && isCanvasOpen) {
      setIsCanvasOpen(false);
    }
  }, [searchParams]);

  useEffect(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('canvas', isCanvasOpen ? 'open' : 'closed');
      return newParams;
    }, { replace: true });
  }, [isCanvasOpen, setSearchParams]);

  const handleSendMessage = (payload: ChatInputPayload) => {
    const userMsg: CanvasMessage = {
      id: Date.now(),
      sender: 'user',
      text: payload.text,
      action: payload.action,
      files: payload.files,
    };

    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const aiMsg: CanvasMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: 'Documento gerado e carregado no Canvas Interativo ao lado. Você pode ajustar o nível de complexidade ou editar os blocos diretamente.',
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsCanvasOpen(true);
    }, 800);
  };

  const handleLevelChange = (newLevel: number) => {
    setCanvasDocument((prev) => ({ ...prev, difficultyLevel: newLevel }));
    
    // Trigger automatic re-evaluation of the document level
    handleSendMessage({
      text: `Revisão de Nível: ajuste todo o documento para o Nível ${newLevel}.`,
      action: 'revisao_nivel',
      files: [],
      webSearch: false
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden">
      {/* Chat */}
      <div
        className={`flex flex-col h-full transition-all duration-300 ${
          isCanvasOpen ? 'w-5/12 border-r border-slate-200' : 'w-full max-w-4xl mx-auto'
        }`}
      >
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <h1 className="font-bold text-slate-800 text-lg">Piffer EduTech</h1>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              IA Pedagógica
            </span>
          </div>
          {!isCanvasOpen && (
            <button
              onClick={() => setIsCanvasOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Abrir Canvas</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none'
                }`}
              >
                <div className="prose prose-sm max-w-none prose-slate">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      video: ({node, ...props}) => {
                        const isPlaceholder = props.src === 'VIDEO_MEDIA';
                        return (
                          <div className="my-4 rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-black aspect-video flex flex-col relative">
                            {isPlaceholder ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white p-6 text-center bg-slate-900">
                                  <Loader2 className="w-12 h-12 mb-4 text-indigo-400 animate-spin" />
                                  <h4 className="text-sm font-bold mb-1">Processando Mídia Visual</h4>
                                  <p className="text-[10px] text-slate-400">Gerando cenas e áudio para vídeo de até 60s (01:00)...</p>
                                </div>
                            ) : (
                              <video 
                                controls 
                                className="w-full h-full object-contain" 
                                src={props.src}
                                key={props.src}
                              />
                            )}
                            <div className="bg-slate-900 p-3 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EduCreator VideoLab</span>
                              {!isPlaceholder && (
                                <a 
                                  href={props.src as string} 
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
                    {sanitizeChatText(msg.text)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border-t border-slate-200">
          <ChatInput onSendMessage={handleSendMessage} />
        </div>
      </div>

      {/* Canvas */}
      {isCanvasOpen && (
        <div className="w-7/12 h-full bg-slate-200/60 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-slate-700 text-sm">Editor ao Vivo</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Sliders className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Nível:</span>
              <div className="flex gap-1">
                {[
                  { level: 1, label: 'Essencial' },
                  { level: 2, label: 'Padrão' },
                  { level: 3, label: 'Desafio' },
                ].map((item) => (
                  <button
                    key={item.level}
                    onClick={() => handleLevelChange(item.level)}
                    className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-all ${
                      canvasDocument.difficultyLevel === item.level
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => window.print()}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Imprimir / Gerar PDF com Cabeçalho Institucional"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${canvasDocument.title}\n${canvasDocument.subtitle}\n\n` +
                      canvasDocument.sections.map((s) => `${s.title}\n${s.content}`).join('\n\n'),
                  )
                }
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Copiar Conteúdo"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsCanvasOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg ml-2"
                title="Fechar Canvas"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 flex justify-center">
            <div className="w-full max-w-2xl bg-white min-h-[800px] rounded-xl shadow-lg border border-slate-200/80 p-10 flex flex-col justify-between transition-all">
              <div>
                <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{canvasDocument.title}</h2>
                    <p className="text-xs text-slate-500 font-medium">{canvasDocument.subtitle}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                    Ajustado:{' '}
                    {canvasDocument.difficultyLevel === 1
                      ? 'Nível Essencial'
                      : canvasDocument.difficultyLevel === 2
                        ? 'Nível Padrão'
                        : 'Nível Desafio'}
                  </span>
                </div>

                <div className="space-y-6">
                  {canvasDocument.sections.map((section) => (
                    <div
                      key={section.id}
                      className="group relative p-3 rounded-xl hover:bg-slate-50/80 border border-transparent hover:border-slate-200 transition-all"
                    >
                      <h3 className="text-sm font-bold text-slate-800 mb-1.5">{section.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-md p-1">
                        {section.content}
                      </p>

                      <button
                        className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 bg-white border border-slate-200 shadow-sm rounded-lg px-2 py-1 text-[11px] font-medium text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 transition-all"
                        onClick={() =>
                          handleSendMessage({
                            text: `Refine o bloco "${section.title}" mantendo o nível atual de complexidade.`,
                            action: null,
                            files: [],
                            webSearch: false,
                          })
                        }
                      >
                        <Sparkles className="w-3 h-3" />
                        Refinar este bloco
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6 mt-8 flex items-center justify-between">
                <div className="text-xs text-slate-400">Sincronizado com a nuvem</div>
                <button className="flex items-center gap-2 bg-slate-900 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-md">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Enviar para o Diário de Classe (EduFlow)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}