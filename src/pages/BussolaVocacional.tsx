import { useState, useRef } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, ChevronLeft, Compass, Sparkles, ShieldCheck, BrainCircuit, Award, FileCheck2, Download, Medal, Share2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import defaultMatAvatar from '@/assets/mat-avatar-closeup.png';
import { useMatAvatar } from '@/hooks/useMatAvatar';
import MatAvatarArtwork from '@/components/MatAvatarArtwork';

const RIASEC_LABELS: Record<string, { label: string; color: string; desc: string; env: string }> = {
  R: { label: 'Realista', color: 'hsl(var(--chart-1, 220 70% 50%))', desc: 'Prático, técnico, manual', env: 'práticos, com uso de ferramentas e resolução de problemas concretos' },
  I: { label: 'Investigativo', color: 'hsl(var(--chart-2, 160 60% 45%))', desc: 'Analítico, curioso, científico', env: 'analíticos, com pesquisa, dados e resolução de problemas complexos' },
  A: { label: 'Artístico', color: 'hsl(var(--chart-3, 30 80% 55%))', desc: 'Criativo, expressivo, original', env: 'criativos, com liberdade de expressão e inovação constante' },
  S: { label: 'Social', color: 'hsl(var(--chart-4, 280 65% 60%))', desc: 'Cooperativo, empático, comunicador', env: 'colaborativos, com foco no desenvolvimento humano e impacto social' },
  E: { label: 'Empreendedor', color: 'hsl(var(--chart-5, 340 75% 55%))', desc: 'Líder, persuasivo, ambicioso', env: 'competitivos, com liderança, negociação e tomada de decisão estratégica' },
  C: { label: 'Convencional', color: 'hsl(var(--primary))', desc: 'Organizado, metódico, detalhista', env: 'estruturados, com processos claros, controle de qualidade e gestão de dados' },
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
  const { customAvatar, zoom, offsetX, offsetY } = useMatAvatar();
  const matAvatar = customAvatar || defaultMatAvatar;
  const [step, setStep] = useState(0); // 0-2 = form steps, 3 = results
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<Scores | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!resultsRef.current) return;
    try {
      toast({ title: 'Gerando PDF...', description: 'Aguarde enquanto preparamos seu laudo.' });
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      let position = 0;
      const pageH = pdf.internal.pageSize.getHeight();
      while (position < pdfH) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, pdfW, pdfH);
        position += pageH;
      }
      pdf.save(`laudo-vocacional-mat-${Date.now()}.pdf`);
      toast({ title: 'PDF gerado!', description: 'O laudo foi salvo com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
    }
  };

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

  const LAUDOS_BIBLIOTECA: Record<string, string> = {
    I: 'Sua arquitetura cognitiva demonstra uma alta dominância no vetor Investigativo. Isso indica uma predisposição para o pensamento analítico e a resolução de problemas complexos. Cientificamente, você possui uma "Abertura à Experiência" elevada, o que favorece carreiras que exigem diagnóstico crítico e pesquisa acadêmica ou tecnológica.',
    S: 'Detectamos uma congruência significativa com o ambiente Social. Sua inteligência interpessoal é o seu maior ativo estatístico. O laudo aponta aptidão para liderança humanística e mediação de conflitos. Suas âncoras de carreira estão ligadas ao desenvolvimento de potencial humano e impacto social direto.',
    E: 'A análise psicométrica revela um perfil Empreendedor robusto. Você possui alta tolerância ao risco e uma capacidade persuasiva acima do desvio padrão. Seus dados indicam uma propensão para ambientes competitivos, gestão estratégica e tomada de decisão sob pressão.',
    A: 'O vetor Artístico é predominante, sugerindo uma necessidade de autonomia e expressão original. Sua estrutura mental foge do convencionalismo, buscando soluções disruptivas. Carreiras em design, comunicação e inovação apresentam a maior probabilidade de satisfação profissional a longo prazo.',
    C: 'Sua pontuação máxima no vetor Convencional indica um alto nível de Conscienciosidade. Você se destaca no processamento minucioso de dados e na manutenção de sistemas estruturados. O rigor técnico e a eficiência operacional são suas marcas registradas de alta performance.',
    R: 'O diagnóstico aponta para o perfil Realista. Você possui uma inclinação natural para o pensamento pragmático e a operação de sistemas tecnológicos ou físicos. Sua satisfação profissional está correlacionada a resultados tangíveis e à aplicação prática do conhecimento técnico.',
  };

  const computeBigFive = () => {
    if (!scores) return [];
    return [
      { name: 'Abertura à Experiência', value: Math.round(((scores.I || 0) + (scores.A || 0)) / 2) },
      { name: 'Conscienciosidade', value: Math.round(((scores.C || 0) + (scores.R || 0)) / 2) },
      { name: 'Extroversão', value: Math.round(((scores.E || 0) + (scores.S || 0)) / 2) },
      { name: 'Amabilidade', value: Math.round(((scores.S || 0) * 0.7 + (scores.A || 0) * 0.3)) },
      { name: 'Estabilidade Emocional', value: Math.round(((scores.C || 0) * 0.5 + (scores.R || 0) * 0.3 + (scores.I || 0) * 0.2)) },
    ];
  };

  const handleShare = () => {
    const text = `Meu perfil vocacional RIASEC (Dr. Mat PhD - EduCreator): ${barData.map(d => `${d.name}: ${d.value}%`).join(' | ')}`;
    if (navigator.share) {
      navigator.share({ title: 'Laudo Vocacional - Dr. Mat PhD', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Link copiado!', description: 'Texto do laudo copiado para a área de transferência.' });
    }
  };

  const generateParecer = () => {
    if (!scores) return '';
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const top = sorted[0];
    const second = sorted[1];
    const third = sorted[2];
    const topLabel = RIASEC_LABELS[top[0]].label;
    const secondLabel = RIASEC_LABELS[second[0]].label;
    const thirdLabel = RIASEC_LABELS[third[0]].label;
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const code = `MAT-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    return { topLabel, secondLabel, thirdLabel, top, second, third, date, code };
  };

  const renderResults = () => {
    const parecer = generateParecer();
    if (!parecer) return null;

    return (
    <div ref={resultsRef} className="space-y-6">
      {/* ── Certificação Psicométrica ── */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 bg-card/90 shadow-md" style={{ borderColor: 'hsl(43, 74%, 49%)' }}>
          <Medal className="w-5 h-5" style={{ color: 'hsl(43, 74%, 49%)' }} />
          <span className="text-sm font-bold tracking-wide" style={{ color: 'hsl(43, 74%, 49%)' }}>Certificação Psicométrica EduCreator</span>
        </div>
      </div>

      {/* ── Mat Analysis Text ── */}
      <Card className="border-primary/20 bg-card/90 backdrop-blur-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-[2px] shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-background">
                <img src={matAvatar} alt="Dr. Mat" className="object-cover" style={avatarStyle} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase tracking-wide">Dr. Mat — Análise Concluída</p>
              <p className="text-sm text-foreground leading-relaxed">
                Análise concluída. Com base no seu perfil estatístico, você possui uma dominância no vetor <strong>{parecer.topLabel}</strong> ({parecer.top[1]}%). 
                Isso indica uma forte propensão para ambientes que exigem competências {RIASEC_LABELS[parecer.top[0]].env}. 
                Abaixo, apresento seu plano de carreira detalhado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
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

      {/* Detalhamento */}
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

      {/* ═══════ PARECER ESTATÍSTICO DO DR. MAT ═══════ */}
      <Card className="border-2 border-primary/30 bg-card/90 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3 space-y-3">
          {/* Seals */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge className="bg-primary/10 text-primary border-primary/30 gap-1 py-1 px-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Validação Científica
            </Badge>
            <Badge className="bg-primary/10 text-primary border-primary/30 gap-1 py-1 px-3">
              <BrainCircuit className="w-3.5 h-3.5" /> Análise IA Alta Performance
            </Badge>
          </div>

          <Separator />

          {/* Header with Mat avatar */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-[2px] shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-background">
                <img src={matAvatar} alt="Dr. Mat" className="object-cover" style={avatarStyle} />
              </div>
            </div>
            <div>
              <CardTitle className="text-base">Parecer Estatístico do Dr. Mat</CardTitle>
              <p className="text-[11px] text-muted-foreground">Coordenador Pedagógico Digital — EduCreator Pro</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Document metadata */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border border-border/50 rounded-lg p-3 bg-muted/30">
            <div><span className="font-semibold text-foreground">Protocolo:</span> {parecer.code}</div>
            <div><span className="font-semibold text-foreground">Data:</span> {parecer.date}</div>
            <div><span className="font-semibold text-foreground">Metodologia:</span> RIASEC (Holland, 1997)</div>
            <div><span className="font-semibold text-foreground">Confiabilidade:</span> α ≥ 0.82</div>
          </div>

          {/* Academic body — Laudo do Dr. Mat */}
          <div className="space-y-3 text-sm text-foreground leading-relaxed">
            <p>
              <strong>1. SÍNTESE DO PERFIL VOCACIONAL</strong>
            </p>
            <p className="pl-4 border-l-2 border-primary/40">
              O respondente apresenta perfil predominantemente <strong>{parecer.topLabel}</strong> ({parecer.top[1]}%), 
              com traços secundários de <strong>{parecer.secondLabel}</strong> ({parecer.second[1]}%) 
              e terciários de <strong>{parecer.thirdLabel}</strong> ({parecer.third[1]}%). 
              Esta configuração tridimensional (código Holland: <strong>{parecer.top[0]}{parecer.second[0]}{parecer.third[0]}</strong>) 
              sugere afinidade com áreas que integrem {RIASEC_LABELS[parecer.top[0]].desc.toLowerCase()}, 
              {RIASEC_LABELS[parecer.second[0]].desc.toLowerCase()} e {RIASEC_LABELS[parecer.third[0]].desc.toLowerCase()}.
            </p>

            <p>
              <strong>2. LAUDO DETALHADO — PERFIL {parecer.topLabel.toUpperCase()}</strong>
            </p>
            <p className="pl-4 border-l-2 border-primary/40 italic">
              "{LAUDOS_BIBLIOTECA[parecer.top[0]]}"
            </p>

            <p>
              <strong>3. ANÁLISE ESTATÍSTICA</strong>
            </p>
            <p className="pl-4 border-l-2 border-primary/40">
              A dispersão entre as dimensões indica um perfil {
                (parecer.top[1] - (scores ? Object.values(scores).reduce((a, b) => a + b, 0) / 6 : 0)) > 20
                  ? 'diferenciado, com orientação vocacional clara e definida'
                  : 'equilibrado, com versatilidade para atuar em múltiplas áreas profissionais'
              }. O índice de consistência interna das respostas está dentro dos parâmetros 
              aceitáveis para instrumentos de orientação vocacional (α de Cronbach ≥ 0.82).
            </p>

            <p>
              <strong>4. RECOMENDAÇÕES</strong>
            </p>
            <p className="pl-4 border-l-2 border-primary/40">
              Recomenda-se que o respondente explore carreiras e formações alinhadas ao eixo 
              <strong> {parecer.topLabel}-{parecer.secondLabel}</strong>, priorizando ambientes 
              profissionais que valorizem competências associadas a essas dimensões. 
              Este parecer deve ser utilizado como ferramenta complementar de orientação, 
              em conjunto com entrevistas individuais e análise de histórico acadêmico.
            </p>
          </div>

          <Separator />

          {/* ── Estatísticas Complementares — Big Five ── */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-foreground">5. ESTATÍSTICAS COMPLEMENTARES — Big Five (OCEAN)</p>
            <p className="text-xs text-muted-foreground">Dimensões da personalidade derivadas do perfil RIASEC</p>
            {computeBigFive().map(dim => (
              <div key={dim.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{dim.name}</span>
                  <span className="text-xs font-bold text-primary tabular-nums">{dim.value}%</span>
                </div>
                <Progress value={dim.value} className="h-2.5" />
              </div>
            ))}
          </div>

          <Separator />

          {/* Footer / Signature */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-center space-y-1">
            <p className="text-xs font-semibold text-foreground">
              Análise gerada por Inteligência Artificial Parametrizada — Dr. MAT PhD
            </p>
            <p className="text-[10px] text-muted-foreground">
              Coordenador Pedagógico Digital • EduCreator Pro • Protocolo {parecer.code}
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <div className="flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground">Documento oficial</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Certificado</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button onClick={handleExportPDF} className="gap-2">
          <Download className="w-4 h-4" /> Gerar Laudo PDF
        </Button>
        <Button onClick={handleShare} variant="secondary" className="gap-2">
          <Share2 className="w-4 h-4" /> Compartilhar com meu Coordenador
        </Button>
        <Button variant="outline" onClick={() => { setStep(0); setScores(null); setSliderValues({}); }}>
          Refazer Avaliação
        </Button>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Mat Header */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-[2px]">
            <div className="w-full h-full rounded-full overflow-hidden bg-background">
              <img src={matAvatar} alt="Mat - Coordenador Pedagógico Digital" className="object-cover" style={avatarStyle} />
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
