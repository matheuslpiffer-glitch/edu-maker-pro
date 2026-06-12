import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const userId = getUserIdFromAuth(authHeader);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mode, context, grade } = await req.json();
    if (!context?.trim()) {
      return new Response(JSON.stringify({ error: "Descreva a situação." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");


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

    const creditCheck = await checkAndDecrementCredits(userId);
    if (!creditCheck.allowed) {
      return new Response(JSON.stringify({ error: creditCheck.error }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let response;
    for (let i = 0; i < 4; i++) {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: context },
          ],
        }),
      });
      if (response.ok || (response.status !== 503 && response.status !== 500 && response.status !== 429)) break;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }


    if (!response!.ok) {
      const s = response!.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro ao processar." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response!.json();
    let cleaned = (data.choices?.[0]?.message?.content || "").replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.search(/[\{\[]/);
    const end = cleaned.lastIndexOf(cleaned[start] === "[" ? "]" : "}");
    if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse:", cleaned);
      throw e;
    }

    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("escuta-ativa error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
