import { QRCodeSVG } from 'qrcode.react';
import { buildPublicAppUrl } from '@/lib/public-links';

interface Props {
  questionCount: number;
  simulatorId?: string;
  title: string;
  institutionName: string;
  teacherName?: string;
  className?: string;
  date?: string;
  logoUrl?: string;
}

export default function AnswerSheet({
  questionCount, simulatorId, title, institutionName,
  teacherName, className, date, logoUrl,
}: Props) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const questions = Array.from({ length: questionCount }, (_, i) => i + 1);
  const qrUrl = simulatorId ? buildPublicAppUrl(`/simulado/${simulatorId}`) : '';

  // Layout: use 2-col grid when ≤30 questions, 3-col when more
  const cols = questionCount <= 30 ? 2 : 3;

  return (
    <div
      className="bg-white text-black max-w-[210mm] mx-auto relative"
      style={{
        fontFamily: "'Nunito', sans-serif",
        fontSize: '12pt',
        padding: '20mm',
        pageBreakBefore: 'always',
        boxSizing: 'border-box',
      }}
      data-pdf-section="answer-sheet"
    >
      {/* Watermark */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          bottom: '25mm', right: '20mm',
          fontSize: '8pt', color: 'rgba(0,0,0,0.08)',
          letterSpacing: '0.1em', transform: 'rotate(-15deg)',
          whiteSpace: 'nowrap',
        }}
      >
        EDUCREATOR PRO SYSTEMS — GABARITO OFICIAL
      </div>

      {/* ─── Header ─── */}
      <div className="text-center mb-4 border-b-2 border-black pb-3">
        <div className="flex items-center justify-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-12 object-contain" style={{ minHeight: 'unset', background: 'transparent' }} />
          )}
          <div>
            <h2 className="font-bold uppercase" style={{ fontSize: '14pt' }}>
              {institutionName || 'NOME DA ESCOLA'}
            </h2>
            {teacherName && (
              <p className="text-sm mt-0.5">PROF. {teacherName.toUpperCase()}</p>
            )}
          </div>
        </div>
        <h3 className="font-semibold mt-2 uppercase" style={{ fontSize: '13pt' }}>
          FOLHA DE RESPOSTAS — {title || 'SIMULADO'}
        </h3>
      </div>

      {/* Student fields */}
      <div className="mb-4 space-y-2" style={{ fontSize: '11pt' }}>
        <p>ALUNO(A): _____________________________________________________________ Nº: ______</p>
        <p>TURMA: _________________ DATA: ____/____/________ {className && `(${className.toUpperCase()})`}</p>
      </div>

      {/* Instruction */}
      <div className="mb-4 p-2 border border-gray-400 rounded text-center" style={{ fontSize: '9pt', background: '#fafafa' }}>
        <strong>INSTRUÇÕES:</strong> PREENCHA TOTALMENTE O CÍRCULO CORRESPONDENTE À SUA RESPOSTA COM CANETA PRETA OU AZUL.
        NÃO RASURE. MARQUE APENAS UMA ALTERNATIVA POR QUESTÃO.
      </div>

      {/* ─── Answer Grid ─── */}
      <div className="border-2 border-black p-4 mb-6">
        <h4 className="text-center font-bold uppercase mb-4 border-b border-black pb-2" style={{ fontSize: '12pt' }}>
          GABARITO — {questionCount} QUESTÕES
        </h4>
        <div
          className="gap-x-8 gap-y-1"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {questions.map(num => (
            <div key={num} className="flex items-center gap-3 py-0.5">
              <span className="font-bold text-right" style={{ fontSize: '11pt', width: '28px' }}>
                {String(num).padStart(2, '0')}.
              </span>
              <div className="flex gap-2">
                {letters.map(letter => (
                  <div
                    key={letter}
                    className="flex items-center justify-center rounded-full border-2 border-black"
                    style={{ width: '22px', height: '22px' }}
                  >
                    <span style={{ fontSize: '9pt', fontWeight: 700 }}>{letter}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code + ID */}
      <div className="flex items-center justify-between border-t border-gray-300 pt-3">
        <div className="text-xs" style={{ color: '#666' }}>
          {simulatorId && <p>ID: {simulatorId.slice(0, 8).toUpperCase()}</p>}
          <p>TOTAL: {questionCount} QUESTÕES</p>
        </div>
        {simulatorId && qrUrl && (
          <div className="flex flex-col items-center">
            <QRCodeSVG value={qrUrl} size={70} level="M" />
            <span className="mt-1" style={{ fontSize: '7pt', color: '#999' }}>QR CODE DE CORREÇÃO</span>
          </div>
        )}
      </div>

      {/* ─── Footer Piffer ─── */}
      <div className="mt-6 pt-3 border-t border-gray-300 text-center" style={{ pageBreakInside: 'avoid' }}>
        <p style={{ fontSize: '10pt', color: '#555' }}>
          VAMOS ILUMINAR JUNTOS O CAMINHO DO SEU ALUNO? ✨
        </p>
        <p className="mt-1" style={{ fontFamily: "'Dancing Script', cursive", fontSize: '16pt', color: '#333' }}>
          Matheus Lima Piffer
        </p>
      </div>
    </div>
  );
}
