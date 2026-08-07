// EduCreator VideoLab — planejamento de cenas para vídeos de até 60 segundos.
// A API de vídeo gera clipes curtos por chamada, então um vídeo longo é montado
// como uma sequência de cenas encadeadas que o player reproduz em ordem.

export const SEGMENT_SECONDS = 8;

export const VIDEO_DURATIONS = [15, 30, 45, 60] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];

export const DURATION_LABELS: Record<VideoDuration, string> = {
  15: '15s',
  30: '30s',
  45: '45s',
  60: '60s (1 min)',
};

export interface SceneBlock {
  label: string;
  instruction: string;
}

/** Blocos narrativos padrão de um vídeo educacional de 1 minuto. */
export const SCENE_BLOCKS: { from: number; to: number; block: SceneBlock }[] = [
  {
    from: 0,
    to: 10,
    block: {
      label: 'Gancho / Introdução Impactante',
      instruction:
        'Abertura impactante: apresente o tema com uma pergunta ou situação curiosa que prenda a atenção do estudante.',
    },
  },
  {
    from: 10,
    to: 35,
    block: {
      label: 'Explicando o Conceito com Exemplos Visuais',
      instruction:
        'Explique o conceito central de forma clara e progressiva, com exemplos visuais concretos e linguagem didática.',
    },
  },
  {
    from: 35,
    to: 50,
    block: {
      label: 'Aplicação Prática / Exercício Rápido',
      instruction:
        'Mostre uma aplicação prática do conceito e proponha um exercício rápido para o estudante resolver mentalmente.',
    },
  },
  {
    from: 50,
    to: 60,
    block: {
      label: 'Resumo Final e Chamada para Ação',
      instruction:
        'Feche com um resumo objetivo dos pontos principais e uma chamada para ação pedagógica (praticar, revisar, aplicar em sala).',
    },
  },
];

/** Retorna o bloco narrativo correspondente a um instante do vídeo (normalizado para 60s). */
export function blockForTime(seconds: number, totalDuration: number): SceneBlock {
  const normalized = (seconds / Math.max(totalDuration, 1)) * 60;
  const found = SCENE_BLOCKS.find((b) => normalized >= b.from && normalized < b.to);
  return (found ?? SCENE_BLOCKS[SCENE_BLOCKS.length - 1]).block;
}

export interface PlannedScene {
  index: number;
  start: number;
  end: number;
  seconds: 4 | 6 | 8;
  block: SceneBlock;
  prompt: string;
}

/** Divide um roteiro em cenas de no máximo 8s cobrindo a duração total pedida. */
export function planScenes(basePrompt: string, totalDuration: number): PlannedScene[] {
  const scenes: PlannedScene[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < totalDuration) {
    const remaining = totalDuration - cursor;
    const chunk = Math.min(SEGMENT_SECONDS, remaining);
    const seconds: 4 | 6 | 8 = chunk <= 4 ? 4 : chunk <= 6 ? 6 : 8;
    const start = cursor;
    const end = Math.min(cursor + seconds, totalDuration);
    const block = blockForTime((start + end) / 2, totalDuration);

    scenes.push({
      index,
      start,
      end,
      seconds,
      block,
      prompt: [
        `Vídeo educacional em português sobre: ${basePrompt}`,
        `Cena ${index + 1} (${start}s a ${end}s de um vídeo de ${totalDuration}s).`,
        `Etapa do roteiro: ${block.label}.`,
        block.instruction,
        'Continue naturalmente a cena anterior mantendo o mesmo estilo visual, paleta e ritmo.',
      ].join(' '),
    });

    cursor = end;
    index += 1;
  }

  return scenes;
}

export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
