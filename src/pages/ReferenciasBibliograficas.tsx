import { BookOpenCheck, ExternalLink } from 'lucide-react';

const references = [
  {
    title: 'BNCC — Base Nacional Comum Curricular',
    description: 'Documento normativo que define o conjunto orgânico e progressivo de aprendizagens essenciais que todos os alunos devem desenvolver ao longo das etapas da Educação Básica.',
    source: 'MEC — Ministério da Educação',
    url: 'http://basenacionalcomum.mec.gov.br/',
  },
  {
    title: 'Matrizes de Referência do SAEB',
    description: 'Matrizes de Língua Portuguesa e Matemática que orientam a elaboração dos itens do Sistema de Avaliação da Educação Básica, organizadas por tópicos e descritores de competência.',
    source: 'INEP / MEC',
    url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/saeb',
  },
  {
    title: 'Matrizes de Referência do ENEM',
    description: 'Documento oficial do INEP que apresenta as competências e habilidades avaliadas no Exame Nacional do Ensino Médio, organizadas por áreas do conhecimento.',
    source: 'INEP / MEC',
    url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem',
  },
  {
    title: 'SARESP — Sistema de Avaliação de Rendimento Escolar do Estado de São Paulo',
    description: 'Avaliação externa aplicada anualmente pela Secretaria da Educação do Estado de São Paulo para medir o desempenho dos alunos em Língua Portuguesa e Matemática, com base em escalas de proficiência.',
    source: 'SEDUC-SP — Secretaria da Educação do Estado de São Paulo',
    url: 'https://www.educacao.sp.gov.br/',
  },
  {
    title: 'Prova Paulista — Avaliação Bimestral',
    description: 'Avaliação diagnóstica bimestral aplicada pela Secretaria da Educação de São Paulo para acompanhar o desenvolvimento das aprendizagens dos estudantes ao longo do ano letivo.',
    source: 'SEDUC-SP — Secretaria da Educação do Estado de São Paulo',
    url: 'https://www.educacao.sp.gov.br/',
  },
  {
    title: 'Diretrizes do PISA (OCDE)',
    description: 'Quadro de referência do Programme for International Student Assessment, que avalia competências em Leitura, Matemática e Ciências de estudantes de 15 anos em escala internacional.',
    source: 'OCDE (Organização para a Cooperação e Desenvolvimento Econômico)',
    url: 'https://www.oecd.org/pisa/',
  },
  {
    title: 'Cadernos Pedagógicos da OBMEP',
    description: 'Material didático produzido pelo IMPA para a Olimpíada Brasileira de Matemática das Escolas Públicas, com problemas, soluções comentadas e estratégias de resolução.',
    source: 'IMPA / OBMEP',
    url: 'https://www.obmep.org.br/',
  },
  {
    title: 'Manuais de Atendimento Educacional Especializado (AEE)',
    description: 'Diretrizes e orientações do MEC para o Atendimento Educacional Especializado, incluindo adaptações curriculares para alunos com deficiência, TEA, TDAH e altas habilidades/superdotação.',
    source: 'SECADI / MEC',
    url: 'https://www.gov.br/mec/pt-br/assuntos/educacao-especial',
  },
  {
    title: 'Diretrizes de Acessibilidade e Design Universal para a Aprendizagem (DUA)',
    description: 'Conjunto de princípios e diretrizes que orientam o planejamento curricular flexível, promovendo múltiplas formas de engajamento, representação e ação/expressão para atender à diversidade dos estudantes.',
    source: 'CAST — Center for Applied Special Technology / MEC',
    url: 'https://www.cast.org/impact/universal-design-for-learning-udl',
  },
];

export default function ReferenciasBibliograficas() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <BookOpenCheck size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">Referências Bibliográficas</h1>
          <p className="text-sm text-muted-foreground">Bases de dados e documentos oficiais que fundamentam o motor de IA do EduCreator Pro</p>
        </div>
      </div>

      <div className="space-y-4">
        {references.map((ref, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-6 space-y-2 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h2 className="text-lg font-black text-foreground">{ref.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{ref.description}</p>
                <p className="text-xs font-semibold text-primary/70 mt-2">Fonte: {ref.source}</p>
              </div>
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 mt-1 p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground pt-4">
        EduCreator Pro — Por Matheus Lima Piffer
      </p>
    </div>
  );
}
