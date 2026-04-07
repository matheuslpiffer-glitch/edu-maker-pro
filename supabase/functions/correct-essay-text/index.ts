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
  ENEM: `Você é um corretor oficial do ENEM com 20+ anos de experiência.
Avalie a redação nas 5 competências do ENEM (0 a 200 cada, múltiplos de 40: 0, 40, 80, 120, 160, 200):
- C1: Domínio da modalidade escrita formal da língua portuguesa
- C2: Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento
- C3: Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista
- C4: Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação
- C5: Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos

REGRA C5 (OBRIGATÓRIA): A proposta de intervenção DEVE conter 5 elementos: Agente (quem), Ação (o quê), Meio/Modo (como), Efeito/Finalidade (para quê) e Detalhamento de um dos anteriores. Para cada elemento ausente, desconte 40 pontos da C5.

${COMMON_INSTRUCTIONS}

Responda APENAS com JSON válido (sem markdown):
{
  "competencies": [
    {"name": "C1 - Norma Culta", "score": 120, "max": 200, "justification": "..."},
    {"name": "C2 - Compreensão do Tema", "score": 160, "max": 200, "justification": "..."},
    {"name": "C3 - Argumentação", "score": 120, "max": 200, "justification": "..."},
    {"name": "C4 - Coesão", "score": 80, "max": 200, "justification": "..."},
    {"name": "C5 - Proposta de Intervenção", "score": 120, "max": 200, "justification": "... Elementos encontrados: Agente(sim/não), Ação(...), Meio(...), Efeito(...), Detalhamento(...)"}
  ],
  "total_score": 600,
  "suggestions": "...",
  "repertoire_analysis": "...",
  "annotations": [...],
  "originality": {"score": 85, "flags": [], "ai_generated_probability": 10}
}`,

  FUVEST: `Você é um corretor da banca FUVEST/USP com expertise em redação dissertativa.
Avalie nas 4 dimensões da FUVEST (0 a 25 cada, total 100):
- Tema e texto: Adequação ao tema proposto e gênero dissertativo
- Estrutura: Organização textual (introdução, desenvolvimento, conclusão)
- Argumentação: Qualidade dos argumentos, consistência e uso de repertório erudito
- Expressão: Domínio da norma culta e recursos expressivos

CRITÉRIO FUVEST: Valorize especialmente analogias, metáforas e repertório erudito (filosofia, literatura clássica, ciências). Seja rigoroso com a norma culta formal e coesão textual refinada.

${COMMON_INSTRUCTIONS}

Responda APENAS com JSON válido (sem markdown):
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

  VUNESP: `Você é um corretor da banca VUNESP (Fundação para o Vestibular da UNESP).
Avalie nas 3 dimensões da VUNESP (total até 100):
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

  UNICAMP: `Você é um corretor da banca UNICAMP.
Avalie nas 4 dimensões da UNICAMP (total até 12):
- Proposta temática: Abordagem do tema (0-3)
- Gênero textual: Adequação ao gênero solicitado (0-3). Se for Carta, VERIFIQUE se há local, data e despedida formal. Se ausente, desconte de "Gênero". Se for artigo, verifique título e linguagem adequada.
- Leitura dos textos: Uso produtivo da coletânea (0-3)
- Articulação: Coesão, coerência e recursos linguísticos (0-3)

CRITÉRIO UNICAMP: Valide rigorosamente a tipologia textual. Se o gênero for "Carta" e faltar local/data/despedida, a nota de Gênero deve ser no máximo 1.

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
};

// Keep backward compat alias
BANCA_PROMPTS["Avaliação Técnica"] = BANCA_PROMPTS["Avaliação Técnica"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { essayText, banca, theme } = await req.json();
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const bancaKey = (banca || "Banca Padrão Nacional").toUpperCase();
    const systemPrompt = BANCA_PROMPTS[bancaKey] || BANCA_PROMPTS["Banca Padrão Nacional"];
    const safeTheme = (theme || "Tema livre").slice(0, 500);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar correção" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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
