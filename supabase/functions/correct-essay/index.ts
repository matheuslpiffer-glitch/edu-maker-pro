import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) throw new Error("Nenhuma imagem fornecida");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um corretor especialista de redações no padrão ENEM/INEP com mais de 20 anos de experiência.
Sua tarefa é:
1. Extrair o texto da imagem da redação manuscrita (OCR)
2. Avaliar o texto nas 5 competências do ENEM (0 a 200 cada, em múltiplos de 40: 0, 40, 80, 120, 160, 200)
3. Fornecer justificativas detalhadas e dicas de melhoria

Responda APENAS com JSON válido, sem markdown:
{
  "extracted_text": "texto completo extraído da redação",
  "comp1_score": 120,
  "comp1_justification": "Justificativa para Domínio da norma culta...",
  "comp2_score": 160,
  "comp2_justification": "Justificativa para Compreensão do tema e estrutura...",
  "comp3_score": 120,
  "comp3_justification": "Justificativa para Organização e interpretação de informações...",
  "comp4_score": 80,
  "comp4_justification": "Justificativa para Mecanismos linguísticos (coesão)...",
  "comp5_score": 120,
  "comp5_justification": "Justificativa para Proposta de intervenção...",
  "golden_tips": [
    "Dica específica 1 para melhorar",
    "Dica específica 2 para melhorar",
    "Dica específica 3 para melhorar"
  ]
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia o texto desta redação manuscrita e avalie nas 5 competências do ENEM. Retorne o JSON conforme especificado.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar redação" }), {
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
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate total
    parsed.total_score = (parsed.comp1_score || 0) + (parsed.comp2_score || 0) +
      (parsed.comp3_score || 0) + (parsed.comp4_score || 0) + (parsed.comp5_score || 0);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("correct-essay error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
