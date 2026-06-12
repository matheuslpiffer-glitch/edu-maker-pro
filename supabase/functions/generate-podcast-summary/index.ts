import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questions, title, subject } = await req.json();
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: "Questões são obrigatórias" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const userId = getUserIdFromAuth(req.headers.get("Authorization"));
    if (userId) {
      const creditCheck = await checkAndDecrementCredits(userId);
      if (!creditCheck.allowed) {
        return new Response(JSON.stringify({ error: creditCheck.error }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const contentText = questions.map((q: any, i: number) => {
      const opts = (q.options || []).map((o: any) => `${o.letter}) ${o.text}${o.isCorrect ? ' ✓' : ''}`).join("; ");
      return `Q${i + 1}: ${q.content.replace(/<[^>]+>/g, '')} | ${opts}`;
    }).join("\n");

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
            content: `Você é um roteirista de podcasts educacionais. Crie um roteiro de podcast envolvente e didático a partir do conteúdo fornecido.

O roteiro deve:
- Ter um título cativante
- Começar com uma saudação ao ouvinte
- Explicar os conceitos-chave de forma conversacional
- Mencionar as questões como "desafios" para o ouvinte pensar
- Revelar as respostas com explicações
- Ter uma despedida motivacional
- Durar aproximadamente 5-8 minutos de leitura
- Usar formatação em HTML com <h2>, <p>, <strong>, <em>`,
          },
          { role: "user", content: `Título: ${title || 'Simulado'}\nDisciplina: ${subject || 'Geral'}\n\nConteúdo:\n${contentText}` },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro ao gerar roteiro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ script }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("podcast error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
