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
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    const { subject } = await req.json();
    if (!subject) {
      return new Response(JSON.stringify({ error: "Assunto obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um Designer Instrucional Premium especializado em Infográficos Pedagógicos de alta conversão.
    Sua tarefa é transformar o assunto fornecido em um infográfico de processo passo a passo (fluxograma de sistematização).
    
    Regras de Conteúdo:
    1. Crie exatamente entre 5 e 7 passos lógicos.
    2. Cada passo deve ter um título curto e impactante em MAIÚSCULAS.
    3. A 'mainInstruction' deve ser uma orientação clara para o aluno.
    4. A 'subInstruction' deve ser um exemplo prático, uma curiosidade ou uma pergunta de reflexão.
    5. 'thoughtBubble' deve ser uma dica rápida ou incentivo curto (máx 10 palavras).
    6. 'iconName' deve ser um nome válido de ícone do Lucide React (ex: 'lightbulb', 'target', 'book-open', 'cpu', 'flask-conical', 'globe', 'pencil', 'message-circle').
    7. 'colorTheme' deve variar entre os passos para criar ritmo visual, usando apenas: 'blue', 'green', 'orange', 'purple', 'pink', 'teal'.
    8. 'footerTips' deve ser um array com exatamente 4 dicas fundamentais de revisão sobre o assunto.

    Retorne APENAS um objeto JSON perfeitamente válido com esta estrutura:
    {
      "steps": [
        {
          "number": number,
          "title": "TÍTULO",
          "mainInstruction": "Instrução",
          "subInstruction": "Exemplo/Reflexão",
          "iconName": "icon-name",
          "thoughtBubble": "Texto do balão",
          "colorTheme": "blue"
        }
      ],
      "footerTips": ["Dica 1", "Dica 2", "Dica 3", "Dica 4"]
    }`;

    let resp;
    for (let i = 0; i < 4; i++) {
      resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: subject },
          ],
        }),
      });
      if (resp.ok || (resp.status !== 503 && resp.status !== 500 && resp.status !== 429)) break;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }

    if (!resp!.ok) {
      const t = await resp!.text();
      if (resp!.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp!.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI error", resp!.status, t);
      return new Response(JSON.stringify({ error: "Falha na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp!.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let parsed;
    try {
      let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const start = cleaned.search(/[\{\[]/);
      const end = cleaned.lastIndexOf(cleaned[start] === "[" ? "]" : "}");
      if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse:", content);
      throw e;
    }

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
