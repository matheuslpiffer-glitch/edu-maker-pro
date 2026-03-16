import { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

const INTEREST_QUESTIONS = [
  { id: 'i1', text: 'Gosto de resolver problemas práticos com as mãos.', dimension: 'R' },
  { id: 'i2', text: 'Sinto curiosidade por entender como as coisas funcionam.', dimension: 'I' },
  { id: 'i3', text: 'Prefiro atividades que envolvam criatividade e arte.', dimension: 'A' },
  { id: 'i4', text: 'Gosto de ajudar e orientar outras pessoas.', dimension: 'S' },
  { id: 'i5', text: 'Sinto-me motivado(a) a liderar projetos.', dimension: 'E' },
  { id: 'i6', text: 'Prefiro tarefas organizadas e com regras claras.', dimension: 'C' },
];

const SKILL_QUESTIONS = [
  { id: 's1', text: 'Tenho facilidade com ferramentas e tecnologia.', dimension: 'R' },
  { id: 's2', text: 'Sou bom(a) em pesquisar e analisar dados.', dimension: 'I' },
  { id: 's3', text: 'Consigo me expressar bem por meio de música, escrita ou design.', dimension: 'A' },
  { id: 's4', text: 'Tenho facilidade de me comunicar e trabalhar em grupo.', dimension: 'S' },
  { id: 's5', text: 'Sou convincente e consigo negociar bem.', dimension: 'E' },
  { id: 's6', text: 'Sou organizado(a) e atento(a) aos detalhes.', dimension: 'C' },
];

const VALUE_QUESTIONS = [
  { id: 'v1', text: 'Qual valor é mais importante para você em uma carreira?', dimension: 'multi', options: [
    { label: 'Estabilidade e segurança', dimension: 'C' },
    { label: 'Descoberta e inovação', dimension: 'I' },
    { label: 'Liberdade criativa', dimension: 'A' },
    { label: 'Impacto social', dimension: 'S' },
    { label: 'Autonomia e liderança', dimension: 'E' },
    { label: 'Resultados tangíveis', dimension: 'R' },
  ]},
  { id: 'v2', text: 'Em qual ambiente você se sente mais produtivo(a)?', dimension: 'multi', options: [
    { label: 'Laboratório ou oficina', dimension: 'R' },
    { label: 'Biblioteca ou centro de pesquisa', dimension: 'I' },
    { label: 'Estúdio ou espaço aberto', dimension: 'A' },
    { label: 'Escola ou ONG', dimension: 'S' },
    { label: 'Escritório corporativo', dimension: 'E' },
    { label: 'Ambiente estruturado e previsível', dimension: 'C' },
  ]},
  { id: 'v3', text: 'O que mais te motiva no dia a dia?', dimension: 'multi', options: [
    { label: 'Construir e consertar coisas', dimension: 'R' },
    { label: 'Resolver enigmas complexos', dimension: 'I' },
    { label: 'Criar algo único', dimension: 'A' },
    { label: 'Ajudar pessoas a crescerem', dimension: 'S' },
    { label: 'Alcançar metas e vencer desafios', dimension: 'E' },
    { label: 'Manter tudo em ordem', dimension: 'C' },
  ]},
];

type Scores = Record<string, number>;

export default function BussolaVocacional() {
  const [step, setStep] = useState(0); // 0=interests, 1=skills, 2=values, 3=results
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [multiValues, setMultiValues] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Scores | null>(null);

  const handleSlider = (id: string, val: number[]) => {
    setSliderValues(prev => ({ ...prev, [id]: val[0] }));
  };

  const handleMulti = (qId: string, dimension: string) => {
    setMultiValues(prev => ({ ...prev, [qId]: dimension }));
  };

  const canAdvance = () => {
    if (step === 0) return INTEREST_QUESTIONS.every(q => sliderValues[q.id] !== undefined);
    if (step === 1) return SKILL_QUESTIONS.every(q => sliderValues[q.id] !== undefined);
    if (step === 2) return VALUE_QUESTIONS.every(q => multiValues[q.id]);
    return true;
  };

  const calculateScores = () => {
    const s: Scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    // Interests (weight 1)
    INTEREST_QUESTIONS.forEach(q => { s[q.dimension] += (sliderValues[q.id] || 0); });
    // Skills (weight 1)
    SKILL_QUESTIONS.forEach(q => { s[q.dimension] += (sliderValues[q.id] || 0); });
    // Values (weight 3 each answer = 3 points)
    VALUE_QUESTIONS.forEach(q => {
      const dim = multiValues[q.id];
      if (dim) s[dim] += 3;
    });
    // Normalize to 0-100
    const maxPossible = 10 + 10 + 9; // max slider + max slider + 3 value questions * 3
    Object.keys(s).forEach(k => {
      s[k] = Math.round((s[k] / maxPossible) * 100);
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

  const renderSliderStep = (questions: typeof INTEREST_QUESTIONS, title: string, subtitle: string) => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-5">
        {questions.map(q => (
          <Card key={q.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground leading-snug">{q.text}</p>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {sliderValues[q.id] ?? '—'}/10
                </Badge>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[sliderValues[q.id] ?? 5]}
                onValueChange={(v) => handleSlider(q.id, v)}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Discordo totalmente</span>
                <span>Concordo totalmente</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderValuesStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Etapa 3: Valores</h2>
        <p className="text-sm text-muted-foreground">Selecione a opção que melhor representa você</p>
      </div>
      <div className="space-y-5">
        {VALUE_QUESTIONS.map(q => (
          <Card key={q.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-4 pb-4 space-y-3">
              <p className="text-sm font-medium text-foreground">{q.text}</p>
              <RadioGroup
                value={multiValues[q.id] || ''}
                onValueChange={(val) => handleMulti(q.id, val)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                {q.options!.map(opt => (
                  <div key={opt.dimension + q.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.dimension} id={`${q.id}-${opt.dimension}`} />
                    <Label htmlFor={`${q.id}-${opt.dimension}`} className="text-sm cursor-pointer">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
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
        <p className="text-sm text-muted-foreground">Resultado baseado no modelo Holland (RIASEC)</p>
      </div>

      {/* Top 3 */}
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

      {/* Radar Chart */}
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

      {/* Bar Chart */}
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

      {/* Dimension descriptions */}
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
        <Button variant="outline" onClick={() => { setStep(0); setScores(null); setSliderValues({}); setMultiValues({}); }}>
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
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-accent border-2 border-background" style={{ backgroundColor: 'hsl(48, 96%, 53%)' }} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold tracking-wide text-primary uppercase">Mat</p>
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
        <p className="text-sm text-muted-foreground">Baseado no modelo RIASEC de John Holland</p>
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
      {step === 0 && renderSliderStep(INTEREST_QUESTIONS, 'Etapa 1: Interesses', 'Avalie de 1 a 10 o quanto cada afirmação combina com você')}
      {step === 1 && renderSliderStep(SKILL_QUESTIONS, 'Etapa 2: Habilidades', 'Avalie de 1 a 10 suas competências em cada área')}
      {step === 2 && renderValuesStep()}
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
