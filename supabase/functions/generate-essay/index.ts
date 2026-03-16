import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NIVEL_PROMPTS: Record<string, string> = {
  "Ensino Fundamental I (1º ao 5º)": "Use linguagem simples, lúdica e frases curtas. Adapte o vocabulário para crianças de 6 a 10 anos.",
  "Ensino Fundamental II (6º ao 9º)": "Use linguagem clara, educativa e parágrafos bem estruturados. Adapte para alunos de 11 a 14 anos.",
  "Ensino Médio": "Use linguagem formal, acadêmica, conectivos complexos e exija profundidade argumentativa. Adapte para alunos de 15 a 17 anos.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { genero, tema, nivel } = await req.json();

    if (!genero || !tema || !nivel) {
      return new Response(JSON.stringify({ error: "Gênero, tema e nível de ensino são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nivelInstrucao = NIVEL_PROMPTS[nivel] || NIVEL_PROMPTS["Ensino Médio"];

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
            content: `Você é um professor especialista em produção textual, seguindo as normas da BNCC/Currículo Paulista.
${nivelInstrucao}
Gere propostas realistas com textos motivadores relevantes.
Responda APENAS com JSON válido no formato especificado, sem markdown.`,
          },
          {
            role: "user",
            content: `Escreva uma proposta de redação no gênero ${genero}, sobre o tema "${tema}", adaptada para o nível ${nivel}. O texto deve seguir as normas da BNCC/Currículo Paulista.

A proposta deve conter:
1. 3 a 4 textos motivadores curtos adequados ao nível de ensino (dados, trechos, notícias ou citações)
2. A frase de comando adequada ao gênero e nível

Responda em JSON:
{
  "tema": "${tema}",
  "area": "uma de: Social, Ambiental, Tecnológica, Saúde, Educação, Cultural, Econômica",
  "textos_motivadores": [
    { "tipo": "Texto I", "conteudo": "..." },
    { "tipo": "Texto II", "conteudo": "..." },
    { "tipo": "Texto III", "conteudo": "..." }
  ],
  "comando": "Frase de comando adequada ao gênero ${genero}, tema ${tema} e nível ${nivel}."
}`,
          },
        ],
        temperature: 0.9,
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
      return new Response(JSON.stringify({ error: "Erro ao gerar proposta" }), {
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
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-essay error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
