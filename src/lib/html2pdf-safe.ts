/**
 * Wrapper único do html2pdf.js usado por TODAS as exportações de PDF.
 * Garante: nada estoura a margem lateral (palavras longas, tabelas, SVG,
 * imagens, código) e linhas/blocos não são cortados ao meio na quebra de página.
 */
import html2pdfLib from 'html2pdf.js';

export const PDF_AVOID_SELECTORS = [
  'p', 'li', 'tr', 'img', 'svg', 'figure', 'pre', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  '.question-block', '.questao-container', '.pdf-block', '.card-plano',
  '.print-break-inside-avoid', '.avoid-break', '[data-pdf-avoid]',
];

export const PDF_SAFE_CSS = `
[data-pdf-safe], [data-pdf-safe] * { box-sizing: border-box !important; }
[data-pdf-safe] { max-width: 100% !important; overflow-wrap: anywhere !important; word-break: break-word !important; }
[data-pdf-safe] * { max-width: 100% !important; overflow-wrap: anywhere; }
[data-pdf-safe] img, [data-pdf-safe] svg, [data-pdf-safe] canvas, [data-pdf-safe] video { height: auto !important; }
[data-pdf-safe] table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
[data-pdf-safe] td, [data-pdf-safe] th { word-break: break-word !important; }
[data-pdf-safe] pre, [data-pdf-safe] code { white-space: pre-wrap !important; }
[data-pdf-safe] .katex-display { overflow: visible !important; white-space: normal !important; }
`;

const STYLE_ID = 'pdf-safe-style';

/** Aplica as regras de segurança ao elemento; retorna função de limpeza. */
export function applyPdfSafety(el: HTMLElement): () => void {
  if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = PDF_SAFE_CSS;
    document.head.appendChild(s);
  }
  const had = el.hasAttribute('data-pdf-safe');
  el.setAttribute('data-pdf-safe', '');
  return () => { if (!had) el.removeAttribute('data-pdf-safe'); };
}

/** Mescla as opções do chamador com quebra de página segura. */
export function withSafePagebreak(opts: any = {}): any {
  const pb = opts.pagebreak || {};
  const mode = Array.isArray(pb.mode) ? pb.mode : pb.mode ? [pb.mode] : ['css', 'legacy'];
  const avoid = Array.from(new Set([...(Array.isArray(pb.avoid) ? pb.avoid : pb.avoid ? [pb.avoid] : []), ...PDF_AVOID_SELECTORS]));
  return { ...opts, pagebreak: { ...pb, mode: mode.filter((m: string) => m !== 'avoid-all').concat([]), avoid } };
}

export default function html2pdf(): any {
  const worker = html2pdfLib();
  let cleanup: (() => void) | null = null;
  const origSet = worker.set.bind(worker);
  const origFrom = worker.from.bind(worker);
  worker.set = (opts: any) => { origSet(withSafePagebreak(opts)); return worker; };
  worker.from = (src: any, type?: string) => {
    if (src instanceof HTMLElement) cleanup = applyPdfSafety(src);
    origFrom(src, type);
    return worker;
  };
  // Garante pagebreak seguro mesmo sem .set()
  origSet(withSafePagebreak({}));
  for (const k of ['save', 'outputPdf', 'output', 'toPdf']) {
    const orig = worker[k]?.bind(worker);
    if (!orig) continue;
    worker[k] = (...args: any[]) => {
      const p = orig(...args);
      Promise.resolve(p).finally(() => { cleanup?.(); cleanup = null; });
      return p;
    };
  }
  return worker;
}
