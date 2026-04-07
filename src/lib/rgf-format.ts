/**
 * Padrão Pedagógico — Configuração de Formatação.
 *
 * Fonte: Arial 11pt | Títulos em Negrito | Texto em MAIÚSCULAS
 * Espaçamento: 1.15 | Layout: 2 colunas (eco-print)
 */

export interface RGFFormatConfig {
  fontFamily: string;
  fontSize: string;          // CSS value
  fontSizeDocx: number;      // half-points for docx (22 = 11pt)
  lineHeight: string;
  textTransform: 'uppercase' | 'none';
  twoColumns: boolean;
}

export const RGF_DEFAULT: RGFFormatConfig = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11pt',
  fontSizeDocx: 22,
  lineHeight: '1.15',
  textTransform: 'uppercase',
  twoColumns: true,
};

/** CSS class string for print containers using RGF standard */
export function rgfPrintStyles(cfg: RGFFormatConfig = RGF_DEFAULT): React.CSSProperties {
  return {
    fontFamily: cfg.fontFamily,
    fontSize: cfg.fontSize,
    lineHeight: cfg.lineHeight,
    textTransform: cfg.textTransform,
    columnCount: cfg.twoColumns ? 2 : 1,
    columnGap: '20px',
  };
}

/** Transforms plain text to RGF uppercase if enabled */
export function rgfText(text: string, cfg: RGFFormatConfig = RGF_DEFAULT): string {
  return cfg.textTransform === 'uppercase' ? text.toUpperCase() : text;
}

/**
 * Pedagogical audit checklist items.
 * Each item is a validation rule the teacher should confirm.
 */
export interface AuditItem {
  id: string;
  label: string;
  autoCheck?: (content: string) => boolean;
}

export const PEDAGOGICAL_CHECKLIST: AuditItem[] = [
  {
    id: 'text_reviewed',
    label: 'Letra inteira e revisada?',
    autoCheck: (c) => c.length > 20,
  },
  {
    id: 'arial_uppercase',
    label: 'Padrão Arial 11 e Maiúsculas aplicado?',
  },
  {
    id: 'header_footer',
    label: 'Cabeçalho e rodapé incluídos?',
  },
  {
    id: 'instructions',
    label: 'Instruções claras para o aluno?',
  },
  {
    id: 'content_fidelity',
    label: 'Nenhum trecho do material de referência foi omitido?',
  },
];
