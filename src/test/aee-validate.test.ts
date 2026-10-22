import { describe, it, expect } from 'vitest';
import { enforceAeeRules } from '../../supabase/functions/generate-simulator-questions/aee-validate';

const four = [
  { letter: 'A', text: 'um', isCorrect: false },
  { letter: 'B', text: 'dois', isCorrect: false },
  { letter: 'C', text: 'três', isCorrect: false },
  { letter: 'D', text: 'quatro', isCorrect: true },
];

describe('enforceAeeRules', () => {
  it('reduz para 3 alternativas no perfil de deficiência intelectual, mantendo a correta', () => {
    const [q] = enforceAeeRules([{ content: 'x', options: four }], ['aee_intelectual']);
    expect(q.options).toHaveLength(3);
    expect(q.options!.filter((o) => o.isCorrect).map((o) => o.text)).toEqual(['quatro']);
    expect(q.options!.map((o) => o.letter)).toEqual(['A', 'B', 'C']);
  });

  it('mantém 4 alternativas para TDAH', () => {
    const [q] = enforceAeeRules([{ content: 'x', options: four }], ['aee_tdah']);
    expect(q.options).toHaveLength(4);
  });

  it('aplica 3 alternativas quando deficiência múltipla é cruzada com outro perfil', () => {
    const [q] = enforceAeeRules([{ content: 'x', options: four }], ['aee_tea', 'aee_dm']);
    expect(q.options).toHaveLength(3);
  });

  it('deixa exatamente uma alternativa correta', () => {
    const [q] = enforceAeeRules([{ content: 'x', options: four.map((o) => ({ ...o, isCorrect: true })) }], ['aee_tea']);
    expect(q.options!.filter((o) => o.isCorrect)).toHaveLength(1);
  });

  it('remove imagens do serviço externo', () => {
    const [q] = enforceAeeRules([{ content: 'a<img src="https://image.pollinations.ai/p/x">b', imageUrl: 'https://image.pollinations.ai/p/x', options: [] }], ['aee_tea']);
    expect(q.imageUrl).toBeUndefined();
    expect(q.content).toBe('ab');
  });
});
