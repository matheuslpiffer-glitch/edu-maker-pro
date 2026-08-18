import { forwardRef } from 'react';

interface SimQuestion {
  content: string;
  options: any[];
  skillCode?: string;
  descriptor?: string;
  correctionMirror?: string;
  explanation?: string;
}

interface Props {
  questions: SimQuestion[];
  simulatorId: string;
  title: string;
  institutionName: string;
}

const EspelhoCorrecao = forwardRef<HTMLDivElement, Props>(
  ({ questions, simulatorId, title, institutionName }, ref) => {
    const shortId = simulatorId.slice(0, 8).toUpperCase();

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto"
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '11pt',
          lineHeight: '1.6',
          pageBreakBefore: 'always',
        }}
        data-pdf-section="espelho-correcao"
      >
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-lg font-bold uppercase">
            {institutionName || 'Instituição de Ensino'}
          </h1>
          <h2 className="text-base font-bold mt-1 uppercase tracking-wider">
            ESPELHO DE CORREÇÃO — 2ª FASE
          </h2>
          <p className="text-sm font-semibold mt-1">{title || 'Simulado'}</p>
          <p className="text-xs mt-2 font-mono text-gray-500">
            ID do Simulado: {shortId}
          </p>
        </div>

        {questions.map((q, i) => (
          <div key={i} className="mb-6 border-b border-gray-200 pb-4" style={{ pageBreakInside: 'avoid' }}>
            <p className="font-bold mb-2">
              Questão {String(i + 1).padStart(2, '0')}
              {q.skillCode && (
                <span className="text-xs font-normal text-gray-500 ml-2">[{q.skillCode}]</span>
              )}
            </p>
            {q.correctionMirror ? (
              <div className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200 mb-3">
                <div className="font-bold text-[9pt] uppercase text-gray-500 mb-1">Critérios de Avaliação / Espelho:</div>
                {q.correctionMirror}
              </div>
            ) : null}
            {q.explanation ? (
              <div className="text-sm whitespace-pre-wrap bg-blue-50/30 p-4 rounded border border-blue-100">
                <div className="font-bold text-[9pt] uppercase text-blue-600 mb-1">Resolução Comentada / Justificativa:</div>
                {q.explanation}
              </div>
            ) : null}
            {!q.correctionMirror && !q.explanation && (
              <p className="text-sm text-gray-400 italic">Resolução/Espelho não disponível.</p>
            )}
          </div>
        ))}

        <div className="border-t-2 border-black pt-4 flex justify-between text-xs text-gray-600">
          <div>
            <p>Total de questões: {questions.length}</p>
            <p>ID: {shortId}</p>
          </div>
          <div className="text-right">
            <p>Documento gerado por EduCreator</p>
            <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <p className="text-center mt-4" style={{ fontSize: '8pt', color: '#c0c0c0', letterSpacing: '0.05em' }}>
          EduCreator Pro • Matheus Piffer
        </p>
      </div>
    );
  }
);

EspelhoCorrecao.displayName = 'EspelhoCorrecao';
export default EspelhoCorrecao;
