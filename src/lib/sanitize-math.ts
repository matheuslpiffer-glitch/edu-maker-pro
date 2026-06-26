/**
 * Remove cifrões ($...$ e $$...$$) que vêm contaminando textos
 * vindos da IA, preservando o conteúdo interno.
 *
 * O renderizador (MathText/KaTeX) já lida com Unicode puro, então
 * qualquer "$" remanescente apenas atrapalha o parser e a exportação
 * (DOCX/PDF). Esta função é idempotente e segura para texto sem cifrão.
 */
export const sanitizeMathData = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    // bloco $$...$$
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    // inline $...$
    .replace(/\$([^$\n]+?)\$/g, '$1')
    // cifrões soltos remanescentes que não sejam moeda (R$, US$, etc.)
    .replace(/(?<![A-Za-z])\$(?!\s*\d)/g, '');
};

/** Aplica sanitizeMathData em um objeto de gabarito { respostaCorreta, explicacao, ... } */
export const sanitizeGabaritoItem = <T extends Record<string, any>>(item: T): T => ({
  ...item,
  respostaCorreta: sanitizeMathData(item.respostaCorreta),
  explicacao: sanitizeMathData(item.explicacao),
  correctionMirror: sanitizeMathData(item.correctionMirror),
});