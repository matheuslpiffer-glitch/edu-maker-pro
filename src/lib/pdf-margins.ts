/**
 * Utilitários de margem para exportação em PDF (A4).
 * Centraliza a conversão mm -> px e o cálculo da área útil,
 * usado tanto pelo export real quanto pelos testes de regressão.
 */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
/** 96 dpi: 1 polegada = 25.4 mm */
export const PX_PER_MM = 96 / 25.4;

export interface PdfMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PdfMarginPresetId = 'compacto' | 'padrao' | 'amplo' | 'custom';

export const PDF_MARGIN_PRESETS: { id: Exclude<PdfMarginPresetId, 'custom'>; label: string; mm: number }[] = [
  { id: 'compacto', label: 'Compacto', mm: 10 },
  { id: 'padrao', label: 'Padrão', mm: 12 },
  { id: 'amplo', label: 'Amplo', mm: 20 },
];

export const DEFAULT_PDF_MARGINS: PdfMargins = { top: 12, right: 12, bottom: 12, left: 12 };

/** Limites seguros para os campos em mm. */
export const MIN_MARGIN_MM = 5;
export const MAX_MARGIN_MM = 40;

export function clampMargin(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PDF_MARGINS.top;
  return Math.min(MAX_MARGIN_MM, Math.max(MIN_MARGIN_MM, Math.round(value)));
}

export function clampMargins(m: PdfMargins): PdfMargins {
  return {
    top: clampMargin(m.top),
    right: clampMargin(m.right),
    bottom: clampMargin(m.bottom),
    left: clampMargin(m.left),
  };
}

export function presetToMargins(mm: number): PdfMargins {
  return { top: mm, right: mm, bottom: mm, left: mm };
}

export function matchPreset(m: PdfMargins): PdfMarginPresetId {
  const uniform = m.top === m.right && m.right === m.bottom && m.bottom === m.left;
  if (!uniform) return 'custom';
  return PDF_MARGIN_PRESETS.find((p) => p.mm === m.top)?.id ?? 'custom';
}

/** Largura útil (mm) da A4 descontando as margens laterais. */
export function usableWidthMm(m: PdfMargins): number {
  return A4_WIDTH_MM - m.left - m.right;
}

/** Altura útil (mm) da A4 descontando as margens verticais. */
export function usableHeightMm(m: PdfMargins): number {
  return A4_HEIGHT_MM - m.top - m.bottom;
}

export function mmToPx(mm: number): number {
  return Math.round(mm * PX_PER_MM);
}

/** Largura útil em px @96dpi — é a largura fixa aplicada ao container na captura. */
export function usableWidthPx(m: PdfMargins): number {
  return mmToPx(usableWidthMm(m));
}

export function usableHeightPx(m: PdfMargins): number {
  return mmToPx(usableHeightMm(m));
}

/** Formato aceito pelo html2pdf: [top, right, bottom, left]. */
export function toHtml2PdfMargin(m: PdfMargins): [number, number, number, number] {
  return [m.top, m.right, m.bottom, m.left];
}

export interface OverflowReport {
  /** Largura útil considerada (px). */
  limitPx: number;
  /** Nós que ultrapassam a área útil. */
  offenders: { description: string; widthPx: number }[];
}

function describeNode(el: Element, index: number): string {
  const tag = el.tagName.toLowerCase();
  const cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return `#${index} <${tag}${cls ? '.' + cls : ''}> "${text}"`;
}

/**
 * Detecta conteúdo que estoura a largura útil da A4.
 * Tolerância de 1px para arredondamentos de layout.
 */
export function findWidthOverflow(root: HTMLElement, limitPx: number, tolerancePx = 1): OverflowReport {
  const offenders: OverflowReport['offenders'] = [];
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  nodes.forEach((el, i) => {
    const width = Math.max(el.scrollWidth || 0, el.getBoundingClientRect?.().width || 0);
    if (width > limitPx + tolerancePx) {
      offenders.push({ description: describeNode(el, i), widthPx: Math.round(width) });
    }
  });
  return { limitPx, offenders };
}

/**
 * Estilos aplicados ao container durante a captura.
 * Safari: largura fixa em px, sem colunas e sem quebra de palavra agressiva,
 * evitando que o html2canvas capture um layout mais largo que a área útil.
 */
export function captureStyleFor(m: PdfMargins): Record<string, string> {
  const width = `${usableWidthPx(m)}px`;
  return {
    width,
    minWidth: width,
    maxWidth: width,
    columnCount: '1',
    columnGap: 'normal',
    overflow: 'visible',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  };
}