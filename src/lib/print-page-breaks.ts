/**
 * Utilitários de paginação para impressão / exportação PDF.
 * `print-page-break`  -> usado pelo @media print (Chrome, Safari, Firefox)
 * `html2pdf__page-break` -> reconhecido pelo html2pdf.js no modo legacy
 */
export const PAGE_BREAK_CLASS = 'print-page-break html2pdf__page-break';
export const PAGE_BREAK_SELECTOR = '.print-page-break, .html2pdf__page-break';

function toElement(input: HTMLElement | string): HTMLElement {
  if (typeof input !== 'string') return input;
  const host = document.createElement('div');
  host.innerHTML = input;
  return host;
}

/** Quantos elementos de quebra de página existem no conteúdo. */
export function countPageBreaks(input: HTMLElement | string): number {
  return toElement(input).querySelectorAll(PAGE_BREAK_SELECTOR).length;
}

/** Número de páginas lógicas do documento de impressão (1 + quebras). */
export function countPrintPages(input: HTMLElement | string): number {
  const root = toElement(input);
  const hasContent = (root.textContent || '').trim().length > 0;
  if (!hasContent) return 0;
  return 1 + countPageBreaks(root);
}

/** Falha quando o documento renderiza apenas a primeira folha. */
export function assertMultiPagePrint(input: HTMLElement | string, expectedMinimum = 2): void {
  const pages = countPrintPages(input);
  if (pages < expectedMinimum) {
    throw new Error(
      `Documento de impressão com apenas ${pages} página(s); esperado no mínimo ${expectedMinimum}. ` +
        'Verifique se as seções (Folha de Respostas, Gabarito, Espelho de Correção) possuem quebra de página.'
    );
  }
}