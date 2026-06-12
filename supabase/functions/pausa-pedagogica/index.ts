import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, grade } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const categoryDescriptions: Record<string, string> = {
      foco: "Atividade de foco e concentração (respiração, mindfulness, atenção plena)",
      musica: "Atividade musical rápida (ritmo com palmas, canto coletivo, escuta ativa de trecho musical)",
      reflexao: "Reflexão ética/religiosa laica (valores, empatia, gratidão, diversidade cultural)",
      energizante: "Dinâmica energizante (movimento corporal, alongamento, dança rápida)",
      criatividade: "Exercício criativo rápido (desenho relâmpago, história coletiva, associação livre)",
    };

    const catDesc = categoryDescriptions[category] || categoryDescriptions.foco;

    const systemPrompt = `Você é uma pedagoga especialista em dinâmicas de grupo e neurociência da aprendizagem.
Gere UMA dinâmica rápida (máximo 2 minutos) para início de aula.
Série: ${grade || "Geral"}.
Categoria: ${catDesc}.

REGRAS:
- A atividade deve ser realizável em sala de aula comum, sem materiais especiais.
- Instruções claras e numeradas.
- Adapte a linguagem à faixa etária.
- Retorne EXCLUSIVAMENTE JSON válido.

Estrutura:
{
  "title": "Nome criativo da dinâmica",
  "category": "${category || 'foco'}",
  "duration": "1-2 min",
  "objective": "O que se espera alcançar",
  "instructions": ["Passo 1", "Passo 2", "Passo 3"],
  "variation": "Uma variação para turmas maiores ou menores",
  "teacherTip": "Dica para o professor",
  "emoji": "🎯"
}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere uma dinâmica de ${catDesc} para ${grade || "turma geral"}.` },
        ],
      }),
    });

    if (!response.ok) {
      const s = response.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Limite de requisições." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro ao gerar dinâmica." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content || "").replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const result = JSON.parse(raw);

    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("pausa-pedagogica error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
