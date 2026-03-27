import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const { theme, mode, subject } = await req.json();
    if (!theme) return new Response(JSON.stringify({ error: "Tema obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const modeInstructions: Record<string, string> = {
      infantil: `Modo "Nuvem Mágica" para Anos Iniciais (1º ao 5º ano):
- Crie um mapa mental LÚDICO com no máximo 5 ramificações.
- Cada nó deve ter no máximo 3 palavras-chave simples.
- Use emojis como ícones visuais para cada conceito.
- As conexões devem usar verbos simples: "tem", "é", "usa".
- Vocabulário adequado para crianças de 6 a 10 anos.
- Cores sugeridas: amarelo, azul claro, verde, rosa, laranja.`,

      fundamental: `Modo "Rede de Conhecimento" para Fundamental II (6º ao 9º ano):
- Crie um mapa mental ANALÍTICO com 5 a 7 ramificações.
- Cada nó deve ter um título curto e um resumo de 1 frase.
- Os conectores devem usar verbos de ação: "gera", "causa", "resulta em", "é composto por".
- Inclua exemplos práticos em cada braço.
- Use emojis como suporte visual.`,

      medio: `Modo "Mapa Conceitual Completo" para Ensino Médio:
- Crie um mapa mental DENSO estilo infográfico de revisão com 6 a 8 ramificações.
- Cada nó deve conter definições técnicas precisas.
- Inclua fórmulas quando aplicável (use APENAS caracteres Unicode, NUNCA LaTeX).
- Adicione conexões interdisciplinares entre os braços.
- Use gatilhos mentais e palavras-chave para memorização.
- Hierarquia clara com sub-ramificações.`,
    };

    const instruction = modeInstructions[mode] || modeInstructions.medio;

    const prompt = `Você é um especialista em pedagogia e mapas mentais educacionais.

Gere um mapa mental sobre o tema: "${theme}"${subject ? ` na disciplina de ${subject}` : ''}.

${instruction}

REGRAS INVIOLÁVEIS:
- NUNCA use LaTeX ($, $$), tags HTML (<sup>, <sub>, <b>) ou Markdown.
- Use APENAS caracteres Unicode para símbolos: ², ³, √, π, ÷, ×, ≠, ≤, ≥, →, ←, ↔, ∞, Σ, Δ, ∫, ≈, ∈, ∉, ⊂, ∪, ∩, ∀, ∃.
- Para frações use barra: 1/2, 3/4.

Retorne um JSON PURO (sem markdown) com esta estrutura:
{
  "center": { "label": "Tema Central", "emoji": "🎯" },
  "branches": [
    {
      "label": "Conceito",
      "emoji": "📘",
      "color": "#3B82F6",
      "summary": "Resumo curto do conceito",
      "connector": "verbo de conexão",
      "children": [
        { "label": "Sub-conceito", "detail": "detalhe opcional" }
      ]
    }
  ]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const mindMap = JSON.parse(raw);

    return new Response(JSON.stringify(mindMap), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
