import { BookOpen, Presentation, Lightbulb, ClipboardList, BarChart3, CalendarDays, Printer, Shield, Users, QrCode, TrendingUp, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const modules = [
  {
    icon: Presentation,
    title: 'EduSlides',
    badge: 'IA',
    description: 'Gere roteiros de aula em 8-12 slides com design acadêmico (Azul Marinho/Dourado). A habilidade BNCC é exibida no topo de cada slide, garantindo alinhamento ao Currículo Paulista.',
    steps: ['Selecione disciplina, série e tema', 'A IA gera o roteiro completo', 'Edite, apresente ou exporte (PPTX/PDF)'],
  },
  {
    icon: Lightbulb,
    title: 'EduBank — Banco de Itens',
    badge: 'IA',
    description: 'Gerador de listas de exercícios por proficiência (Fácil, Médio, Difícil) para Aula Regular, Reforço ou Plano de Ausência. Inclui Gabarito Comentado para o professor.',
    steps: ['Defina disciplina, tema e quantidade por nível', 'A IA gera questões com distratores pedagógicos', 'Imprima a Folha de Atividades + Gabarito'],
  },
  {
    icon: ClipboardList,
    title: 'Simulados Elite',
    badge: 'IA',
    description: 'Cadernos de prova padrão SARESP, SAEB, Prova Paulista e ADE com 5 alternativas (A-E), Folha de Respostas com bolinhas e QR Code de autenticação.',
    steps: ['Escolha o tipo de avaliação e habilidades', 'A IA gera as questões e o gabarito', 'Exporte o caderno de prova + folha de respostas'],
  },
  {
    icon: BarChart3,
    title: 'Analytics MMR',
    badge: 'Dados',
    description: 'Lance acertos dos alunos e obtenha dashboards com distribuição por proficiência, medidor de meta IDESP e insights pedagógicos gerados por IA.',
    steps: ['Selecione o simulado e lance os acertos', 'Visualize KPIs e gráficos de distribuição', 'Receba recomendações pedagógicas da IA'],
  },
  {
    icon: TrendingUp,
    title: 'Evolução Pedagógica',
    badge: 'Dados',
    description: 'Acompanhamento longitudinal que compara resultados ao longo do ano. Gráficos de tendência com marcadores de Metas MMR para monitorar o progresso IDESP.',
    steps: ['Compare avaliações (ADE, bimestres)', 'Analise tendências de evolução', 'Gere relatórios para supervisão'],
  },
  {
    icon: CalendarDays,
    title: 'Agenda Estratégica & Atas',
    badge: 'Gestão',
    description: 'Calendário de reuniões (ATPC, Conselhos, Gestão) com geração automática de atas via EduSlides, assinatura digital e notificações via WhatsApp.',
    steps: ['Crie o evento e adicione professores', 'Envie o link de assinatura via WhatsApp', 'Acompanhe assinaturas em tempo real'],
  },
  {
    icon: Users,
    title: 'Assinatura Digital',
    badge: 'Gestão',
    description: 'Sistema de assinatura sem login. Cada professor recebe um link individual via WhatsApp e assina com um clique. O painel do coordenador atualiza em tempo real.',
    steps: ['O coordenador cria a reunião', 'Links individuais são gerados automaticamente', 'Professor acessa e assina com um clique'],
  },
  {
    icon: Printer,
    title: 'Engenharia de Impressão',
    badge: 'Layout',
    description: 'Todos os documentos são otimizados para papel A4 com margens rigorosas (20mm topo/base, 15mm laterais), tipografia 11pt e word-break para evitar estouros.',
    steps: ['Clique em "Visualizar / Imprimir"', 'O layout A4 é gerado automaticamente', 'Exporte como PDF ou imprima direto'],
  },
];

export default function SystemGuide() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary mb-4">
          <BookOpen size={32} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Guia do Sistema</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Manual de gestão pedagógica do <strong>EduCreator Pro 2026</strong> — Escola PEI • Limeira/SP.
          Conheça cada módulo e comece a usar em segundos.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: 'Módulos IA', value: '3', icon: Lightbulb },
          { label: 'Exportações', value: 'PDF / PPTX / DOCX', icon: FileText },
          { label: 'Autenticação', value: 'QR Code', icon: QrCode },
          { label: 'Segurança', value: 'RLS por Usuário', icon: Shield },
        ].map(s => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon size={20} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {modules.map(m => (
          <Card key={m.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <m.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{m.badge}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-sm leading-relaxed">{m.description}</CardDescription>
              <ol className="space-y-1.5">
                {m.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 text-center text-xs text-muted-foreground pb-6">
        EduCreator Pro 2026 • Plataforma de Governança Pedagógica • Escola PEI — Limeira/SP
      </div>
    </div>
  );
}
