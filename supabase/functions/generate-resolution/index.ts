import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { content, options, answer, type, subjectName, topic } = await req.json();

    if (!content || !subjectName) {
      return new Response(JSON.stringify({ error: "Conteúdo da questão e disciplina são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um assistente de ensino do Estado de São Paulo. Sua tarefa é gerar uma resolução comentada passo a passo para uma questão escolar, seguindo estritamente o Currículo Paulista.

FORMATAÇÃO BLINDADA — REGRA INVIOLÁVEL (Matemática/Física):
Está TERMINANTEMENTE PROIBIDO o uso do caractere cifrão ($) como delimitador de fórmulas ou de qualquer comando LaTeX (\\(...\\), \\[...\\], \\frac, \\sqrt, \\pi, \\alpha, \\sum, \\int, \\begin{cases}, etc.). O parser do frontend quebra com "$".
Está PROIBIDO também usar tags HTML de formatação matemática (<sup>, <sub>, <b>, <i>, <em>, <strong>).
Use EXCLUSIVAMENTE texto puro Unicode: π, ², ³, √, ±, ×, ÷, °, %, ≠, ≤, ≥, ≈, ∞, ½, ⅓, ¼, ¾, α, β, γ, δ, θ, Δ, Σ, Ω, ∈, ⊂, ∪, ∩, ∅, ℝ, ℕ, ℤ.
Para frações use barra comum (1/3, 2/7); para expoentes use ⁰¹²³⁴⁵⁶⁷⁸⁹; para subscritos ₀₁₂₃₄₅₆₇₈₉.
Exemplo: escreva "x² + 2x + 1 = 0" e NÃO "$x^2 + 2x + 1 = 0$".
A resolução deve seguir EXATAMENTE a mesma limpeza — sem $, sem LaTeX, sem tags.
VALIDAÇÃO FINAL: antes de responder, confirme que NENHUM "$", "\\(", "\\[", "\\frac", "\\sqrt" ou tag HTML de formatação aparece no texto da resolução.

A resolução deve incluir:
1. Explicação passo a passo da solução.
2. No caso de múltipla escolha, uma breve justificativa de por que a alternativa correta está certa e as outras estão incorretas.
3. Linguagem clara e adequada ao nível escolar.

Responda APENAS com JSON válido: {"explanation": "Texto da resolução aqui"}`;

    const userPrompt = `Gere a resolução comentada para a seguinte questão da disciplina "${subjectName}" (Tópico: ${topic || "Geral"}).

Tipo: ${type === "essay" ? "Dissertativa" : "Múltipla Escolha"}
Enunciado: ${content}
${options ? `Alternativas: ${JSON.stringify(options)}` : ""}
Gabarito/Referência: ${answer}

Responda em JSON: {"explanation": "Resolução detalhada aqui"}`;

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
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });
      if (response.ok || (response.status !== 503 && response.status !== 500 && response.status !== 429)) break;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }

    if (!response!.ok) {
      const t = await response!.text();
      console.error("AI gateway error:", response!.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar resolução" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response!.json();
    const resultText = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      let cleaned = resultText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", resultText);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-resolution error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
