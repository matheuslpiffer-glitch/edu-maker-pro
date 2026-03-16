import { forwardRef } from 'react';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  subject_id: string;
  type: string;
  content: string;
  options: QuestionOption[];
  answer: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Header {
  institutionName: string;
  logoUrl: string;
  teacherName: string;
  date: string;
  className: string;
  title: string;
}

interface Props {
  header: Header;
  questions: Question[];
  subjects: Subject[];
  showGabarito: boolean;
}

const AssessmentPreview = forwardRef<HTMLDivElement, Props>(({ header, questions, subjects, showGabarito }, ref) => {
  return (
    <div ref={ref} className="bg-white text-black p-8 max-w-[210mm] mx-auto" style={{ fontFamily: 'serif', fontSize: '12pt', lineHeight: '1.6' }}>
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        {header.logoUrl && <img src={header.logoUrl} alt="Logo" className="h-16 mx-auto mb-2" />}
        <h1 className="text-xl font-bold uppercase">{header.institutionName || 'Nome da Instituição'}</h1>
        <h2 className="text-lg font-semibold mt-1">{header.title || 'Avaliação'}</h2>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          {header.teacherName && <span>Professor(a): {header.teacherName}</span>}
          {header.date && <span>Data: {header.date}</span>}
          {header.className && <span>Turma: {header.className}</span>}
        </div>
      </div>

      <div className="mb-4 text-sm">
        <p>Nome: __________________________________________ Nº: ______</p>
      </div>

      {/* Questions */}
      {questions.map((q, i) => {
        const subject = subjects.find(s => s.id === q.subject_id);
        return (
          <div key={q.id} className="mb-6">
            <div className="flex gap-1">
              <span className="font-bold whitespace-nowrap">{i + 1})</span>
              <div>
                <span className="text-xs italic text-gray-500">[{subject?.name}]</span>
                <div dangerouslySetInnerHTML={{ __html: (q.content || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }} />
              </div>
            </div>
            {q.type === 'multiple-choice' && (
              <div className="ml-5 mt-2 space-y-1">
                {q.options.map((opt, j) => (
                  <div key={opt.id} className="flex gap-2">
                    <span className="font-medium">{String.fromCharCode(97 + j)})</span>
                    <span>{opt.text}</span>
                  </div>
                ))}
              </div>
            )}
            {q.type === 'essay' && (
              <div className="ml-5 mt-3 space-y-4">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="border-b border-gray-400" style={{ height: '1.5em' }} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Gabarito */}
      {showGabarito && (
        <div className="mt-10 pt-6 border-t-2 border-black" style={{ pageBreakBefore: 'always' }}>
          <h3 className="text-center text-lg font-bold mb-4 uppercase">Gabarito</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, i) => (
              <div key={q.id} className="text-sm">
                <span className="font-bold">{i + 1}. </span>
                {q.type === 'multiple-choice' ? (
                  <span>{String.fromCharCode(65 + Math.max(0, q.options.findIndex(o => o.isCorrect)))}</span>
                ) : (
                  <span className="italic text-xs">Dissertativa</span>
                )}
              </div>
            ))}
          </div>
          {questions.filter(q => q.type === 'essay').length > 0 && (
            <div className="mt-4">
              <p className="font-bold text-sm mb-2">Respostas Dissertativas:</p>
              {questions.filter(q => q.type === 'essay').map((q, i) => (
                <div key={q.id} className="mb-2 text-sm">
                  <span className="font-bold">{questions.indexOf(q) + 1}. </span>
                  <span className="italic">{q.answer || 'Sem gabarito definido'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

AssessmentPreview.displayName = 'AssessmentPreview';
export default AssessmentPreview;
