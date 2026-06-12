import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { errors } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const errorList = (errors || []).slice(0, 5).map((e: string, i: number) => `${i + 1}. ${e}`).join('\n');

    const systemPrompt = `Você é um coordenador pedagógico especialista em avaliações PISA. 
Com base nos erros mais frequentes identificados nos simulados de elite dos alunos, crie um PLANO DE INTERVENÇÃO PEDAGÓGICA curto e prático.

ERROS IDENTIFICADOS:
${errorList}

O plano deve conter:
1. Objetivo da intervenção (1 frase)
2. Duração sugerida (ex: 2 aulas de 50 min)
3. Sequência de atividades (3-5 atividades práticas e engajadoras)
4. Recursos necessários
5. Critérios de avaliação da melhoria

Seja prático, motivador e focado em metodologias ativas.`;

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
            { role: "user", content: "Gere o plano de intervenção pedagógica." },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_intervention_plan",
              description: "Return a structured intervention plan",
              parameters: {
                type: "object",
                properties: {
                  objective: { type: "string" },
                  duration: { type: "string" },
                  activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        duration: { type: "string" },
                      },
                      required: ["title", "description", "duration"],
                    },
                  },
                  resources: { type: "array", items: { type: "string" } },
                  evaluation_criteria: { type: "string" },
                },
                required: ["objective", "duration", "activities", "resources", "evaluation_criteria"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_intervention_plan" } },
        }),
      });
      if (response.ok || (response.status !== 503 && response.status !== 500 && response.status !== 429)) break;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }

    if (!response!.ok) {
      if (response!.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response!.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response!.text();
      console.error("AI error:", response!.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const result = await response!.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Sem dados estruturados");

    const plan = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Intervention plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
