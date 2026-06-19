import { describe, it, expect, vi, beforeEach } from 'vitest';

const textRuns: string[] = [];

vi.mock('docx', () => {
  class TextRun {
    text: string;
    constructor(opts: any) {
      this.text = typeof opts === 'string' ? opts : opts?.text ?? '';
      textRuns.push(this.text);
    }
  }
  class Paragraph {
    constructor(_opts: any) {}
  }
  class Document {
    constructor(_opts: any) {}
  }
  const Packer = { toBlob: async () => new Blob([]) };
  const AlignmentType = { CENTER: 'center', LEFT: 'left' };
  return { TextRun, Paragraph, Document, Packer, AlignmentType };
});

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { stripHtml, sanitizeForDocx, exportToDocx } from './export';

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<span>5 cm</span>')).toBe('5 cm');
    expect(stripHtml('<p><b>oi</b> mundo</p>')).toBe('oi mundo');
  });
  it('decodes entities', () => {
    expect(stripHtml('a&nbsp;b&amp;c&lt;d&gt;e&quot;f&#39;g')).toBe(`a b&c<d>e"f'g`);
  });
});

describe('sanitizeForDocx', () => {
  it('strips HTML then converts LaTeX', () => {
    expect(sanitizeForDocx('<span>\\(5\\) cm</span>')).toBe('5 cm');
    expect(sanitizeForDocx('<span>\\(300\\sqrt{3}\\) m</span>')).toBe('300√3 m');
    expect(sanitizeForDocx('ângulo de \\(30^\\circ\\)')).toBe('ângulo de 30°');
  });
});

describe('exportToDocx pipeline', () => {
  beforeEach(() => {
    textRuns.length = 0;
  });

  it('sanitizes content, options, answer, and resolution', async () => {
    const header = {
      institutionName: 'Escola',
      teacherName: 'Prof',
      date: '2026-01-01',
      className: '9A',
      title: 'Prova',
    };
    const subjects = [{ id: 's1', name: 'Mat' }];
    const questions = [
      {
        id: 'q1',
        subject_id: 's1',
        type: 'multiple-choice',
        content: '<span>Calcule \\(x^2 + 1\\) para \\(x=2\\)</span>',
        options: [
          { id: 'a', text: '<b>\\(5\\)</b>', isCorrect: true },
          { id: 'b', text: '\\(300\\sqrt{3}\\) m', isCorrect: false },
        ],
        answer: '<i>\\(5\\)</i>',
        explanation: 'ângulo de \\(30^\\circ\\) e <span>\\(6\\sqrt{3}\\)</span>',
      },
      {
        id: 'q2',
        subject_id: 's1',
        type: 'open',
        content: 'Discorra sobre \\(\\pi\\)',
        options: [],
        answer: '<p>Resposta com \\(\\frac{1}{2}\\)</p>',
        resolution: '<div>Use \\(\\sqrt{2}\\)</div>',
      },
    ] as any;

    await exportToDocx(header, questions, subjects, true);

    const all = textRuns.join('\n').toLowerCase();

    // Sanitized content
    expect(all).toContain('calcule x² + 1 para x=2');
    // Sanitized options
    expect(all).toContain('5');
    expect(all).toContain('300√3 m');
    // Sanitized answer (gabarito)
    expect(all).toContain('use √2');
    // Sanitized resolution
    expect(all).toContain('ângulo de 30°');
    expect(all).toContain('6√3');
    // Open question content
    expect(all).toContain('discorra sobre π');
    expect(all).toContain('1/2');

    // No raw artifacts anywhere
    expect(all).not.toMatch(/<[^>]+>/);
    expect(all).not.toContain('\\(');
    expect(all).not.toContain('\\)');
    expect(all).not.toContain('\\sqrt');
    expect(all).not.toContain('\\frac');
    expect(all).not.toContain('\\circ');
    expect(all).not.toContain('$');
  });
});