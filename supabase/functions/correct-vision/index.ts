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

    const { imageUrl, gabarito } = await req.json();

    if (!imageUrl || !gabarito) {
      return new Response(
        JSON.stringify({ error: "imageUrl e gabarito são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um especialista em OCR (Reconhecimento Óptico de Caracteres) e correção de provas escolares. Sua tarefa:

1. Analise a imagem da prova do aluno e identifique as respostas marcadas/escritas (caligrafia manuscrita).
2. Compare com o gabarito fornecido.
3. Retorne o resultado em JSON estruturado.

GABARITO OFICIAL:
${gabarito}

INSTRUÇÕES:
- Identifique cada questão numerada e a alternativa marcada pelo aluno.
- Se a caligrafia for ilegível, marque como "?" e adicione uma observação.
- Seja preciso no OCR — considere letras maiúsculas e minúsculas como equivalentes.
- Na seção "observations", comente brevemente sobre a qualidade da caligrafia e possíveis dúvidas.

Responda APENAS com JSON válido no formato:
{
  "extractedAnswers": [{"question": 1, "answer": "A"}, ...],
  "comparison": [{"question": 1, "studentAnswer": "A", "correctAnswer": "A", "isCorrect": true}, ...],
  "score": 8,
  "total": 10,
  "observations": "Caligrafia legível na maioria das questões. Questão 5 teve leitura ambígua entre B e D."
}`;

    const callGemini = async () => fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta foto de prova e compare com o gabarito fornecido. Retorne o JSON de correção." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    let response = await callGemini();
    let attempts = 0;
    while (!response.ok && [429, 500, 503].includes(response.status) && attempts < 2) {
      attempts++;
      await new Promise((r) => setTimeout(r, 800 * attempts));
      response = await callGemini();
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar imagem com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON found in AI response");
    }
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Attempt repair
      cleaned = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, " ");
      parsed = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("correct-vision error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
