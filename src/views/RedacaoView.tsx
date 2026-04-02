import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Sparkles, Loader2, Printer, Search, FolderOpen, Calendar, CheckCircle2, PenLine, BookOpen, GraduationCap, Globe, FileText, Rocket, Copy, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EssaySheet from '@/components/EssaySheet';
import QRCodeModal from '@/components/QRCodeModal';
import { buildPublicAppUrl } from '@/lib/public-links';
import { cn } from '@/lib/utils';

interface TextoMotivador {
  tipo: string;
  conteudo: string;
}

interface Proposta {
  tema: string;
  area?: string;
  textos_motivadores: TextoMotivador[];
  comando: string;
}

interface SavedTheme {
  id: string;
  tema: string;
  area: string;
  textos_motivadores: TextoMotivador[];
  comando: string;
  usage_count: number;
  created_at: string;
}

const AREA_COLORS: Record<string, string> = {
  Social: 'bg-indigo-100 text-indigo-700',
  Ambiental: 'bg-cyan-100 text-cyan-700',
  Tecnológica: 'bg-fuchsia-100 text-fuchsia-700',
  Saúde: 'bg-rose-100 text-rose-700',
  Educação: 'bg-amber-100 text-amber-700',
  Cultural: 'bg-pink-100 text-pink-700',
  Econômica: 'bg-sky-100 text-sky-700',
};

const BANCAS = [
  { id: 'enem', label: 'ENEM', desc: '5 Competências', icon: GraduationCap, gradient: 'from-indigo-600 to-blue-600' },
  { id: 'unicamp', label: 'UNICAMP', desc: 'Múltiplos Gêneros', icon: BookOpen, gradient: 'from-violet-600 to-purple-600' },
  { id: 'fuvest', label: 'FUVEST', desc: 'Dissertativa Clássica', icon: FileText, gradient: 'from-cyan-600 to-blue-600' },
  { id: 'vunesp', label: 'VUNESP', desc: 'Texto Dissertativo', icon: Globe, gradient: 'from-fuchsia-600 to-pink-600' },
];

const GENEROS = [
  { id: 'dissertacao', label: 'Dissertação Argumentativa' },
  { id: 'carta', label: 'Carta' },
  { id: 'artigo', label: 'Artigo de Opinião' },
  { id: 'cronica', label: 'Crônica' },
  { id: 'manifesto', label: 'Manifesto' },
];

export default function RedacaoView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);
  const [selectedBanca, setSelectedBanca] = useState('');
  const [selectedGenero, setSelectedGenero] = useState('');
  const [tema, setTema] = useState('');
  const [dadosBrutos, setDadosBrutos] = useState('');
  const [lineCount, setLineCount] = useState(30);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'used'>('recent');
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [sendingToLab, setSendingToLab] = useState(false);
  const [labLink, setLabLink] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => { loadThemes(); }, []);

  const loadThemes = async () => {
    const { data } = await supabase
      .from('essay_themes')
      .select('*')
      .order('created_at', { ascending: false });
    setSavedThemes((data as unknown as SavedTheme[]) || []);
    setLoadingThemes(false);
  };

  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-essay', {
        body: {
          genero: selectedGenero,
          tema,
          nivel: 'Ensino Médio',
          banca: selectedBanca,
          dadosBrutos: dadosBrutos.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const p = data as Proposta;
      setProposta(p);

      await supabase.from('essay_themes').insert({
        user_id: user.id,
        tema: p.tema,
        area: p.area || 'Social',
        textos_motivadores: p.textos_motivadores as any,
        comando: p.comando,
      });
      await loadThemes();
      toast({ title: 'Proposta gerada e salva!' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar proposta', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTheme = async (theme: SavedTheme) => {
    setProposta({
      tema: theme.tema,
      area: theme.area,
      textos_motivadores: theme.textos_motivadores,
      comando: theme.comando,
    });
    await supabase
      .from('essay_themes')
      .update({ usage_count: theme.usage_count + 1 })
      .eq('id', theme.id);
    setSavedThemes(prev =>
      prev.map(t => t.id === theme.id ? { ...t, usage_count: t.usage_count + 1 } : t)
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({ title: 'Tema carregado! Ajuste as linhas e imprima.' });
  };

  const handlePrint = () => window.print();

  const handleSendToLab = async () => {
    if (!user || !proposta) return;
    setSendingToLab(true);
    try {
      const bancaId = selectedBanca.toUpperCase() || 'ENEM';
      const { data, error } = await supabase
        .from('essay_submissions')
        .insert({
          teacher_user_id: user.id,
          proposal_theme: proposta.tema,
          banca: bancaId,
          proposal_content: {
            textos_motivadores: proposta.textos_motivadores,
            comando: proposta.comando,
            area: proposta.area,
          },
        } as any)
        .select()
        .single();
      if (error) throw error;
      const code = (data as any).access_code;
      const url = buildPublicAppUrl(`/redacao-online/${code}`);
      setLabLink(url);
      toast({ title: '🚀 Proposta enviada ao Laboratório!', description: `Código: ${code}` });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSendingToLab(false);
    }
  };

  const filteredThemes = savedThemes
    .filter(t => !searchQuery || t.tema.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'used') return b.usage_count - a.usage_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const canAdvanceStep2 = !!selectedBanca;
  const canAdvanceStep3 = !!selectedGenero;
  const canGenerate = !!tema.trim();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6 no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Estúdio de Redação Elite</h1>
          <p className="text-xs text-muted-foreground">Gere propostas de redação com IA para as principais bancas</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6 no-print">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s === 1) setStep(1);
                else if (s === 2 && canAdvanceStep2) setStep(2);
                else if (s === 3 && canAdvanceStep2 && canAdvanceStep3) setStep(3);
              }}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all',
                step >= s
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {step > s ? <CheckCircle2 size={16} /> : s}
            </button>
            <span className={cn('text-xs font-medium hidden sm:inline', step >= s ? 'text-foreground' : 'text-muted-foreground')}>
              {s === 1 ? 'Banca' : s === 2 ? 'Gênero' : 'Tema'}
            </span>
            {s < 3 && <div className={cn('w-8 h-0.5 rounded-full', step > s ? 'bg-indigo-500' : 'bg-muted')} />}
          </div>
        ))}
      </div>

      {/* Step 1: Banca */}
      {step === 1 && (
        <div className="space-y-4 no-print">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Passo 1 — Selecione a Banca</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BANCAS.map(b => (
              <button
                key={b.id}
                onClick={() => { setSelectedBanca(b.id); setStep(2); }}
                className={cn(
                  'relative rounded-2xl border-2 p-5 text-left transition-all hover:scale-[1.03] hover:shadow-lg',
                  selectedBanca === b.id
                    ? 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/20'
                    : 'border-border bg-card hover:border-indigo-300'
                )}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${b.gradient} flex items-center justify-center mb-3`}>
                  <b.icon size={20} className="text-white" />
                </div>
                <p className="font-bold text-sm">{b.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{b.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Gênero Textual */}
      {step === 2 && (
        <div className="space-y-4 no-print">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Passo 2 — Gênero Textual</p>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← Voltar</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {GENEROS.map(g => (
              <button
                key={g.id}
                onClick={() => { setSelectedGenero(g.id); setStep(3); }}
                className={cn(
                  'px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all hover:scale-105',
                  selectedGenero === g.id
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700'
                    : 'border-border bg-card hover:border-indigo-300 text-foreground'
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Tema e Motivadores */}
      {step === 3 && (
        <div className="space-y-4 no-print">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Passo 3 — Tema e Dados de Apoio</p>
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>← Voltar</Button>
          </div>

          <div className="flex gap-2 mb-2">
            <Badge variant="outline" className="border-indigo-300 text-indigo-600">
              {BANCAS.find(b => b.id === selectedBanca)?.label}
            </Badge>
            <Badge variant="outline" className="border-indigo-300 text-indigo-600">
              {GENEROS.find(g => g.id === selectedGenero)?.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tema da Redação <span className="text-destructive">*</span></Label>
              <Input
                value={tema}
                onChange={e => setTema(e.target.value)}
                placeholder="Ex: Os impactos da IA na educação brasileira"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Dados Brutos para Textos Motivadores</Label>
              <Textarea
                value={dadosBrutos}
                onChange={e => setDadosBrutos(e.target.value)}
                placeholder="Cole aqui dados, estatísticas, citações ou trechos que a IA transformará em textos motivadores..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Quantidade de Linhas</Label>
              <Input
                type="number"
                min={10}
                max={50}
                value={lineCount}
                onChange={e => setLineCount(Math.min(50, Math.max(10, Number(e.target.value))))}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Checkbox
                id="includeHeader"
                checked={includeHeader}
                onCheckedChange={(v) => setIncludeHeader(!!v)}
              />
              <Label htmlFor="includeHeader" className="cursor-pointer">
                Incluir Cabeçalho da Escola
              </Label>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            className="w-full sm:w-auto min-h-[48px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold shadow-lg"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? 'Gerando proposta...' : 'GERAR PROPOSTA DE REDAÇÃO OFICIAL'}
          </Button>
        </div>
      )}

      {/* Preview */}
      {proposta && (
        <>
          <div className="flex flex-wrap justify-end gap-2 mt-4 no-print">
            <Button onClick={handleSendToLab} disabled={sendingToLab} className="bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-700 text-primary-foreground font-bold">
              {sendingToLab ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
              🚀 ENVIAR PARA LABORATÓRIO ONLINE
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              🖨️ Imprimir Folha de Redação
            </Button>
          </div>

          {labLink && (
            <Card className="mt-3 border-primary/30 no-print">
              <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">Link do Laboratório:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 min-w-0 truncate">{labLink}</code>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(labLink); toast({ title: '📋 Link copiado!' }); }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQrOpen(true)}>
                  <QrCode className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
          <div className="mt-4 no-print">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <EssaySheet ref={printRef} proposta={proposta} lineCount={lineCount} includeHeader={includeHeader} />
              </CardContent>
            </Card>
          </div>
          <div className="print-only">
            <EssaySheet proposta={proposta} lineCount={lineCount} includeHeader={includeHeader} />
          </div>
        </>
      )}

      {/* Theme Gallery */}
      <div className="mt-10 no-print">
        <h2 className="text-xl font-bold mb-4">📚 Galeria de Temas da Unidade</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por palavras-chave..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'recent' | 'used')}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais Recentes</SelectItem>
              <SelectItem value="used">Mais Utilizados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingThemes ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredThemes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {searchQuery ? 'Nenhum tema encontrado.' : 'Nenhum tema salvo ainda. Gere sua primeira proposta!'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredThemes.map(theme => (
              <Card key={theme.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug flex-1">{theme.tema}</h3>
                    <Badge className={`shrink-0 text-[10px] ${AREA_COLORS[theme.area] || AREA_COLORS.Social}`}>{theme.area}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar size={12} />{new Date(theme.created_at).toLocaleDateString('pt-BR')}</span>
                    <span>{theme.usage_count}× utilizado</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenTheme(theme)}>
                    <FolderOpen className="mr-2 h-4 w-4" />📂 Abrir e Imprimir
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
