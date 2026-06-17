import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, context, grade } = await req.json();
    if (!context?.trim()) {
      return new Response(JSON.stringify({ error: "Descreva a situação." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é uma especialista em Comunicação Escolar e Comunicação Não-Violenta (CNV), atuando como mediadora de conflitos.
Sua missão é gerar um retorno rigoroso metodologicamente e extremamente sintético para economizar tokens.

REGRAS OBRIGATÓRIAS:
1. ESTRUTURAÇÃO ESTRITA (cnvElements/cnvApproach): Limite cada pilar a no máximo uma frase direta:
   - 'observation': Fatos puros e objetivos, sem julgamentos ou adjetivos.
   - 'feeling': O sentimento gerado na situação (ex: frustração, preocupação).
   - 'need': A necessidade humana não atendida (ex: respeito, clareza, colaboração).
   - 'request': Um pedido prático, realizável e positivo para resolver a situação.

2. COMUNICADO/ORIENTAÇÃO DIRETIVO E ACOLHEDOR (body/analysis): O texto deve ser empático, profissional e direto ao ponto. Elimine introduções longas, desculpas excessivas ou formalidades vazias. Foco na resolução pacífica em até 3 parágrafos curtos.

3. DICAS PRÁTICAS LIMITADAS (tips/preventionTips): Forneça EXATAMENTE 3 recomendações de ação imediatas, em forma de tópicos curtos de até 12 palavras cada.

4. FORMATO DE RETORNO: Retorne EXCLUSIVAMENTE um objeto JSON limpo, sem tags markdown (\`\`\`json) ou textos periféricos.

ESTRUTURA JSON PARA MODO ${mode === "comunicado" ? "COMUNICADO" : "ORIENTAÇÃO"}:
${mode === "comunicado" 
  ? '{ "title": "Título", "body": "Texto do comunicado", "tone": "Tom", "cnvElements": { "observation": "...", "feeling": "...", "need": "...", "request": "..." }, "tips": ["Dica 1", "Dica 2", "Dica 3"] }'
  : '{ "title": "Título", "analysis": "Texto da orientação", "cnvApproach": { "observation": "...", "feeling": "...", "need": "...", "request": "..." }, "dialogScript": ["Fala 1", "Fala 2", "Fala 3"], "preventionTips": ["Dica 1", "Dica 2", "Dica 3"], "followUp": "Ação de acompanhamento" }'
}
Série/contexto: ${grade || "Não especificada"}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context },
        ],
      }),
    });

    if (!response.ok) {
      const s = response.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro ao processar." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content || "").replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const result = JSON.parse(raw);

    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("escuta-ativa error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
