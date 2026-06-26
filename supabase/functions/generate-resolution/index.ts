import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const {
      content = "",
      options = [],
      answer = "",
      type = "multiple-choice",
      subjectName = "",
      topic = "",
    } = body || {};

    if (!content || String(content).trim().length < 5) {
      return new Response(JSON.stringify({ error: "Enunciado obrigatório." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isMC = type === "multiple-choice";
    const optionsText = isMC && Array.isArray(options)
      ? options.map((o: any, i: number) =>
          `${String.fromCharCode(65 + i)}) ${o?.text || ""}${o?.isCorrect ? "  [CORRETA]" : ""}`,
        ).join("\n")
      : "";

    const systemPrompt = `Você é um professor experiente que escreve resoluções comentadas claras e didáticas para gabarito oficial.

FORMATAÇÃO BLINDADA — REGRA INVIOLÁVEL:
Está TERMINANTEMENTE PROIBIDO usar:
- O caractere cifrão ($) como delimitador ou qualquer comando LaTeX (\\(...\\), \\[...\\], \\frac, \\sqrt, \\pi, \\alpha, \\sum, \\int, \\begin{cases}, etc.). O parser do frontend quebra com "$".
- Tags HTML de formatação (<sup>, <sub>, <b>, <i>, <em>, <strong>, <span>, <div>, <script>, <style>, <iframe>).
Use EXCLUSIVAMENTE texto puro Unicode: π, ², ³, √, ±, ×, ÷, °, %, ≠, ≤, ≥, ≈, ∞, ½, ⅓, ¼, ¾, α, β, γ, δ, θ, Δ, Σ, Ω.
Para frações use barra comum (1/3, 2/7); para expoentes use ⁰¹²³⁴⁵⁶⁷⁸⁹; para subscritos ₀₁₂₃₄₅₆₇₈₉.
Moeda (R$, US$) é permitida.

Responda APENAS com JSON válido, sem markdown.`;

    const userPrompt = `Gere uma RESOLUÇÃO COMENTADA para a questão abaixo (disciplina: ${subjectName || "—"}, tópico: ${topic || "—"}).

ENUNCIADO:
${content}

${isMC ? `ALTERNATIVAS:\n${optionsText}\n` : `GABARITO/RESPOSTA ESPERADA:\n${answer || "(em branco)"}\n`}

A resolução deve:
1. Apresentar o passo a passo do raciocínio (3 a 6 passos curtos).
2. ${isMC ? "Justificar por que a alternativa correta está certa e, em uma linha cada, por que as demais estão erradas." : "Indicar os critérios de avaliação e o que se espera ver na resposta do aluno."}
3. Terminar com uma frase pedagógica de fechamento (até 25 palavras).

Responda em JSON:
{
  "explanation": "texto corrido em parágrafos curtos, sem HTML, sem LaTeX, sem $"
}`;

    const creditCheck = await checkAndDecrementCredits(userId);
    if (!creditCheck.allowed) {
      return new Response(JSON.stringify({ error: creditCheck.error }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let response: Response | undefined;
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
          temperature: 0.6,
        }),
      });
      if (response.ok) break;
      if (![429, 500, 503].includes(response.status)) break;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
    }

    if (!response || !response.ok) {
      const status = response?.status ?? 500;
      const msg =
        status === 429 ? "Limite de requisições excedido. Tente novamente em instantes." :
        status === 402 ? "Créditos insuficientes." :
        "Erro ao gerar resolução";
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    let parsed: { explanation?: string } = {};
    try {
      let cleaned = String(raw).replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const start = cleaned.search(/[\{\[]/);
      const end = cleaned.lastIndexOf(cleaned[start] === "[" ? "]" : "}");
      if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: usa o texto cru como explicação.
      parsed = { explanation: String(raw).trim() };
    }

    let explanation = String(parsed.explanation || "").trim();
    // Limpeza defensiva (mesmas regras do prompt).
    explanation = explanation
      .replace(/<[^>]+>/g, "")
      .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
      .replace(/\$([^$\n]+?)\$/g, "$1");

    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-resolution error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});