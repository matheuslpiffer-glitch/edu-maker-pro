import { describe, it, expect } from 'vitest';
import { buildSanitizedQuestionHtml } from './export';

describe('buildSanitizedQuestionHtml — saída usada no exportToPDF', () => {
  const header = {
    institutionName: 'Escola <script>alert(1)</script>',
    teacherName: 'Prof <b>X</b>',
    date: '2026-01-01',
    className: '9A',
    title: 'Prova \\(\\alpha\\)',
  };
  const subjects = [{ id: 's1', name: 'Matemática' }];
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
      explanation: '<div>Use <span>\\(\\frac{1}{2}\\)</span> e \\(\\sqrt{2}\\)</div>',
    },
    {
      id: 'q2',
      subject_id: 's1',
      type: 'essay',
      content: '<p>Discuta \\(\\pi\\) na geometria</p>',
      options: [],
      answer: '\\(\\pi \\approx 3.14\\)',
      explanation: '<script>bad()</script>Espera-se citar \\(\\pi\\)',
    },
  ] as any;

  const html = buildSanitizedQuestionHtml(header, questions, subjects, true);

  // Renderiza para extrair APENAS o textContent visível (o que vai pro PDF).
  const dom = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const visibleText = dom.body.textContent || '';

  it('preserva conteúdo sanitizado (Unicode, R$, etc.)', () => {
    expect(visibleText).toMatch(/Calcule x² \+ 1 para x=2/);
    expect(visibleText).toMatch(/ângulo de 30°/);
    expect(visibleText).toMatch(/300√3 m/);
    expect(visibleText).toMatch(/6√3/);
    expect(visibleText).toMatch(/R\$ 50,00/);
    expect(visibleText).toMatch(/Use 1\/2/);
    expect(visibleText).toMatch(/√2/);
    expect(visibleText).toMatch(/π/);
  });

  it('inclui resolução comentada (explanation) no gabarito', () => {
    expect(visibleText).toMatch(/Resolução comentada/i);
    expect(visibleText).toMatch(/Espera-se citar π/);
  });

  it('não emite NENHUMA tag HTML proibida vinda do conteúdo', () => {
    // Nada de <script>, <b>, <i>, <span>, <div>, <iframe>, <style> originárias do conteúdo
    // (HTML estrutural do template — h1/h2/p/ol/li/section/header — é esperado).
    const lower = html.toLowerCase();
    const forbiddenTags = ['<script', '<iframe', '<style'];
    for (const tag of forbiddenTags) {
      expect(lower.includes(tag)).toBe(false);
    }
    // Nenhum HTML "cru" injetado: o conteúdo passou por escapeHtml,
    // logo qualquer "<b>" / "<i>" original aparece como &lt;b&gt;... NUNCA como tag real.
    // Procura pela string textual de uma tag injetada (não deve achar).
    expect(visibleText).not.toMatch(/<\/?(b|i|em|strong|span|div|script|iframe)>/i);
  });

  it('não vaza LaTeX cru (sem $, sem comandos \\xxx, sem chaves) no texto visível', () => {
    const cleaned = visibleText.replace(/R\$/g, '');
    expect(cleaned).not.toMatch(/\$/);
    expect(cleaned).not.toMatch(/\\[a-zA-Z]+/);
    expect(cleaned).not.toMatch(/\\\(|\\\)|\\\[|\\\]/);
    expect(cleaned).not.toMatch(/[{}]/);
  });

  it('escapa o header (evita XSS via institutionName/title)', () => {
    // O <script> do institutionName precisa virar texto inerte, não tag executável.
    expect(html.toLowerCase()).not.toContain('<script>alert');
    expect(visibleText).toContain('alert(1)'); // virou texto visível, escapado
  });

  it('emite uma linha de gabarito por questão', () => {
    // q1 MC com 1ª alternativa correta → "A"; q2 essay → texto da resposta sanitizado.
    expect(visibleText).toMatch(/1\.\s*A/);
    expect(visibleText).toMatch(/2\.\s*π/);
  });
});