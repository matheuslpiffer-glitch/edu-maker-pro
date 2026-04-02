import { forwardRef } from 'react';
import { GraduationCap } from 'lucide-react';

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
  answerLines?: number;
  correctionMirror?: string;
}

interface Props {
  title: string;
  institutionName: string;
  examType: string;
  questions: SimQuestion[];
  isDiscursiva?: boolean;
  columns?: 1 | 2;
}

const EXAM_LABELS: Record<string, string> = {
  saresp: 'Avaliação Paulista',
  prova_paulista: 'Prova Paulista',
  ade: 'Avaliação Diagnóstica (ADE)',
  saeb: 'SAEB',
};

const SimulatorPreview = forwardRef<HTMLDivElement, Props>(({ title, institutionName, examType, questions, isDiscursiva, columns = 1 }, ref) => {
  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 max-w-[210mm] w-full mx-auto box-border"
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%', boxSizing: 'border-box' }}
      data-pdf-section="questions"
    >
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4" style={{ paddingTop: '40px' }}>
        {/* 3D CSS Logo */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div
            className="relative w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #a855f7, #06b6d4)',
              boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 6px rgba(0,0,0,0.2), 4px 6px 12px rgba(79,70,229,0.4)',
              transform: 'perspective(100px) rotateX(5deg) rotateY(-5deg)'
            }}
          >
            <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(to top right, rgba(255,255,255,0.2), transparent)' }}></div>
            <GraduationCap size={20} color="white" className="relative z-10" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
          </div>
          <div className="text-left">
            <span
              className="text-xl font-black tracking-tighter leading-none"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              EduCreator
            </span>
            <p style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3em', marginTop: '2px', marginLeft: '2px' }}>
              Pro Systems <span style={{ color: '#6366f1' }}>2026</span>
            </p>
          </div>
        </div>
        <h1 className="text-lg font-bold uppercase">{institutionName || 'Instituição de Ensino'}</h1>
        <h2 className="text-base font-semibold mt-1">{title || 'Simulado'}</h2>
        <p className="text-xs mt-1 text-gray-600 uppercase">{EXAM_LABELS[examType] || examType}</p>
      </div>

      <div className="mb-4" style={{ fontSize: '11pt' }}>
        <p>Nome: _________________________________________________________ Nº: ______</p>
        <p className="mt-1">Turma: _________________ Data: ____/____/________</p>
      </div>

      <div className="mb-6 p-3 border border-black bg-gray-50 text-xs">
        <p className="font-bold mb-1">INSTRUÇÕES:</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li>Leia cada questão com atenção antes de responder.</li>
          <li>Marque apenas UMA alternativa para cada questão na Folha de Respostas.</li>
          <li>Use caneta esferográfica azul ou preta.</li>
          <li>Não rasure a Folha de Respostas.</li>
        </ul>
      </div>

      {/* Questions - with column support */}
      <div
        style={columns === 2 ? { columnCount: 2, columnGap: '2.5em' } : undefined}
      >
        {questions.map((q, i) => (
          <div key={i} className="mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', maxWidth: '100%', marginRight: 'auto', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            <div className="flex gap-2">
              <span className="font-bold whitespace-nowrap" style={{ fontSize: '11pt' }}>
                {String(i + 1).padStart(2, '0')}.
              </span>
              <div className="flex-1" style={{ maxWidth: '100%', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                {q.skillCode && (
                  <span className="text-[8pt] italic text-gray-400 block mb-0.5">[{q.skillCode}]</span>
                )}
                <div
                  style={{ maxWidth: '100%', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: (q.content || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }}
                />
              </div>
            </div>
            {q.options && q.options.length > 0 ? (
              <div className="ml-6 mt-2 space-y-1" style={{ maxWidth: '100%', boxSizing: 'border-box', overflowWrap: 'break-word' }}>
                {q.options.map((opt) => (
                  <div key={opt.letter} className="flex gap-2" style={{ fontSize: '11pt', maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    <span className="font-medium">({opt.letter})</span>
                    <span style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{opt.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ml-6 mt-3" data-pdf-section="answer-lines">
                {Array.from({ length: q.answerLines || 10 }).map((_, li) => (
                  <div key={li} className="border-b border-gray-300 mb-4" style={{ height: '1.2em' }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Watermark footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <p style={{ fontSize: '8pt', color: '#c0c0c0', letterSpacing: '0.05em' }}>
          EduCreator Pro • Matheus Lima Piffer
        </p>
      </div>
    </div>
  );
});

SimulatorPreview.displayName = 'SimulatorPreview';
export default SimulatorPreview;
