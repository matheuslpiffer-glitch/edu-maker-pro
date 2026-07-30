import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { countPageBreaks, countPrintPages, assertMultiPagePrint, PAGE_BREAK_CLASS } from './print-page-breaks';

const read = (p: string) => readFileSync(path.resolve(__dirname, '..', p), 'utf-8');

describe('print page breaks (util)', () => {
  it('conta páginas lógicas a partir das quebras', () => {
    const html = `
      <div><h1>Prova</h1></div>
      <div class="print-page-break"><h2>Folha de Respostas</h2></div>
      <div class="print-page-break"><h2>Gabarito</h2></div>`;
    expect(countPageBreaks(html)).toBe(2);
    expect(countPrintPages(html)).toBe(3);
  });

  it('FALHA quando apenas a primeira página é renderizada', () => {
    const onlyFirstPage = '<div><h1>Prova</h1><p>Questão 1</p></div>';
    expect(countPrintPages(onlyFirstPage)).toBe(1);
    expect(() => assertMultiPagePrint(onlyFirstPage)).toThrow(/apenas 1 página/);
  });

  it('passa quando há Folha de Respostas + Gabarito', () => {
    const html = `<div>Prova</div>
      <div class="${PAGE_BREAK_CLASS}">Folha</div>
      <div class="${PAGE_BREAK_CLASS}">Gabarito</div>`;
    expect(() => assertMultiPagePrint(html, 3)).not.toThrow();
  });
});

describe('Simuladores Elite — markup de impressão/PDF', () => {
  const source = read('pages/Simulators.tsx');

  it('envolve Folha de Respostas, Gabarito e Espelho com quebra de página', () => {
    for (const section of ['<AnswerSheet', '<GabaritoOficial', '<EspelhoCorrecao']) {
      const occurrences = source.split(section).slice(1);
      expect(occurrences.length).toBeGreaterThan(0);
      const before = source.split(section);
      before.slice(0, -1).forEach((chunk) => {
        const tail = chunk.slice(-260);
        expect(tail).toMatch(/PAGE_BREAK_CLASS|print-page-break/);
      });
    }
  });

  it('usa a classe compartilhada de quebra (print + html2pdf)', () => {
    expect(source).toContain("from '@/lib/print-page-breaks'");
    expect(PAGE_BREAK_CLASS).toContain('print-page-break');
    expect(PAGE_BREAK_CLASS).toContain('html2pdf__page-break');
  });

  it('mantém o container de impressão em fluxo estático (multipágina)', () => {
    const css = read('index.css');
    expect(css).toMatch(/\.print-page-break[\s\S]*break-before:\s*page/);
    expect(css).toMatch(/\.print-page-break[\s\S]*page-break-before:\s*always/);
    expect(css).toMatch(/\.print-sheet-root[\s\S]*position:\s*static/);
    expect(css).toMatch(/html,\s*body,\s*#root[\s\S]*overflow:\s*visible/);
  });
});