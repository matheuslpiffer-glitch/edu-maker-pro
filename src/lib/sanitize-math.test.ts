import { describe, it, expect } from "vitest";
import { sanitizeMathData, sanitizeGabaritoItem } from "./sanitize-math";

describe("sanitizeMathData", () => {
  it("remove cifrões inline simples", () => {
    expect(sanitizeMathData("calcule $x^2 + 1$ agora")).toBe("calcule x^2 + 1 agora");
  });

  it("remove blocos $$...$$", () => {
    expect(sanitizeMathData("formula: $$a+b$$ fim")).toBe("formula: a+b fim");
  });

  it("remove múltiplos pares na mesma string", () => {
    expect(sanitizeMathData("$a$ e $b$")).toBe("a e b");
  });

  it("preserva moeda R$ e US$", () => {
    expect(sanitizeMathData("custa R$ 10,00")).toBe("custa R$ 10,00");
    expect(sanitizeMathData("valor US$ 5")).toBe("valor US$ 5");
  });

  it("não altera texto sem cifrões", () => {
    const t = "Equação x² + 2x + 1 = 0 com π e √2";
    expect(sanitizeMathData(t)).toBe(t);
  });

  it("retorna string vazia para null/undefined/empty", () => {
    expect(sanitizeMathData(null)).toBe("");
    expect(sanitizeMathData(undefined)).toBe("");
    expect(sanitizeMathData("")).toBe("");
  });

  it("é idempotente", () => {
    const once = sanitizeMathData("$x^2$ vale $4$");
    expect(sanitizeMathData(once)).toBe(once);
  });
});

describe("sanitizeGabaritoItem", () => {
  it("limpa respostaCorreta e explicacao", () => {
    const item = {
      id: 1,
      respostaCorreta: "$x = 2$",
      explicacao: "Pois $x^2 = 4$ logo x = 2",
    };
    const out = sanitizeGabaritoItem(item);
    expect(out.respostaCorreta).toBe("x = 2");
    expect(out.explicacao).toBe("Pois x^2 = 4 logo x = 2");
  });

  it("preserva todos os outros campos do item", () => {
    const item = {
      id: 42,
      questionNumber: 3,
      skillCode: "EF09MA01",
      extra: { nested: true },
      respostaCorreta: "$a$",
      explicacao: "$b$",
    };
    const out = sanitizeGabaritoItem(item);
    expect(out.id).toBe(42);
    expect(out.questionNumber).toBe(3);
    expect(out.skillCode).toBe("EF09MA01");
    expect(out.extra).toEqual({ nested: true });
  });

  it("aplica a limpeza em todos os itens de uma lista", () => {
    const gabarito = [
      { id: 1, respostaCorreta: "$2$", explicacao: "$dois$" },
      { id: 2, respostaCorreta: "R$ 5", explicacao: "sem cifrão" },
      { id: 3, respostaCorreta: "$$x+1$$", explicacao: "$y$ e $z$" },
    ];
    const cleaned = gabarito.map(sanitizeGabaritoItem);
    expect(cleaned).toHaveLength(3);
    expect(cleaned[0].respostaCorreta).toBe("2");
    expect(cleaned[0].explicacao).toBe("dois");
    expect(cleaned[1].respostaCorreta).toBe("R$ 5");
    expect(cleaned[1].explicacao).toBe("sem cifrão");
    expect(cleaned[2].respostaCorreta).toBe("x+1");
    expect(cleaned[2].explicacao).toBe("y e z");
    cleaned.forEach((c, i) => expect(c.id).toBe(gabarito[i].id));
  });

  it("normaliza correctionMirror quando presente", () => {
    const out = sanitizeGabaritoItem({ correctionMirror: "espelho $f(x)=x^2$" });
    expect(out.correctionMirror).toBe("espelho f(x)=x^2");
  });
});

// Teste de integração do pipeline `sanitizedQuestions` do AltaPerformance.
// Reproduz o mesmo mapeamento (DOMPurify + sanitizeMathData) sobre
// enunciado, alternativas, gabarito e resolução para garantir que nenhum
// caractere proibido ($, <script>) sobreviva ao pipeline.
import DOMPurify from "dompurify";

type Q = {
  content: string;
  correctionMirror?: string;
  options?: { letter: string; text: string; isCorrect: boolean }[];
  resolucao?: string;
};

const runPipeline = (questions: Q[]) =>
  questions.map((q) => ({
    ...q,
    content: sanitizeMathData(DOMPurify.sanitize(q.content)),
    correctionMirror: q.correctionMirror
      ? sanitizeMathData(DOMPurify.sanitize(q.correctionMirror))
      : undefined,
    options: q.options?.map((o) => ({ ...o, text: sanitizeMathData(o.text) })),
    resolucao: q.resolucao ? sanitizeMathData(q.resolucao) : undefined,
  }));

describe("AltaPerformance — pipeline sanitizedQuestions (integração)", () => {
  const FORBIDDEN = /\$(?!\s*\d)|<script/i;

  it("remove cifrões e scripts de enunciado, alternativas, gabarito e resolução", () => {
    const input: Q[] = [
      {
        content: "<p>Resolva $x^2 = 9$ <script>alert(1)</script></p>",
        correctionMirror: "Espelho: $x = \\pm 3$",
        options: [
          { letter: "A", text: "$x = 3$", isCorrect: true },
          { letter: "B", text: "$x = -3$", isCorrect: false },
          { letter: "C", text: "x = 0", isCorrect: false },
          { letter: "D", text: "$$impossível$$", isCorrect: false },
        ],
        resolucao: "Como $x^2=9$, então x = ±3.",
      },
      {
        content: "<p>Pagamento de R$ 10,00 — sem fórmula.</p>",
        options: [{ letter: "A", text: "R$ 5", isCorrect: true }],
      },
    ];

    const out = runPipeline(input);

    out.forEach((q) => {
      expect(q.content).not.toMatch(FORBIDDEN);
      if (q.correctionMirror) expect(q.correctionMirror).not.toMatch(FORBIDDEN);
      if (q.resolucao) expect(q.resolucao).not.toMatch(FORBIDDEN);
      q.options?.forEach((o) => expect(o.text).not.toMatch(FORBIDDEN));
    });

    // Moeda preservada
    expect(out[1].content).toContain("R$ 10,00");
    expect(out[1].options?.[0].text).toBe("R$ 5");

    // Estrutura preservada
    expect(out[0].options).toHaveLength(4);
    expect(out[0].options?.[0].isCorrect).toBe(true);
    expect(out[0].options?.[0].letter).toBe("A");
  });
});