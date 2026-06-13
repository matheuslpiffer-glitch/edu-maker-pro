import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { proficiencyLevel, competency, questionCount, eliteMode, eliteCategory } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado. Faça login novamente." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const creditCheck = await checkAndDecrementCredits(userId);
    if (!creditCheck.allowed) {
      return new Response(JSON.stringify({ error: creditCheck.error }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const competencyLabels: Record<string, string> = {
      letramento_matematico: "Letramento Matemático",
      letramento_leitura: "Letramento em Leitura",
      letramento_cientifico: "Letramento Científico",
      letramento_financeiro: "Letramento Financeiro",
      pensamento_critico: "Pensamento Crítico e Criativo",
    };

    const competencyLabel = competencyLabels[competency] || competency;
    const count = questionCount || 5;

    const eliteAddendum = eliteMode ? `

MODO ELITE ATIVADO — Categoria: "${eliteCategory || 'Elite'}".
REGRAS ADICIONAIS PARA ELITE:
- Gere APENAS questões de Níveis 5 e 6 da OCDE (alterne entre ambos).
- Priorize fortemente questões do tipo "constructed-response" (pelo menos 60% devem ser dissertativas).
- Cada questão dissertativa deve exigir que o aluno EXPLIQUE o raciocínio completo.
- Inclua cenários complexos que envolvam múltiplas variáveis e tomada de decisão.
- Avalie habilidades como: Pensamento Estratégico, Modelagem Avançada, Análise de Viés, Design Experimental, Resolução Criativa de Problemas.` : '';

    const systemPrompt = `Você é um especialista em avaliações internacionais PISA (Programme for International Student Assessment) da OCDE. 
Gere exatamente ${count} questões no formato PISA para o Nível de Proficiência ${proficiencyLevel} (escala OCDE 1-6) na competência "${competencyLabel}".

REGRAS OBRIGATÓRIAS:
1. Cada questão deve ser contextualizada em um cenário do mundo real (ex: gestão escolar, consumo, meio ambiente, saúde pública).
2. Varie os tipos de item entre:
   - "multiple-choice": 4 alternativas (A-D), apenas 1 correta
   - "constructed-response": O aluno explica seu raciocínio em texto livre (forneça uma resposta modelo)
   - "data-analysis": Apresente dados em formato textual (tabela descrita) e peça interpretação
   - "interactive-scenario": Descreva um cenário-problema e peça uma solução criativa
3. Inclua referência à habilidade do século XXI sendo avaliada (ex: "Interpretar Dados", "Resolução de Problemas", "Pensamento Crítico", "Comunicação Efetiva", "Letramento Financeiro").
4. O nível de complexidade deve corresponder estritamente ao nível PISA indicado.

Níveis PISA de referência:
- Nível 1: Tarefas simples e diretas, contextos familiares
- Nível 2: Interpretação básica, inferências simples
- Nível 3: Múltiplas informações, procedimentos sequenciais
- Nível 4: Raciocínio complexo, modelos explícitos
- Nível 5: Modelagem avançada, pensamento estratégico
- Nível 6: Conceituação e generalização, raciocínio matemático avançado${eliteAddendum}`;

    const userPrompt = `Gere ${count} questões PISA ${eliteMode ? 'ELITE (níveis 5-6)' : `nível ${proficiencyLevel}`} para "${competencyLabel}". Retorne APENAS o JSON.`;

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
        tools: [{
          type: "function",
          function: {
            name: "return_pisa_questions",
            description: "Return PISA-style questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["multiple-choice", "constructed-response", "data-analysis", "interactive-scenario"] },
                      scenario: { type: "string", description: "Contexto/cenário do mundo real" },
                      content: { type: "string", description: "Enunciado da questão" },
                      options: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            letter: { type: "string" },
                            text: { type: "string" },
                            isCorrect: { type: "boolean" },
                          },
                          required: ["letter", "text", "isCorrect"],
                        },
                        description: "Alternativas (apenas para multiple-choice)",
                      },
                      modelAnswer: { type: "string", description: "Resposta modelo ou gabarito comentado" },
                      skill21: { type: "string", description: "Habilidade do Século XXI avaliada" },
                      dataTable: { type: "string", description: "Dados em formato tabular (para data-analysis)" },
                    },
                    required: ["type", "scenario", "content", "modelAnswer", "skill21"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_pisa_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta da IA sem dados estruturados");

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("PISA generation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
