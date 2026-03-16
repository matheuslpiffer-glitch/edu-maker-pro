import { QRCodeSVG } from 'qrcode.react';

interface Props {
  questionCount: number;
  simulatorId: string;
  title: string;
  institutionName: string;
}

export default function AnswerSheet({ questionCount, simulatorId, title, institutionName }: Props) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const questions = Array.from({ length: questionCount }, (_, i) => i + 1);
  const qrUrl = `${window.location.origin}/simuladores?id=${simulatorId}`;

  return (
    <div
      className="bg-white text-black p-8 max-w-[210mm] mx-auto"
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', pageBreakBefore: 'always' }}
      data-pdf-section="answer-sheet"
    >
      {/* Header */}
      <div className="text-center mb-4 border-b-2 border-black pb-3">
        <h2 className="text-base font-bold uppercase">{institutionName || 'Instituição de Ensino'}</h2>
        <h3 className="text-sm font-semibold mt-1">{title || 'Folha de Respostas'}</h3>
      </div>

      <div className="mb-4 space-y-2" style={{ fontSize: '10pt' }}>
        <p>Nome: _________________________________________________________ Nº: ______</p>
        <p>Turma: _________________ Data: ____/____/________ Turno: ______________</p>
      </div>

      <div className="border-2 border-black p-4 mb-6">
        <h4 className="text-center font-bold text-sm uppercase mb-4 border-b border-black pb-2">Gabarito - Marque apenas UMA alternativa</h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          {questions.map(num => (
            <div key={num} className="flex items-center gap-3 py-0.5">
              <span className="font-bold w-8 text-right" style={{ fontSize: '10pt' }}>
                {String(num).padStart(2, '0')}.
              </span>
              <div className="flex gap-3">
                {letters.map(letter => (
                  <div key={letter} className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center">
                      <span style={{ fontSize: '8pt', fontWeight: 600 }}>{letter}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code */}
      <div className="flex items-center justify-between border-t-2 border-black pt-4">
        <div className="text-xs text-gray-600">
          <p>ID do Simulado: {simulatorId.slice(0, 8)}</p>
          <p>Gerado por EduCreator</p>
        </div>
        <div className="flex flex-col items-center">
          <QRCodeSVG value={qrUrl} size={80} level="M" />
          <span className="text-[8pt] mt-1 text-gray-500">QR Code de Correção</span>
        </div>
      </div>
    </div>
  );
}
