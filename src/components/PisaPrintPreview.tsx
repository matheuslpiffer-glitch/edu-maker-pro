import { forwardRef } from 'react';
import { GraduationCap } from 'lucide-react';

interface PisaOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

interface PisaQuestion {
  type: string;
  scenario: string;
  content: string;
  options?: PisaOption[];
  modelAnswer: string;
  skill21: string;
  dataTable?: string;
}

interface Props {
  title: string;
  proficiencyLevel: number;
  competency: string;
  questions: PisaQuestion[];
  institutionName?: string;
  showAnswerKey?: boolean;
}

const COMPETENCY_LABELS: Record<string, string> = {
  letramento_matematico: 'Letramento Matemático',
  letramento_leitura: 'Letramento em Leitura',
  letramento_cientifico: 'Letramento Científico',
  letramento_financeiro: 'Letramento Financeiro',
  pensamento_critico: 'Pensamento Crítico e Criativo',
};

const TYPE_LABELS: Record<string, string> = {
  'multiple-choice': 'Múltipla Escolha',
  'constructed-response': 'Resposta Construída',
  'data-analysis': 'Análise de Dados',
  'interactive-scenario': 'Cenário Interativo',
};

const PisaPrintPreview = forwardRef<HTMLDivElement, Props>(
  ({ title, proficiencyLevel, competency, questions, institutionName, showAnswerKey }, ref) => {
    const compLabel = COMPETENCY_LABELS[competency] || competency;
    return (
      <div
        ref={ref}
        className="bg-white text-black"
        style={{
          fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
          fontSize: '11pt',
          lineHeight: '1.6',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '210mm',
          margin: '0 auto',
          padding: '0',
          boxSizing: 'border-box',
        }}
        data-pdf-section="questions"
      >
        {/* EduCreator Pro Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1a1a', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            <div
              style={{
                width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #4f46e5, #a855f7, #06b6d4)',
                boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 6px rgba(0,0,0,0.2), 4px 6px 12px rgba(79,70,229,0.4)',
              }}
            >
              <GraduationCap size={18} color="white" strokeWidth={2.5} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '16pt', fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                EduCreator
              </span>
              <p style={{ fontSize: '7pt', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3em', marginTop: '1px', marginLeft: '2px' }}>
                Pro Systems <span style={{ color: '#6366f1' }}>2026</span>
              </p>
            </div>
          </div>
          <p style={{ fontSize: '8pt', color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Simulado Elite | Professor Matheus Lima Piffer
          </p>
          <h1 style={{ fontSize: '15pt', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
            {institutionName || 'Instituição de Ensino'}
          </h1>
          <h2 style={{ fontSize: '13pt', fontWeight: 600, margin: '4px 0 0' }}>{title || 'Simulado PISA Elite'}</h2>
          <p style={{ fontSize: '9pt', color: '#666', margin: '4px 0 0', textTransform: 'uppercase' }}>
            Avaliação PISA — Nível {proficiencyLevel} OCDE — {compLabel}
          </p>
        </div>

        {/* Student fields */}
        <div style={{ fontSize: '11pt', marginBottom: '16px' }}>
          <p>Nome: _________________________________________________________ Nº: ______</p>
          <p style={{ marginTop: '4px' }}>Turma: _________________ Data: ____/____/________</p>
        </div>

        {/* Instructions */}
        <div style={{ border: '1px solid #1a1a1a', padding: '10px 14px', marginBottom: '20px', background: '#f9fafb', fontSize: '9pt' }}>
          <p style={{ fontWeight: 700, marginBottom: '4px' }}>INSTRUÇÕES — AVALIAÇÃO PISA:</p>
          <ul style={{ listStyle: 'disc', marginLeft: '16px' }}>
            <li>Leia cada situação-problema com atenção antes de responder.</li>
            <li>Para questões de múltipla escolha, marque apenas UMA alternativa.</li>
            <li>Para questões dissertativas, explique seu raciocínio completo no espaço indicado.</li>
            <li>Use caneta esferográfica azul ou preta.</li>
            <li>Esta avaliação tem como referência os níveis de proficiência da OCDE.</li>
          </ul>
        </div>

        {/* Questions */}
        {questions.map((q, i) => (
          <div key={i} style={{ marginBottom: '24px', pageBreakInside: 'avoid', breakInside: 'avoid', maxWidth: '100%' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: '11pt' }}>
                {String(i + 1).padStart(2, '0')}.
              </span>
              <div style={{ flex: 1, maxWidth: '95%', overflowWrap: 'break-word', wordWrap: 'break-word' }}>
                <span style={{ fontSize: '8pt', color: '#999', fontStyle: 'italic', display: 'block', marginBottom: '2px' }}>
                  [{TYPE_LABELS[q.type] || q.type}] — {q.skill21}
                </span>
                {q.scenario && (
                  <div style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: '6px', marginBottom: '8px', fontSize: '10pt', fontStyle: 'italic', maxWidth: '100%', overflowWrap: 'break-word' }}>
                    {q.scenario}
                  </div>
                )}
                {q.dataTable && (
                  <pre style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: '6px', marginBottom: '8px', fontSize: '9pt', whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'monospace', maxWidth: '100%', overflow: 'hidden' }}>
                    {q.dataTable}
                  </pre>
                )}
                <p>{q.content}</p>
              </div>
            </div>

            {q.type === 'multiple-choice' && q.options && (
              <div style={{ marginLeft: '28px', marginTop: '8px' }}>
                {q.options.map(opt => (
                  <div key={opt.letter} style={{ display: 'flex', gap: '8px', fontSize: '11pt', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 500 }}>({opt.letter})</span>
                    <span>{opt.text}</span>
                  </div>
                ))}
              </div>
            )}

            {(q.type === 'constructed-response' || q.type === 'interactive-scenario') && (
              <div style={{ marginLeft: '28px', marginTop: '8px' }}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} style={{ borderBottom: '1px solid #ccc', height: '28px' }} />
                ))}
              </div>
            )}

            {q.type === 'data-analysis' && (
              <div style={{ marginLeft: '28px', marginTop: '8px' }}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} style={{ borderBottom: '1px solid #ccc', height: '28px' }} />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Watermark footer */}
        <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', fontSize: '8pt', color: '#c0c0c0', textAlign: 'center', letterSpacing: '0.05em' }}>
          <p>EduCreator Pro • Matheus Lima Piffer</p>
          <p><strong>Competência PISA avaliada:</strong> {compLabel} — Nível {proficiencyLevel} de proficiência OCDE.</p>
        </div>

        {/* Answer Key (ALWAYS on a new page) */}
        {showAnswerKey && (
          <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '8pt', color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                EduCreator Pro | Simulado Elite | Professor Matheus Lima Piffer
              </p>
            </div>
            <h2 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 700, borderBottom: '2px solid #1a1a1a', paddingBottom: '8px', marginBottom: '16px' }}>
              GABARITO COMENTADO — {title}
            </h2>

            {questions.map((q, i) => (
              <div key={i} style={{ marginBottom: '16px', pageBreakInside: 'avoid', breakInside: 'avoid', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', maxWidth: '100%' }}>
                <p style={{ fontWeight: 700, fontSize: '11pt' }}>
                  Questão {String(i + 1).padStart(2, '0')} — [{TYPE_LABELS[q.type] || q.type}]
                </p>
                {q.type === 'multiple-choice' && q.options && (
                  <p style={{ fontSize: '10pt', marginTop: '4px' }}>
                    <strong>Resposta Correta:</strong> ({q.options.find(o => o.isCorrect)?.letter || '?'}) {q.options.find(o => o.isCorrect)?.text || ''}
                  </p>
                )}
                <p style={{ fontSize: '10pt', marginTop: '4px', overflowWrap: 'break-word', wordWrap: 'break-word' }}>
                  <strong>Resposta Modelo:</strong> {q.modelAnswer}
                </p>
              </div>
            ))}

            {/* Competency Matrix (new page) */}
            <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
              <h2 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 700, borderBottom: '2px solid #1a1a1a', paddingBottom: '8px', marginBottom: '16px' }}>
                MATRIZ DE COMPETÊNCIAS PISA
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1a1a1a' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', width: '15%' }}>Questão</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', width: '25%' }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', width: '45%' }}>Habilidade PISA</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px', width: '15%' }}>Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</td>
                      <td style={{ padding: '6px 8px', overflowWrap: 'break-word' }}>{TYPE_LABELS[q.type] || q.type}</td>
                      <td style={{ padding: '6px 8px', overflowWrap: 'break-word' }}>{q.skill21}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{proficiencyLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }
);

PisaPrintPreview.displayName = 'PisaPrintPreview';
export default PisaPrintPreview;
