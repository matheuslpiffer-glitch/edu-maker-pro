import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildTranscriptionPrompt(): string {
  return `Você é um especialista mundial em paleografia e caligrafia escolar brasileira com 30 anos de experiência.
Sua ÚNICA tarefa nesta etapa é DECIFRAR e TRANSCREVER fielmente o manuscrito da imagem.

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
  "feedback_aluno": "Mensagem lúdica e motivadora para o aluno, celebrando os acertos e incentivando a leitura...",
  "feedback_professor": "Observações técnicas sobre o estágio de alfabetização e recomendações pedagógicas..."
}`;
  }

  if (level === "anos_finais") {
    return `Você é um professor experiente do Ensino Fundamental II (6º ao 9º ano).
Seu foco é ESTRUTURA e COESÃO. Avalie a redação com base nos critérios abaixo.

TOM: Instrutivo e construtivo. Mostre exatamente ONDE e COMO o texto pode melhorar, especialmente na conexão entre parágrafos. Seja encorajador, mas com rigor pedagógico.

CRITÉRIOS (0 a 10 cada):
1. COESÃO (Uso de Conectivos): O aluno usa conectivos (porém, além disso, portanto, etc.) para ligar ideias e parágrafos de forma fluida?
2. COERÊNCIA (Faz sentido?): As ideias se conectam logicamente? O texto progride sem contradições?
3. PONTUAÇÃO: O aluno usa vírgulas, pontos, dois-pontos e outros sinais de forma correta?
4. RIQUEZA DE VOCABULÁRIO: O aluno usa palavras variadas, evitando repetições? Demonstra repertório lexical adequado à faixa etária?
5. DESENVOLVIMENTO ARGUMENTATIVO: O aluno aprofunda suas ideias com exemplos, explicações ou justificativas?

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
  "improvements": ["Mostre onde o parágrafo poderia ser melhor conectado", "Sugestão prática de melhoria"],
  "feedback_aluno": "Feedback instrutivo mostrando onde e como melhorar a conexão entre ideias...",
  "feedback_professor": "Observações técnicas sobre coesão, coerência e desenvolvimento para planejamento pedagógico..."
}`;
  }

  // Ensino Médio - Bancas
  if (subLevel === "enem") {
    return `Você é um corretor especialista do ENEM com mais de 20 anos de experiência.
Aplique RIGOROSAMENTE as 5 Competências oficiais do ENEM (0 a 200 cada, múltiplos de 40: 0, 40, 80, 120, 160, 200).

TOM: Técnico, rigoroso e preciso. Cite EXATAMENTE as falhas na norma culta. Avalie a qualidade da tese e da proposta de intervenção com máximo rigor. Sem margem para subjetividade.

COMPETÊNCIAS:
1. DOMÍNIO DA MODALIDADE ESCRITA FORMAL da língua portuguesa (desvios gramaticais, ortográficos, acentuação, concordância, regência)
2. COMPREENDER A PROPOSTA de redação e aplicar conceitos das áreas de conhecimento para desenvolver o tema dentro dos limites estruturais do texto dissertativo-argumentativo
3. SELECIONAR, RELACIONAR, ORGANIZAR e INTERPRETAR informações, fatos, opiniões e argumentos em defesa de um ponto de vista (qualidade da argumentação)
4. MECANISMOS LINGUÍSTICOS necessários para a construção da argumentação (coesão textual: uso de conectivos, referenciação, progressão temática)
5. ELABORAR PROPOSTA DE INTERVENÇÃO para o problema abordado, respeitando os direitos humanos (deve conter: Agente + Ação + Meio/Modo + Efeito/Finalidade + Detalhamento)

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
  "strengths": ["Ponto forte técnico citando trecho do texto", "Outro ponto forte com evidência"],
  "improvements": ["Falha na norma culta com citação exata do trecho", "Problema na tese/proposta com justificativa técnica"],
  "feedback_aluno": "Análise técnica detalhada citando falhas na norma culta e qualidade da tese/proposta de intervenção...",
  "feedback_professor": "Observações pedagógicas para o professor com recomendações de intervenção didática..."
}`;
  }

  if (subLevel === "vunesp") {
    return `Você é um corretor especialista da banca VUNESP.
Avalie com foco em COERÊNCIA e ESTRUTURA DISSERTATIVA RÍGIDA.

TOM: Técnico e rigoroso, padrão vestibular paulista.
CRITÉRIOS (0 a 20 cada):
1. TEMA E TESE: Abordagem adequada do tema com tese clara e bem definida
2. ARGUMENTAÇÃO: Consistência, profundidade e pertinência dos argumentos
3. COERÊNCIA: Progressão lógica, ausência de contradições, unidade temática
4. COESÃO: Uso adequado de conectivos, referenciação e articulação entre períodos e parágrafos
5. NORMA CULTA: Domínio gramatical, vocabular e de registro formal

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
    console.log("Phase 1: Starting transcription for level:", level);
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
              { type: "text", text: "Decifre e transcreva fielmente este manuscrito escolar. Se a caligrafia for um 'garrancho', use o contexto das palavras vizinhas para deduzir o texto com 99% de precisão. Esta transcrição será exibida ao professor ANTES de qualquer avaliação." },
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

    console.log("Phase 1 complete. Words:", p1Parsed.estimated_word_count, "Legibility:", p1Parsed.legibility);

    // ========== PHASE 2: Level-adaptive correction ==========
    console.log("Phase 2: Starting correction with level:", level, "subLevel:", subLevel);
    const phase2 = await fetch(gateway, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
