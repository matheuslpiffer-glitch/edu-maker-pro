import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../../supabase/functions/generate-simulator-questions/index.ts'),
  'utf8',
);

// Extrai o bloco do objeto diretrizesPorPerfil
function extractObjectBlock(src: string, varName: string): string {
  const start = src.indexOf(`const ${varName}`);
  if (start === -1) throw new Error(`${varName} não encontrado`);
  const braceStart = src.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(braceStart, i + 1);
    }
  }
  throw new Error(`Bloco de ${varName} não fechado`);
}

const diretrizesBlock = extractObjectBlock(source, 'diretrizesPorPerfil');
const labelBlock = extractObjectBlock(source, 'perfilLabel');

function extractEntry(block: string, key: string): string {
  // Captura todas as ocorrências (chaves duplicadas em objeto literal — a última prevalece em runtime)
  const re = new RegExp(`${key}\\s*:\\s*\`([\\s\\S]*?)\``, 'g');
  const matches = [...block.matchAll(re)];
  if (matches.length === 0) throw new Error(`Entrada ${key} não encontrada`);
  return matches[matches.length - 1][1];
}

const NEW_PROFILES: Array<{
  key: string;
  label: RegExp;
  mustInclude: RegExp[];
}> = [
  {
    key: 'aee_toc',
    label: /TOC/,
    mustInclude: [/PREVIS[IÍ]VEL/i, /(checklist|conclus[ãa]o|1 vez|marque apenas)/i],
  },
  {
    key: 'aee_tag',
    label: /TAG|Ansiedade/i,
    mustInclude: [/ACOLHEDOR|CALMO/i, /(press[ãa]o|cron[ôo]metro|seguran[çc]a|refor[çc]o)/i],
  },
  {
    key: 'aee_tpac',
    label: /TPAC|Auditivo/i,
    mustInclude: [/VISUAL|ESCRIT/i, /(áudio|auditiv|rima|sonor)/i],
  },
  {
    key: 'aee_tdl',
    label: /TDL|Linguagem/i,
    mustInclude: [/(VOCABUL[ÁA]RIO|frases? curtas?|ordem direta)/i, /(emoji|imagem|gloss[áa]rio)/i],
  },
  {
    key: 'aee_sensorial',
    label: /Sensorial/i,
    mustInclude: [/(SOBRECARGA|CARGA) SENSORIAL/i, /(layout|espa[çc]o em branco|cores|est[íi]mulos)/i],
  },
];

describe('generate-simulator-questions — perfis AEE novos', () => {
  it.each(NEW_PROFILES)('injeta diretriz para $key', ({ key, mustInclude }) => {
    const entry = extractEntry(diretrizesBlock, key);
    expect(entry.length).toBeGreaterThan(80);
    for (const re of mustInclude) {
      expect(entry).toMatch(re);
    }
  });

  it.each(NEW_PROFILES)('expõe label legível para $key', ({ key, label }) => {
    // labels usam aspas simples, não crase — extraímos com regex dedicada
    const matches = [...labelBlock.matchAll(new RegExp(`${key}\\s*:\\s*'([^']+)'`, 'g'))];
    expect(matches.length).toBeGreaterThan(0);
    // a última definição é a que prevalece em runtime para chaves duplicadas
    const finalLabel = matches[matches.length - 1][1];
    expect(finalLabel).toMatch(label);
  });

  it('simula montagem da diretriz combinada para múltiplos perfis novos', () => {
    const perfilLabel: Record<string, string> = {};
    const diretrizesPorPerfil: Record<string, string> = {};
    for (const { key } of NEW_PROFILES) {
      diretrizesPorPerfil[key] = extractEntry(diretrizesBlock, key);
      const re = new RegExp(`${key}\\s*:\\s*'([^']+)'`, 'g');
      const matches = [...labelBlock.matchAll(re)];
      perfilLabel[key] = matches[matches.length - 1][1];
    }
    const profileKeys = NEW_PROFILES.map((p) => p.key);
    const diretriz = profileKeys
      .map((k) => diretrizesPorPerfil[k] || '')
      .filter(Boolean)
      .join('\n\n');
    const perfil = profileKeys.map((k) => perfilLabel[k] || k).join(' + ');

    expect(diretriz.split('\n\n')).toHaveLength(NEW_PROFILES.length);
    for (const { key } of NEW_PROFILES) {
      expect(diretriz).toContain(diretrizesPorPerfil[key]);
    }
    expect(perfil).toMatch(/TOC.*TAG.*TPAC.*TDL.*Sensorial/);
  });
});