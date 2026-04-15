import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildTranscriptionPrompt(): string {
  return `Você é um especialista mundial em PALEOGRAFIA DIGITAL e caligrafia escolar brasileira com 30 anos de experiência.
Sua ÚNICA tarefa nesta etapa é DECIFRAR e TRANSCREVER fielmente o manuscrito da imagem.

TÉCNICA DE PALEOGRAFIA DIGITAL:
- Analise cada caractere em contexto: se uma letra é ambígua (ex: 'a' vs 'o', 'n' vs 'u', 'm' vs 'n'), use o CONTEXTO DA FRASE para determinar qual letra faz sentido pedagógico
- Se uma palavra parece sem sentido, considere as palavras ANTES e DEPOIS para deduzir a intenção do aluno
- Analise o padrão de caligrafia do aluno ao longo do texto: se ele escreve 'a' de um jeito específico, use esse padrão para decifrar letras semelhantes
- Priorize SEMPRE a interpretação que resulta em sentido semântico coerente

REGRAS ABSOLUTAS:
- Decifre CADA palavra, não importa quão ilegível pareça a caligrafia ("garrancho")
- Use o contexto das palavras vizinhas para DEDUZIR com 99% de precisão letras ou palavras ambíguas
- Mantenha TODOS os erros ortográficos, gramaticais e de pontuação exatamente como o aluno escreveu
- NÃO corrija, NÃO adicione, NÃO omita NADA
- Se um trecho for genuinamente impossível de decifrar após máximo esforço, marque com [ilegível]
- Respeite a paragrafação original do aluno
- Se a imagem estiver completamente ilegível (muito escura, borrada, sem texto), responda: {"error": "IMAGEM_ILEGIVEL"}

IMPORTANTE: Esta transcrição será apresentada ao professor ANTES de qualquer nota. Ela é o campo 'Transcrição da Caligrafia' e deve ser a base fiel para toda avaliação posterior.

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
Seu foco é ALFABETIZAÇÃO e ESTÍMULO. Avalie a redação com base nos critérios abaixo.

TOM: Lúdico, motivador e acolhedor. Celebre cada acerto com entusiasmo. Use emojis e linguagem simples. Incentive a leitura e a prática da escrita.

CRITÉRIOS (0 a 10 cada):
1. ESCRITA ALFABÉTICA: O aluno consegue representar os sons da fala com letras de forma correta e reconhecível?
2. ESPAÇAMENTO ENTRE PALAVRAS (Segmentação): O aluno separa as palavras corretamente, sem juntar ou quebrar palavras indevidamente?
3. USO DE MAIÚSCULAS/MINÚSCULAS: O aluno usa letra maiúscula no início de frases e em nomes próprios?
4. ORTOGRAFIA BÁSICA: O aluno acerta a escrita das palavras mais comuns do cotidiano?
5. CRIATIVIDADE E EXPRESSÃO: O aluno expressou ideias próprias de forma criativa e imaginativa?

Responda APENAS com JSON válido (sem markdown):
{
  "scores": [
    {"criteria": "Escrita Alfabética", "score": 8, "max": 10},
    {"criteria": "Espaçamento entre Palavras", "score": 6, "max": 10},
    {"criteria": "Uso de Maiúsculas/Minúsculas", "score": 7, "max": 10},
    {"criteria": "Ortografia Básica", "score": 7, "max": 10},
    {"criteria": "Criatividade e Expressão", "score": 9, "max": 10}
  ],
  "total_score": 37,
  "max_total": 50,
  "strengths": ["Ponto forte celebrado com entusiasmo ⭐", "Outro acerto incrível 🌟"],
  "improvements": ["Dica carinhosa para melhorar 💪", "Incentivo à leitura 📚"],
  "feedback_aluno": "Mensagem lúdica e motivadora para o aluno...",
  "feedback_professor": "Observações técnicas sobre o estágio de alfabetização..."
}`;
  }

  if (level === "anos_finais") {
    return `Você é um professor experiente do Ensino Fundamental II (6º ao 9º ano).
Seu foco é ESTRUTURA e COESÃO. Avalie a redação com base nos critérios abaixo.

TOM: Instrutivo e construtivo. Mostre exatamente ONDE e COMO o texto pode melhorar. Seja encorajador, mas com rigor pedagógico.

CRITÉRIOS (0 a 10 cada):
1. COESÃO (Uso de Conectivos): O aluno usa conectivos para ligar ideias e parágrafos de forma fluida?
2. COERÊNCIA (Faz sentido?): As ideias se conectam logicamente? O texto progride sem contradições?
3. PONTUAÇÃO: O aluno usa vírgulas, pontos, dois-pontos e outros sinais de forma correta?
4. RIQUEZA DE VOCABULÁRIO: O aluno usa palavras variadas, evitando repetições?
5. DESENVOLVIMENTO ARGUMENTATIVO: O aluno aprofunda suas ideias com exemplos e justificativas?

Responda APENAS com JSON válido (sem markdown):
{
  "scores": [
    {"criteria": "Coesão (Uso de Conectivos)", "score": 7, "max": 10},
    {"criteria": "Coerência", "score": 8, "max": 10},
    {"criteria": "Pontuação", "score": 6, "max": 10},
    {"criteria": "Riqueza de Vocabulário", "score": 7, "max": 10},
    {"criteria": "Desenvolvimento Argumentativo", "score": 6, "max": 10}
  ],
  "total_score": 34,
  "max_total": 50,
  "strengths": ["Ponto forte identificado", "Outro aspecto positivo"],
  "improvements": ["Sugestão prática de melhoria", "Outra sugestão"],
  "feedback_aluno": "Feedback instrutivo...",
  "feedback_professor": "Observações técnicas..."
}`;
  }

  if (subLevel === "enem") {
    return `Você é um corretor especialista do ENEM com mais de 20 anos de experiência.
Aplique RIGOROSAMENTE as 5 Competências oficiais do ENEM (0 a 200 cada, múltiplos de 40).

TOM: Técnico, rigoroso e preciso. Cite EXATAMENTE as falhas na norma culta.

COMPETÊNCIAS:
1. DOMÍNIO DA MODALIDADE ESCRITA FORMAL da língua portuguesa
2. COMPREENDER A PROPOSTA de redação e aplicar conceitos
3. SELECIONAR, RELACIONAR, ORGANIZAR e INTERPRETAR informações e argumentos
4. MECANISMOS LINGUÍSTICOS necessários para a construção da argumentação (coesão)
5. ELABORAR PROPOSTA DE INTERVENÇÃO (Agente + Ação + Meio + Efeito + Detalhamento)

Responda APENAS com JSON válido (sem markdown):
{
  "scores": [
    {"criteria": "Competência I — Domínio da Norma Culta", "score": 120, "max": 200},
    {"criteria": "Competência II — Compreensão do Tema", "score": 160, "max": 200},
    {"criteria": "Competência III — Argumentação", "score": 120, "max": 200},
    {"criteria": "Competência IV — Coesão Textual", "score": 80, "max": 200},
    {"criteria": "Competência V — Proposta de Intervenção", "score": 120, "max": 200}
  ],
  "total_score": 600,
  "max_total": 1000,
  "strengths": ["Ponto forte técnico", "Outro ponto forte"],
  "improvements": ["Falha com citação do trecho", "Problema com justificativa"],
  "feedback_aluno": "Análise técnica detalhada...",
  "feedback_professor": "Observações pedagógicas..."
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

Responda APENAS com JSON válido (sem markdown):
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
  "feedback_aluno": "Análise detalhada...",
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

Responda APENAS com JSON válido (sem markdown):
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

function buildInterventionPrompt(level: string, subLevel?: string): string {
  const levelContext = level === "anos_iniciais"
    ? "aluno dos Anos Iniciais (1º ao 5º ano). Atividades devem ser lúdicas e adequadas à alfabetização."
    : level === "anos_finais"
    ? "aluno dos Anos Finais (6º ao 9º ano). Atividades devem ser instrutivas e focadas em estrutura textual."
    : subLevel === "enem"
    ? "aluno do Ensino Médio preparando-se para o ENEM. Atividades devem ser técnicas e focadas nas 5 competências."
    : subLevel === "vunesp"
    ? "aluno do Ensino Médio preparando-se para a VUNESP. Atividades devem focar em dissertação rigorosa."
    : "aluno do Ensino Médio preparando-se para a FUVEST. Atividades devem focar em argumentação filosófica e repertório.";

  return `Você é um pedagogo especialista em intervenção pedagógica personalizada.
Com base nas notas e no feedback da correção, gere um PLANO DE AÇÃO imediato para um ${levelContext}

Seu plano deve:
1. IDENTIFICAR a MAIOR LACUNA de aprendizagem (o critério com pior desempenho proporcional)
2. SUGERIR exatamente 3 ATIVIDADES PRÁTICAS IMEDIATAS que o aluno pode fazer nos próximos dias
3. FORNECER uma EXPLICAÇÃO TEÓRICA BREVE e personalizada sobre o erro mais recorrente

As atividades devem ser concretas, específicas e realizáveis (ex: "Reescreva o 2º parágrafo usando 3 conectivos diferentes", "Leia 2 editoriais e grife os conectivos").

Responda APENAS com JSON válido (sem markdown):
{
  "biggest_gap": "Nome do critério com pior desempenho",
  "gap_explanation": "Explicação breve do que essa lacuna significa pedagogicamente",
  "activities": [
    {"title": "Título curto da atividade", "description": "Descrição detalhada e prática do exercício", "duration": "15 min"},
    {"title": "Título curto da atividade 2", "description": "Descrição detalhada e prática", "duration": "20 min"},
    {"title": "Título curto da atividade 3", "description": "Descrição detalhada e prática", "duration": "10 min"}
  ],
  "theory_snippet": "Explicação teórica personalizada e breve sobre o erro mais cometido pelo aluno, com exemplos práticos de como corrigir."
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, level, subLevel, generatePlan, correctionData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };
    const gateway = "https://ai.gateway.lovable.dev/v1/chat/completions";

    // ========== INTERVENTION PLAN ONLY (Phase 3) ==========
    if (generatePlan && correctionData) {
      console.log("Phase 3: Generating intervention plan for level:", level);
      const phase3 = await fetch(gateway, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: buildInterventionPrompt(level, subLevel) },
            {
              role: "user",
              content: `Aqui estão os resultados da correção do aluno:\n\nNOTAS:\n${JSON.stringify(correctionData.scores)}\n\nNOTA TOTAL: ${correctionData.total_score}/${correctionData.max_total}\n\nPONTOS FORTES: ${JSON.stringify(correctionData.strengths)}\n\nO QUE MELHORAR: ${JSON.stringify(correctionData.improvements)}\n\nTEXTO DO ALUNO:\n${correctionData.transcribed_text}\n\nGere o plano de intervenção personalizado.`,
            },
          ],
          temperature: 0.4,
          max_tokens: 2000,
        }),
      });

      if (!phase3.ok) {
        const s = phase3.status;
        if (s === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (s === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await phase3.text();
        console.error("Phase 3 error:", s, t);
        return new Response(JSON.stringify({ error: "Erro ao gerar plano de intervenção." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const p3Data = await phase3.json();
      const p3Content = p3Data.choices?.[0]?.message?.content || "";
      let p3Parsed;
      try {
        p3Parsed = JSON.parse(p3Content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      } catch {
        console.error("Phase 3 parse error:", p3Content);
        return new Response(JSON.stringify({ error: "Erro ao interpretar plano de intervenção." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify(p3Parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== FULL CORRECTION FLOW (Phase 1 + 2) ==========
    if (!imageBase64) throw new Error("Nenhuma imagem fornecida");
    if (!level) throw new Error("Nível de aprendizagem não informado");

    // Validate base64 size (max ~4MB base64 = ~3MB image)
    if (imageBase64.length > 5_500_000) {
      return new Response(JSON.stringify({ error: "Imagem muito grande. Reduza a resolução." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Image base64 length:", imageBase64.length, "chars (~", Math.round(imageBase64.length * 0.75 / 1024), "KB)");

    // Helper to robustly parse JSON from AI responses (handles truncation)
    function robustJsonParse(raw: string): any {
      // Strip markdown fences
      let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      // Find JSON object boundaries
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1) throw new Error("No JSON found");
      if (end === -1 || end <= start) {
        // Truncated response — try to repair
        cleaned = cleaned.substring(start);
        // Close open strings, arrays, objects
        cleaned = cleaned
          .replace(/,\s*$/, "")
          .replace(/[\x00-\x1F\x7F]/g, " ");
        // Count unclosed braces/brackets and close them
        let braces = 0, brackets = 0;
        for (const ch of cleaned) {
          if (ch === "{") braces++;
          if (ch === "}") braces--;
          if (ch === "[") brackets++;
          if (ch === "]") brackets--;
        }
        // Close any open string
        const quoteCount = (cleaned.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) cleaned += '"';
        while (brackets > 0) { cleaned += "]"; brackets--; }
        while (braces > 0) { cleaned += "}"; braces--; }
      } else {
        cleaned = cleaned.substring(start, end + 1);
      }
      // Remove trailing commas before } or ]
      cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      return JSON.parse(cleaned);
    }

    // ========== PHASE 1: Transcription with vision (use flash for speed) ==========
    console.log("Phase 1: Starting paleographic transcription for level:", level);
    const phase1 = await fetch(gateway, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildTranscriptionPrompt() },
          {
            role: "user",
            content: [
              { type: "text", text: "Aplique a técnica de PALEOGRAFIA DIGITAL: decifre e transcreva fielmente este manuscrito escolar. Se a caligrafia for um 'garrancho', analise o contexto da frase inteira para garantir que a transcrição faça sentido pedagógico. Priorize a interpretação semântica coerente." },
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
      const t = await phase1.text();
      console.error("Phase 1 AI error:", s, t);
      if (s === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro na transcrição. Tente novamente.", diagnostics: { stage: "phase1_ai", status: s } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const p1Data = await phase1.json();
    const p1Content = p1Data.choices?.[0]?.message?.content || "";
    console.log("Phase 1 raw response length:", p1Content.length);
    let p1Parsed;
    try {
      p1Parsed = robustJsonParse(p1Content);
    } catch (parseErr) {
      console.error("Phase 1 parse error:", p1Content.substring(0, 500));
      return new Response(JSON.stringify({ error: "Erro ao interpretar transcrição. Tente foto mais nítida." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (p1Parsed.error === "IMAGEM_ILEGIVEL" || !p1Parsed.transcribed_text?.trim()) {
      return new Response(JSON.stringify({ error: "A foto está muito escura, borrada ou ilegível. Tente novamente com uma imagem mais clara e nítida." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Phase 1 complete. Words:", p1Parsed.estimated_word_count, "Legibility:", p1Parsed.legibility);

    // ========== PHASE 2: Level-adaptive correction (use flash for speed) ==========
    console.log("Phase 2: Starting correction with level:", level, "subLevel:", subLevel);
    const phase2 = await fetch(gateway, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildCorrectionPrompt(level, subLevel) },
          {
            role: "user",
            content: `IMPORTANTE: A transcrição fiel da caligrafia do aluno está abaixo. Use ESTE texto como base para toda a avaliação. Não modifique nem corrija a transcrição — avalie o que o aluno REALMENTE escreveu.\n\nTRANSCRIÇÃO DA CALIGRAFIA:\n---\n${p1Parsed.transcribed_text}\n---\n\nAgora avalie conforme os critérios do nível selecionado e retorne o JSON estruturado.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!phase2.ok) {
      const s = phase2.status;
      const t = await phase2.text();
      console.error("Phase 2 AI error:", s, t);
      if (s === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro na correção. Tente novamente.", diagnostics: { stage: "phase2_ai", status: s } }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const p2Data = await phase2.json();
    const p2Content = p2Data.choices?.[0]?.message?.content || "";
    console.log("Phase 2 raw response length:", p2Content.length);
    let p2Parsed;
    try {
      p2Parsed = robustJsonParse(p2Content);
    } catch (parseErr) {
      console.error("Phase 2 parse error:", p2Content.substring(0, 500));
      return new Response(JSON.stringify({ error: "Erro ao interpretar correção. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Phase 2 complete. Total score:", p2Parsed.total_score);

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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido", diagnostics: { stage: "catch_all" } }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
