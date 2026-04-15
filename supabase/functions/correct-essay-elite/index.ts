import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildTranscriptionPrompt(): string {
  return `Você é um especialista mundial em paleografia e caligrafia escolar brasileira com 30 anos de experiência.
Sua ÚNICA tarefa nesta etapa é DECIFRAR e TRANSCREVER fielmente o manuscrito da imagem.

REGRAS ABSOLUTAS:
- Decifre CADA palavra, não importa quão ilegível pareça a caligrafia
- Mantenha TODOS os erros ortográficos, gramaticais e de pontuação exatamente como o aluno escreveu
- NÃO corrija, NÃO adicione, NÃO omita NADA
- Se um trecho for genuinamente impossível de decifrar após máximo esforço, marque com [ilegível]
- Respeite a paragrafação original do aluno
- Se a imagem estiver completamente ilegível (muito escura, borrada, sem texto), responda: {"error": "IMAGEM_ILEGIVEL"}

Responda APENAS com JSON válido (sem markdown):
{
  "transcribed_text": "texto fiel transcrito aqui...",
  "legibility": "alta" | "media" | "baixa",
  "paragraph_count": 4,
  "estimated_word_count": 250,
  "notes": "observações sobre a caligrafia"
}`;
}

function buildCorrectionPrompt(level: string, subLevel?: string): string {
  if (level === "anos_iniciais") {
    return `Você é uma professora carinhosa e experiente do Ensino Fundamental I (1º ao 5º ano).
Avalie a redação com foco em ALFABETIZAÇÃO, ORTOGRAFIA BÁSICA e ESTRUTURA DE FRASE.

TOM: Motivador, acolhedor, com linguagem simples. Use emojis e elogios sinceros.
CRITÉRIOS (0 a 10 cada):
1. ESCRITA LEGÍVEL: O aluno escreve de forma que dá para ler?
2. ORTOGRAFIA BÁSICA: Acerta as palavras mais comuns?
3. ESTRUTURA DE FRASE: Forma frases com começo, meio e fim?
4. CRIATIVIDADE: Expressou ideias próprias?
5. ORGANIZAÇÃO: Tem começo, desenvolvimento e final?

Responda APENAS com JSON válido:
{
  "scores": [
    {"criteria": "Escrita Legível", "score": 8, "max": 10},
    {"criteria": "Ortografia Básica", "score": 6, "max": 10},
    {"criteria": "Estrutura de Frase", "score": 7, "max": 10},
    {"criteria": "Criatividade", "score": 9, "max": 10},
    {"criteria": "Organização", "score": 7, "max": 10}
  ],
  "total_score": 37,
  "max_total": 50,
  "strengths": ["Ponto forte 1 ⭐", "Ponto forte 2 🌟"],
  "improvements": ["O que melhorar 1 💪", "O que melhorar 2 📝"],
  "feedback_aluno": "Mensagem motivadora e carinhosa para o aluno...",
  "feedback_professor": "Observações técnicas para o professor..."
}`;
  }

  if (level === "anos_finais") {
    return `Você é um professor experiente do Ensino Fundamental II (6º ao 9º ano).
Avalie a redação com foco em COESÃO, PONTUAÇÃO e DESENVOLVIMENTO DO TEMA.

TOM: Construtivo e encorajador, porém com rigor pedagógico adequado à faixa etária.
CRITÉRIOS (0 a 10 cada):
1. ADEQUAÇÃO AO TEMA: O texto responde ao tema proposto?
2. COESÃO E COERÊNCIA: As ideias se conectam bem?
3. PONTUAÇÃO E GRAMÁTICA: Usa pontuação e gramática corretamente?
4. VOCABULÁRIO: Usa palavras variadas e adequadas?
5. DESENVOLVIMENTO: Aprofunda os argumentos?

Responda APENAS com JSON válido:
{
  "scores": [
    {"criteria": "Adequação ao Tema", "score": 8, "max": 10},
    {"criteria": "Coesão e Coerência", "score": 6, "max": 10},
    {"criteria": "Pontuação e Gramática", "score": 7, "max": 10},
    {"criteria": "Vocabulário", "score": 7, "max": 10},
    {"criteria": "Desenvolvimento", "score": 6, "max": 10}
  ],
  "total_score": 34,
  "max_total": 50,
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "improvements": ["O que melhorar 1", "O que melhorar 2"],
  "feedback_aluno": "Feedback construtivo para o aluno...",
  "feedback_professor": "Observações técnicas para o professor..."
}`;
  }

  // Ensino Médio - Bancas
  if (subLevel === "enem") {
    return `Você é um corretor especialista do ENEM com mais de 20 anos de experiência.
Avalie RIGOROSAMENTE nas 5 competências oficiais (0 a 200 cada, múltiplos de 40).

TOM: Técnico, rigoroso e preciso. Sem margem para subjetividade.
COMPETÊNCIAS:
1. Domínio da modalidade escrita formal da língua portuguesa
2. Compreender a proposta e aplicar conceitos das áreas de conhecimento
3. Selecionar, relacionar, organizar e interpretar informações e argumentos
4. Mecanismos linguísticos necessários para a construção da argumentação (coesão)
5. Proposta de intervenção (Agente + Ação + Meio + Efeito + Detalhamento)

Responda APENAS com JSON válido:
{
  "scores": [
    {"criteria": "Competência I — Norma Culta", "score": 120, "max": 200},
    {"criteria": "Competência II — Tema e Estrutura", "score": 160, "max": 200},
    {"criteria": "Competência III — Argumentação", "score": 120, "max": 200},
    {"criteria": "Competência IV — Coesão", "score": 80, "max": 200},
    {"criteria": "Competência V — Proposta de Intervenção", "score": 120, "max": 200}
  ],
  "total_score": 600,
  "max_total": 1000,
  "strengths": ["Ponto forte técnico 1", "Ponto forte técnico 2"],
  "improvements": ["Ponto a melhorar com justificativa 1", "Ponto a melhorar 2"],
  "feedback_aluno": "Análise técnica detalhada para o aluno...",
  "feedback_professor": "Observações pedagógicas para o professor..."
}`;
  }

  if (subLevel === "vunesp") {
    return `Você é um corretor especialista da banca VUNESP.
Avalie com foco em COERÊNCIA e ESTRUTURA DISSERTATIVA RÍGIDA.

TOM: Técnico e rigoroso, padrão vestibular paulista.
CRITÉRIOS (0 a 20 cada):
1. TEMA E TESE: Abordagem adequada do tema com tese clara
2. ARGUMENTAÇÃO: Consistência e profundidade dos argumentos
3. COERÊNCIA: Progressão lógica e ausência de contradições
4. COESÃO: Uso adequado de conectivos e referenciação
5. NORMA CULTA: Domínio gramatical e vocabular

Responda APENAS com JSON válido:
{
  "scores": [
    {"criteria": "Tema e Tese", "score": 16, "max": 20},
    {"criteria": "Argumentação", "score": 14, "max": 20},
    {"criteria": "Coerência", "score": 15, "max": 20},
    {"criteria": "Coesão", "score": 13, "max": 20},
    {"criteria": "Norma Culta", "score": 14, "max": 20}
  ],
  "total_score": 72,
  "max_total": 100,
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "improvements": ["Ponto a melhorar 1", "Ponto a melhorar 2"],
  "feedback_aluno": "Análise detalhada para o aluno...",
  "feedback_professor": "Observações para o professor..."
}`;
  }

  // FUVEST default
  return `Você é um corretor especialista da banca FUVEST/USP.
Avalie com foco em ARGUMENTAÇÃO FILOSÓFICA, REPERTÓRIO ERUDITO e TESE.

TOM: Acadêmico e exigente, padrão vestibular de excelência.
CRITÉRIOS (0 a 20 cada):
1. TESE E POSICIONAMENTO: Clareza e originalidade da tese
2. REPERTÓRIO SOCIOCULTURAL: Referências eruditas e pertinentes
3. ARGUMENTAÇÃO: Profundidade filosófica e lógica
4. ESTRUTURA TEXTUAL: Organização e gênero textual
5. EXPRESSÃO LINGUÍSTICA: Precisão vocabular e domínio gramatical

Responda APENAS com JSON válido:
{
  "scores": [
    {"criteria": "Tese e Posicionamento", "score": 15, "max": 20},
    {"criteria": "Repertório Sociocultural", "score": 12, "max": 20},
    {"criteria": "Argumentação", "score": 14, "max": 20},
    {"criteria": "Estrutura Textual", "score": 16, "max": 20},
    {"criteria": "Expressão Linguística", "score": 15, "max": 20}
  ],
  "total_score": 72,
  "max_total": 100,
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "improvements": ["Ponto a melhorar 1", "Ponto a melhorar 2"],
  "feedback_aluno": "Análise acadêmica detalhada...",
  "feedback_professor": "Observações para o professor..."
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, level, subLevel } = await req.json();
    if (!imageBase64) throw new Error("Nenhuma imagem fornecida");
    if (!level) throw new Error("Nível de aprendizagem não informado");

    if (imageBase64.length > 5_500_000) {
      return new Response(JSON.stringify({ error: "Imagem muito grande. Reduza a resolução." }), {
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

    // ========== PHASE 1: Transcription with vision ==========
    const phase1 = await fetch(gateway, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: buildTranscriptionPrompt() },
          {
            role: "user",
            content: [
              { type: "text", text: "Decifre e transcreva fielmente este manuscrito escolar. Use todo seu conhecimento em paleografia." },
              { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!phase1.ok) {
      const s = phase1.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await phase1.text();
      console.error("Phase 1 error:", s, t);
      return new Response(JSON.stringify({ error: "Erro na transcrição. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const p1Data = await phase1.json();
    const p1Content = p1Data.choices?.[0]?.message?.content || "";
    let p1Parsed;
    try {
      p1Parsed = JSON.parse(p1Content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      console.error("Phase 1 parse error:", p1Content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar transcrição. Tente foto mais nítida." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (p1Parsed.error === "IMAGEM_ILEGIVEL" || !p1Parsed.transcribed_text?.trim()) {
      return new Response(JSON.stringify({ error: "A foto está muito escura, borrada ou ilegível. Tente novamente com uma imagem mais clara e nítida." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== PHASE 2: Level-adaptive correction ==========
    const phase2 = await fetch(gateway, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: buildCorrectionPrompt(level, subLevel) },
          {
            role: "user",
            content: `Avalie a seguinte redação transcrita:\n\n${p1Parsed.transcribed_text}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!phase2.ok) {
      const s = phase2.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await phase2.text();
      console.error("Phase 2 error:", s, t);
      return new Response(JSON.stringify({ error: "Erro na correção. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const p2Data = await phase2.json();
    const p2Content = p2Data.choices?.[0]?.message?.content || "";
    let p2Parsed;
    try {
      p2Parsed = JSON.parse(p2Content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      console.error("Phase 2 parse error:", p2Content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar correção." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = {
      ...p2Parsed,
      transcribed_text: p1Parsed.transcribed_text,
      legibility: p1Parsed.legibility,
      paragraph_count: p1Parsed.paragraph_count,
      estimated_word_count: p1Parsed.estimated_word_count,
      transcription_notes: p1Parsed.notes,
      level,
      subLevel: subLevel || null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("correct-essay-elite error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
