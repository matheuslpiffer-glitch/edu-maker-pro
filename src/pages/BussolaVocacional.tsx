import { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, ChevronLeft, Compass, Sparkles } from 'lucide-react';
import matAvatar from '@/assets/mat-avatar-closeup.png';

const RIASEC_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  R: { label: 'Realista', color: 'hsl(var(--chart-1, 220 70% 50%))', desc: 'Prático, técnico, manual' },
  I: { label: 'Investigativo', color: 'hsl(var(--chart-2, 160 60% 45%))', desc: 'Analítico, curioso, científico' },
  A: { label: 'Artístico', color: 'hsl(var(--chart-3, 30 80% 55%))', desc: 'Criativo, expressivo, original' },
  S: { label: 'Social', color: 'hsl(var(--chart-4, 280 65% 60%))', desc: 'Cooperativo, empático, comunicador' },
  E: { label: 'Empreendedor', color: 'hsl(var(--chart-5, 340 75% 55%))', desc: 'Líder, persuasivo, ambicioso' },
  C: { label: 'Convencional', color: 'hsl(var(--primary))', desc: 'Organizado, metódico, detalhista' },
};

const LIKERT_LABELS = [
  'Discordo totalmente',
  'Discordo',
  'Neutro',
  'Concordo',
  'Concordo totalmente',
];

type Question = {
  id: string;
  text: string;
  dimensions: string[]; // RIASEC dimensions this feeds into
  traits: string[]; // personality trait labels shown as badges
};

// ── Etapa 1: Cognição e Investigação ──
const STEP1_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'Sinto satisfação intelectual ao analisar dados complexos para encontrar padrões que outros não percebem.',
    dimensions: ['I'],
    traits: ['Investigativo', 'Abertura à Experiência'],
  },
  {
    id: 'q8',
    text: 'Gosto de entender como as coisas funcionam por dentro, sejam máquinas, algoritmos ou sistemas econômicos.',
    dimensions: ['I', 'R'],
    traits: ['Investigativo', 'Realista'],
  },
  {
    id: 'q6',
    text: 'Tenho facilidade e preferência por lidar com ferramentas, tecnologias físicas ou atividades que exijam coordenação motora fina.',
    dimensions: ['R'],
    traits: ['Realista'],
  },
  {
    id: 'q9',
    text: 'Sou extremamente minucioso ao revisar um trabalho, garantindo que nenhum erro técnico passe despercebido.',
    dimensions: ['C'],
    traits: ['Convencional', 'Conscienciosidade'],
  },
];

// ── Etapa 2: Relações e Impacto ──
const STEP2_QUESTIONS: Question[] = [
  {
    id: 'q4',
    text: 'Minha maior motivação profissional é causar um impacto direto no bem-estar ou no aprendizado de outras pessoas.',
    dimensions: ['S'],
    traits: ['Social', 'Amabilidade'],
  },
  {
    id: 'q3',
    text: 'Sinto-me confortável em assumir riscos e persuadir pessoas para atingir metas organizacionais desafiadoras.',
    dimensions: ['E'],
    traits: ['Empreendedor', 'Extroversão'],
  },
  {
    id: 'q7',
    text: 'Mantenho a calma e o foco em resultados mesmo quando enfrento prazos apertados ou ambientes de alta competitividade.',
    dimensions: ['E', 'C'],
    traits: ['Estabilidade Emocional'],
  },
];

// ── Etapa 3: Autonomia e Visão ──
const STEP3_QUESTIONS: Question[] = [
  {
    id: 'q5',
    text: 'Busco autonomia para criar soluções inéditas, mesmo que elas desafiem o modo tradicional de fazer as coisas.',
    dimensions: ['A'],
    traits: ['Artístico', 'Abertura'],
  },
  {
    id: 'q2',
    text: 'Prefiro ambientes de trabalho onde existam regras claras e procedimentos operacionais bem definidos.',
    dimensions: ['C'],
    traits: ['Convencional', 'Conscienciosidade'],
  },
  {
    id: 'q10',
    text: 'Prefiro iniciar novos projetos do zero do que manter processos que já estão funcionando.',
    dimensions: ['E', 'A'],
    traits: ['Empreendedor', 'Artístico'],
  },
];

const ALL_STEPS = [STEP1_QUESTIONS, STEP2_QUESTIONS, STEP3_QUESTIONS];
const STEP_TITLES = [
  { title: 'Etapa 1: Cognição e Investigação', subtitle: 'Avalie cada afirmação de 1 (Discordo Totalmente) a 5 (Concordo Totalmente)' },
  { title: 'Etapa 2: Relações e Impacto', subtitle: 'Avalie cada afirmação de 1 (Discordo Totalmente) a 5 (Concordo Totalmente)' },
  { title: 'Etapa 3: Autonomia e Visão', subtitle: 'Avalie cada afirmação de 1 (Discordo Totalmente) a 5 (Concordo Totalmente)' },
];

type Scores = Record<string, number>;

export default function BussolaVocacional() {
  const [step, setStep] = useState(0); // 0-2 = form steps, 3 = results
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<Scores | null>(null);

  const handleSlider = (id: string, val: number[]) => {
    setSliderValues(prev => ({ ...prev, [id]: val[0] }));
  };

  const canAdvance = () => {
    if (step < 3) return ALL_STEPS[step].every(q => sliderValues[q.id] !== undefined);
    return true;
  };

  const calculateScores = () => {
    const s: Scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const counts: Scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

    ALL_STEPS.flat().forEach(q => {
      const val = sliderValues[q.id] || 3;
      q.dimensions.forEach(dim => {
        s[dim] += val;
        counts[dim] += 1;
      });
    });

    // Normalize: each dimension's max is count * 5, scale to 0-100
    Object.keys(s).forEach(k => {
      const max = counts[k] * 5;
      s[k] = max > 0 ? Math.round((s[k] / max) * 100) : 0;
    });

    setScores(s);
    setStep(3);
  };

  const radarData = scores ? Object.entries(RIASEC_LABELS).map(([key, val]) => ({
    dimension: val.label,
    value: scores[key],
    fullMark: 100,
  })) : [];

  const barData = scores ? Object.entries(RIASEC_LABELS).map(([key, val]) => ({
    name: val.label,
    value: scores[key],
    color: val.color,
  })).sort((a, b) => b.value - a.value) : [];

  const topDimensions = barData.slice(0, 3);

  const renderStep = (questions: Question[], title: string, subtitle: string) => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-5">
        {questions.map(q => (
          <Card key={q.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground leading-snug">{q.text}</p>
                <div className="flex flex-wrap gap-1">
                  {q.traits.map(t => (
                    <Badge key={t} variant="secondary" className="text-[10px] font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[sliderValues[q.id] ?? 3]}
                  onValueChange={(v) => handleSlider(q.id, v)}
                  className="flex-1"
                />
                <span className="w-8 text-center text-sm font-bold text-primary tabular-nums">
                  {sliderValues[q.id] ?? '—'}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                {LIKERT_LABELS.map((l, i) => (
                  <span key={i} className="text-center" style={{ width: '20%' }}>{l}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Seu Perfil RIASEC</h2>
        <p className="text-sm text-muted-foreground">Resultado baseado no modelo Holland (RIASEC) — Questionário Científico Mat PhD</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {topDimensions.map((d, i) => (
          <Card key={d.name} className="border-border/50 bg-card/80 backdrop-blur-sm text-center">
            <CardContent className="pt-4 pb-4 space-y-2">
              <Badge variant={i === 0 ? 'default' : 'secondary'} className="text-xs">
                {i === 0 ? '🥇 Principal' : i === 1 ? '🥈 Secundário' : '🥉 Terciário'}
              </Badge>
              <p className="font-bold text-lg text-foreground">{d.name}</p>
              <p className="text-2xl font-extrabold text-primary">{d.value}%</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gráfico de Radar — Perfil Multidimensional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Radar name="Perfil" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ranking de Dimensões (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} width={80} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${value}%`, 'Pontuação']}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalhamento por Dimensão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {barData.map(d => {
            const key = Object.entries(RIASEC_LABELS).find(([, v]) => v.label === d.name)?.[0] || '';
            const info = RIASEC_LABELS[key];
            return (
              <div key={d.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{d.name}</span>
                  <span className="text-xs text-muted-foreground">{info?.desc}</span>
                </div>
                <Progress value={d.value} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => { setStep(0); setScores(null); setSliderValues({}); }}>
          Refazer Avaliação
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Mat Header */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-[2px]">
            <div className="w-full h-full rounded-full overflow-hidden bg-background">
              <img src={matAvatar} alt="Mat - Coordenador Pedagógico Digital" className="w-full h-full object-cover object-top" />
            </div>
          </div>
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-background" style={{ backgroundColor: 'hsl(48, 96%, 53%)' }} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold tracking-wide text-primary uppercase">Mat PhD</p>
          <p className="text-sm text-foreground leading-snug">
            Olá, sou o <strong>Mat</strong>. Vamos analisar seu perfil com rigor científico para projetar seu futuro.
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold text-foreground">Bússola Vocacional</h1>
        </div>
        <p className="text-sm text-muted-foreground">Questionário Científico baseado no modelo RIASEC de John Holland</p>
      </div>

      {/* Progress */}
      {step < 3 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Etapa {step + 1} de 3</span>
            <span>{Math.round(((step + 1) / 3) * 100)}%</span>
          </div>
          <Progress value={((step + 1) / 3) * 100} className="h-2" />
        </div>
      )}

      {/* Steps */}
      {step < 3 && renderStep(ALL_STEPS[step], STEP_TITLES[step].title, STEP_TITLES[step].subtitle)}
      {step === 3 && renderResults()}

      {/* Navigation */}
      {step < 3 && (
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={calculateScores} disabled={!canAdvance()}>
              <Sparkles className="w-4 h-4 mr-1" /> Ver Resultado
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
