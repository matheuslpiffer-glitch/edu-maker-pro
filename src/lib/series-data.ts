/**
 * Ciclo Escolar Completo — Matheus Lima Piffer
 * Shared grade/series constants for the entire EduCreator Pro platform.
 */

export interface SerieOption {
  id: string;
  label: string;
}

export interface SerieCategory {
  label: string;
  series: SerieOption[];
}

export const SERIES_CATEGORIAS: SerieCategory[] = [
  {
    label: '🌈 Educação Infantil',
    series: [
      { id: 'bercario', label: 'Berçário (0–1a6m)' },
      { id: 'maternal_1', label: 'Maternal I (1a7m–3a11m)' },
      { id: 'maternal_2', label: 'Maternal II / Pré (4a–5a11m)' },
    ],
  },
  {
    label: '📗 Anos Iniciais (Fund. I)',
    series: [
      { id: 'ano_1', label: '1º Ano (Alfabetização)' },
      { id: 'ano_2', label: '2º Ano' },
      { id: 'ano_3', label: '3º Ano' },
      { id: 'ano_4', label: '4º Ano' },
      { id: 'ano_5', label: '5º Ano' },
    ],
  },
  {
    label: '📘 Anos Finais (Fund. II)',
    series: [
      { id: 'ano_6', label: '6º Ano' },
      { id: 'ano_7', label: '7º Ano' },
      { id: 'ano_8', label: '8º Ano' },
      { id: 'ano_9', label: '9º Ano' },
    ],
  },
  {
    label: '🎓 Ensino Médio & Técnico',
    series: [
      { id: 'serie_1', label: '1ª Série EM' },
      { id: 'serie_2', label: '2ª Série EM' },
      { id: 'serie_3', label: '3ª Série EM' },
      { id: 'tecnico', label: 'Curso Técnico' },
      { id: 'etec', label: 'Instituto Técnico' },
    ],
  },
];

export const SERIE_GRADE_MAP: Record<string, string> = {
  bercario: 'Berçário (Educação Infantil)',
  maternal_1: 'Maternal I (Educação Infantil)',
  maternal_2: 'Maternal II / Pré-Escola (Educação Infantil)',
  ano_1: '1º Ano EF (Alfabetização)',
  ano_2: '2º Ano EF',
  ano_3: '3º Ano EF',
  ano_4: '4º Ano EF',
  ano_5: '5º Ano EF',
  ano_6: '6º Ano EF',
  ano_7: '7º Ano EF',
  ano_8: '8º Ano EF',
  ano_9: '9º Ano EF',
  serie_1: '1ª Série EM',
  serie_2: '2ª Série EM',
  serie_3: '3ª Série EM',
  tecnico: 'Curso Técnico',
  etec: 'Instituto Técnico',
  // Legacy mappings for backward compatibility
  mini_maternal: 'Berçário (Educação Infantil)',
  maternal: 'Maternal I (Educação Infantil)',
  jardim_1: 'Maternal II / Pré-Escola (Educação Infantil)',
  jardim_2: 'Maternal II / Pré-Escola (Educação Infantil)',
  pre: 'Maternal II / Pré-Escola (Educação Infantil)',
};

/** Returns true if the series ID belongs to Educação Infantil */
export function isEducacaoInfantil(serieId: string): boolean {
  return ['bercario', 'maternal_1', 'maternal_2', 'mini_maternal', 'maternal', 'jardim_1', 'jardim_2', 'pre'].includes(serieId);
}

/** Returns true if the series ID belongs to Anos Iniciais (1º–2º Ano) — needs simplified language */
export function isAlfabetizacao(serieId: string): boolean {
  return ['ano_1', 'ano_2'].includes(serieId);
}
