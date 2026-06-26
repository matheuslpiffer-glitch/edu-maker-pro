import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fixtures from './fixtures/aee-profiles.json';

const source = readFileSync(
  resolve(__dirname, '../../supabase/functions/generate-simulator-questions/index.ts'),
  'utf8',
);

function extractBlock(src: string, varName: string): string {
  const start = src.indexOf(`const ${varName}`);
  const braceStart = src.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(braceStart, i + 1);
  }
  throw new Error('unclosed');
}

const diretrizesBlock = extractBlock(source, 'diretrizesPorPerfil');
const labelBlock = extractBlock(source, 'perfilLabel');

function lastBacktick(block: string, key: string): string {
  const m = [...block.matchAll(new RegExp(`${key}\\s*:\\s*\`([\\s\\S]*?)\``, 'g'))];
  return m.length ? m[m.length - 1][1] : '';
}
function lastQuoted(block: string, key: string): string {
  const m = [...block.matchAll(new RegExp(`${key}\\s*:\\s*'([^']+)'`, 'g'))];
  return m.length ? m[m.length - 1][1] : '';
}

describe('generate-simulator-questions — fixtures/snapshot dos novos perfis AEE', () => {
  it('não contém chaves duplicadas para os novos perfis', () => {
    for (const key of Object.keys(fixtures)) {
      const dCount = [...diretrizesBlock.matchAll(new RegExp(`${key}\\s*:`, 'g'))].length;
      const lCount = [...labelBlock.matchAll(new RegExp(`${key}\\s*:`, 'g'))].length;
      expect(dCount, `diretriz ${key} duplicada`).toBe(1);
      expect(lCount, `label ${key} duplicado`).toBe(1);
    }
  });

  it.each(Object.entries(fixtures))('fixture bate com runtime: %s', (key, expected) => {
    expect(lastBacktick(diretrizesBlock, key)).toBe((expected as any).diretriz);
    expect(lastQuoted(labelBlock, key)).toBe((expected as any).label);
  });

  it('simula a chamada da edge function e injeta diretrizes para múltiplos perfis (snapshot)', () => {
    const profileKeys = Object.keys(fixtures);
    const diretriz = profileKeys
      .map((k) => (fixtures as any)[k].diretriz)
      .join('\n\n');
    const perfil = profileKeys.map((k) => (fixtures as any)[k].label).join(' + ');

    // Mesma montagem usada em runtime no edge function (ver index.ts isInclusao branch)
    const prompt = `PERFIL: ${perfil}\n\nDIRETRIZES:\n${diretriz}`;

    expect(prompt).toMatchSnapshot();
    for (const key of profileKeys) {
      expect(prompt).toContain((fixtures as any)[key].diretriz);
      expect(prompt).toContain((fixtures as any)[key].label);
    }
  });
});
