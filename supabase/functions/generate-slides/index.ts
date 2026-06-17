import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { topic, skillCode, skillDescription, grade, objective, formato, tema, includeAiImages, slideCount } = await req.json();

    if (!topic) {
      return new Response(JSON.stringify({ error: "O tema da aula é obrigatório." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const skillContext = skillCode
      ? `\nHabilidade BNCC/Gestor de Ensino: ${skillCode} - ${skillDescription}`
      : skillDescription ? `\nHabilidade: ${skillDescription}` : "";

    // ══════════════════════════════════════════
    // VISUAL SLIDES MODE (HTML rich)
    // ══════════════════════════════════════════
    if (formato === 'slides') {
      const temaColors: Record<string, { bg: string; text: string; accent: string; card: string }> = {
        minimalista: { bg: '#ffffff', text: '#1e293b', accent: '#6366f1', card: '#f8fafc' },
        dark_mode: { bg: '#0f172a', text: '#f8fafc', accent: '#a78bfa', card: '#1e293b' },
        corporativo: { bg: '#172554', text: '#e0f2fe', accent: '#38bdf8', card: '#1e3a5f' },
        criativo: { bg: '#86198f', text: '#fdf4ff', accent: '#f0abfc', card: '#a21caf' },
      };
      const colors = temaColors[tema] || temaColors.minimalista;
      const count = slideCount || 8;

      const imageInstruction = includeAiImages
        ? `\nIMAGENS OBRIGATÓRIAS: Para CADA slide (exceto capa e fechamento), insira UMA imagem contextual usando:
<img src="https://image.pollinations.ai/prompt/{prompt_em_ingles_descrevendo_o_conceito_do_slide}?width=800&height=400&nologo=true" style="border-radius: 12px; margin-top: 1rem; width: 100%; max-height: 400px; object-fit: cover;" alt="ilustração do conceito">
O prompt da imagem deve ser em INGLÊS, descritivo e educacional (ex: "colorful diagram of the solar system with labeled planets").`
        : "";

      const systemPrompt = `Você é um Designer de Apresentações Educacionais de nível Gamma.app / Canva. Crie slides visualmente impactantes usando HTML puro com estilos inline.

REGRAS DE DESIGN:
- Cada slide deve ser um bloco HTML autônomo com: <div class="slide-container" style="page-break-after: always; min-height: 100vh; padding: 3rem; display: flex; flex-direction: column; justify-content: center; background: ${colors.bg}; color: ${colors.text}; font-family: 'Segoe UI', system-ui, sans-serif;">
- Use cores do tema: fundo=${colors.bg}, texto=${colors.text}, destaque=${colors.accent}, cards=${colors.card}
- Títulos grandes (font-size: 2.5rem; font-weight: 800)
- Subtítulos (font-size: 1.2rem; opacity: 0.8)
- Use cards internos com border-radius: 16px e padding: 1.5rem para organizar conteúdo
- Use ícones emoji relevantes ao lado dos títulos
- Bullet points com espaçamento generoso (line-height: 2)
${imageInstruction}

Responda APENAS com JSON válido:
{ "htmlSlides": ["<div class=\\"slide-container\\" ...>...</div>", ...] }`;

      const userPrompt = `Crie ${count} slides visuais sobre: "${topic}"
${grade ? `Série: ${grade}` : ""}
${objective ? `Objetivo: ${objective}` : ""}${skillContext}

Sequência: 1) Capa, 2) Objetivo, 3) Contextualização, 4-${count - 3}) Desenvolvimento, ${count - 2}) Exercício, ${count - 1}) Síntese, ${count}) Fechamento.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error:", response.status, t);
        if (response.status === 429) return new Response(JSON.stringify({ error: "Limite excedido. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "Erro ao gerar slides visuais" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      let parsed;
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        // Find JSON boundaries
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("No JSON found");
        parsed = JSON.parse(cleaned.substring(start, end + 1));
      } catch {
        console.error("Failed to parse visual slides:", content.substring(0, 500));
        return new Response(JSON.stringify({ error: "Erro ao processar slides visuais" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ══════════════════════════════════════════
    // CLASSIC / APOSTILA MODE (structured JSON)
    // ══════════════════════════════════════════
    const systemPrompt = `Você é um especialista em criação de roteiros de aula do Estado de São Paulo, alinhado ao Currículo Paulista e à BNCC.

REGRAS OBRIGATÓRIAS:
1. TEXTO CURTO POR SLIDE: Cada slide deve conter no máximo 3 tópicos (bullet points). Cada tópico deve ter no máximo 10 palavras. Evite parágrafos longos ou blocos textuais.
2. NOTAS DO PROFESSOR COMPACTAS: O campo "speaker_notes" deve conter exatamente 2 dicas metodológicas práticas por slide, sem textos teóricos.
3. RIGOR BNCC: Use apenas códigos de habilidades reais da BNCC (ex: EM13MAT, EM13CNT, EF09MA). Proibido inventar códigos.
4. RESPOSTA EM JSON LIMPO: Responda exclusivamente com um objeto JSON estruturado, sem tags markdown (como \`\`\`json) e sem introduções ou conclusões textuais. Se quebrar esta regra, o sistema falhará.`;

    const userPrompt = `Crie um roteiro de aula em formato de apresentação (slides) sobre o tema: "${topic}"
${grade ? `Série/Ano: ${grade}` : ""}
${objective ? `Objetivo da aula: ${objective}` : ""}${skillContext}

Gere entre 8 e 10 slides com a seguinte sequência pedagógica:
1. Capa (título da aula, série, disciplina)
2. Objetivo da Aula
3. Contextualização / Situação-problema
4-6. Desenvolvimento do conteúdo (conceitos, exemplos, explicações)
7. Aplicação / Exercício prático
8. Atividade de fixação
9. Síntese / Resumo
10. Fechamento / Para casa

Responda em JSON com esta estrutura:
{
  "slides": [
    {
      "title": "Título do slide",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
      "speaker_notes": "Sugestão de fala para o professor neste slide",
      "activity": null
    }
  ]
}

Para o slide de Aplicação/Exercício, preencha o campo "activity" com uma sugestão de exercício prático detalhado. Para os demais slides, deixe "activity" como null.

Os bullet points devem ser concisos e claros. As speaker_notes devem ser orientações detalhadas de como o professor pode conduzir aquele momento da aula.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar slides" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-slides error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
