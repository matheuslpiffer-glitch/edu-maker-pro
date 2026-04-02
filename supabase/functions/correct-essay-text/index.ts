import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BANCA_PROMPTS: Record<string, string> = {
  ENEM: `Você é um corretor oficial do ENEM com 20+ anos de experiência.
Avalie a redação nas 5 competências do ENEM (0 a 200 cada, múltiplos de 40):
- C1: Domínio da modalidade escrita formal da língua portuguesa
- C2: Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento
- C3: Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos
- C4: Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação
- C5: Elaborar proposta de intervenção para o problema abordado

Responda APENAS com JSON válido:
{
  "competencies": [
    {"name": "C1 - Norma Culta", "score": 120, "max": 200, "justification": "..."},
    {"name": "C2 - Compreensão do Tema", "score": 160, "max": 200, "justification": "..."},
    {"name": "C3 - Argumentação", "score": 120, "max": 200, "justification": "..."},
    {"name": "C4 - Coesão", "score": 80, "max": 200, "justification": "..."},
    {"name": "C5 - Proposta de Intervenção", "score": 120, "max": 200, "justification": "..."}
  ],
  "total_score": 600,
  "suggestions": "Texto com sugestões detalhadas de melhoria...",
  "repertoire_analysis": "Análise do repertório sociocultural utilizado..."
}`,

  FUVEST: `Você é um corretor da banca FUVEST/USP com expertise em redação dissertativa.
Avalie nas 4 dimensões da FUVEST (0 a 25 cada, total 100):
- Tema e texto: Adequação ao tema proposto e gênero dissertativo
- Estrutura: Organização textual (introdução, desenvolvimento, conclusão)
- Argumentação: Qualidade dos argumentos e consistência
- Expressão: Domínio da norma culta e recursos expressivos

Responda APENAS com JSON válido:
{
  "competencies": [
    {"name": "Tema e Texto", "score": 20, "max": 25, "justification": "..."},
    {"name": "Estrutura", "score": 18, "max": 25, "justification": "..."},
    {"name": "Argumentação", "score": 22, "max": 25, "justification": "..."},
    {"name": "Expressão", "score": 19, "max": 25, "justification": "..."}
  ],
  "total_score": 79,
  "suggestions": "...",
  "repertoire_analysis": "..."
}`,

  UNESP: `Você é um corretor da banca UNESP.
Avalie nas 3 dimensões da UNESP (0 a 32 cada + bônus, total até 100):
- Conteúdo: Abordagem do tema, argumentação e repertório (0-36)
- Estrutura: Organização, coesão e coerência (0-32)  
- Expressão: Domínio da norma culta e clareza (0-32)

Responda APENAS com JSON válido:
{
  "competencies": [
    {"name": "Conteúdo", "score": 28, "max": 36, "justification": "..."},
    {"name": "Estrutura", "score": 26, "max": 32, "justification": "..."},
    {"name": "Expressão", "score": 24, "max": 32, "justification": "..."}
  ],
  "total_score": 78,
  "suggestions": "...",
  "repertoire_analysis": "..."
}`,

  UNICAMP: `Você é um corretor da banca UNICAMP.
Avalie nas 4 dimensões da UNICAMP (total até 12):
- Proposta temática: Abordagem do tema e gênero textual (0-3)
- Gênero textual: Adequação ao gênero solicitado (0-3)
- Leitura dos textos: Uso produtivo da coletânea (0-3)
- Articulação: Coesão, coerência e recursos linguísticos (0-3)

Responda APENAS com JSON válido:
{
  "competencies": [
    {"name": "Proposta Temática", "score": 2, "max": 3, "justification": "..."},
    {"name": "Gênero Textual", "score": 3, "max": 3, "justification": "..."},
    {"name": "Leitura dos Textos", "score": 2, "max": 3, "justification": "..."},
    {"name": "Articulação", "score": 2, "max": 3, "justification": "..."}
  ],
  "total_score": 9,
  "suggestions": "...",
  "repertoire_analysis": "..."
}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { essayText, banca, theme } = await req.json();
    if (!essayText || essayText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Texto muito curto. Mínimo de 50 caracteres." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = BANCA_PROMPTS[banca] || BANCA_PROMPTS["ENEM"];

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
            content: `Tema da proposta: "${theme || 'Tema livre'}"\n\nRedação do aluno:\n\n${essayText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
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
