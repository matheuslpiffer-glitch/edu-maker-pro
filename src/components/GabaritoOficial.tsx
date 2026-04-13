import { forwardRef } from 'react';

interface QuestionOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

interface SimQuestion {
  content: string;
  options: QuestionOption[];
  skillCode?: string;
  descriptor?: string;
}

interface Props {
  questions: SimQuestion[];
  simulatorId: string;
  title: string;
  institutionName: string;
  examType?: string;
}

const EXAM_LABELS: Record<string, string> = {
  saresp: 'Avaliação de Larga Escala',
  prova_paulista: 'Avaliação Regional',
  ade: 'Avaliação Diagnóstica (ADE)',
  saeb: 'Avaliação Nacional',
};

const GabaritoOficial = forwardRef<HTMLDivElement, Props>(
  ({ questions, simulatorId, title, institutionName, examType }, ref) => {
    const shortId = simulatorId.slice(0, 8).toUpperCase();

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto"
        style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: '12pt',
          lineHeight: '1.15',
          pageBreakBefore: 'always',
        }}
        data-pdf-section="gabarito-oficial"
      >
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-lg font-bold uppercase">
            {institutionName || 'Instituição de Ensino'}
          </h1>
          <h2 className="text-base font-bold mt-1 uppercase tracking-wider">
            GABARITO OFICIAL
          </h2>
          <p className="text-sm font-semibold mt-1">{title || 'Simulado'}</p>
          {examType && (
            <p className="text-xs mt-1 text-gray-600 uppercase">
              {EXAM_LABELS[examType] || examType}
            </p>
          )}
          <p className="text-xs mt-2 font-mono text-gray-500">
            ID do Simulado: {shortId}
          </p>
        </div>

        {/* Answer key table */}
        <table
          className="w-full border-collapse mb-6"
          style={{ fontSize: '11pt' }}
        >
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 px-3 w-20">Questão</th>
              <th className="text-center py-2 px-3 w-24">Resposta</th>
              <th className="text-left py-2 px-3">
                Habilidade / Descritor
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => {
              const correctOption = q.options.find((o) => o.isCorrect);
              return (
                <tr
                  key={i}
                  className={`border-b border-gray-300 ${i % 2 === 0 ? 'bg-gray-50' : ''}`}
                >
                  <td className="py-2 px-3 font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-lg">
                    {correctOption?.letter || '—'}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-600">
                    {q.skillCode && <span className="font-medium">{q.skillCode}</span>}
                    {q.skillCode && q.descriptor && ' — '}
                    {q.descriptor && <span>{q.descriptor}</span>}
                    {!q.skillCode && !q.descriptor && '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div className="border-t-2 border-black pt-4 flex justify-between text-xs" style={{ color: '#666' }}>
          <div>
            <p>TOTAL DE QUESTÕES: {questions.length}</p>
            <p>ID DO SIMULADO: {shortId}</p>
          </div>
          <div className="text-right">
            <p>GERADO POR EDUCREATOR PRO</p>
            <p>DATA: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Footer Piffer */}
        <div className="mt-6 pt-3 border-t border-gray-300 text-center" style={{ pageBreakInside: 'avoid' }}>
          <p style={{ fontSize: '10pt', color: '#555' }}>
            VAMOS ILUMINAR JUNTOS O CAMINHO DO SEU ALUNO? ✨
          </p>
          <p className="mt-1" style={{ fontFamily: "'Dancing Script', cursive", fontSize: '16pt', color: '#333' }}>
            Matheus Lima Piffer
          </p>
        </div>

        {/* Watermark */}
        <p className="text-center mt-3" style={{ fontSize: '8pt', color: 'rgba(0,0,0,0.1)', letterSpacing: '0.1em' }}>
          EDUCREATOR PRO SYSTEMS — GABARITO OFICIAL
        </p>
      </div>
    );
  }
);

GabaritoOficial.displayName = 'GabaritoOficial';
export default GabaritoOficial;
