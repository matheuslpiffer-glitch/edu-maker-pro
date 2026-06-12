import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { examType, subjectArea, grade, average, distribution, weakSkills } = await req.json();

    const systemPrompt = `Você é um especialista em análise de dados educacionais do Estado de São Paulo. Com base nos resultados de uma avaliação, forneça insights pedagógicos precisos e acionáveis, alinhados ao Currículo Paulista e ao Escopo e Sequência da Gestor de Ensino.

Responda APENAS com JSON válido, sem markdown.`;

    const userPrompt = `Analise os resultados de um simulado ${examType} de ${subjectArea} para o ${grade}:

- Média da turma: ${average}%
- Distribuição: Abaixo do Básico: ${distribution.abaixo_basico} alunos, Básico: ${distribution.basico}, Proficiente: ${distribution.proficiente}, Avançado: ${distribution.avancado}
${weakSkills?.length ? `- Habilidades com menor desempenho: ${weakSkills.join(', ')}` : ''}

Responda em JSON:
{
  "overallAnalysis": "Análise geral do desempenho da turma (2-3 frases)",
  "urgentActions": [
    {"title": "Ação 1", "description": "Descrição da ação pedagógica", "priority": "alta"},
    {"title": "Ação 2", "description": "Descrição", "priority": "media"}
  ],
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "recommendations": [
    "Recomendação pedagógica específica 1",
    "Recomendação pedagógica específica 2",
    "Recomendação pedagógica específica 3"
  ]
}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
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
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar insights" }), {
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
      console.error("Failed to parse:", content);
      return new Response(JSON.stringify({ error: "Erro ao processar insights" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pedagogical-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
