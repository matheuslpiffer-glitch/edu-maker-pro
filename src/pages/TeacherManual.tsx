import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck, Presentation, ClipboardList, BarChart3, PenLine, BookOpen, Lightbulb, CalendarDays } from 'lucide-react';

const sections = [
  {
    icon: ClipboardCheck,
    title: 'EduAtas — Assinaturas Digitais',
    steps: [
      'Acesse "EduSlides" e crie uma nova reunião com tema, habilidade e série.',
      'Adicione os nomes dos professores participantes.',
      'Gere o QR Code e compartilhe via WhatsApp ou projetor.',
      'Os professores assinam pelo celular, sem necessidade de login.',
      'Exporte a ata completa com assinaturas em PDF.',
    ],
  },
  {
    icon: Presentation,
    title: 'EduSlides — Roteiros de Aula com IA',
    steps: [
      'Selecione o componente curricular, a série e a habilidade BNCC.',
      'Clique em "Gerar Roteiro" e aguarde a IA montar os slides.',
      'Revise e edite cada slide conforme necessário.',
      'Exporte como PDF ou apresentação PPTX.',
    ],
  },
  {
    icon: ClipboardList,
    title: 'Simuladores Elite — Provas Padrão BNCC/SAEB',
    steps: [
      'Escolha a área de conhecimento, série e tipo de prova.',
      'Selecione as habilidades que deseja avaliar.',
      'A IA gera as questões com distratores calibrados.',
      'Revise, ajuste e exporte o caderno de prova em PDF A4.',
      'O gabarito e a folha de respostas são gerados automaticamente.',
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics MMR — Análise de Resultados',
    steps: [
      'Acesse "Análise de Resultados" e selecione um simulado.',
      'Importe as respostas dos alunos ou digite manualmente.',
      'Visualize mapas de calor por habilidade e nível de proficiência.',
      'Acompanhe a evolução temporal das turmas.',
    ],
  },
  {
    icon: BookOpen,
    title: 'Banco de Questões',
    steps: [
      'Crie questões manualmente ou use o gerador com IA.',
      'Organize por disciplina, tópico e nível de dificuldade.',
      'Monte provas personalizadas selecionando questões do banco.',
    ],
  },
  {
    icon: PenLine,
    title: 'Redação ENEM — Simulador e Corretor IA',
    steps: [
      'Crie temas com textos motivadores e comando de redação.',
      'Os alunos escrevem e fotografam a redação.',
      'A IA corrige nas 5 competências do ENEM com justificativas.',
    ],
  },
];

export default function TeacherManual() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Manual do Professor</h1>
        <p className="text-muted-foreground mt-2">Guia completo com passo a passo de cada módulo do EduCreator Pro.</p>
      </div>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              {section.steps.map((step, i) => (
                <li key={i} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
