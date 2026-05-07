import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractJson(raw: string): any {
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  s = s.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");
    const { subject } = await req.json();
    if (!subject) {
      return new Response(JSON.stringify({ error: "Assunto obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Atue como um criador de jogos e materiais pedagógicos premium. O usuário fornecerá um assunto. 
    Crie um processo passo a passo de 5 a 7 etapas altamente estruturado.
    Retorne APENAS um objeto JSON perfeitamente válido (sem markdown, sem comentários) com a seguinte estrutura:
    {
      "steps": [
        {
          "number": number,
          "title": "TÍTULO EM MAIÚSCULAS",
          "mainInstruction": "Instrução principal clara e direta",
          "subInstruction": "Exemplo prático ou pergunta secundária para fixação",
          "iconName": "nome-do-icone-lucide-em-minusculas-com-hifens",
          "thoughtBubble": "Texto curto simulando a fala de um personagem de apoio",
          "colorTheme": "uma entre: 'blue', 'green', 'orange', 'purple', 'pink', 'teal'"
        }
      ],
      "footerTips": ["Dica curta 1", "Dica curta 2", "Dica curta 3", "Dica curta 4"]
    }`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: subject },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "Falha na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = extractJson(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("infographic error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
