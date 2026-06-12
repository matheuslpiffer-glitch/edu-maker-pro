import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COURSE_BONUS_INSTRUCTIONS = `
5. BONIFICAÇÃO POR ÁREA TÉCNICA:
   - Se o tema envolver SOLDAGEM/SOLDA: pontue +10% se o aluno mencionar corretamente processos (TIG, MIG, MAG, SMAW, Eletrodo Revestido), normas de qualidade (ISO 3834, ISO 9606) ou termos técnicos (junta, chanfro, escória, ZTA). Destaque como "good" annotation.
   - Se o tema envolver DESENVOLVIMENTO DE SISTEMAS/PROGRAMAÇÃO: pontue +10% se o aluno usar corretamente termos como "Backend", "Frontend", "Fullstack", "User Experience (UX)", "API", "banco de dados", "DevOps", "microsserviços". Destaque como "good" annotation.
   - Se nenhum termo técnico relevante for usado em tema técnico, registre isso nas sugestões.
`;

const COMMON_INSTRUCTIONS = `
INSTRUÇÕES ADICIONAIS OBRIGATÓRIAS:

1. MARCAÇÕES NO TEXTO: Identifique erros e pontos fracos no texto original. Retorne um array "annotations" com objetos:
   {"start": <índice_char_início>, "end": <índice_char_fim>, "type": "error"|"weak"|"good", "comment": "explicação breve"}
   - "error" = erros gramaticais, ortográficos, pontuação
   - "weak" = argumentos fracos, falta de coesão, repetição
   - "good" = trechos bem escritos, bom repertório

2. DETECÇÃO DE ORIGINALIDADE: Analise o texto e retorne:
   "originality": {"score": <0-100>, "flags": ["descrição de padrões suspeitos se houver"], "ai_generated_probability": <0-100>}
   - score 0-30 = alta chance de plágio/IA, 31-60 = suspeito, 61-100 = original
   - ai_generated_probability: probabilidade de ter sido gerado por IA externa

3. SUGESTÕES: Retorne "suggestions" como texto detalhado com dicas numeradas de melhoria.

4. REPERTÓRIO: Retorne "repertoire_analysis" analisando referências culturais, filosóficas e sociológicas usadas.

${COURSE_BONUS_INSTRUCTIONS}
`;

const BANCA_PROMPTS: Record<string, string> = {
  BANCA_NACIONAL: `Você é um corretor oficial de redação padrão nacional (ENEM).
Avalie a redação nas 5 competências oficiais (0 a 200 cada, múltiplos de 40). Pontuação total: 1000.

${COMMON_INSTRUCTIONS}

Responda APENAS com o JSON:
{
  "competencies": [
    {"name": "C1 - Norma Culta", "score": 120, "max": 200, "justification": "..."},
    {"name": "C2 - Compreensão do Tema", "score": 160, "max": 200, "justification": "..."},
    {"name": "C3 - Argumentação", "score": 120, "max": 200, "justification": "..."},
    {"name": "C4 - Coesão", "score": 80, "max": 200, "justification": "..."},
    {"name": "C5 - Proposta de Intervenção", "score": 120, "max": 200, "justification": "..."}
  ],
  "total_score": 600,
  "suggestions": "...",
  "repertoire_analysis": "...",
  "annotations": [...],
  "originality": {"score": 85, "flags": [], "ai_generated_probability": 10}
}`,

  BANCA_ACADEMICA: `Você é um corretor de banca acadêmica (FUVEST/Elite).
Avalie nas 4 dimensões da banca acadêmica (0 a 25 cada). Pontuação total: 100.

${COMMON_INSTRUCTIONS}

Responda APENAS com o JSON:
{
  "competencies": [
    {"name": "Tema e Texto", "score": 20, "max": 25, "justification": "..."},
    {"name": "Estrutura", "score": 18, "max": 25, "justification": "..."},
    {"name": "Argumentação", "score": 22, "max": 25, "justification": "..."},
    {"name": "Expressão", "score": 19, "max": 25, "justification": "..."}
  ],
  "total_score": 79,
  "suggestions": "...",
  "repertoire_analysis": "...",
  "annotations": [...],
  "originality": {"score": 85, "flags": [], "ai_generated_probability": 10}
}`,

  AVALIACAO_TECNICA: `Você é um corretor de avaliação técnica profissional.
Avalie nas 3 dimensões da banca técnica (total até 100):
- Conteúdo: Abordagem do tema, argumentação e repertório (0-36)
- Estrutura: Organização, coesão e coerência textual (0-32)
- Expressão: Domínio da norma culta e clareza na escrita (0-32)

${COMMON_INSTRUCTIONS}

Responda APENAS com JSON válido (sem markdown):
{
  "competencies": [
    {"name": "Conteúdo", "score": 28, "max": 36, "justification": "..."},
    {"name": "Estrutura", "score": 26, "max": 32, "justification": "..."},
    {"name": "Expressão", "score": 24, "max": 32, "justification": "..."}
  ],
  "total_score": 78,
  "suggestions": "...",
  "repertoire_analysis": "...",
  "annotations": [...],
  "originality": {"score": 85, "flags": [], "ai_generated_probability": 10}
}`,

  BANCA_EXCELENCIA: `Você é um corretor de banca de excelência.
Avalie nas 4 dimensões da banca de excelência (total até 12):
- Proposta temática: Abordagem do tema (0-3)
- Gênero textual: Adequação ao gênero solicitado (0-3). Se for Carta, VERIFIQUE se há local, data e despedida formal. Se ausente, desconte de "Gênero". Se for artigo, verifique título e linguagem adequada.
- Leitura dos textos: Uso produtivo da coletânea (0-3)
- Articulação: Coesão, coerência e recursos linguísticos (0-3)

CRITÉRIO EXCELÊNCIA: Valide rigorosamente a tipologia textual. Se o gênero for "Carta" e faltar local/data/despedida, a nota de Gênero deve ser no máximo 1.

${COMMON_INSTRUCTIONS}

Responda APENAS com JSON válido (sem markdown):
{
  "competencies": [
    {"name": "Proposta Temática", "score": 2, "max": 3, "justification": "..."},
    {"name": "Gênero Textual", "score": 3, "max": 3, "justification": "..."},
    {"name": "Leitura dos Textos", "score": 2, "max": 3, "justification": "..."},
    {"name": "Articulação", "score": 2, "max": 3, "justification": "..."}
  ],
  "total_score": 9,
  "suggestions": "...",
  "repertoire_analysis": "...",
  "annotations": [...],
  "originality": {"score": 85, "flags": [], "ai_generated_probability": 10}
}`,

  UNICAMP: `Você é um corretor da banca UNICAMP (Comvest).
Avalie nas 4 dimensões (0 a 3 cada). Pontuação total: 12.

${COMMON_INSTRUCTIONS}

Responda APENAS com o JSON:
{
  "competencies": [
    {"name": "Adequação ao Gênero (AIA)", "score": 2, "max": 3, "justification": "..."},
    {"name": "Interlocução", "score": 2, "max": 3, "justification": "..."},
    {"name": "Conteúdo e Leitura", "score": 3, "max": 3, "justification": "..."},
    {"name": "Articulação Linguística", "score": 2, "max": 3, "justification": "..."}
  ],
  "total_score": 9,
  "suggestions": "...",
  "repertoire_analysis": "...",
  "annotations": [...],
  "originality": {"score": 85, "flags": [], "ai_generated_probability": 10}
}`,

  FUVEST: `Você é um corretor da banca FUVEST (USP) com expertise em argumentação filosófica e abstração.
A FUVEST valoriza capacidade de abstração, tese filosófica sólida e rigor absoluto na norma culta.

Avalie nas 3 dimensões da banca FUVEST (total até 50):
- Desenvolvimento do Tema e Tipologia: Adequação ao tema, capacidade de abstração, profundidade da tese e argumentação filosófica. O aluno apresenta uma tese clara e a desenvolve com argumentos consistentes? (0-20)
- Estrutura: Organização do texto, progressão temática, paragrafação lógica e construção argumentativa sólida (0-15)
- Expressão: Domínio rigoroso da norma culta formal, precisão vocabular, recursos estilísticos e ausência de marcas de oralidade (0-15)

CRITÉRIO FUVEST: Valorize especialmente a capacidade de ABSTRAÇÃO — o aluno que generaliza o tema com reflexão filosófica profunda deve ter nota máxima em Desenvolvimento. Penalize fortemente desvios de norma culta.

${COMMON_INSTRUCTIONS}

Responda APENAS com JSON válido (sem markdown):
{
  "competencies": [
    {"name": "Desenvolvimento do Tema", "score": 14, "max": 20, "justification": "..."},
    {"name": "Estrutura", "score": 11, "max": 15, "justification": "..."},
    {"name": "Expressão", "score": 10, "max": 15, "justification": "..."}
  ],
  "total_score": 35,
  "suggestions": "...",
  "repertoire_analysis": "...",
  "annotations": [...],
  "originality": {"score": 85, "flags": [], "ai_generated_probability": 10}
}`,

  VUNESP: `Você é um corretor da banca VUNESP (Unesp/Famema/Famerp) com expertise em estrutura dissertativa clássica.
A VUNESP foca em estrutura clássica de tese e argumentos, com atenção total à coerência e coesão.

Avalie nas 3 dimensões da banca VUNESP (total até 20):
- Tema: Adequação e abordagem do tema proposto. O aluno compreendeu o recorte temático? A tese é clara e bem posicionada? (0-7)
- Estrutura e Gênero: Organização do texto dissertativo-argumentativo, paragrafação, introdução com tese, desenvolvimento com argumentos e conclusão coerente (0-7)
- Coesão e Coerência: Uso adequado de conectivos, progressão textual lógica, ausência de contradições e domínio da norma culta (0-6)

CRITÉRIO VUNESP: Seja rigoroso com a COERÊNCIA — contradições internas devem zerar o critério. A estrutura dissertativa clássica (intro-desenv-conclusão) é obrigatória.

${COMMON_INSTRUCTIONS}

Responda APENAS com JSON válido (sem markdown):
{
  "competencies": [
    {"name": "Tema", "score": 5, "max": 7, "justification": "..."},
    {"name": "Estrutura e Gênero", "score": 5, "max": 7, "justification": "..."},
    {"name": "Coesão e Coerência", "score": 4, "max": 6, "justification": "..."}
  ],
  "total_score": 14,
  "suggestions": "...",
  "repertoire_analysis": "...",
  "annotations": [...],
  "originality": {"score": 85, "flags": [], "ai_generated_probability": 10}
}`,
};

// Normalize banca value from frontend to prompt key
function resolveBancaKey(banca: string): string {
  const map: Record<string, string> = {
    "banca padrão nacional": "BANCA_NACIONAL",
    "banca padrao nacional": "BANCA_NACIONAL",
    "banca acadêmica": "BANCA_ACADEMICA",
    "banca academica": "BANCA_ACADEMICA",
    "avaliação técnica": "AVALIACAO_TECNICA",
    "avaliacao tecnica": "AVALIACAO_TECNICA",
    "banca de excelência": "BANCA_EXCELENCIA",
    "banca de excelencia": "BANCA_EXCELENCIA",
    "unicamp": "UNICAMP",
    "fuvest": "FUVEST",
    "vunesp": "VUNESP",
  };
  const normalized = (banca || "").toLowerCase().trim();
  return map[normalized] || Object.keys(BANCA_PROMPTS).find(k => k === banca) || "BANCA_NACIONAL";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { essayText, banca, theme, generoTextual } = await req.json();
    if (!essayText || typeof essayText !== "string" || essayText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Texto muito curto. Mínimo de 50 caracteres." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (essayText.length > 15000) {
      return new Response(JSON.stringify({ error: "Texto excede o limite de 15.000 caracteres." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const bancaKey = resolveBancaKey(banca);
    let systemPrompt = BANCA_PROMPTS[bancaKey] || BANCA_PROMPTS["BANCA_NACIONAL"];
    const safeTheme = (theme || "Tema livre").slice(0, 500);

    // If UNICAMP and genre specified, inject into prompt
    if (bancaKey === "UNICAMP" && generoTextual) {
      systemPrompt = systemPrompt.replace(
        "CRITÉRIO UNICAMP:",
        `GÊNERO TEXTUAL EXIGIDO NESTA PROVA: "${generoTextual}". Avalie RIGOROSAMENTE se o aluno atendeu a este gênero.\n\nCRITÉRIO UNICAMP:`
      );
    }

    const creditCheck = await checkAndDecrementCredits(userId);
    if (!creditCheck.allowed) {
      return new Response(JSON.stringify({ error: creditCheck.error }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let response;
    for (let i = 0; i < 4; i++) {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Tema da proposta: "${safeTheme}"\n\nRedação do aluno (texto integral):\n\n${essayText}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 6000,
        }),
      });
      if (response.ok || (response.status !== 503 && response.status !== 500 && response.status !== 429)) break;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }


    if (!response!.ok) {
      if (response!.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response!.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response!.text();
      console.error("AI gateway error:", response!.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar correção" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response!.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const start = cleaned.search(/[\{\[]/);
      const end = cleaned.lastIndexOf(cleaned[start] === "[" ? "]" : "}");
      if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure defaults
    if (!parsed.annotations) parsed.annotations = [];
    if (!parsed.originality) parsed.originality = { score: 75, flags: [], ai_generated_probability: 0 };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("correct-essay-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
