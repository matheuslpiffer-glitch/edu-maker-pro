import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { exportToDocx } from './export';

// Capture the blob saved by file-saver instead of writing a file.
let savedBlob: Blob | null = null;
vi.mock('file-saver', () => ({
  saveAs: (blob: Blob) => {
    savedBlob = blob;
  },
}));

function extractWtText(xml: string): string {
  // Concatenate all <w:t ...>...</w:t> bodies (real visible text in the docx).
  const out: string[] = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    // Decode the few entities the OOXML writer emits.
    const decoded = m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    out.push(decoded);
  }
  return out.join('\n');
}

describe('exportToDocx — produced .docx XML content', () => {
  it('contains no HTML tags or raw LaTeX delimiters in any <w:t>', async () => {
    savedBlob = null;

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
        content:
          '<p>Calcule <span>\\(x^2 + 1\\)</span> para \\(x=2\\) com ângulo de \\(30^\\circ\\)</p>',
        options: [
          { id: 'a', text: '<b>\\(5\\) cm</b>', isCorrect: true },
          { id: 'b', text: '<i>\\(300\\sqrt{3}\\) m</i>', isCorrect: false },
          { id: 'c', text: '\\(6\\sqrt{3}\\)', isCorrect: false },
          { id: 'd', text: 'R$ 50,00', isCorrect: false },
        ],
        answer: '<i>\\(5\\)</i>',
        explanation:
          '<div>Use <span>\\(\\frac{1}{2}\\)</span> e \\(\\sqrt{2}\\)</div>',
      },
    ] as any;

    await exportToDocx(header, questions, subjects, true);

    expect(savedBlob).toBeTruthy();
    const buf = await (savedBlob as Blob).arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml')!.async('string');
    const text = extractWtText(xml);

    // Conteúdo esperado, devidamente sanitizado:
    expect(text).toMatch(/Calcule x² \+ 1 para x=2/i);
    expect(text).toMatch(/ângulo de 30°/i);
    expect(text).toMatch(/300√3 m/i);
    expect(text).toMatch(/6√3/i);
    expect(text).toMatch(/R\$ 50,00/i); // moeda preservada
    expect(text).toMatch(/Use 1\/2/i);
    expect(text).toMatch(/√2/i);

    // Caracteres proibidos no texto exportado
    // (R$ é a única exceção legítima → removemos antes da checagem)
    const cleaned = text.replace(/R\$/g, '');
    const forbidden: Array<[string, RegExp]> = [
      ['<', /</],
      ['>', />/],
      ['\\', /\\/],
      ['(', /\(/],
      ['$', /\$/],
      ['{', /\{/],
      ['}', /\}/],
    ];
    for (const [label, re] of forbidden) {
      expect(
        re.test(cleaned),
        `Caractere proibido "${label}" encontrado no texto: ${cleaned}`,
      ).toBe(false);
    }

    // Reforço: nenhuma sequência típica de LaTeX/HTML
    expect(cleaned).not.toMatch(/\\[a-zA-Z]+/);
    expect(cleaned).not.toMatch(/<\/?[a-zA-Z]/);
  });
});