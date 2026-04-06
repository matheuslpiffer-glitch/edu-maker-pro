import type { MindMapQuestion } from '@/components/mindmap/MindMapVisual';

interface Props {
  questions: MindMapQuestion[];
  institutionName?: string;
  theme?: string;
}

export default function MindMapQuestions({ questions, institutionName, theme }: Props) {
  if (!questions.length) return null;

  return (
    <div
      className="bg-white text-black p-8 max-w-[210mm] mx-auto"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11pt',
        pageBreakBefore: 'always',
      }}
      data-pdf-section="mindmap-questions"
    >
      {/* Header */}
      <div className="text-center mb-4 border-b-2 border-black pb-3">
        <p className="text-xs font-bold uppercase">{institutionName || 'INSTITUIÇÃO DE ENSINO'}</p>
        <p className="text-sm font-bold uppercase mt-1">QUESTÕES DE ANÁLISE DO INFOGRÁFICO</p>
        {theme && <p className="text-xs uppercase mt-1">TEMA: {theme}</p>}
      </div>

      <div className="mb-4 space-y-2" style={{ fontSize: '10pt' }}>
        <p>NOME: _________________________________________________________ Nº: ______</p>
        <p>TURMA: _________________ DATA: ____/____/________ TURNO: ______________</p>
      </div>

      <div className="mb-2">
        <p className="font-bold uppercase text-xs mb-3">
          📝 OBSERVE O INFOGRÁFICO ATENTAMENTE E RESPONDA ÀS QUESTÕES ABAIXO:
        </p>
      </div>

      <div className="space-y-5">
        {questions.map((q) => (
          <div key={q.number} style={{ breakInside: 'avoid' }}>
            <p style={{
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '11pt',
              lineHeight: '1.15',
            }}>
              {q.number}. {q.question}
            </p>
            <div className="mt-2 border-b border-gray-300" style={{ height: '60px' }} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-2 border-t border-gray-300 text-center" style={{ fontSize: '7pt', color: '#9CA3AF' }}>
        <p className="uppercase">QUESTÕES DE ANÁLISE — INFOGRÁFICO PEDAGÓGICO — EDUCREATOR PRO</p>
      </div>
    </div>
  );
}
