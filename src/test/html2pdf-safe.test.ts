import { describe, it, expect, vi } from 'vitest';
vi.mock('html2pdf.js', () => ({ default: () => ({}) }));
import { withSafePagebreak, applyPdfSafety } from '@/lib/html2pdf-safe';

describe('html2pdf-safe', () => {
  it('keeps caller modes and always avoids splitting paragraphs, questions and drawings', () => {
    const o = withSafePagebreak({ margin: 15, pagebreak: { mode: ['avoid-all', 'css'] } });
    expect(o.margin).toBe(15);
    expect(o.pagebreak.mode).toEqual(['avoid-all', 'css']);
    for (const s of ['p', 'li', 'tr', 'svg', 'img', '.question-block']) expect(o.pagebreak.avoid).toContain(s);
  });
  it('defaults to css+legacy modes when none given', () => {
    expect(withSafePagebreak({}).pagebreak.mode).toEqual(['css', 'legacy']);
  });
  it('marks the exported element so content cannot exceed the page width', () => {
    const el = document.createElement('div');
    applyPdfSafety(el);
    expect(el.hasAttribute('data-pdf-safe')).toBe(true);
    expect(document.getElementById('pdf-safe-style')?.textContent).toContain('max-width: 100%');
  });
});
