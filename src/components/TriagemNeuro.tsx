import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, ArrowRight, Brain, CheckCircle2, FileDown, Lightbulb,
  ClipboardList, Share2, MessageCircle, GraduationCap,
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
    items: [
      'Perde objetos necessários para tarefas ou atividades',
      'É facilmente distraído por estímulos alheios à tarefa',
      'Apresenta esquecimento em atividades diárias',
    ],
  },
  {
    title: 'Hiperatividade',
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
    items: [
      'O aluno tem dificuldade para compreender instruções orais?',
      'O aluno apresenta dificuldade com raciocínio lógico-matemático?',
      'O aluno esquece rapidamente o que acabou de aprender?',
      'O aluno precisa de tempo significativamente maior para concluir tarefas?',
      'O aluno apresenta vocabulário reduzido para a idade?',
    ],
  },
  {
    title: 'Desenvolvimento e Saúde',
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
  const [protocol, setProtocol] = useState<Protocol>('snap_iv');
  const [schoolCycle, setSchoolCycle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [observerName, setObserverName] = useState('');
  const [observations, setObservations] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStage, setCurrentStage] = useState(0);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportText, setReportText] = useState('');
  const [detectedProfile, setDetectedProfile] = useState('');
  const [step, setStep] = useState<'setup' | 'questions' | 'observations' | 'report'>('setup');

  const stages = protocol === 'snap_iv' ? SNAP_IV_STAGES : protocol === 'mchat' ? MCHAT_STAGES : ANAMNESE_STAGES;
  const scaleOpts = protocol === 'snap_iv' ? SCALE_OPTIONS : YES_NO;
  const allItems = stages.flatMap(s => s.items);
  const totalItems = allItems.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  const currentStageItems = stages[currentStage]?.items || [];
  const stageStartIdx = stages.slice(0, currentStage).reduce((sum, s) => sum + s.items.length, 0);

  const isCurrentStageComplete = currentStageItems.every((_, i) => answers[`${stageStartIdx + i}`] !== undefined);
  const allAnswered = answeredCount === totalItems;

  const cycleLabel = CYCLE_OPTIONS.find(c => c.value === schoolCycle)?.label || '';

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
        summary = `O aluno ${studentName} (${cycleLabel}) apresentou média de ${inattentionAvg} nos itens de Desatenção e ${hyperactivityAvg} nos itens de Hiperatividade/Impulsividade do protocolo SNAP-IV. Os indicadores sugerem possível apresentação combinada de TDAH. Recomenda-se encaminhamento para avaliação neuropsicológica especializada.`;
      } else if (Number(inattentionAvg) >= 1.5) {
        profile = 'TDAH — Predominantemente Desatento';
        summary = `O aluno ${studentName} (${cycleLabel}) apresentou média de ${inattentionAvg} nos itens de Desatenção do protocolo SNAP-IV, acima do ponto de corte (1.5). Os indicadores sugerem possível TDAH com predominância desatenta. Recomenda-se encaminhamento para avaliação especializada.`;
      } else if (Number(hyperactivityAvg) >= 1.5) {
        profile = 'TDAH — Predominantemente Hiperativo/Impulsivo';
        summary = `O aluno ${studentName} (${cycleLabel}) apresentou média de ${hyperactivityAvg} nos itens de Hiperatividade/Impulsividade do protocolo SNAP-IV, acima do ponto de corte (1.5). Recomenda-se encaminhamento para avaliação especializada.`;
      } else {
        profile = 'Sem indicadores significativos';
        summary = `O aluno ${studentName} (${cycleLabel}) apresentou médias de ${inattentionAvg} (Desatenção) e ${hyperactivityAvg} (Hiperatividade) no protocolo SNAP-IV, ambas abaixo do ponto de corte (1.5). Não foram identificados indicadores significativos nesta triagem.`;
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
        summary = `O aluno ${studentName} (${cycleLabel}) apresentou ${totalFails} itens sinalizados no M-CHAT (${criticalFails} em itens críticos). Os indicadores sugerem risco para Transtorno do Espectro Autista (TEA). Recomenda-se encaminhamento imediato para avaliação diagnóstica especializada com neuropediatra.`;
      } else {
        profile = 'Sem indicadores significativos';
        summary = `O aluno ${studentName} (${cycleLabel}) apresentou ${totalFails} itens sinalizados no M-CHAT (${criticalFails} em itens críticos), abaixo do ponto de corte. Não foram identificados indicadores significativos para TEA nesta triagem. Recomenda-se acompanhamento contínuo.`;
      }
    } else {
      // Anamnese
      const allItemsFlat = ANAMNESE_STAGES.flatMap(s => s.items);
      const yesCount = allItemsFlat.filter((_, i) => answers[`${i}`] === 'Sim').length;
      const percent = Math.round((yesCount / allItemsFlat.length) * 100);

      if (percent >= 60) {
        profile = 'Dificuldade Significativa — Encaminhamento Recomendado';
        summary = `O aluno ${studentName} (${cycleLabel}) apresentou ${yesCount} de ${allItemsFlat.length} indicadores positivos (${percent}%) na anamnese pedagógica. O alto índice sugere possível dificuldade de aprendizagem que requer investigação especializada (Psicopedagogo, Neuropsicólogo ou Neuropediatra).`;
      } else if (percent >= 35) {
        profile = 'Atenção Pedagógica — Monitoramento';
        summary = `O aluno ${studentName} (${cycleLabel}) apresentou ${yesCount} de ${allItemsFlat.length} indicadores positivos (${percent}%) na anamnese pedagógica. Recomenda-se monitoramento contínuo, intervenção pedagógica direcionada e reavaliação em 60 dias.`;
      } else {
        profile = 'Sem indicadores significativos';
        summary = `O aluno ${studentName} (${cycleLabel}) apresentou ${yesCount} de ${allItemsFlat.length} indicadores positivos (${percent}%) na anamnese pedagógica. Não foram identificados indicadores significativos nesta triagem.`;
      }
    }

    const protocolName = protocol === 'snap_iv' ? 'SNAP-IV (TDAH)' : protocol === 'mchat' ? 'M-CHAT-R (TEA)' : 'Anamnese Neuropsicopedagógica';

    const stageResults = stages.map((stage, si) => {
      const startIdx = stages.slice(0, si).reduce((sum, s) => sum + s.items.length, 0);
      const lines = stage.items.map((item, ii) => {
        const answer = answers[`${startIdx + ii}`] || '—';
        return `  ${ii + 1}. ${item}\n     Resposta: ${answer}`;
      });
      return `▸ ${stage.title}\n${lines.join('\n')}`;
    });

    const fullReport = `RELATÓRIO DE TRIAGEM NEUROPSICOPEDAGÓGICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DADOS DO ALUNO
Nome: ${studentName}
Idade: ${studentAge || 'Não informada'}
Ciclo Escolar: ${cycleLabel}
Observador: ${observerName || 'Professor(a)'}
Protocolo: ${protocolName}
Data: ${new Date().toLocaleDateString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULTADO DA TRIAGEM
Perfil Identificado: ${profile}

${summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DETALHAMENTO POR ETAPA

${stageResults.join('\n\n')}

${observations ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nOBSERVAÇÕES DO PROFESSOR\n${observations}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMENDAÇÕES PEDAGÓGICAS
${profile.includes('TDAH') ? '• Utilizar instruções curtas e objetivas\n• Dividir tarefas longas em etapas menores\n• Oferecer intervalos programados\n• Posicionar o aluno próximo ao professor\n• Utilizar recursos visuais e destaques em negrito' :
  profile.includes('TEA') ? '• Manter rotina previsível e estruturada\n• Utilizar linguagem literal e direta\n• Evitar metáforas e expressões figuradas\n• Oferecer suporte visual (pictogramas, cronogramas)\n• Preparar antecipadamente para mudanças na rotina' :
  profile.includes('Significativa') ? '• Encaminhar para avaliação multidisciplinar\n• Elaborar PEI (Plano Educacional Individualizado)\n• Oferecer atividades diferenciadas e tempo extra\n• Comunicar família sobre as observações\n• Registrar evolução semanalmente' :
  profile.includes('Monitoramento') ? '• Acompanhamento pedagógico quinzenal\n• Atividades de reforço direcionadas\n• Observar evolução por 60 dias\n• Dialogar com a família\n• Reavaliar com este instrumento após o período' :
  '• Manter acompanhamento pedagógico regular\n• Observar o desenvolvimento ao longo do semestre\n• Dialogar com a família sobre as observações'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ AVISO IMPORTANTE
Este documento é uma triagem pedagógica de apoio baseada em
protocolos internacionais via Piffer EduTech.
NÃO substitui o laudo clínico.

© 2026 PIFFER EDUTECH — Tecnologia Assistiva Autoral por Matheus Lima Piffer`;

    setReportText(fullReport);
    setDetectedProfile(profile);
    setReportGenerated(true);
    setStep('report');
    toast({ title: '✅ Relatório de triagem gerado!' });
  };

  const handlePdf = async () => {
    const el = document.getElementById('triagem-report');
    if (!el) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: [20, 15, 20, 15],
        filename: `Triagem_${studentName.replace(/\s+/g, '_') || 'Aluno'}.pdf`,
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
      const blob: Blob = await html2pdf().set({
        margin: [20, 15, 20, 15],
        filename: `Triagem_${studentName.replace(/\s+/g, '_') || 'Aluno'}.pdf`,
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).outputPdf('blob');

      const file = new File([blob], `Triagem_${studentName.replace(/\s+/g, '_') || 'Aluno'}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Triagem — ${studentName}`, files: [file] });
      } else {
        // Fallback WhatsApp text
        const msg = `🧠 *Triagem Neuropsicopedagógica — ${studentName}*\n\n📋 Perfil: ${detectedProfile}\n📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n⚠️ Triagem pedagógica de apoio via Piffer EduTech.\n\n✅ Relatório completo disponível em PDF.`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast({ title: 'Erro ao compartilhar', description: e.message, variant: 'destructive' });
      }
    }
  };

  const handleWhatsApp = () => {
    const msg = `🧠 *Triagem Neuropsicopedagógica — ${studentName}*\n\n📋 Perfil Identificado: ${detectedProfile}\n🎓 Ciclo: ${cycleLabel}\n📅 Data: ${new Date().toLocaleDateString('pt-BR')}\n\n⚠️ Este documento é uma triagem pedagógica de apoio via Piffer EduTech. Não substitui o laudo clínico.\n\n✅ Tecnologia Assistiva Autoral por Matheus Lima Piffer`;
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
                Triagem Neuro
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              Triagem e Anamnese<br />Neuropsicopedagógica
            </h2>
            <p className="text-sm text-slate-400 mt-3 max-w-md leading-relaxed">
              Protocolos internacionais SNAP-IV, M-CHAT e Anamnese personalizada com relatório de apoio pedagógico.
            </p>
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
                <SelectItem value="snap_iv">SNAP-IV — Triagem para TDAH</SelectItem>
                <SelectItem value="mchat">M-CHAT-R — Triagem para TEA</SelectItem>
                <SelectItem value="anamnese">Anamnese Neuropsicopedagógica Geral</SelectItem>
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
            <span>Etapa {currentStage + 1} de {stages.length}: {stages[currentStage]?.title}</span>
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
            <p className="text-xs text-muted-foreground">{currentStageItems.length} perguntas nesta etapa</p>
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
          <h3 className="text-lg font-black text-foreground">📝 Observações do Professor</h3>
          <p className="text-xs text-muted-foreground">Adicione observações complementares sobre o comportamento do aluno em sala de aula, contexto familiar ou qualquer informação relevante.</p>
          <Textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            placeholder="Descreva comportamentos observados, contexto familiar relevante, interações com colegas, etc."
            className="min-h-[150px] rounded-2xl"
          />

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
              GERAR RELATÓRIO DE TRIAGEM
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
            <p className="text-xs text-muted-foreground">Tecnologia Assistiva Autoral — Triagem Neuropsicopedagógica</p>
          </div>

          {/* Profile badge */}
          <div className={`p-4 rounded-2xl mb-6 ${detectedProfile.includes('Sem indicadores') ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="text-xs font-black uppercase tracking-wider mb-1 ${detectedProfile.includes('Sem indicadores') ? 'text-emerald-700' : 'text-amber-700'}">
              Perfil Identificado
            </p>
            <p className={`text-lg font-black ${detectedProfile.includes('Sem indicadores') ? 'text-emerald-800' : 'text-amber-800'}`}>
              {detectedProfile}
            </p>
          </div>

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
              Com base no perfil identificado ({detectedProfile}), deseja adaptar uma atividade agora para este aluno?
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
          onClick={() => { setReportGenerated(false); setAnswers({}); setReportText(''); setDetectedProfile(''); setCurrentStage(0); setStep('setup'); }}
          variant="outline"
          className="rounded-2xl gap-2"
        >
          <ClipboardList className="h-4 w-4" /> Nova Triagem
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        ⚠️ Triagem de Apoio Pedagógico — Não substitui o laudo médico · PIFFER EDUTECH © 2026
      </p>
    </div>
  );
}
