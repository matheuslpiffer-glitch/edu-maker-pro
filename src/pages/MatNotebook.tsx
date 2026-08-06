import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  FileText, 
  Search, 
  MessageSquare, 
  BookOpen, 
  Mic, 
  Sparkles, 
  Send, 
  FileDown, 
  Copy, 
  Check, 
  GraduationCap, 
  Podcast, 
  ClipboardList, 
  BarChart3, 
  Video, 
  Presentation,
  Trash2,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  FileUp,
  ExternalLink,
  BookMarked
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Notebook {
  id: string;
  title: string;
  created_at: string;
}

interface Source {
  id: string;
  title: string;
  type: string;
  is_active: boolean;
}

interface Artifact {
  id: string;
  title: string;
  type: string;
  content: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
}

export default function MatNotebook() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) loadNotebooks();
  }, [user]);

  useEffect(() => {
    if (activeNotebook) {
      loadNotebookContent(activeNotebook.id);
    }
  }, [activeNotebook]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat]);

  const loadNotebooks = async () => {
    const { data, error } = await (supabase
      .from('mat_notebooks' as any)
      .select('*') as any)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setNotebooks(data);
      if (data.length > 0 && !activeNotebook) {
        setActiveNotebook(data[0]);
      }
    }
  };

  const loadNotebookContent = async (id: string) => {
    setLoading(true);
    const [sourcesRes, chatRes, artifactsRes] = await Promise.all([
      (supabase.from('notebook_sources' as any).select('*') as any).eq('notebook_id', id),
      (supabase.from('notebook_chat_messages' as any).select('*') as any).eq('notebook_id', id).order('created_at', { ascending: true }),
      (supabase.from('notebook_artifacts' as any).select('*') as any).eq('notebook_id', id).order('created_at', { ascending: false })
    ]);

    if (sourcesRes.data) setSources(sourcesRes.data as any);
    if (chatRes.data) setChat(chatRes.data as any);
    if (artifactsRes.data) setArtifacts(artifactsRes.data as any);
    setLoading(false);
  };

  const createNotebook = async () => {
    const title = prompt('Nome do Caderno:');
    if (!title) return;

    const { data, error } = await (supabase
      .from('mat_notebooks' as any)
      .insert({ title, user_id: user?.id })
      .select() as any)
      .single();

    if (!error && data) {
      setNotebooks([data as any, ...notebooks]);
      setActiveNotebook(data as any);
      toast({ title: 'Caderno criado!' });
    }
  };

  const deleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir este caderno e tudo dentro dele?')) return;
    
    const { error } = await (supabase.from('mat_notebooks' as any).delete() as any).eq('id', id);
    if (!error) {
      setNotebooks(notebooks.filter(n => n.id !== id));
      if (activeNotebook?.id === id) setActiveNotebook(null);
      toast({ title: 'Caderno removido' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeNotebook) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Logic for upload to storage and text extraction would go here
      // Mocking source insertion:
      await (supabase.from('notebook_sources' as any).insert({
        notebook_id: activeNotebook.id,
        title: file.name,
        type: file.name.split('.').pop() || 'txt',
        is_active: true
      } as any));
    }
    loadNotebookContent(activeNotebook.id);
    setIsUploading(false);
    toast({ title: `${files.length} arquivo(s) carregado(s)` });
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeNotebook || loading) return;

    const userMsg: ChatMsg = { role: 'user', content: input };
    setChat(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Mocking RAG call: In a real app, this would call an Edge Function
      // that uses embeddings and vector search to find relevant context.
      const { data, error } = await supabase.functions.invoke('mat-notebook-ai', {
        body: { 
          notebook_id: activeNotebook.id, 
          message: userMsg.content,
          active_sources: sources.filter(s => s.is_active).map(s => s.id)
        }
      });

      if (error) throw error;
      setChat(prev => [...prev, data]);
      
      // Save to DB
      await (supabase.from('notebook_chat_messages' as any).insert([
        { notebook_id: activeNotebook.id, role: 'user', content: userMsg.content },
        { notebook_id: activeNotebook.id, role: 'assistant', content: data.content, citations: data.citations }
      ] as any));
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao processar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateArtifact = async (type: string, title: string) => {
    if (!activeNotebook || loading) return;
    setLoading(true);
    toast({ title: `Gerando ${title}...` });

    try {
      const { data, error } = await supabase.functions.invoke('mat-notebook-studio', {
        body: { notebook_id: activeNotebook.id, type }
      });

      if (error) throw error;
      
      const newArtifact = {
        notebook_id: activeNotebook.id,
        title: `${title} - ${new Date().toLocaleDateString()}`,
        type,
        content: data.content
      };

      const { data: saved, error: saveErr } = await (supabase
        .from('notebook_artifacts' as any)
        .insert(newArtifact as any)
        .select() as any)
        .single();

      if (!saveErr && saved) {
        setArtifacts([saved, ...artifacts]);
        toast({ title: `${title} gerado com sucesso!` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro na geração', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0c0a1d]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <BookMarked className="text-violet-400" size={24} />
          <h1 className="text-xl font-black text-white tracking-tight">Mat Notebook</h1>
          <div className="h-6 w-[1px] bg-white/10 mx-2" />
          <div className="flex items-center gap-2">
            {notebooks.map(n => (
              <Badge 
                key={n.id}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all px-3 py-1 border-white/10 hover:bg-white/5",
                  activeNotebook?.id === n.id ? "bg-violet-500/20 text-violet-300 border-violet-500/50" : "text-slate-400"
                )}
                onClick={() => setActiveNotebook(n)}
              >
                {n.title}
                <X 
                  size={12} 
                  className="ml-2 hover:text-red-400" 
                  onClick={(e) => deleteNotebook(n.id, e)}
                />
              </Badge>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 rounded-full border border-white/10 text-slate-400 hover:text-white"
              onClick={createNotebook}
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </div>

      {!activeNotebook ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
          <Brain size={64} className="opacity-20" />
          <p className="font-medium text-lg italic">Selecione ou crie um Caderno do Mat para começar</p>
          <Button onClick={createNotebook} variant="outline" className="border-violet-500/30 text-violet-300">
            Criar Primeiro Caderno
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* COL 1: SOURCES */}
          <div className="w-80 border-r border-white/5 flex flex-col bg-slate-900/30">
            <div className="p-4 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Fontes ({sources.length})</h2>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 px-2 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={16} className="mr-1" /> Add
              </Button>
              <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sources.map(source => (
                  <div 
                    key={source.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <Checkbox checked={source.is_active} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{source.title}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{source.type}</p>
                    </div>
                    <FileText size={14} className="text-slate-600 group-hover:text-slate-400" />
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-white/5 bg-slate-900/50">
              <div className="text-[10px] font-medium text-slate-500 mb-2">PROGRESSO DE PROCESSAMENTO</div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1">
                <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: '100%' }} />
              </div>
              <p className="text-[10px] text-slate-600">Todos os documentos indexados (RAG)</p>
            </div>
          </div>

          {/* COL 2: CHAT */}
          <div className="flex-1 flex flex-col bg-slate-950/20">
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              <div className="max-w-3xl mx-auto space-y-6">
                {chat.length === 0 && (
                  <div className="py-12 text-center space-y-4">
                    <div className="h-16 w-16 rounded-3xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
                      <Sparkles className="text-violet-400" size={32} />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight">Caderno - {activeNotebook.title}</h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">
                      Faça perguntas baseadas estritamente nas suas fontes. O Mat usará citações reais dos seus documentos.
                    </p>
                  </div>
                )}
                
                {chat.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-violet-600 text-white font-medium" 
                        : "bg-slate-800/80 border border-white/5 text-slate-200"
                    )}>
                      {msg.content}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-2">
                          {msg.citations.map((c: any, idx: number) => (
                            <TooltipProvider key={idx}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[10px] font-bold text-violet-400 cursor-help hover:text-violet-300">[{idx + 1}]</span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 border-white/10 text-xs max-w-xs">
                                  {c.text}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-3 text-slate-500 text-xs italic">
                    <Loader2 size={14} className="animate-spin" />
                    Consultando fontes...
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-6 bg-gradient-to-t from-[#0c0a1d] to-transparent">
              <div className="max-w-3xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition-opacity" />
                <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl flex items-end gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 rounded-xl hover:text-violet-400">
                    <Plus size={20} />
                  </Button>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Faça uma pergunta sobre suas fontes..."
                    className="flex-1 bg-transparent border-0 outline-none text-sm text-white px-2 py-3 resize-none min-h-[44px] max-h-[200px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <div className="flex items-center gap-1 mb-1 mr-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 rounded-lg hover:text-blue-400">
                      <Mic size={16} />
                    </Button>
                    <Button 
                      onClick={sendMessage}
                      disabled={!input.trim() || loading}
                      className="h-8 w-8 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-all shadow-lg"
                    >
                      <Send size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COL 3: ARTEFACTS */}
          <div className="w-80 border-l border-white/5 flex flex-col bg-slate-900/30">
            <Tabs defaultValue="studio" className="flex-1 flex flex-col">
              <div className="px-4 py-3 border-b border-white/5">
                <TabsList className="bg-slate-950/50 p-1 w-full border border-white/5 rounded-xl">
                  <TabsTrigger value="studio" className="flex-1 text-[10px] font-black uppercase">Studio</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1 text-[10px] font-black uppercase">Notas ({artifacts.length})</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="studio" className="flex-1 p-4 space-y-4 m-0">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Criação Rápida</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'summary', title: 'Estudo', icon: GraduationCap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { type: 'podcast', title: 'Podcast', icon: Podcast, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    { type: 'exam', title: 'Provas', icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { type: 'bncc', title: 'BNCC', icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { type: 'script', title: 'Vídeo', icon: Video, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                    { type: 'slides', title: 'Slides', icon: Presentation, color: 'text-cyan-400', bg: 'bg-cyan-500/10' }
                  ].map(tool => (
                    <button
                      key={tool.type}
                      onClick={() => generateArtifact(tool.type, tool.title)}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                    >
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-2 shadow-lg", tool.bg)}>
                        <tool.icon size={20} className={tool.color} />
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-tight">{tool.title}</span>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="flex-1 overflow-y-auto m-0">
                <div className="p-4 space-y-3">
                  {artifacts.map(artifact => (
                    <Card key={artifact.id} className="bg-slate-900 border-white/5 hover:border-violet-500/30 transition-all group cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-xs font-bold text-white leading-tight truncate mr-2">{artifact.title}</h4>
                          <Badge variant="outline" className="text-[8px] uppercase font-black tracking-widest px-1 py-0">{artifact.type}</Badge>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-3 mb-4 leading-relaxed">
                          {artifact.content}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-white hover:bg-white/5">
                            <Copy size={12} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-white hover:bg-white/5">
                            <FileDown size={12} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
