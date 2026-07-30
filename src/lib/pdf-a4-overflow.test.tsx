import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import SimulatorPreview from '@/components/SimulatorPreview';
import {
  DEFAULT_PDF_MARGINS,
  PDF_MARGIN_PRESETS,
  captureStyleFor,
  findWidthOverflow,
  presetToMargins,
  usableWidthMm,
  usableWidthPx,
  clampMargin,
  matchPreset,
  toHtml2PdfMargin,
} from '@/lib/pdf-margins';

/**
 * jsdom não faz layout: scrollWidth é sempre 0. Simulamos a medição de largura
 * a partir da largura em px declarada inline (ou herdada do container), o que é
 * suficiente para detectar regressões em que um elemento é declarado mais largo
 * que a área útil da A4 (caso clássico de margem estourada no PDF).
 */
function installWidthMeasurement() {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      const own = parseFloat(this.style.width || '');
      if (Number.isFinite(own) && this.style.width.endsWith('px')) return own;
      let node: HTMLElement | null = this.parentElement;
      while (node) {
        const w = parseFloat(node.style.width || '');
        if (Number.isFinite(w) && node.style.width.endsWith('px')) return w;
        node = node.parentElement;
      }
      return 0;
    },
  });
}
installWidthMeasurement();

const QUESTIONS = [
  {
    content: 'Um investimento de R$ 1.000,00 rende 2% ao mês. Qual o montante após 3 meses?',
    options: [
      { letter: 'A', text: 'R$ 1.020,00', isCorrect: false },
      { letter: 'B', text: 'R$ 1.061,21', isCorrect: true },
      { letter: 'C', text: 'R$ 1.060,00', isCorrect: false },
      { letter: 'D', text: 'R$ 1.100,00', isCorrect: false },
    ],
    skillCode: 'EF09MA05',
  },
];

function renderPreview(widthPx: number, columns: 1 | 2 = 1) {
  const { container } = render(
    <div data-testid="pdf-capture" style={{ width: `${widthPx}px` }}>
      <SimulatorPreview
        title="Simulado Elite"
        institutionName="Instituição de Ensino"
        examType="saeb"
        questions={QUESTIONS}
        columns={columns}
      />
    </div>,
  );
  return container.querySelector('[data-testid="pdf-capture"]') as HTMLElement;
}

afterEach(cleanup);

describe('margens do PDF — presets e área útil', () => {
  it('expõe os três presets em mm', () => {
    expect(PDF_MARGIN_PRESETS.map((p) => [p.label, p.mm])).toEqual([
      ['Compacto', 10],
      ['Padrão', 12],
      ['Amplo', 20],
    ]);
  });

  it('calcula a largura útil da A4 para cada preset', () => {
    expect(usableWidthMm(presetToMargins(10))).toBe(190);
    expect(usableWidthMm(presetToMargins(12))).toBe(186);
    expect(usableWidthMm(presetToMargins(20))).toBe(170);
    // 186mm @96dpi ≈ 703px (largura histórica do export)
    expect(usableWidthPx(presetToMargins(12))).toBe(703);
  });

  it('limita campos em mm e identifica preset ativo', () => {
    expect(clampMargin(0)).toBe(5);
    expect(clampMargin(999)).toBe(40);
    expect(matchPreset(presetToMargins(20))).toBe('amplo');
    expect(matchPreset({ top: 12, right: 20, bottom: 12, left: 12 })).toBe('custom');
    expect(toHtml2PdfMargin(DEFAULT_PDF_MARGINS)).toEqual([12, 12, 12, 12]);
  });
});

describe('compatibilidade Safari — estilo de captura', () => {
  it('fixa a largura em px e desativa colunas durante a captura', () => {
    for (const preset of PDF_MARGIN_PRESETS) {
      const style = captureStyleFor(presetToMargins(preset.mm));
      const expected = `${usableWidthPx(presetToMargins(preset.mm))}px`;
      expect(style.width).toBe(expected);
      expect(style.minWidth).toBe(expected);
      expect(style.maxWidth).toBe(expected);
      expect(style.columnCount).toBe('1');
      expect(style.overflowWrap).toBe('break-word');
    }
  });
});

describe('regressão A4 — conteúdo não pode ultrapassar a área útil', () => {
  it.each(PDF_MARGIN_PRESETS)('preset $label ($mm mm) não estoura', (preset) => {
    const limit = usableWidthPx(presetToMargins(preset.mm));
    const root = renderPreview(limit);
    const report = findWidthOverflow(root, limit);
    expect(
      report.offenders,
      `Conteúdo excede ${limit}px: ${report.offenders.map((o) => `${o.description} = ${o.widthPx}px`).join(' | ')}`,
    ).toEqual([]);
  });

  it('detecta regressão quando um elemento é mais largo que a área útil', () => {
    const limit = usableWidthPx(DEFAULT_PDF_MARGINS);
    const root = renderPreview(limit);
    const wide = document.createElement('table');
    wide.style.width = `${limit + 120}px`;
    wide.textContent = 'Tabela larga demais';
    root.appendChild(wide);

    const report = findWidthOverflow(root, limit);
    expect(report.offenders.length).toBeGreaterThan(0);
    expect(report.offenders[0].widthPx).toBe(limit + 120);
  });
});