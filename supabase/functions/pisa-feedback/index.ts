import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.search(/[\{\[]/);
  const jsonEnd = cleaned.lastIndexOf(jsonStart !== -1 && cleaned[jsonStart] === '[' ? ']' : '}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in response");
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questionContent, scenario, studentAnswer, modelAnswer, skill21 } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    if (!studentAnswer?.trim()) {
      return new Response(JSON.stringify({ error: "Resposta do aluno não pode estar vazia." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um avaliador pedagógico especializado no PISA (OCDE). Analise a resposta dissertativa do aluno e forneça feedback construtivo.

CONTEXTO DA QUESTÃO:
- Cenário: ${scenario || 'Não informado'}
- Enunciado: ${questionContent}
- Habilidade avaliada: ${skill21 || 'Não informada'}
- Resposta modelo (gabarito): ${modelAnswer}

RESPOSTA DO ALUNO:
"${studentAnswer}"

INSTRUÇÕES DE AVALIAÇÃO:
1. Avalie em 3 eixos (nota 0-10 cada):
   - Clareza do Raciocínio: O aluno organizou as ideias de forma lógica e coerente?
   - Uso de Evidências: O aluno utilizou dados, informações do texto/problema para sustentar sua resposta?
   - Precisão Técnica: A resposta está tecnicamente correta e demonstra domínio do conceito?

2. Determine o nível PISA aproximado da resposta (1-6).

3. Se o nível for 3 ou 4 (intermediário), gere uma PROVOCAÇÃO PEDAGÓGICA que instigue o aluno a melhorar.

4. Para cada ponto fraco, gere uma PISTA DE ESTUDO específica.

5. Identifique o principal erro conceitual (se houver) para análise da turma.

Responda APENAS com JSON válido no formato especificado.`;

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
          { role: "user", content: "Analise a resposta do aluno e retorne o feedback estruturado." },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_feedback",
            description: "Return structured feedback for student answer",
            parameters: {
              type: "object",
              properties: {
                clarity_score: { type: "number", description: "Nota 0-10 para Clareza do Raciocínio" },
                evidence_score: { type: "number", description: "Nota 0-10 para Uso de Evidências" },
                accuracy_score: { type: "number", description: "Nota 0-10 para Precisão Técnica" },
                overall_level: { type: "number", description: "Nível PISA estimado da resposta (1-6)" },
                summary: { type: "string", description: "Resumo geral do desempenho (2-3 frases motivadoras)" },
                constructive_provocation: { type: "string", description: "Provocação pedagógica para incentivar melhoria (apenas se nível 3-4)" },
                study_hints: {
                  type: "array",
                  items: { type: "string" },
                  description: "Lista de pistas de estudo para cada ponto fraco identificado",
                },
                main_error: { type: "string", description: "Principal erro conceitual identificado (para análise da turma)" },
                strengths: { type: "string", description: "Pontos fortes da resposta do aluno" },
              },
              required: ["clarity_score", "evidence_score", "accuracy_score", "overall_level", "summary", "study_hints", "main_error", "strengths"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_feedback" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente." }), {
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
    
    let feedback;
    if (toolCall) {
      feedback = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to extract from content
      const content = result.choices?.[0]?.message?.content || '';
      feedback = extractJsonFromResponse(content);
    }

    return new Response(JSON.stringify(feedback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
