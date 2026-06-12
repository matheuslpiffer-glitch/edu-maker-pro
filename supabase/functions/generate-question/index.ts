import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const userId = getUserIdFromAuth(authHeader);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { skillCode, skillDescription, subjectName, grade, type, difficulty } = await req.json();

    if (!skillDescription || !subjectName) {
      return new Response(JSON.stringify({ error: "Habilidade e disciplina são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const questionType = type === "essay" ? "dissertativa" : "de múltipla escolha (4 alternativas, apenas 1 correta)";
    const difficultyMap: Record<string, string> = {
      easy: "fácil, com linguagem acessível",
      medium: "média, equilibrando acessibilidade e rigor",
      hard: "difícil, exigindo análise crítica e raciocínio aprofundado",
    };
    const diffLabel = difficultyMap[difficulty] || difficultyMap.medium;

    const systemPrompt = `Você é um assistente de ensino do Estado de São Paulo. Ao gerar atividades, utilize estritamente o Escopo e Sequência da Gestor de Ensino e o Currículo Paulista. Foque nos Objetos de Conhecimento e Habilidades específicos para o bimestre e série selecionados. Garanta que a linguagem e a complexidade estejam alinhadas com o material digital oficial da rede.

FORMATAÇÃO BLINDADA — REGRA INVIOLÁVEL:
Está TERMINANTEMENTE PROIBIDO o uso de delimitadores LaTeX ($...$, $$...$$, \\(...\\), \\[...\\]) e tags HTML de formatação (<sup>, <sub>, <b>, <i>, <em>, <strong>).
Use EXCLUSIVAMENTE caracteres Unicode: π, ², ³, √, ±, ×, ÷, ≠, ≤, ≥, ≈, ∞, ½, ⅓, ¼, ¾, α, β, γ, δ, θ, Δ, Σ, Ω, ∈, ⊂, ∪, ∩, ∅, ∀, ∃, ⟹, ℝ, ℕ, ℤ.
Para frações não-padrão use barra comum: 1/3, 2/7. Para sobrescritos use: ⁰¹²³⁴⁵⁶⁷⁸⁹. Para subscritos: ₀₁₂₃₄₅₆₇₈₉.
VALIDAÇÃO: Verifique que NENHUM $ ou <sup>/<sub>/<b>/<i> exista no texto final.

Responda APENAS com JSON válido, sem markdown ou texto adicional.`;

    let userPrompt: string;
    if (type === "essay") {
      userPrompt = `Gere uma questão ${questionType} de dificuldade ${diffLabel} para a disciplina "${subjectName}" (${grade || ""}).

Habilidade BNCC/Gestor de Ensino: ${skillCode ? `${skillCode} - ` : ""}${skillDescription}

Responda em JSON:
{
  "content": "<p>Enunciado da questão em HTML</p>",
  "answer": "Resposta esperada detalhada com critérios de avaliação"
}`;
    } else {
      userPrompt = `Gere uma questão ${questionType} de dificuldade ${diffLabel} para a disciplina "${subjectName}" (${grade || ""}).

Habilidade BNCC/Gestor de Ensino: ${skillCode ? `${skillCode} - ` : ""}${skillDescription}

Responda em JSON:
{
  "content": "<p>Enunciado da questão em HTML</p>",
  "options": [
    {"text": "Alternativa A (correta)", "isCorrect": true},
    {"text": "Alternativa B", "isCorrect": false},
    {"text": "Alternativa C", "isCorrect": false},
    {"text": "Alternativa D", "isCorrect": false}
  ]
}`;
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
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
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
      return new Response(JSON.stringify({ error: "Erro ao gerar questão" }), {
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
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-question error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
