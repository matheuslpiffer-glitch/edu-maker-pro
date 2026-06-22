import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questions } = await req.json();
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: "Questões são obrigatórias" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const questionsText = questions.map((q: any, i: number) => {
      const opts = (q.options || []).map((o: any) => `${o.letter}) ${o.text}`).join("\n");
      const correct = (q.options || []).find((o: any) => o.isCorrect)?.letter || "A";
      return `Questão ${i + 1}:\n${q.content}\n${opts}\nCorreta: ${correct}`;
    }).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um formatador de dados para o Kahoot. Converta questões para o formato CSV do Kahoot.
O formato EXATO deve ser (sem cabeçalho):
Question,Answer 1,Answer 2,Answer 3,Answer 4,Time limit (sec),Correct answer(s)

Regras:
- Remova tags HTML do enunciado
- Limite cada pergunta a 120 caracteres
- Limite cada resposta a 75 caracteres
- Time limit sempre 30
- Correct answer é o número da alternativa correta (1, 2, 3 ou 4)
- Use apenas as 4 primeiras alternativas
- Responda APENAS com o CSV, sem explicações`,
          },
          { role: "user", content: questionsText },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro ao formatar Kahoot" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const csv = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ csv: csv.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kahoot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
