import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStudentMode } from '@/hooks/useStudentMode';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PenLine, Sparkles, Maximize2, Minimize2, Trophy, Zap, Loader2, RotateCcw, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BANCAS = [
  { value: 'Banca Padrão Nacional', label: 'Banca Padrão Nacional', maxScore: 1000, color: 'bg-blue-500' },
  { value: 'Banca Acadêmica', label: 'Banca Acadêmica (Elite)', maxScore: 100, color: 'bg-purple-500' },
  { value: 'Avaliação Técnica', label: 'Avaliação Técnica', maxScore: 100, color: 'bg-emerald-500' },
  { value: 'Banca de Excelência', label: 'Banca de Excelência', maxScore: 12, color: 'bg-orange-500' },
  { value: 'UNICAMP', label: 'UNICAMP (Comvest)', maxScore: 12, color: 'bg-red-500' },
  { value: 'FUVEST', label: 'FUVEST (USP)', maxScore: 50, color: 'bg-amber-600' },
  { value: 'VUNESP', label: 'VUNESP (Unesp)', maxScore: 20, color: 'bg-cyan-500' },
];

const HOT_THEMES = [
  'A importância da educação técnica para o desenvolvimento do Brasil',
  'Desafios da inclusão digital nas escolas públicas',
  'O papel da inteligência artificial na formação profissional',
  'Sustentabilidade na indústria: responsabilidades e soluções',
  'Saúde mental de jovens na era das redes sociais',
];

interface Annotation {
  start: number;
  end: number;
  type: 'error' | 'weak' | 'good';
  comment: string;
}

interface Competency {
  name: string;
  score: number;
  max: number;
  justification: string;
}

interface CorrectionResult {
  competencies: Competency[];
  total_score: number;
  suggestions: string;
  annotations: Annotation[];
}

export default function StudentEssayArena() {
  const { user } = useAuth();
  const { addXP, studentXP, studentLevel } = useStudentMode();
  const { toast } = useToast();

  const [step, setStep] = useState<'select' | 'write' | 'result'>('select');
  const [banca, setBanca] = useState('Banca Padrão Nacional');
  const [theme, setTheme] = useState('');
  const [generoTextual, setGeneroTextual] = useState('');
  const [generatingTheme, setGeneratingTheme] = useState(false);
  const [essayText, setEssayText] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [correction, setCorrection] = useState<CorrectionResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const draftKey = user ? `arena_draft_${user.id}` : 'arena_draft_anon';
  const saveTimer = useRef<ReturnType<typeof setInterval>>();

  // Restore draft
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.text) setEssayText(parsed.text);
        if (parsed.banca) setBanca(parsed.banca);
        if (parsed.theme) {
          setTheme(parsed.theme);
          setStep('write');
        }
      } catch { /* ignore */ }
    }
  }, [draftKey]);

  // Auto-save every 5s
  useEffect(() => {
    if (step !== 'write') return;
    saveTimer.current = setInterval(() => {
      localStorage.setItem(draftKey, JSON.stringify({ text: essayText, banca, theme }));
    }, 5000);
    return () => clearInterval(saveTimer.current);
  }, [essayText, banca, theme, step, draftKey]);

  const lineCount = essayText.split('\n').filter(l => l.trim().length > 0).length;
  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
  const progressPercent = Math.min((lineCount / 30) * 100, 100);

  const handleGenerateTheme = async () => {
    setGeneratingTheme(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-essay', {
        body: { Genero: 'Dissertativo-Argumentativo', tema: '', nivel: 'medio' },
      });
      if (error) throw error;
      setTheme(data?.tema || HOT_THEMES[Math.floor(Math.random() * HOT_THEMES.length)]);
    } catch {
      setTheme(HOT_THEMES[Math.floor(Math.random() * HOT_THEMES.length)]);
    } finally {
      setGeneratingTheme(false);
    }
  };

  const handleStartWriting = (selectedTheme: string) => {
    setTheme(selectedTheme);
    setStep('write');
  };

  const handleCorrection = async () => {
    if (wordCount < 50) {
      toast({ title: 'Texto muito curto', description: 'Escreva pelo menos 50 palavras para enviar.', variant: 'destructive' });
      return;
    }
    setCorrecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('correct-essay-text', {
        body: { essayText, banca, theme, generoTextual: banca === 'UNICAMP' ? generoTextual : undefined },
      });
      if (error) throw error;

      const competencies: Competency[] = data?.competencies || [];
      const total = data?.total_score ?? competencies.reduce((s: number, c: Competency) => s + c.score, 0);
      const result: CorrectionResult = {
        competencies,
        total_score: total,
        suggestions: data?.suggestions || '',
        annotations: data?.annotations || [],
      };
      setCorrection(result);
      setStep('result');

      // Gamification
      const xpEarned = Math.round(total / 10) + 50;
      addXP(xpEarned);
      toast({ title: `+${xpEarned} XP ganhos!`, description: `Sua nota: ${total}` });

      const bancaInfo = BANCAS.find(b => b.value === banca);
      if (bancaInfo && total >= bancaInfo.maxScore * 0.8) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }

      localStorage.removeItem(draftKey);
    } catch (err: any) {
      toast({ title: 'Erro na correção', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setCorrecting(false);
    }
  };

  const handleRewrite = () => {
    setCorrection(null);
    setStep('write');
  };

  const handleNewEssay = () => {
    setEssayText('');
    setTheme('');
    setCorrection(null);
    setStep('select');
    localStorage.removeItem(draftKey);
  };

  const bancaInfo = BANCAS.find(b => b.value === banca);

  // ---- SELECT BANCA + THEME ----
  if (step === 'select') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            ✍️ Arena de Redação Elite
          </h1>
          <p className="text-muted-foreground">Treine redações com correção instantânea da IA Doutora</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">1. Escolha a Banca</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BANCAS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setBanca(b.value)}
                  className={`p-3 rounded-xl border-2 transition-all text-center font-semibold ${
                    banca === b.value
                      ? 'border-primary bg-primary/10 shadow-md scale-105'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm md:text-lg">{b.label}</div>
                  <div className="text-xs text-muted-foreground">Máx: {b.maxScore}</div>
                </button>
              ))}
            </div>
            {banca === 'UNICAMP' && (
              <div className="mt-4">
                <label className="text-sm font-medium mb-1 block">Gênero Textual Exigido:</label>
                <Select value={generoTextual} onValueChange={setGeneroTextual}>
                  <SelectTrigger><SelectValue placeholder="Selecione o gênero..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carta Aberta">Carta Aberta</SelectItem>
                    <SelectItem value="Artigo de Opinião">Artigo de Opinião</SelectItem>
                    <SelectItem value="Crônica">Crônica</SelectItem>
                    <SelectItem value="Roteiro de Podcast">Roteiro de Podcast</SelectItem>
                    <SelectItem value="Manifesto">Manifesto</SelectItem>
                    <SelectItem value="Editorial">Editorial</SelectItem>
                    <SelectItem value="Dissertação">Dissertação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">2. Escolha o Tema</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGenerateTheme} disabled={generatingTheme} className="w-full bg-gradient-to-r from-primary to-purple-600 text-primary-foreground">
              {generatingTheme ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              🎲 Gerar Tema Aleatório com IA
            </Button>

            {theme && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="font-medium text-sm text-muted-foreground mb-1">Tema gerado:</p>
                <p className="font-semibold">{theme}</p>
                <Button onClick={() => handleStartWriting(theme)} className="mt-3" size="sm">
                  <ChevronRight className="mr-1 h-4 w-4" /> Começar a escrever
                </Button>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">🔥 Temas Quentes da Semana:</p>
              <div className="space-y-2">
                {HOT_THEMES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => handleStartWriting(t)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- WRITE ----
  if (step === 'write') {
    return (
      <div className={`${focusMode ? 'fixed inset-0 z-50 bg-background p-4 md:p-8' : 'max-w-4xl mx-auto p-4'} animate-fade-in`}>
        {showConfetti && <ConfettiOverlay />}

        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div>
            <Badge variant="secondary" className="mb-1">{bancaInfo?.label}</Badge>
            <h2 className="text-lg font-bold leading-tight line-clamp-2">{theme}</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFocusMode(!focusMode)}>
              {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNewEssay}>
              <RotateCcw className="h-4 w-4 mr-1" /> Novo
            </Button>
          </div>
        </div>

        {/* XP bar */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
          <Zap className="h-5 w-5 text-yellow-500" />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold">Nível {studentLevel}</span>
              <span>{studentXP % 500}/500 XP</span>
            </div>
            <Progress value={(studentXP % 500) / 5} className="h-2" />
          </div>
        </div>

        {/* Line counter + progress */}
        <div className="flex items-center gap-4 mb-2 text-sm text-muted-foreground">
          <span>{lineCount}/30 linhas</span>
          <span>{wordCount} palavras</span>
          <div className="flex-1">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
          {lineCount < 7 && <span className="text-destructive text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Mín. 7 linhas</span>}
          {lineCount >= 7 && lineCount <= 30 && <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> OK</span>}
        </div>

        <Textarea
          value={essayText}
          onChange={e => setEssayText(e.target.value)}
          placeholder="Comece sua redação aqui..."
          className="min-h-[400px] md:min-h-[500px] font-mono text-sm leading-7 resize-none"
          style={{ lineHeight: '1.75rem' }}
          autoFocus
        />

        <div className="flex justify-between items-center mt-4 gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">💾 Salvando automaticamente a cada 5s</p>
          <Button
            onClick={handleCorrection}
            disabled={correcting || wordCount < 50}
            className="bg-gradient-to-r from-amber-500 to-yellow-600 text-foreground font-bold shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            {correcting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            💎 CORREÇÃO INSTANTÂNEA
          </Button>
        </div>
      </div>
    );
  }

  // ---- RESULT ----
  if (step === 'result' && correction) {
    const maxScore = bancaInfo?.maxScore || 1000;
    const pct = Math.round((correction.total_score / maxScore) * 100);
    const isHigh = pct >= 80;

    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4 animate-fade-in">
        {showConfetti && <ConfettiOverlay />}

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Resultado da Correção</h1>
          <Badge variant="secondary">{bancaInfo?.label}</Badge>
        </div>

        {/* Score hero */}
        <Card className={`text-center ${isHigh ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20' : ''}`}>
          <CardContent className="py-8">
            <div className={`text-6xl font-black ${isHigh ? 'text-yellow-600' : 'text-primary'}`}>
              {correction.total_score}
            </div>
            <p className="text-muted-foreground">de {maxScore} pontos</p>
            {isHigh && (
              <div className="mt-3 flex items-center justify-center gap-2 text-yellow-600 font-bold">
                <Trophy className="h-6 w-6" /> Excelente! Nota de Elite!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competencies */}
        <Card>
          <CardHeader><CardTitle className="text-lg">📊 Competências</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {correction.competencies.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{c.name}</span>
                  <span className="font-bold">{c.score}/{c.max}</span>
                </div>
                <Progress value={(c.score / c.max) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{c.justification}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Suggestions */}
        {correction.suggestions && (
          <Card>
            <CardHeader><CardTitle className="text-lg">💡 Dicas da IA Doutora</CardTitle></CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap">{correction.suggestions}</div>
            </CardContent>
          </Card>
        )}

        {/* Annotated text */}
        {correction.annotations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">📝 Anotações no Texto</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {correction.annotations.slice(0, 10).map((a, i) => (
                <div key={i} className={`p-2 rounded text-sm border-l-4 ${
                  a.type === 'error' ? 'border-destructive bg-destructive/5' :
                  a.type === 'weak' ? 'border-yellow-500 bg-yellow-500/5' :
                  'border-green-500 bg-green-500/5'
                }`}>
                  <span className="font-mono text-xs text-muted-foreground">Pos {a.start}-{a.end}</span>
                  <p className="mt-0.5">{a.comment}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleRewrite} variant="outline" className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" /> Reescrever com as Dicas
          </Button>
          <Button onClick={handleNewEssay} className="flex-1">
            <PenLine className="mr-2 h-4 w-4" /> Nova Redação
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function ConfettiOverlay() {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <div className="text-center animate-scale-in">
        <div className="text-7xl mb-4">🎉🏆🎊</div>
        <p className="text-2xl font-black text-yellow-600 drop-shadow-lg">NOTA DE ELITE!</p>
      </div>
    </div>
  );
}
