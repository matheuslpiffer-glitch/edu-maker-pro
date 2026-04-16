import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, ArrowLeft, Brain, CheckCircle2, FileDown, Lightbulb, ClipboardList,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

/* ── SNAP-IV (TDAH) ── */
const SNAP_IV_ITEMS = [
  'Não consegue prestar muita atenção a detalhes ou comete erros por descuido',
  'Tem dificuldade de manter a atenção em tarefas ou atividades lúdicas',
  'Parece não escutar quando lhe dirigem a palavra',
  'Não segue instruções e não termina deveres escolares',
  'Tem dificuldade para organizar tarefas e atividades',
  'Evita ou reluta em se envolver em tarefas que exijam esforço mental prolongado',
  'Perde objetos necessários para tarefas ou atividades',
  'É facilmente distraído por estímulos alheios à tarefa',
  'Apresenta esquecimento em atividades diárias',
  'Agita as mãos ou os pés ou se remexe na cadeira',
  'Abandona sua cadeira em sala de aula ou situações nas quais se espera que permaneça sentado',
  'Corre ou escala em situações inapropriadas',
  'Tem dificuldade para brincar ou envolver-se silenciosamente em atividades de lazer',
  'Está "a mil" ou age como se estivesse "a todo vapor"',
  'Fala em demasia',
  'Dá respostas precipitadas antes das perguntas terem sido completadas',
  'Tem dificuldade para aguardar sua vez',
  'Interrompe ou se intromete em assuntos de outros',
];

/* ── M-CHAT (TEA) ── */
const MCHAT_ITEMS = [
  'A criança gosta de ser balançada, de pular no seu joelho, etc.?',
  'A criança tem interesse por outras crianças?',
  'A criança gosta de subir em coisas, como escadas?',
  'A criança gosta de brincar de esconde-esconde?',
  'A criança brinca de faz-de-conta (ex: falar ao telefone, cuidar de bonecas)?',
  'A criança usa o dedo indicador para apontar, para pedir alguma coisa?',
  'A criança usa o dedo indicador para apontar, para indicar interesse em algo?',
  'A criança consegue brincar de forma correta com brinquedos pequenos?',
  'A criança alguma vez trouxe objetos para você (pais) para lhe mostrar?',
  'A criança olha para você no olho por mais de um segundo ou dois?',
  'A criança parece ser excessivamente sensível ao barulho?',
  'A criança sorri em resposta ao seu rosto ou ao seu sorriso?',
  'A criança imita você? (ex: você faz expressão e ela imita)',
  'A criança responde quando você chama pelo nome dela?',
  'Se você apontar um brinquedo do outro lado do cômodo, a criança olha para ele?',
  'A criança anda?',
  'A criança olha para coisas que você está olhando?',
  'A criança faz movimentos estranhos com os dedos perto do rosto?',
  'A criança tenta atrair a sua atenção para a atividade dela?',
  'Você já se perguntou se a criança é surda?',
];

const SCALE_OPTIONS = ['Nem um pouco', 'Um pouco', 'Bastante', 'Demais'];
const YES_NO = ['Sim', 'Não'];

type Protocol = 'snap_iv' | 'mchat';

interface TriagemNeuroProps {
  onBack: () => void;
  onAdaptFromProfile?: (profile: string) => void;
}

export default function TriagemNeuro({ onBack, onAdaptFromProfile }: TriagemNeuroProps) {
  const { toast } = useToast();
  const [protocol, setProtocol] = useState<Protocol>('snap_iv');
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [observerName, setObserverName] = useState('');
  const [observations, setObservations] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportText, setReportText] = useState('');
  const [detectedProfile, setDetectedProfile] = useState('');

  const items = protocol === 'snap_iv' ? SNAP_IV_ITEMS : MCHAT_ITEMS;
  const scaleOpts = protocol === 'snap_iv' ? SCALE_OPTIONS : YES_NO;
  const allAnswered = items.every((_, i) => answers[i] !== undefined);

  const handleGenerateReport = () => {
    if (!studentName.trim()) {
      toast({ title: 'Preencha o nome do aluno', variant: 'destructive' });
      return;
    }

    let profile = '';
    let summary = '';

    if (protocol === 'snap_iv') {
      const scores = items.map((_, i) => SCALE_OPTIONS.indexOf(answers[i] || 'Nem um pouco'));
      const inattention = scores.slice(0, 9).reduce((a, b) => a + b, 0);
      const hyperactivity = scores.slice(9).reduce((a, b) => a + b, 0);
      const inattentionAvg = (inattention / 9).toFixed(1);
      const hyperactivityAvg = (hyperactivity / 9).toFixed(1);

      if (Number(inattentionAvg) >= 1.5 && Number(hyperactivityAvg) >= 1.5) {
        profile = 'TDAH — Apresentação Combinada';
        summary = `O aluno ${studentName} apresentou média de ${inattentionAvg} nos itens de Desatenção e ${hyperactivityAvg} nos itens de Hiperatividade/Impulsividade do protocolo SNAP-IV. Os indicadores sugerem possível apresentação combinada de TDAH. Recomenda-se encaminhamento para avaliação neuropsicológica especializada.`;
      } else if (Number(inattentionAvg) >= 1.5) {
        profile = 'TDAH — Predominantemente Desatento';
        summary = `O aluno ${studentName} apresentou média de ${inattentionAvg} nos itens de Desatenção do protocolo SNAP-IV, acima do ponto de corte (1.5). Os indicadores sugerem possível TDAH com predominância desatenta. Recomenda-se encaminhamento para avaliação especializada.`;
      } else if (Number(hyperactivityAvg) >= 1.5) {
        profile = 'TDAH — Predominantemente Hiperativo/Impulsivo';
        summary = `O aluno ${studentName} apresentou média de ${hyperactivityAvg} nos itens de Hiperatividade/Impulsividade do protocolo SNAP-IV, acima do ponto de corte (1.5). Recomenda-se encaminhamento para avaliação especializada.`;
      } else {
        profile = 'Sem indicadores significativos';
        summary = `O aluno ${studentName} apresentou médias de ${inattentionAvg} (Desatenção) e ${hyperactivityAvg} (Hiperatividade) no protocolo SNAP-IV, ambas abaixo do ponto de corte (1.5). Não foram identificados indicadores significativos nesta triagem.`;
      }
    } else {
      const criticalItems = [2, 7, 9, 13, 14, 15];
      const negativeAnswers = items.map((_, i) => {
        const isNegativeQuestion = [11, 18, 20].includes(i + 1);
        return isNegativeQuestion ? answers[i] === 'Sim' : answers[i] === 'Não';
      });
      const totalFails = negativeAnswers.filter(Boolean).length;
      const criticalFails = criticalItems.filter(idx => negativeAnswers[idx - 1]).length;

      if (totalFails >= 3 || criticalFails >= 2) {
        profile = 'TEA — Risco Identificado';
        summary = `O aluno ${studentName} apresentou ${totalFails} itens sinalizados no M-CHAT (${criticalFails} em itens críticos). Os indicadores sugerem risco para Transtorno do Espectro Autista (TEA). Recomenda-se encaminhamento imediato para avaliação diagnóstica especializada com neuropediatra.`;
      } else {
        profile = 'Sem indicadores significativos';
        summary = `O aluno ${studentName} apresentou ${totalFails} itens sinalizados no M-CHAT (${criticalFails} em itens críticos), abaixo do ponto de corte. Não foram identificados indicadores significativos para TEA nesta triagem. Recomenda-se acompanhamento contínuo.`;
      }
    }

    const fullReport = `RELATÓRIO DE TRIAGEM E APOIO PEDAGÓGICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DADOS DO ALUNO
Nome: ${studentName}
Idade: ${studentAge || 'Não informada'}
Observador: ${observerName || 'Professor(a)'}
Protocolo: ${protocol === 'snap_iv' ? 'SNAP-IV (TDAH)' : 'M-CHAT-R (TEA)'}
Data: ${new Date().toLocaleDateString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULTADO DA TRIAGEM
Perfil Identificado: ${profile}

${summary}

${observations ? `\nOBSERVAÇÕES DO PROFESSOR:\n${observations}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMENDAÇÕES PEDAGÓGICAS
${profile.includes('TDAH') ? '• Utilizar instruções curtas e objetivas\n• Dividir tarefas longas em etapas menores\n• Oferecer intervalos programados\n• Posicionar o aluno próximo ao professor\n• Utilizar recursos visuais e destaques em negrito' :
  profile.includes('TEA') ? '• Manter rotina previsível e estruturada\n• Utilizar linguagem literal e direta\n• Evitar metáforas e expressões figuradas\n• Oferecer suporte visual (pictogramas, cronogramas)\n• Preparar antecipadamente para mudanças na rotina' :
  '• Manter acompanhamento pedagógico regular\n• Observar o desenvolvimento ao longo do semestre\n• Dialogar com a família sobre as observações'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ AVISO IMPORTANTE: Este documento constitui uma Triagem de Apoio Pedagógico e NÃO substitui o laudo médico ou avaliação neuropsicológica profissional.

© 2026 PIFFER EDUTECH — Tecnologia Assistiva Autoral por Matheus Lima Piffer`;

    setReportText(fullReport);
    setDetectedProfile(profile);
    setReportGenerated(true);
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

  const suggestedAeeProfile = detectedProfile.includes('TDAH') ? 'aee_tdah' : detectedProfile.includes('TEA') ? 'aee_tea' : '';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
            Triagem e Anamnese<br />Neuroeducacional
          </h2>
          <p className="text-sm text-slate-400 mt-3 max-w-md leading-relaxed">
            Questionários baseados em protocolos internacionais (SNAP-IV / M-CHAT). Gere relatórios de apoio pedagógico.
          </p>
        </div>
      </div>

      {!reportGenerated ? (
        <div className="bg-card rounded-[2rem] border p-6 sm:p-8 space-y-6">
          {/* Protocol selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Protocolo de Triagem</Label>
            <Select value={protocol} onValueChange={(v) => { setProtocol(v as Protocol); setAnswers({}); }}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="snap_iv">SNAP-IV — Triagem para TDAH</SelectItem>
                <SelectItem value="mchat">M-CHAT-R — Triagem para TEA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Student data */}
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

          {/* Questions */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {protocol === 'snap_iv' ? 'Escala SNAP-IV' : 'M-CHAT-R — Checklist'}
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
              {items.map((item, i) => (
                <div key={i} className="p-4 rounded-xl border bg-muted/30 space-y-2">
                  <p className="text-sm font-medium text-foreground"><span className="font-black text-muted-foreground mr-2">{i + 1}.</span>{item}</p>
                  <RadioGroup
                    value={answers[i] || ''}
                    onValueChange={v => setAnswers(prev => ({ ...prev, [i]: v }))}
                    className="flex flex-wrap gap-2"
                  >
                    {scaleOpts.map(opt => (
                      <label key={opt} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-bold transition-all ${
                        answers[i] === opt ? 'bg-rose-50 border-rose-400 text-rose-700' : 'border-transparent bg-muted/50 hover:border-border text-muted-foreground'
                      }`}>
                        <RadioGroupItem value={opt} className="sr-only" />
                        {opt}
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações do Professor (Opcional)</Label>
            <Textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Descreva comportamentos observados em sala de aula, contexto familiar relevante, etc."
              className="min-h-[100px] rounded-2xl"
            />
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={!allAnswered || !studentName.trim()}
            size="lg"
            className="w-full rounded-2xl text-white shadow-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            GERAR RELATÓRIO DE TRIAGEM
          </Button>

          {!allAnswered && (
            <p className="text-center text-xs text-muted-foreground">
              Responda todas as {items.length} questões para gerar o relatório.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Report */}
          <div id="triagem-report" className="bg-card rounded-[2rem] border p-8 space-y-4" style={{ fontFamily: 'Inter, Arial, sans-serif', position: 'relative' }}>
            {/* Watermark */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: '4rem', fontWeight: 900, color: 'rgba(15, 23, 42, 0.04)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
              PIFFER EDUTECH
            </div>

            <div className="relative z-10">
              <div className="text-center border-b pb-4 mb-4">
                <h2 className="text-lg font-black text-foreground">PIFFER EDUTECH</h2>
                <p className="text-xs text-muted-foreground">Tecnologia Assistiva Autoral</p>
              </div>

              <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
                {reportText}
              </pre>
            </div>
          </div>

          {/* Flow Intelligence: suggest adaptation */}
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
            <Button onClick={() => { setReportGenerated(false); setAnswers({}); setReportText(''); setDetectedProfile(''); }} variant="outline" className="rounded-2xl gap-2">
              <ClipboardList className="h-4 w-4" /> Nova Triagem
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        ⚠️ Triagem de Apoio Pedagógico — Não substitui o laudo médico · PIFFER EDUTECH © 2026
      </p>
    </div>
  );
}
