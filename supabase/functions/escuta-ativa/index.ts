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

    const systemPrompt = mode === "comunicado"
      ? `Você é uma especialista em Comunicação Escolar e Comunicação Não-Violenta (CNV).
Redija comunicados escolares profissionais, empáticos e claros.
Use os 4 componentes da CNV: Observação, Sentimento, Necessidade e Pedido.
Adapte o tom ao público-alvo (pais, alunos, equipe).
Retorne JSON: { "title": "Título do comunicado", "body": "Texto completo", "tone": "Tom utilizado", "cnvElements": { "observation": "...", "feeling": "...", "need": "...", "request": "..." }, "tips": ["Dica 1", "Dica 2"] }`
      : `Você é uma mediadora escolar especialista em Comunicação Não-Violenta (CNV) e resolução de conflitos.
Analise a situação descrita e forneça orientação prática ao professor.
Use os 4 componentes da CNV: Observação (sem julgamento), Sentimento, Necessidade e Pedido.
Série/contexto: ${grade || "Não especificada"}.
Retorne JSON: { "title": "Título da orientação", "analysis": "Análise da situação", "cnvApproach": { "observation": "Como descrever sem julgar", "feeling": "Sentimentos envolvidos", "need": "Necessidades não atendidas", "request": "Pedido concreto e positivo" }, "dialogScript": ["Fala sugerida 1", "Fala sugerida 2", "Fala sugerida 3"], "preventionTips": ["Dica preventiva 1", "Dica preventiva 2"], "followUp": "Ação de acompanhamento sugerida" }`;

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
