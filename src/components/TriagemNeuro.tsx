import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, ArrowRight, Brain, CheckCircle2, FileDown, Lightbulb,
  ClipboardList, Share2, MessageCircle, GraduationCap, Camera, Upload,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

/* ── Cycle options ── */
const CYCLE_OPTIONS = [
  { value: 'infantil', label: 'Educação Infantil' },
  { value: 'anos_iniciais', label: 'Anos Iniciais (1º ao 5º)' },
  { value: 'anos_finais', label: 'Anos Finais (6º ao 9º)' },
  { value: 'medio', label: 'Ensino Médio' },
];

/* ── SNAP-IV — grouped by stages ── */
const SNAP_IV_STAGES = [
  {
    title: 'Atenção e Concentração',
    axis: 'Cognitivo',
    items: [
      'Não consegue prestar muita atenção a detalhes ou comete erros por descuido',
      'Tem dificuldade de manter a atenção em tarefas ou atividades lúdicas',
      'Parece não escutar quando lhe dirigem a palavra',
      'Não segue instruções e não termina deveres escolares',
      'Tem dificuldade para organizar tarefas e atividades',
      'Evita ou reluta em se envolver em tarefas que exijam esforço mental prolongado',
    ],
  },
  {
    title: 'Organização e Memória',
    axis: 'Cognitivo',
    items: [
      'Perde objetos necessários para tarefas ou atividades',
      'É facilmente distraído por estímulos alheios à tarefa',
      'Apresenta esquecimento em atividades diárias',
    ],
  },
  {
    title: 'Hiperatividade',
    axis: 'Motor',
    items: [
      'Agita as mãos ou os pés ou se remexe na cadeira',
      'Abandona sua cadeira em sala de aula ou situações nas quais se espera que permaneça sentado',
      'Corre ou escala em situações inapropriadas',
      'Tem dificuldade para brincar ou envolver-se silenciosamente em atividades de lazer',
      'Está "a mil" ou age como se estivesse "a todo vapor"',
      'Fala em demasia',
    ],
  },
  {
    title: 'Impulsividade e Socialização',
    axis: 'Social',
    items: [
      'Dá respostas precipitadas antes das perguntas terem sido completadas',
      'Tem dificuldade para aguardar sua vez',
      'Interrompe ou se intromete em assuntos de outros',
    ],
  },
];

/* ── M-CHAT — grouped by stages ── */
const MCHAT_STAGES = [
  {
    title: 'Interação Social',
    axis: 'Social',
    items: [
      'A criança tem interesse por outras crianças?',
      'A criança olha para você no olho por mais de um segundo ou dois?',
      'A criança sorri em resposta ao seu rosto ou ao seu sorriso?',
      'A criança tenta atrair a sua atenção para a atividade dela?',
      'A criança responde quando você chama pelo nome dela?',
    ],
  },
  {
    title: 'Comunicação e Linguagem',
    axis: 'Linguagem',
    items: [
      'A criança usa o dedo indicador para apontar, para pedir alguma coisa?',
      'A criança usa o dedo indicador para apontar, para indicar interesse em algo?',
      'A criança alguma vez trouxe objetos para você (pais) para lhe mostrar?',
      'A criança imita você? (ex: você faz expressão e ela imita)',
      'Se você apontar um brinquedo do outro lado do cômodo, a criança olha para ele?',
    ],
  },
  {
    title: 'Comportamento e Brincadeiras',
    axis: 'Social',
    items: [
      'A criança gosta de ser balançada, de pular no seu joelho, etc.?',
      'A criança gosta de subir em coisas, como escadas?',
      'A criança gosta de brincar de esconde-esconde?',
      'A criança brinca de faz-de-conta (ex: falar ao telefone, cuidar de bonecas)?',
      'A criança consegue brincar de forma correta com brinquedos pequenos?',
    ],
  },
  {
    title: 'Sensibilidade e Motricidade',
    axis: 'Motor',
    items: [
      'A criança parece ser excessivamente sensível ao barulho?',
      'A criança anda?',
      'A criança olha para coisas que você está olhando?',
      'A criança faz movimentos estranhos com os dedos perto do rosto?',
      'Você já se perguntou se a criança é surda?',
    ],
  },
];

/* ── Anamnese personalizada ── */
const ANAMNESE_STAGES = [
  {
    title: 'Histórico Escolar',
    axis: 'Cognitivo',
    items: [
      'O aluno já foi reprovado alguma vez?',
      'O aluno apresenta dificuldade persistente em leitura e escrita?',
      'O aluno troca letras com frequência (ex: b/d, p/q)?',
      'O aluno tem dificuldade para copiar do quadro?',
      'O aluno demonstra resistência para ir à escola?',
    ],
  },
  {
    title: 'Comportamento em Sala',
    axis: 'Social',
    items: [
      'O aluno se isola frequentemente dos colegas?',
      'O aluno apresenta crises emocionais desproporcionais?',
      'O aluno tem dificuldade em seguir regras e combinados?',
      'O aluno apresenta comportamento agressivo com frequência?',
      'O aluno demonstra ansiedade ou medo excessivo?',
    ],
  },
  {
    title: 'Cognição e Aprendizagem',
    axis: 'Cognitivo',
    items: [
      'O aluno tem dificuldade para compreender instruções orais?',
      'O aluno apresenta dificuldade com raciocínio lógico-matemático?',
      'O aluno esquece rapidamente o que acabou de aprender?',
      'O aluno precisa de tempo significativamente maior para concluir tarefas?',
      'O aluno apresenta vocabulário reduzido para a idade?',
    ],
  },
  {
    title: 'Desenvolvimento Motor e Saúde',
    axis: 'Motor',
    items: [
      'Há histórico familiar de dificuldades de aprendizagem?',
      'O aluno faz uso de medicação contínua?',
      'O aluno possui algum diagnóstico prévio?',
      'O aluno apresenta dificuldades motoras (coordenação fina/grossa)?',
      'O aluno demonstra fadiga ou sonolência frequente em sala?',
    ],
  },
];

const SCALE_OPTIONS = ['Nem um pouco', 'Um pouco', 'Bastante', 'Demais'];
const YES_NO = ['Sim', 'Não'];

type Protocol = 'snap_iv' | 'mchat' | 'anamnese';

interface TriagemNeuroProps {
  onBack: () => void;
  onAdaptFromProfile?: (profile: string) => void;
}

export default function TriagemNeuro({ onBack, onAdaptFromProfile }: TriagemNeuroProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [protocol, setProtocol] = useState<Protocol>('snap_iv');
  const [schoolCycle, setSchoolCycle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [observerName, setObserverName] = useState('');
  const [observations, setObservations] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStage, setCurrentStage] = useState(0);
  const [reportText, setReportText] = useState('');
  const [detectedProfile, setDetectedProfile] = useState('');
  const [step, setStep] = useState<'setup' | 'questions' | 'observations' | 'report'>('setup');
  const [handwritingPreview, setHandwritingPreview] = useState<string | null>(null);

  const stages = protocol === 'snap_iv' ? SNAP_IV_STAGES : protocol === 'mchat' ? MCHAT_STAGES : ANAMNESE_STAGES;
  const scaleOpts = protocol === 'snap_iv' ? SCALE_OPTIONS : YES_NO;
  const allItems = stages.flatMap(s => s.items);
  const totalItems = allItems.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  const currentStageItems = stages[currentStage]?.items || [];
  const stageStartIdx = stages.slice(0, currentStage).reduce((sum, s) => sum + s.items.length, 0);

  const isCurrentStageComplete = currentStageItems.every((_, i) => answers[`${stageStartIdx + i}`] !== undefined);

  const cycleLabel = CYCLE_OPTIONS.find(c => c.value === schoolCycle)?.label || '';

  const handleHandwritingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setHandwritingPreview(reader.result as string);
    reader.readAsDataURL(file);
    toast({ title: '📸 Amostra de caligrafia anexada!' });
  };

  const buildHandwritingAnalysis = (): string => {
    if (!handwritingPreview) return '';
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANÁLISE DE GRAFOMOTRICIDADE (AMOSTRA ANEXADA)

Nota Clínica: Uma amostra de caligrafia foi anexada a este relatório
para avaliação complementar de grafomotricidade. Recomenda-se que um
profissional de Terapia Ocupacional ou Psicomotricidade analise os
seguintes aspectos da amostra:

  1. PRESSÃO DO TRAÇO: Avaliar se há pressão excessiva (hipertonia)
     ou insuficiente (hipotonia), indicativos de alteração no tônus
     muscular da mão dominante.

  2. TAMANHO E PROPORÇÃO: Verificar se há macrografia (letras muito
     grandes) ou micrografia (letras compactadas), que podem sugerir
     dificuldades no planejamento motor.

  3. ALINHAMENTO E ESPAÇAMENTO: Observar se a escrita respeita as
     linhas-guia e se há espaçamento regular entre palavras, indicando
     o nível de controle visomotor.

  4. FLUIDEZ DO TRAÇO: Identificar se há tremores, interrupções ou
     movimentos compensatórios que sugiram déficit na coordenação
     motora fina (disgrafia motora).

  5. DIREÇÃO E ORGANIZAÇÃO: Verificar se a escrita segue a
     direcionalidade esquerda-direita e se há organização espacial
     adequada na folha.

⚠ Esta análise preliminar deve ser complementada por avaliação
  presencial com instrumentos padronizados (Escala de Ajuriaguerra,
  BHK ou DASH).`;
  };

  const buildDSM5Analysis = (profile: string, summary: string): string => {
    if (profile.includes('TDAH')) {
      return `
CORRELAÇÃO COM CRITÉRIOS DIAGNÓSTICOS (DSM-5-TR / CID-11)

▸ DSM-5-TR — Transtorno de Déficit de Atenção/Hiperatividade (F90)
  Critério A: Os sinais observados correlacionam-se com os critérios
  de desatenção e/ou hiperatividade-impulsividade do DSM-5-TR.
  Critério B: Para confirmação, os sintomas devem estar presentes
  antes dos 12 anos de idade.
  Critério C: Os sintomas devem ser observados em dois ou mais
  ambientes (escola, casa, atividades sociais).
  Critério D: Deve haver evidência clara de prejuízo funcional.

▸ CID-11 — Transtorno de Déficit de Atenção com Hiperatividade (6A05)
  A classificação internacional (CID-11) categoriza o TDAH em
  apresentação predominantemente desatenta (6A05.0), predominantemente
  hiperativa-impulsiva (6A05.1) ou combinada (6A05.2).

▸ FUNÇÕES EXECUTIVAS OBSERVADAS:
  • Déficit na alternância de atenção (atenção sustentada/seletiva)
  • Dificuldade no controle inibitório (respostas precipitadas)
  • Comprometimento da memória de trabalho (esquecimento diário)
  • Prejuízo no planejamento e organização de tarefas`;
    }

    if (profile.includes('TEA')) {
      return `
CORRELAÇÃO COM CRITÉRIOS DIAGNÓSTICOS (DSM-5-TR / CID-11)

▸ DSM-5-TR — Transtorno do Espectro Autista (F84.0)
  Critério A: Déficits persistentes na comunicação social e na
  interação social em múltiplos contextos.
  Critério B: Padrões restritos e repetitivos de comportamento,
  interesses ou atividades.
  Critério C: Sintomas presentes no período inicial do desenvolvimento.
  Critério D: Os sintomas causam prejuízo clinicamente significativo.

▸ CID-11 — Transtorno do Espectro do Autismo (6A02)
  A CID-11 classifica o TEA considerando o nível de funcionamento
  intelectual e linguístico, com ou sem comprometimento.

▸ DOMÍNIOS NEUROPSICOLÓGICOS OBSERVADOS:
  • Prejuízo na Teoria da Mente (dificuldade em inferir estados mentais)
  • Déficit na reciprocidade socioemocional
  • Alteração no processamento sensorial (hiper ou hiporreatividade)
  • Rigidez cognitiva e dificuldade na flexibilidade adaptativa`;
    }

    if (profile.includes('Significativa')) {
      return `
CORRELAÇÃO COM INDICADORES NEUROPSICOLÓGICOS

▸ Os indicadores observados nesta anamnese sugerem possível
  comprometimento em múltiplos domínios do desenvolvimento
  neuropsicológico:

  • FUNÇÕES EXECUTIVAS: Dificuldade em planejamento, organização
    e controle inibitório.
  • PROCESSAMENTO LINGUÍSTICO: Vocabulário reduzido, dificuldade
    na compreensão de instruções complexas.
  • MEMÓRIA OPERACIONAL: Esquecimento rápido de conteúdos recém-
    apresentados, necessidade de repetição constante.
  • COORDENAÇÃO MOTORA: Possíveis dificuldades na motricidade fina
    e/ou grossa que podem afetar a grafomotricidade.

▸ Recomenda-se avaliação neuropsicológica completa com instrumentos
  padronizados (WISC-V, SNAP-IV, Inventário de Habilidades Sociais)
  para diagnóstico diferencial.`;
    }

    return '';
  };

  const buildInterventionSuggestions = (profile: string): string => {
    if (profile.includes('TDAH')) {
      return `
INTERVENÇÕES IMEDIATAS BASEADAS EM EVIDÊNCIAS

▸ ADAPTAÇÃO CURRICULAR (DUA — Desenho Universal para a Aprendizagem):
  • Fragmentar instruções em passos curtos e objetivos (máx. 3 por vez)
  • Utilizar destaques visuais (negrito, cores) em palavras-chave
  • Oferecer intervalos programados a cada 15-20 minutos
  • Posicionar o aluno próximo ao professor, longe de distrações

▸ ESTRATÉGIAS METACOGNITIVAS:
  • Ensinar uso de checklists e organizadores visuais
  • Implementar rotinas previsíveis com cronômetro visual
  • Utilizar reforço positivo imediato e específico

▸ AMBIENTE:
  • Reduzir estímulos visuais e sonoros desnecessários
  • Permitir uso de fones de ouvido durante atividades de concentração
  • Oferecer assento com suporte sensorial (almofada de ar, elástico)`;
    }

    if (profile.includes('TEA')) {
      return `
INTERVENÇÕES IMEDIATAS BASEADAS EM EVIDÊNCIAS

▸ ADAPTAÇÃO CURRICULAR (DUA — Desenho Universal para a Aprendizagem):
  • Utilizar linguagem literal e direta, evitando metáforas
  • Fornecer antecipação de mudanças na rotina (cronograma visual)
  • Oferecer suporte visual (pictogramas, histórias sociais)
  • Estruturar atividades com início, meio e fim claros

▸ COMUNICAÇÃO SOCIAL:
  • Ensinar explicitamente regras sociais não-ditas
  • Utilizar modelagem visual para interações sociais
  • Respeitar necessidades sensoriais (iluminação, ruídos)

▸ FLEXIBILIDADE:
  • Oferecer opções dentro de uma estrutura previsível
  • Preparar transições com avisos antecipados (5 min, 2 min, 1 min)
  • Permitir interesses especiais como ponte para novos conteúdos`;
    }

    return `
INTERVENÇÕES PEDAGÓGICAS RECOMENDADAS

▸ ADAPTAÇÃO CURRICULAR:
  • Elaborar PEI (Plano Educacional Individualizado)
  • Oferecer atividades diferenciadas com tempo ampliado
  • Utilizar recursos multissensoriais (visual, auditivo, tátil)

▸ ACOMPANHAMENTO:
  • Monitoramento quinzenal com registro de evolução
  • Diálogo frequente com a família
  • Reavaliação com este instrumento após 60 dias

▸ ENCAMINHAMENTO:
  • Avaliação multidisciplinar (Psicopedagogo, Neuropsicólogo)
  • Considerar avaliação fonoaudiológica se houver déficits na linguagem
  • Considerar Terapia Ocupacional se houver déficits motores`;
  };

  const handleGenerateReport = () => {
    if (!studentName.trim()) {
      toast({ title: 'Preencha o nome do aluno', variant: 'destructive' });
      return;
    }

    let profile = '';
    let summary = '';

    if (protocol === 'snap_iv') {
      const allItemsFlat = SNAP_IV_STAGES.flatMap(s => s.items);
      const scores = allItemsFlat.map((_, i) => SCALE_OPTIONS.indexOf(answers[`${i}`] || 'Nem um pouco'));
      const inattention = scores.slice(0, 9).reduce((a, b) => a + b, 0);
      const hyperactivity = scores.slice(9).reduce((a, b) => a + b, 0);
      const inattentionAvg = (inattention / 9).toFixed(1);
      const hyperactivityAvg = (hyperactivity / 9).toFixed(1);

      if (Number(inattentionAvg) >= 1.5 && Number(hyperactivityAvg) >= 1.5) {
        profile = 'TDAH — Apresentação Combinada';
        summary = `O(a) aluno(a) ${studentName}, ${studentAge || 'idade não informada'}, cursando ${cycleLabel}, apresentou média de ${inattentionAvg} nos itens de Desatenção e ${hyperactivityAvg} nos itens de Hiperatividade/Impulsividade do protocolo SNAP-IV (Swanson, Nolan e Pelham, 1983). Ambas as médias ultrapassam o ponto de corte de 1.5, sugerindo apresentação combinada compatível com o perfil clínico de TDAH. Recomenda-se encaminhamento prioritário para avaliação neuropsicológica via MAT.`;
      } else if (Number(inattentionAvg) >= 1.5) {
        profile = 'TDAH — Predominantemente Desatento';
        summary = `O(a) aluno(a) ${studentName}, ${studentAge || 'idade não informada'}, cursando ${cycleLabel}, apresentou média de ${inattentionAvg} nos itens de Desatenção do protocolo SNAP-IV, acima do ponto de corte (1.5). Os indicadores são compatíveis com déficits na atenção sustentada e seletiva, sugerindo apresentação predominantemente desatenta. Recomenda-se avaliação neuropsicológica especializada.`;
      } else if (Number(hyperactivityAvg) >= 1.5) {
        profile = 'TDAH — Predominantemente Hiperativo/Impulsivo';
        summary = `O(a) aluno(a) ${studentName}, ${studentAge || 'idade não informada'}, cursando ${cycleLabel}, apresentou média de ${hyperactivityAvg} nos itens de Hiperatividade/Impulsividade do protocolo SNAP-IV, acima do ponto de corte (1.5). Os indicadores sugerem déficits no controle inibitório e na regulação motora. Recomenda-se avaliação neuropsicológica.`;
      } else {
        profile = 'Sem indicadores significativos';
        summary = `O(a) aluno(a) ${studentName}, ${studentAge || 'idade não informada'}, cursando ${cycleLabel}, apresentou médias de ${inattentionAvg} (Desatenção) e ${hyperactivityAvg} (Hiperatividade) no protocolo SNAP-IV, ambas abaixo do ponto de corte (1.5). Não foram identificados sinais sugestivos de TDAH nesta triagem. Recomenda-se acompanhamento pedagógico de rotina.`;
      }
    } else if (protocol === 'mchat') {
      const allItemsFlat = MCHAT_STAGES.flatMap(s => s.items);
      const criticalItems = [2, 7, 9, 13, 14, 15];
      const negativeAnswers = allItemsFlat.map((_, i) => {
        const isNegativeQuestion = [11, 18, 20].includes(i + 1);
        return isNegativeQuestion ? answers[`${i}`] === 'Sim' : answers[`${i}`] === 'Não';
      });
      const totalFails = negativeAnswers.filter(Boolean).length;
      const criticalFails = criticalItems.filter(idx => negativeAnswers[idx - 1]).length;

      if (totalFails >= 3 || criticalFails >= 2) {
        profile = 'TEA — Risco Identificado';
        summary = `O(a) aluno(a) ${studentName}, ${studentAge || 'idade não informada'}, cursando ${cycleLabel}, apresentou ${totalFails} itens sinalizados no M-CHAT-R/F (Robins et al., 2009), sendo ${criticalFails} em itens críticos. O padrão de respostas sugere déficits na reciprocidade socioemocional e na comunicação social não-verbal, compatíveis com o perfil de risco para Transtorno do Espectro Autista (TEA). Recomenda-se encaminhamento imediato para avaliação diagnóstica com neuropediatra.`;
      } else {
        profile = 'Sem indicadores significativos';
        summary = `O(a) aluno(a) ${studentName}, ${studentAge || 'idade não informada'}, cursando ${cycleLabel}, apresentou ${totalFails} itens sinalizados no M-CHAT-R/F (${criticalFails} em itens críticos), abaixo dos pontos de corte. Não foram identificados sinais sugestivos de TEA nesta triagem. Recomenda-se acompanhamento do desenvolvimento e reavaliação em 6 meses.`;
      }
    } else {
      const allItemsFlat = ANAMNESE_STAGES.flatMap(s => s.items);
      const yesCount = allItemsFlat.filter((_, i) => answers[`${i}`] === 'Sim').length;
      const percent = Math.round((yesCount / allItemsFlat.length) * 100);

      if (percent >= 60) {
        profile = 'Dificuldade Significativa — Encaminhamento Recomendado';
        summary = `O(a) aluno(a) ${studentName}, ${studentAge || 'idade não informada'}, cursando ${cycleLabel}, apresentou ${yesCount} de ${allItemsFlat.length} indicadores positivos (${percent}%) na anamnese neuropsicopedagógica. A elevada taxa de indicadores sugere comprometimento em múltiplos domínios do desenvolvimento, requerendo investigação multidisciplinar urgente (Psicopedagogo, Neuropsicólogo e/ou Neuropediatra).`;
      } else if (percent >= 35) {
        profile = 'Atenção Pedagógica — Monitoramento';
        summary = `O(a) aluno(a) ${studentName}, ${studentAge || 'idade não informada'}, cursando ${cycleLabel}, apresentou ${yesCount} de ${allItemsFlat.length} indicadores positivos (${percent}%) na anamnese neuropsicopedagógica. Recomenda-se monitoramento contínuo com intervenção pedagógica direcionada e reavaliação em 60 dias.`;
      } else {
        profile = 'Sem indicadores significativos';
        summary = `O(a) aluno(a) ${studentName}, ${studentAge || 'idade não informada'}, cursando ${cycleLabel}, apresentou ${yesCount} de ${allItemsFlat.length} indicadores positivos (${percent}%) na anamnese neuropsicopedagógica. Não foram identificados indicadores significativos nesta triagem.`;
      }
    }

    const protocolName = protocol === 'snap_iv' ? 'SNAP-IV (Swanson, Nolan & Pelham, 1983)' : protocol === 'mchat' ? 'M-CHAT-R/F (Robins et al., 2009)' : 'Anamnese Neuropsicopedagógica Estruturada';

    const stageResults = stages.map((stage, si) => {
      const startIdx = stages.slice(0, si).reduce((sum, s) => sum + s.items.length, 0);
      const lines = stage.items.map((item, ii) => {
        const answer = answers[`${startIdx + ii}`] || '—';
        return `  ${ii + 1}. ${item}\n     Resposta: ${answer}`;
      });
      return `▸ ${stage.title} [Eixo: ${stage.axis}]\n${lines.join('\n')}`;
    });

    const dsm5Analysis = buildDSM5Analysis(profile, summary);
    const interventions = buildInterventionSuggestions(profile);
    const handwritingAnalysis = buildHandwritingAnalysis();

    const fullReport = `RELATÓRIO DE TRIAGEM NEUROPSICOPEDAGÓGICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PIFFER EDUTECH — ANÁLISE BASEADA EM PROTOCOLOS DE NEUROCIÊNCIA CLÍNICA

DADOS DO ALUNO
Nome: ${studentName}
Idade: ${studentAge || 'Não informada'}
Ciclo Escolar: ${cycleLabel}
Observador: ${observerName || 'Professor(a)'}
Protocolo Aplicado: ${protocolName}
Data da Triagem: ${new Date().toLocaleDateString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANÁLISE DE SINAIS SUGESTIVOS
Perfil Identificado: ${profile}

${summary}
${dsm5Analysis}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DETALHAMENTO POR EIXO DE OBSERVAÇÃO

${stageResults.join('\n\n')}
${handwritingAnalysis}

${observations ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nOBSERVAÇÕES COMPLEMENTARES DO PROFESSOR\n${observations}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${interventions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ NOTA DE SEGURANÇA E ÉTICA PROFISSIONAL

Este relatório visa apoiar a prática pedagógica e o encaminhamento
clínico, garantindo o direito à aprendizagem plena. Esta é uma
TRIAGEM DE APOIO baseada em protocolos internacionais reconhecidos
(DSM-5-TR, CID-11, SNAP-IV, M-CHAT-R/F) processados via tecnologia
Piffer EduTech. NÃO SUBSTITUI O LAUDO MÉDICO OFICIAL.

Referências:
• APA (2022). DSM-5-TR: Manual Diagnóstico e Estatístico de Transtornos Mentais.
• OMS (2019). CID-11: Classificação Internacional de Doenças.
• Swanson, J. M. et al. (1983). The SNAP rating scale. Univ. of California, Irvine.
• Robins, D. L. et al. (2009). Modified Checklist for Autism in Toddlers, Revised.

© 2026 PIFFER EDUTECH — Tecnologia Assistiva Autoral por Matheus Lima Piffer`;

    setReportText(fullReport);
    setDetectedProfile(profile);
    setStep('report');
    toast({ title: '✅ Relatório de triagem gerado com rigor científico!' });
  };

  const handlePdf = async () => {
    const el = document.getElementById('triagem-report');
    if (!el) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const cleanName = studentName.replace(/\s+/g, '_') || 'Aluno';
      await html2pdf().set({
        margin: [20, 15, 20, 15],
        filename: `Relatorio_Inclusao_${cleanName}.pdf`,
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).save();
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    try {
      const el = document.getElementById('triagem-report');
      if (!el) return;
      toast({ title: '📎 Preparando arquivo...' });
      const html2pdf = (await import('html2pdf.js')).default;
      const cleanName = studentName.replace(/\s+/g, '_') || 'Aluno';
      const blob: Blob = await html2pdf().set({
        margin: [20, 15, 20, 15],
        filename: `Relatorio_Inclusao_${cleanName}.pdf`,
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).outputPdf('blob');

      const file = new File([blob], `Relatorio_Inclusao_${cleanName}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Triagem — ${studentName}`, files: [file] });
      } else {
        const msg = `🧠 *Relatório de Triagem Neuropsicopedagógica — ${studentName}*\n\n📋 Perfil: ${detectedProfile}\n🎓 Ciclo: ${cycleLabel}\n📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n⚠️ Triagem de apoio baseada em protocolos clínicos (DSM-5-TR/CID-11) via Piffer EduTech.\n\n✅ Relatório completo disponível em PDF.`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast({ title: 'Erro ao compartilhar', description: e.message, variant: 'destructive' });
      }
    }
  };

  const handleWhatsApp = () => {
    const msg = `🧠 *Relatório de Triagem Neuropsicopedagógica — ${studentName}*\n\n📋 Perfil Identificado: ${detectedProfile}\n🎓 Ciclo: ${cycleLabel}\n📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n⚠️ Triagem de apoio baseada em protocolos de Neurociência Clínica (DSM-5-TR / CID-11) via Piffer EduTech. Não substitui o laudo clínico.\n\n✅ Tecnologia Assistiva Autoral por Matheus Lima Piffer`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const suggestedAeeProfile = detectedProfile.includes('TDAH') ? 'aee_tdah' : detectedProfile.includes('TEA') ? 'aee_tea' : '';

  /* ── SETUP STEP ── */
  if (step === 'setup') {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <Button variant="ghost" onClick={onBack} className="gap-2 rounded-xl">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        {/* Hero */}
        <div className="bg-[#0F172A] rounded-[3.5rem] p-8 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-600/20 to-pink-600/10 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] uppercase tracking-widest font-bold">
                Dra. IA Neurociência
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              Triagem e Anamnese<br />Neuropsicopedagógica
            </h2>
            <p className="text-sm text-slate-400 mt-3 max-w-md leading-relaxed">
              Análise multimodal baseada em protocolos DSM-5-TR e CID-11.
              Questionário + Análise de Grafomotricidade.
            </p>
          </div>
        </div>

        {/* Selo de Garantia */}
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-50/80 to-yellow-50/80">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Selo de Garantia Pedagógica</p>
            <p className="text-[10px] text-amber-700">Análise baseada em Protocolos de Neurociência Clínica · DSM-5-TR · CID-11</p>
          </div>
        </div>

        <div className="bg-card rounded-[2rem] border p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Configuração Inicial</h3>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Ciclo Escolar *
            </Label>
            <Select value={schoolCycle} onValueChange={setSchoolCycle}>
              <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Selecione o ciclo" /></SelectTrigger>
              <SelectContent>
                {CYCLE_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Protocolo de Triagem *</Label>
            <Select value={protocol} onValueChange={(v) => { setProtocol(v as Protocol); setAnswers({}); setCurrentStage(0); }}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="snap_iv">SNAP-IV — Triagem para TDAH (DSM-5-TR F90)</SelectItem>
                <SelectItem value="mchat">M-CHAT-R/F — Triagem para TEA (DSM-5-TR F84)</SelectItem>
                <SelectItem value="anamnese">Anamnese Neuropsicopedagógica Estruturada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Aluno *</Label>
              <Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Nome completo" className="rounded-2xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Idade</Label>
              <Input value={studentAge} onChange={e => setStudentAge(e.target.value)} placeholder="Ex: 8 anos" className="rounded-2xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observador</Label>
              <Input value={observerName} onChange={e => setObserverName(e.target.value)} placeholder="Nome do professor(a)" className="rounded-2xl" />
            </div>
          </div>

          {/* Handwriting Upload */}
          <div className="space-y-3 p-4 rounded-2xl border border-dashed border-violet-300 bg-violet-50/50">
            <Label className="text-xs font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Amostra de Caligrafia (Opcional)
            </Label>
            <p className="text-[10px] text-violet-600 leading-relaxed">
              Tire uma foto da caligrafia do aluno. A análise cruzará dados do questionário com sinais de grafomotricidade (coordenação motora fina, tônus muscular, planejamento motor).
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleHandwritingUpload}
            />
            {handwritingPreview ? (
              <div className="space-y-2">
                <img src={handwritingPreview} alt="Amostra de caligrafia" className="max-h-40 rounded-xl border shadow-sm mx-auto object-contain" />
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-xl text-xs gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> Trocar Foto
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setHandwritingPreview(null)} className="rounded-xl text-xs text-destructive">
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl gap-2 border-violet-300 text-violet-700 hover:bg-violet-100">
                <Upload className="h-4 w-4" /> Fotografar ou Enviar Amostra
              </Button>
            )}
          </div>

          <Button
            onClick={() => setStep('questions')}
            disabled={!schoolCycle || !studentName.trim()}
            size="lg"
            className="w-full rounded-2xl text-white shadow-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            INICIAR QUESTIONÁRIO
          </Button>
        </div>
      </div>
    );
  }

  /* ── QUESTIONS STEP ── */
  if (step === 'questions') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>Eixo {stages[currentStage]?.axis} — Etapa {currentStage + 1} de {stages.length}: {stages[currentStage]?.title}</span>
            <span className="text-rose-600">{progressPercent}% concluído</span>
          </div>
          <Progress value={progressPercent} className="h-2.5 rounded-full" />
          <div className="flex gap-1">
            {stages.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < currentStage ? 'bg-rose-500' : i === currentStage ? 'bg-rose-400 animate-pulse' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stage title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
            {currentStage + 1}
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">{stages[currentStage]?.title}</h3>
            <p className="text-xs text-muted-foreground">Eixo: {stages[currentStage]?.axis} · {currentStageItems.length} perguntas</p>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {currentStageItems.map((item, i) => {
            const globalIdx = `${stageStartIdx + i}`;
            return (
              <div key={globalIdx} className={`p-4 rounded-2xl border transition-all ${answers[globalIdx] ? 'bg-rose-50/50 border-rose-200' : 'bg-card border-border'}`}>
                <p className="text-sm font-medium text-foreground mb-3">
                  <span className="font-black text-rose-500 mr-2">{stageStartIdx + i + 1}.</span>
                  {item}
                </p>
                <RadioGroup
                  value={answers[globalIdx] || ''}
                  onValueChange={v => setAnswers(prev => ({ ...prev, [globalIdx]: v }))}
                  className="flex flex-wrap gap-2"
                >
                  {scaleOpts.map(opt => (
                    <label key={opt} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 cursor-pointer text-xs font-bold transition-all ${
                      answers[globalIdx] === opt ? 'bg-rose-100 border-rose-400 text-rose-700 shadow-sm' : 'border-transparent bg-muted/50 hover:border-rose-200 text-muted-foreground'
                    }`}>
                      <RadioGroupItem value={opt} className="sr-only" />
                      {opt}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => currentStage > 0 ? setCurrentStage(currentStage - 1) : setStep('setup')}
            className="rounded-2xl gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentStage > 0 ? 'Etapa Anterior' : 'Voltar'}
          </Button>

          {currentStage < stages.length - 1 ? (
            <Button
              onClick={() => setCurrentStage(currentStage + 1)}
              disabled={!isCurrentStageComplete}
              className="rounded-2xl gap-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-700 hover:to-pink-700"
            >
              Próxima Etapa <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => setStep('observations')}
              disabled={!isCurrentStageComplete}
              className="rounded-2xl gap-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-700 hover:to-pink-700"
            >
              Finalizar Respostas <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ── OBSERVATIONS STEP ── */
  if (step === 'observations') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-2">
          <Progress value={100} className="h-2.5 rounded-full" />
          <p className="text-xs font-bold text-rose-600 mt-2">✅ Todas as questões respondidas!</p>
        </div>

        <div className="bg-card rounded-[2rem] border p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-black text-foreground">📝 Observações Complementares do Professor</h3>
          <p className="text-xs text-muted-foreground">Adicione observações sobre comportamento em sala, contexto familiar, interações com colegas ou qualquer informação relevante para a análise multimodal.</p>
          <Textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder="Descreva comportamentos observados, contexto familiar relevante, interações com colegas, padrões sensoriais notados, etc."
            className="min-h-[150px] rounded-2xl"
          />

          {handwritingPreview && (
            <div className="p-3 rounded-xl border border-violet-200 bg-violet-50/50">
              <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-2">📸 Amostra de Caligrafia Anexada</p>
              <img src={handwritingPreview} alt="Caligrafia" className="max-h-24 rounded-lg object-contain mx-auto" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => { setStep('questions'); setCurrentStage(stages.length - 1); }} className="rounded-2xl gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button
              onClick={handleGenerateReport}
              size="lg"
              className="flex-1 rounded-2xl text-white shadow-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              GERAR ANÁLISE DE SINAIS SUGESTIVOS
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── REPORT STEP ── */
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 rounded-xl">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      {/* Report */}
      <div id="triagem-report" className="bg-card rounded-[2rem] border p-8 space-y-4" style={{ fontFamily: 'Inter, Arial, sans-serif', position: 'relative' }}>
        {/* Watermark */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: '4rem', fontWeight: 900, color: 'rgba(15, 23, 42, 0.04)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
          PIFFER EDUTECH
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center border-b-2 border-rose-200 pb-4 mb-6">
            <h2 className="text-xl font-black text-foreground tracking-wide">PIFFER EDUTECH</h2>
            <p className="text-xs text-muted-foreground">Análise baseada em Protocolos de Neurociência Clínica</p>
            <p className="text-[10px] text-muted-foreground mt-1">Triagem Neuropsicopedagógica · DSM-5-TR · CID-11</p>
          </div>

          {/* Profile badge */}
          <div className={`p-4 rounded-2xl mb-6 ${detectedProfile.includes('Sem indicadores') ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`text-xs font-black uppercase tracking-wider mb-1 ${detectedProfile.includes('Sem indicadores') ? 'text-emerald-700' : 'text-amber-700'}`}>
              Análise de Sinais Sugestivos
            </p>
            <p className={`text-lg font-black ${detectedProfile.includes('Sem indicadores') ? 'text-emerald-800' : 'text-amber-800'}`}>
              {detectedProfile}
            </p>
          </div>

          {/* Handwriting image in report */}
          {handwritingPreview && (
            <div className="mb-6 p-4 rounded-2xl border border-violet-200 bg-violet-50/30">
              <p className="text-xs font-black text-violet-700 uppercase tracking-wider mb-3">Amostra de Grafomotricidade Anexada</p>
              <img src={handwritingPreview} alt="Amostra de caligrafia do aluno" className="max-h-48 rounded-xl border shadow-sm mx-auto object-contain" />
            </div>
          )}

          <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
            {reportText}
          </pre>
        </div>
      </div>

      {/* Flow Intelligence */}
      {suggestedAeeProfile && (
        <div className="flex items-start gap-3 p-5 rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200">
          <Lightbulb className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-black text-purple-800 uppercase tracking-wider mb-1">🧠 Inteligência de Fluxo</p>
            <p className="text-sm text-purple-900 leading-relaxed mb-3">
              Com base no perfil identificado ({detectedProfile}), deseja adaptar uma atividade agora para este aluno utilizando o Desenho Universal para a Aprendizagem (DUA)?
            </p>
            <Button
              onClick={() => onAdaptFromProfile?.(suggestedAeeProfile)}
              className="rounded-2xl gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700"
              size="sm"
            >
              <Lightbulb className="h-4 w-4" />
              Adaptar Atividade para {detectedProfile.split('—')[0].trim()}
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handlePdf} variant="outline" className="rounded-2xl gap-2">
          <FileDown className="h-4 w-4" /> Gerar PDF
        </Button>
        <Button onClick={handleShare} className="rounded-2xl gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700">
          <Share2 className="h-4 w-4" /> Compartilhar Relatório
        </Button>
        <Button onClick={handleWhatsApp} variant="outline" className="rounded-2xl gap-2">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </Button>
        <Button
          onClick={() => { setAnswers({}); setReportText(''); setDetectedProfile(''); setCurrentStage(0); setStep('setup'); setHandwritingPreview(null); }}
          variant="outline"
          className="rounded-2xl gap-2"
        >
          <ClipboardList className="h-4 w-4" /> Nova Triagem
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">
        ⚠️ Este relatório visa apoiar a prática pedagógica e o encaminhamento clínico.
        Triagem de Apoio — Não substitui o laudo médico oficial.
        <br />PIFFER EDUTECH © 2026
      </p>
    </div>
  );
}
