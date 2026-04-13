import { forwardRef } from 'react';
import MathRenderer from '@/components/MathRenderer';
import AnswerSheet from '@/components/AnswerSheet';

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
  topic?: string;
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
  twoColumns?: boolean;
  isAEE?: boolean;
  mestreMode?: boolean;
  ecoPrint?: boolean;
}

/** Extract BNCC-style skill codes like [EM13MAT301] from content */
function extractSkillCode(content: string): { code: string | null; clean: string } {
  const match = content.match(/\[([A-Z]{2}\d{2}[A-Z]{2,4}\d{2,3})\]/);
  if (match) {
    return { code: match[1], clean: content.replace(match[0], '').trim() };
  }
  return { code: null, clean: content };
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/** Detect if content has complex elements (tables, images, long formulas) */
function hasComplexContent(questions: Question[]): boolean {
  return questions.some(q => {
    const c = q.content.toLowerCase();
    return c.includes('<table') || c.includes('<img') || c.includes('$$') || stripHtml(q.content).length > 600;
  });
}

const AssessmentPreview = forwardRef<HTMLDivElement, Props>(({
  header, questions, subjects, showGabarito, twoColumns = false, isAEE = false,
  mestreMode = false, ecoPrint = false,
}, ref) => {
  // Mestre mode overrides
  const fontFamily = mestreMode ? "'Nunito', sans-serif" : 'serif';
  const bodySize = isAEE ? '14pt' : mestreMode ? '12pt' : '12pt';
  const titleSize = mestreMode ? '14pt' : '14pt';
  const lineH = isAEE ? '1.8' : '1.15';
  const padding = mestreMode ? '20mm' : '30mm 20mm 20mm 30mm';

  // Smart columns: mestre mode auto-detects, otherwise use prop
  const useColumns = mestreMode
    ? (!hasComplexContent(questions) && questions.length >= 4)
    : twoColumns;

  // Eco-print: tighter spacing
  const questionGap = ecoPrint ? 'mb-3' : 'mb-6';
  const headerGap = ecoPrint ? 'mb-3' : 'mb-6';

  const multipleChoiceCount = questions.filter(q => q.type === 'multiple-choice').length;

  return (
    <div ref={ref}>
    <div
      className={`bg-white text-black max-w-[210mm] mx-auto ${isAEE ? 'aee-print' : ''}`}
      style={{ fontFamily, fontSize: bodySize, lineHeight: lineH, padding, boxSizing: 'border-box' }}
    >
      {/* ─── HEADER ─── */}
      <div className={`text-center ${headerGap} border-b-2 border-black pb-4`}>
        <div className="flex items-center justify-center gap-4">
          {header.logoUrl && (
            <img src={header.logoUrl} alt="Logo" className="h-16 object-contain" style={{ minHeight: 'unset', background: 'transparent' }} />
          )}
          <div>
            <h1 className="font-bold uppercase" style={{ fontSize: titleSize }}>
              {header.institutionName || 'NOME DA ESCOLA'}
            </h1>
            <h2 className="font-semibold mt-1" style={{ fontSize: bodySize }}>
              {header.title || 'AVALIAÇÃO'}
            </h2>
          </div>
        </div>
        {mestreMode && header.teacherName && (
          <p className="text-sm mt-1" style={{ fontFamily }}>
            PROF. {header.teacherName.toUpperCase()}
          </p>
        )}
        {!mestreMode && (
          <div className="flex justify-center gap-6 mt-2 text-sm">
            {header.teacherName && <span>Professor(a): {header.teacherName}</span>}
            {header.date && <span>Data: {header.date}</span>}
            {header.className && <span>Turma: {header.className}</span>}
          </div>
        )}
      </div>

      {/* Student identification */}
      <div className={`${ecoPrint ? 'mb-2' : 'mb-4'} text-sm`} style={{ fontFamily }}>
        {mestreMode ? (
          <div className="space-y-2">
            <p>ALUNO(A): ______________________________________________ DATA: ___/___/______</p>
            <p>TURMA: ____________ Nº: ______ {header.className && `(${header.className.toUpperCase()})`}</p>
          </div>
        ) : (
          <p>Nome: __________________________________________ Nº: ______</p>
        )}
      </div>

      {/* ─── QUESTIONS ─── */}
      <div
        className={useColumns ? 'print-two-columns' : ''}
        style={useColumns ? { columnCount: 2, columnGap: '20px', columnRule: '1px solid #ccc' } : {}}
      >
        {questions.map((q, i) => {
          const subject = subjects.find(s => s.id === q.subject_id);
          const { code: skillCode, clean: cleanContent } = extractSkillCode(q.content);
          const contentHtml = cleanContent.replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim();
          const hasLatex = contentHtml.includes('$');

          return (
            <div key={q.id} className={`${questionGap} question-block`} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              {/* Skill code badge (mestre only) */}
              {mestreMode && skillCode && (
                <span className="font-bold" style={{ fontSize: '9pt', color: '#555', display: 'block', marginBottom: '2px' }}>
                  {skillCode}
                </span>
              )}

              <div className="flex gap-1">
                <span className="font-bold whitespace-nowrap" style={{ fontSize: mestreMode ? '12pt' : undefined }}>
                  {mestreMode ? `QUESTÃO ${String(i + 1).padStart(2, '0')}` : `${i + 1})`}
                </span>
                <div className="flex-1">
                  {!mestreMode && subject && (
                    <span className="text-xs italic text-gray-500">[{subject.name}]</span>
                  )}
                  {hasLatex ? (
                    <MathRenderer content={contentHtml} className="inline" />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                  )}
                </div>
              </div>

              {/* Multiple choice options */}
              {q.type === 'multiple-choice' && (
                <div className={`mt-2 space-y-1 ${mestreMode ? 'ml-8' : 'ml-5'}`}>
                  {q.options.map((opt, j) => {
                    const letter = String.fromCharCode(65 + j);
                    const optHasLatex = opt.text.includes('$');
                    return (
                      <div key={opt.id} className="flex gap-2 items-start">
                        <span className="font-medium whitespace-nowrap" style={{ minWidth: mestreMode ? '24px' : undefined }}>
                          {mestreMode ? `${letter})` : `${String.fromCharCode(97 + j)})`}
                        </span>
                        {optHasLatex ? (
                          <MathRenderer content={opt.text} className="inline" />
                        ) : (
                          <span>{opt.text}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Essay lines */}
              {q.type === 'essay' && (
                <div className="ml-5 mt-3 space-y-4">
                  {[...Array(ecoPrint ? 4 : 6)].map((_, j) => (
                    <div key={j} className="border-b border-gray-400" style={{ height: '1.5em' }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── GABARITO ─── */}
      {showGabarito && (
        <div className="mt-10 pt-6 border-t-2 border-black" style={{ pageBreakBefore: 'always' }}>
          <h3 className="text-center text-lg font-bold mb-4 uppercase">GABARITO</h3>
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
              <p className="font-bold text-sm mb-2">RESPOSTAS DISSERTATIVAS:</p>
              {questions.filter(q => q.type === 'essay').map((q) => (
                <div key={q.id} className="mb-2 text-sm">
                  <span className="font-bold">{questions.indexOf(q) + 1}. </span>
                  <span className="italic">{q.answer || 'Sem gabarito definido'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── FOOTER ─── */}
      {mestreMode ? (
        <div className="mt-8 pt-3 border-t border-gray-300 text-center" style={{ pageBreakInside: 'avoid' }}>
          <p className="text-sm" style={{ color: '#555' }}>
            VAMOS ILUMINAR JUNTOS O CAMINHO DO SEU ALUNO? ✨
          </p>
          <p className="mt-1" style={{ fontFamily: "'Dancing Script', cursive", fontSize: '16pt', color: '#333' }}>
            Matheus Lima Piffer
          </p>
        </div>
      ) : (
        <div className="mt-8 pt-2 border-t border-gray-300 text-center text-xs text-gray-400">
          Avaliação de Elite por Matheus Lima Piffer | EduCreator Pro
        </div>
      )}

      {/* ─── ANSWER SHEET (Mestre mode) ─── */}
      {mestreMode && showGabarito && multipleChoiceCount > 0 && (
        <AnswerSheet
          questionCount={multipleChoiceCount}
          title={header.title}
          institutionName={header.institutionName}
          teacherName={header.teacherName}
          className={header.className}
          date={header.date}
          logoUrl={header.logoUrl}
        />
      )}
    </>
  );
});

AssessmentPreview.displayName = 'AssessmentPreview';
export default AssessmentPreview;
