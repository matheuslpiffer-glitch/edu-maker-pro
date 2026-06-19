import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import MathText from '@/components/MathText';

/**
 * O export para PDF (exportToPDF/generatePdfFromElement) captura o DOM
 * renderizado. Os campos passam por <MathText /> (KaTeX), que NUNCA deve
 * deixar HTML cru ou delimitadores de LaTeX visíveis.
 * Este teste simula um questão com enunciado, alternativas, gabarito e
 * resolução e valida o textContent capturado pelo pipeline de PDF.
 */
describe('PDF export — rendered question fields contain no raw HTML/LaTeX', () => {
  it('renders content, options, answer and resolution sanitized', () => {
    const fields = {
      content:
        '<p>Calcule <span>\\(x^2 + 1\\)</span> para \\(x=2\\) — ângulo \\(30^\\circ\\)</p>',
      options: [
        '<b>\\(5\\) cm</b>',
        '<i>\\(300\\sqrt{3}\\) m</i>',
        '\\(6\\sqrt{3}\\)',
        'R$ 50,00',
      ],
      answer: '<i>\\(5\\)</i>',
      resolution:
        '<div>Use <span>\\(\\frac{1}{2}\\)</span> e \\(\\sqrt{2}\\)</div>',
    };

    const { container } = render(
      <div data-testid="pdf-root">
        <MathText text={fields.content} />
        {fields.options.map((o, i) => (
          <MathText key={i} text={o} />
        ))}
        <MathText text={fields.answer} />
        <MathText text={fields.resolution} />
      </div>,
    );

    const root = container.querySelector('[data-testid="pdf-root"]') as HTMLElement;
    // KaTeX duplica conteúdo (HTML + MathML acessível). Pegamos só a árvore visível.
    root.querySelectorAll('.katex-mathml, annotation').forEach((n) => n.remove());
    const text = (root.textContent || '').replace(/\s+/g, ' ').trim();

    // Sanitizado conforme esperado
    expect(text).toContain('Calcule');
    expect(text).toContain('ângulo');
    expect(text).toContain('R$ 50,00'); // moeda intacta

    // Nenhum delimitador/marcador de LaTeX cru visível
    expect(text).not.toContain('\\(');
    expect(text).not.toContain('\\)');
    expect(text).not.toContain('\\[');
    expect(text).not.toContain('\\]');
    expect(text).not.toMatch(/\\[a-zA-Z]+/); // \sqrt, \frac, \circ...

    // Nenhuma tag HTML escapou para texto visível
    expect(text).not.toMatch(/<\/?[a-zA-Z]/);

    // innerHTML não pode conter as strings de tag literais (<span>, <b>, <i>)
    // como TEXTO — só como elementos. Garantimos isso via innerText acima.
    // Adicionalmente, o root não deve conter os delimitadores em nenhum
    // atributo de texto.
    const html = root.innerHTML;
    expect(html).not.toContain('\\(');
    expect(html).not.toContain('\\)');
    expect(html).not.toContain('\\sqrt');
    expect(html).not.toContain('\\frac');
    expect(html).not.toContain('\\circ');
  });
});