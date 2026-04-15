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

    // Validate base64 size (max ~4MB after encoding)
    if (imageBase64.length > 5_500_000) {
      return new Response(JSON.stringify({ error: "Imagem muito grande. Reduza a resolução e tente novamente." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };
    const gateway = "https://ai.gateway.lovable.dev/v1/chat/completions";

    // ========== PHASE 1: Faithful Transcription ==========
    const phase1Response = await fetch(gateway, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em OCR de textos manuscritos em português brasileiro.
Sua ÚNICA tarefa é transcrever FIELMENTE o texto escrito à mão na imagem, incluindo todos os erros ortográficos, gramaticais e de pontuação do aluno.
NÃO corrija nada. NÃO adicione nada. NÃO omita nada.
Se a caligrafia estiver ilegível em algum trecho, marque com [ilegível].
Se a imagem estiver muito escura, borrada ou sem texto visível, responda APENAS: {"error": "IMAGEM_ILEGIVEL"}

Responda APENAS com JSON válido (sem markdown):
{
  "transcribed_text": "texto fiel transcrito aqui...",
  "legibility": "alta" | "media" | "baixa",
  "notes": "observações sobre a caligrafia (opcional)"
}`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcreva fielmente o texto manuscrito desta imagem. Não corrija erros." },
              { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!phase1Response.ok) {
      const status = phase1Response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await phase1Response.text();
      console.error("Phase 1 AI error:", status, t);
      return new Response(JSON.stringify({ error: "Erro na fase de transcrição. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phase1Data = await phase1Response.json();
    const phase1Content = phase1Data.choices?.[0]?.message?.content || "";
    let phase1Parsed;
    try {
      phase1Parsed = JSON.parse(phase1Content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      console.error("Phase 1 parse error:", phase1Content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar a transcrição. Tente com uma foto mais nítida." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if image was illegible
    if (phase1Parsed.error === "IMAGEM_ILEGIVEL" || !phase1Parsed.transcribed_text?.trim()) {
      return new Response(JSON.stringify({ error: "A foto está muito escura, borrada ou ilegível. Tente novamente com uma imagem mais clara e nítida." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcribedText = phase1Parsed.transcribed_text;

    // ========== PHASE 2: Pedagogical Correction ==========
    const phase2Response = await fetch(gateway, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um corretor especialista de redações no padrão ENEM/nacional oficial com mais de 20 anos de experiência.
Você receberá o TEXTO JÁ TRANSCRITO de uma redação manuscrita. Avalie o texto nas 5 competências oficiais.

CRITÉRIOS DE PONTUAÇÃO (0 a 200 cada, em múltiplos de 40: 0, 40, 80, 120, 160, 200):
- Competência I: Domínio da modalidade escrita formal da língua portuguesa
- Competência II: Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento
- Competência III: Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos
- Competência IV: Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação (coesão)
- Competência V: Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos

Responda APENAS com JSON válido (sem markdown):
{
  "extracted_text": "o texto transcrito recebido",
  "comp1_score": 120,
  "comp1_justification": "Justificativa detalhada...",
  "comp2_score": 160,
  "comp2_justification": "Justificativa detalhada...",
  "comp3_score": 120,
  "comp3_justification": "Justificativa detalhada...",
  "comp4_score": 80,
  "comp4_justification": "Justificativa detalhada...",
  "comp5_score": 120,
  "comp5_justification": "Justificativa detalhada...",
  "golden_tips": [
    "Dica específica 1 para melhorar",
    "Dica específica 2 para melhorar",
    "Dica específica 3 para melhorar"
  ]
}`,
          },
          {
            role: "user",
            content: `Avalie a seguinte redação transcrita nas 5 competências oficiais:\n\n${transcribedText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!phase2Response.ok) {
      const status = phase2Response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await phase2Response.text();
      console.error("Phase 2 AI error:", status, t);
      return new Response(JSON.stringify({ error: "Erro na fase de correção. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phase2Data = await phase2Response.json();
    const phase2Content = phase2Data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(phase2Content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      console.error("Phase 2 parse error:", phase2Content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar a correção da IA. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure extracted_text uses the faithful transcription
    parsed.extracted_text = transcribedText;
    parsed.legibility = phase1Parsed.legibility || "media";
    parsed.transcription_notes = phase1Parsed.notes || "";

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
