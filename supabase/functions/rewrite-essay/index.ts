import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { essayText, banca, theme, suggestions } = await req.json();
    if (!essayText || typeof essayText !== "string" || essayText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Texto muito curto." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em redação da banca ${banca || "Banca Padrão Nacional"} com nota máxima.
Sua tarefa é REESCREVER a redação do aluno transformando-a em uma versão "Nota Máxima" (1000 na banca nacional, 100 na banca acadêmica, 12 na banca de excelência).

REGRAS:
- Mantenha a MESMA TESE e LINHA ARGUMENTATIVA do aluno
- Melhore a estrutura, coesão, vocabulário e repertório
- Corrija todos os erros gramaticais
- Adicione repertório sociocultural pertinente (citações, dados, referências)
- Para banca nacional: garanta proposta de intervenção completa (Agente, Ação, Meio, Efeito, Detalhamento)
- Para banca de excelência: respeite o gênero textual solicitado
- Marque com [MELHORIA] ao lado de cada parágrafo que foi significativamente alterado

Responda APENAS com JSON válido (sem markdown):
{
  "rewritten_text": "Texto completo reescrito...",
  "changes_summary": "Resumo das principais alterações feitas...",
  "key_improvements": ["Melhoria 1", "Melhoria 2", "Melhoria 3"]
}`,
          },
          {
            role: "user",
            content: `Tema: "${(theme || "Tema livre").slice(0, 500)}"

Redação original do aluno:
${essayText}

${suggestions ? `\nSugestões da correção anterior:\n${suggestions}` : ""}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 5000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar reescrita" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      console.error("Parse error:", content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar reescrita" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rewrite-essay error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
