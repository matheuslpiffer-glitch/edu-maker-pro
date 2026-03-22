import { useState } from 'react';
import { SERIES_CATEGORIAS } from '@/lib/series-data';
import { useSavedQuestionsBank } from '@/hooks/useSavedQuestionsBank';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Puzzle, Grid3X3, Search, Brain, Layers, CheckCircle2 } from 'lucide-react';
import PdfToolbar from '@/components/PdfToolbar';

interface GameQuestion {
  content: string;
  options: any[];
  skillCode?: string;
  descriptor?: string;
}

const GAME_TYPES = [
  { id: 'cruzadinha', label: 'Cruzadinha Temática', icon: Grid3X3, desc: 'Palavras cruzadas com dicas pedagógicas' },
  { id: 'caca_palavras', label: 'Caça-Palavras', icon: Search, desc: 'Encontre termos-chave em uma grade de letras' },
  { id: 'sudoku', label: 'Sudoku Educativo', icon: Layers, desc: 'Sudoku com conceitos no lugar de números' },
  { id: 'memoria', label: 'Jogo da Memória', icon: Brain, desc: 'Pares de conceito/definição para memorização' },
];

const SERIES_CATEGORIAS = [
  {
    label: '🌈 Educação Infantil',
    series: [
      { id: 'mini_maternal', label: 'Mini Maternal' },
      { id: 'maternal', label: 'Maternal' },
      { id: 'jardim_1', label: 'Jardim I' },
      { id: 'jardim_2', label: 'Jardim II' },
      { id: 'pre', label: 'Pré-Escola' },
    ],
  },
  {
    label: '📗 Ensino Fundamental I',
    series: [
      { id: 'ano_1', label: '1º Ano' },
      { id: 'ano_2', label: '2º Ano' },
      { id: 'ano_3', label: '3º Ano' },
      { id: 'ano_4', label: '4º Ano' },
      { id: 'ano_5', label: '5º Ano' },
    ],
  },
  {
    label: '📘 Ensino Fundamental II',
    series: [
      { id: 'ano_6', label: '6º Ano' },
      { id: 'ano_7', label: '7º Ano' },
      { id: 'ano_8', label: '8º Ano' },
      { id: 'ano_9', label: '9º Ano' },
    ],
  },
  {
    label: '🎓 Ensino Médio & Técnico',
    series: [
      { id: 'serie_1', label: '1ª Série EM' },
      { id: 'serie_2', label: '2ª Série EM' },
      { id: 'serie_3', label: '3ª Série EM' },
      { id: 'tecnico', label: 'Curso Técnico' },
      { id: 'etec', label: 'ETEC / COTUCA' },
    ],
  },
];

export default function GameFactory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addQuestions: addToBank } = useSavedQuestionsBank();

  const [gameType, setGameType] = useState('cruzadinha');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [activeSerie, setActiveSerie] = useState('ano_6');
  const [includeImages, setIncludeImages] = useState(false);
  const [wordCount, setWordCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GameQuestion[]>([]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Informe o tema do jogo.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setResult([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-simulator-questions', {
        body: {
          isJogos: true,
          gameType,
          specificTopic: topic,
          customMaterial: context.trim() || undefined,
          serie: activeSerie,
          includeImages,
          count: wordCount,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.questions) {
        setResult(data.questions);
        // Auto-save to bank
        addToBank(data.questions.map((q: any, i: number) => ({
          id: `jogo-${Date.now()}-${i}`,
          banca: 'Jogos',
          tema: topic || 'Jogo Educativo',
          conteudo: q.content,
          tipo: GAME_TYPES.find(g => g.id === gameType)?.label || gameType,
          options: q.options,
          dataCriacao: new Date().toISOString(),
        })));
        toast({ title: `🎮 Jogo gerado com sucesso!` });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao gerar jogo', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="relative max-w-[1600px] mx-auto overflow-x-hidden bg-slate-50 min-h-screen -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 no-print">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Puzzle className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Gamificação Educacional</p>
          <h1 className="text-2xl font-bold text-slate-900">Fábrica de Jogos</h1>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-4 sm:p-6 no-print">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left: Config */}
          <div className="w-full xl:w-[600px] xl:shrink-0 space-y-6">

            {/* Step 1: Game Type */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">1</div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Tipo de Jogo</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GAME_TYPES.map(g => {
                  const Icon = g.icon;
                  const isSelected = gameType === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGameType(g.id)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col gap-2 min-h-[100px] ${
                        isSelected
                          ? 'bg-violet-50 border-violet-600 shadow-md shadow-violet-500/10'
                          : 'bg-slate-50 border-transparent hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="absolute top-2.5 right-2.5 h-5 w-5 text-violet-600" />}
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-violet-600' : 'text-slate-400'}`} />
                      <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-violet-700' : 'text-slate-600'}`}>{g.label}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{g.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Grade Level */}
            <div className="border-t border-slate-100" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Série / Ano Escolar</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {SERIES_CATEGORIAS.map(cat => (
                  <div key={cat.label}>
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 mb-2">{cat.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.series.map(s => {
                        const isSelected = activeSerie === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setActiveSerie(s.id)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                              isSelected
                                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Topic & Config */}
            <div className="border-t border-slate-100" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Configuração do Conteúdo</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500">Tema / Assunto</Label>
                  <Input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="Ex: Sistema Solar, Revolução Francesa..."
                    className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-violet-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500">
                    {gameType === 'caca_palavras' || gameType === 'cruzadinha' ? 'Nº de Palavras' : 'Nº de Pares/Itens'}
                  </Label>
                  <Input
                    type="number"
                    min={4}
                    max={20}
                    value={wordCount}
                    onChange={e => setWordCount(+e.target.value)}
                    className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-violet-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500">Contexto / Material de Apoio (Opcional)</Label>
                <Textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="Cole aqui o conteúdo da apostila ou texto de referência..."
                  className="bg-slate-50 border-slate-200 rounded-2xl min-h-[80px] focus:ring-4 focus:ring-violet-500/20"
                />
              </div>

              {/* Image Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-violet-50 border border-violet-200">
                <div className="flex-1 mr-4">
                  <Label className="text-sm font-bold text-violet-700 cursor-pointer">Incluir Figuras / Ilustrações</Label>
                  <p className="text-[10px] text-violet-500 mt-0.5">(A IA irá gerar ou buscar pictogramas e imagens didáticas. Altamente recomendado para Infantil e Fund 1)</p>
                </div>
                <Switch
                  checked={includeImages}
                  onCheckedChange={setIncludeImages}
                  className="data-[state=checked]:bg-violet-600"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                size="lg"
                className="w-full rounded-[20px] text-white shadow-lg transition-all bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-500/20"
              >
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {generating ? 'Gerando jogo...' : `GERAR ${GAME_TYPES.find(g => g.id === gameType)?.label?.toUpperCase()}`}
              </Button>
            </div>

            {generating && (
              <div className="mt-4 flex flex-col items-center gap-3 py-6 animate-pulse">
                <div className="relative">
                  <Puzzle className="h-12 w-12 text-violet-500 animate-bounce" />
                  <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-1 animate-ping" />
                </div>
                <p className="text-sm font-medium text-slate-500 text-center">Criando jogo educativo...</p>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          {result.length > 0 && (
            <div className="flex-1 min-w-0">
              <Card className="sticky top-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Puzzle className="h-5 w-5 text-violet-500" />
                      Resultado
                    </CardTitle>
                    <PdfToolbar filename={`jogo-${topic || 'educativo'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div id="pdf-preview-container" className="space-y-4 bg-white p-6 rounded-xl">
                    {result.map((q, i) => (
                      <div key={i} className="border rounded-2xl p-4 bg-white print-no-break">
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: (q.content || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
