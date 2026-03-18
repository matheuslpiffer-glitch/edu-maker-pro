import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function detectRefusal(content: string): boolean {
  const refusalIndicators = [
    "i cannot",
    "i don't have the ability",
    "cannot complete this request",
    "i'm unable to",
    "as a language model",
    "my limitations",
    "i apologize, but",
  ];

  const normalized = content.toLowerCase();
  return refusalIndicators.some((indicator) => normalized.includes(indicator));
}

function repairAndParse(json: string): unknown {
  let cleaned = json
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .trim();

  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/"\s*\n\s*/g, '" ')
    .replace(/\t/g, " ");

  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;

  for (let i = 0; i < openBrackets - closeBrackets; i++) cleaned += "]";
  for (let i = 0; i < openBraces - closeBraces; i++) cleaned += "}";

  return JSON.parse(cleaned);
}

function extractJsonFromMixedResponse(response: string): unknown {
  const cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through
  }

  const jsonStart = cleaned.search(/[\[{]/);
  if (jsonStart !== -1) {
    const candidate = cleaned.slice(jsonStart).trim();

    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return repairAndParse(candidate);
      } catch {
        // fall through
      }
    }
  }

  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    try {
      return repairAndParse(codeBlockMatch[1].trim());
    } catch {
      // fall through
    }
  }

  if (detectRefusal(response)) {
    throw new Error("LLM refused to process the literary dossier request");
  }

  throw new Error("Could not extract valid JSON from response");
}

// Strip any <img> tags from all content fields recursively
function stripImgTags(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/<img[^>]*\/?>/gi, '');
  }
  if (Array.isArray(obj)) {
    return obj.map(stripImgTags);
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = stripImgTags(val);
    }
    return result;
  }
  return obj;
}

function normalizeSupportMaterial(material?: string): string {
  const trimmed = material?.trim();
  if (!trimmed) return "";

  const blocks = trimmed
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const selected: string[] = [];
  let totalLength = 0;

  for (const block of blocks) {
    const nextBlock = block.slice(0, 1200);
    if (selected.length > 0 && totalLength + nextBlock.length > 3600) break;
    selected.push(`[BLOCO ${selected.length + 1}] ${nextBlock}`);
    totalLength += nextBlock.length;
    if (selected.length >= 4) break;
  }

  if (selected.length === 0) {
    return trimmed.slice(0, 3600);
  }

  return selected.join("\n");
}

// Retry-enabled AI fetch with exponential backoff + timeout fallback
async function fetchAIWithRetry(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxAttempts = 3,
  timeoutMs = 90000
): Promise<Response> {
  let lastResponse: Response | null = null;
  let currentModel = model;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      lastResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: currentModel, messages, temperature }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const shouldRetry = (lastResponse.status === 429 || lastResponse.status >= 500) && attempt < maxAttempts - 1;
      if (!shouldRetry) break;
    } catch (e: unknown) {
      clearTimeout(timer);
      const isAbort = e instanceof DOMException && e.name === 'AbortError';
      if (isAbort && attempt < maxAttempts - 1) {
        console.warn(`Timeout on attempt ${attempt + 1}, retrying with faster model...`);
        // On timeout, switch to a faster/lighter model
        if (attempt === 0) currentModel = "google/gemini-2.5-flash";
        if (attempt === 1) currentModel = "google/gemini-2.5-flash-lite";
      } else if (attempt >= maxAttempts - 1) {
        throw new Error("Estamos processando sua inteligência pedagógica... isso pode levar um momento. Por favor, tente novamente ou reduza o número de questões.");
      }
    }

    const waitMs = 1000 * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  return lastResponse!;
}

function handleErrorResponse(response: Response, label: string) {
  if (response.status === 429)
    return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (response.status === 402)
    return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ error: `Erro ao gerar ${label}. Tente novamente.` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function parseAIResponse(response: Response, label: string) {
  if (!response.ok) {
    const t = await response.text();
    console.error(`AI error (${label}):`, response.status, t);
    return handleErrorResponse(response, label);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  try {
    const parsed = extractJsonFromMixedResponse(content);
    const sanitized = stripImgTags(parsed);
    return new Response(JSON.stringify(sanitized), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(`Failed to parse ${label}:`, content.substring(0, 1200), error);
    return new Response(JSON.stringify({ error: `Erro ao processar ${label}. Tente novamente.` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}

const NO_IMG_RULE = "\nREGRA ABSOLUTA: NÃO inclua NENHUMA tag <img>, link de imagem ou URL de imagem. Todo o conteúdo deve ser 100% textual. NUNCA use blocos de código markdown (```html). Retorne somente HTML cru nos campos de conteúdo.\n";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { examType, examModel, litModel, subjectArea, subjects, grade, difficulty, count, isDiscursiva, isRedacao, isAula, isQuestoes, isLiteratura, isInclusao, isJogos, gameType, activeDna, aeeMode, aeeTopic, aeeContent, aeeQuestionCount, aeeQuestionType, aeeImageMode, customMaterial, bloomLevel, specificTopic, serie, includeImages, technicalDiscipline, provaFormat, generoTextual, litObraName, litAutorName, studentMode, questionCount: studentQCount, activeSpecialty, isFastTrackVestibulinho, tecnicoInstitution, tecnicoMode } = await req.json();

    // ══════ INCLUSÃO / AEE MODE ══════
    if (isInclusao) {
      const diretrizesPorPerfil: Record<string, string> = {
        aee_tea: `Sua linguagem deve ser LITERAL, sem metáforas ou figuras de linguagem. Use passos numerados (1, 2, 3) para toda instrução. Ao lado de cada palavra-chave, sugira pictogramas em forma de Emojis (ex: "fotossíntese 🌱☀️"). Estruture cada questão com rotina visual clara.`,
        aee_tdah: `Seus textos devem ser CURTOS (máximo 2 linhas por enunciado). Use bullet points (•) para todas as instruções. Aplique linguagem de gamificação: chame cada questão de "Missão" (ex: "🎯 Missão 3"). DESTAQUE o verbo de comando em CAIXA ALTA e negrito (ex: "<strong>CIRCULE</strong>", "<strong>PINTE</strong>", "<strong>LIGUE</strong>"). Inclua recompensas visuais (⭐🏆) ao final.`,
        aee_intelectual: `Use vocabulário COTIDIANO e frases simples (sujeito + verbo + complemento). Reduza as alternativas para APENAS 3 opções (A, B, C). Associe SEMPRE o conteúdo à vida real do aluno (supermercado, cozinha, transporte). Use exemplos concretos e tangíveis, nunca abstratos.`,
        aee_visual: `Forneça descrições textuais detalhadas (audiodescrição) de qualquer elemento visual. Use alinhamento à ESQUERDA com muito espaçamento em branco entre blocos. PROÍBA frases com dupla negativa. Garanta alto contraste textual. Cada questão deve ter uma descrição completa do contexto sem depender de imagens.`,
        aee_dm: `Combine múltiplas adaptações: linguagem simples, passos numerados, emojis como apoio visual, frases curtas (máximo 1 linha), alternativas reduzidas (3 opções) e descrição verbal completa de qualquer contexto visual.`,
        aee_tod: `Use linguagem POSITIVA e motivacional. Evite ordens diretas; prefira convites ("Vamos descobrir juntos?"). Ofereça escolhas ao aluno quando possível. Quebre tarefas grandes em micro-etapas com recompensa visual (⭐) a cada conclusão. Tom acolhedor e sem julgamento.`,
        aee_auditiva: `Priorize instruções VISUAIS e ESCRITAS claras. Use frases curtas na ordem direta. Destaque palavras-chave em <strong>negrito</strong>. Evite trocadilhos ou jogos de palavras sonoros. Cada instrução deve ser auto-explicativa sem depender de explicação oral.`,
      };

      const perfilLabel: Record<string, string> = {
        aee_tea: 'TEA (Transtorno do Espectro Autista)',
        aee_tdah: 'TDAH (Transtorno de Déficit de Atenção e Hiperatividade)',
        aee_intelectual: 'Deficiência Intelectual (DI)',
        aee_visual: 'Deficiência Visual / Dislexia',
        aee_dm: 'Deficiência Múltipla (DM)',
        aee_tod: 'TOD (Transtorno Opositivo Desafiador)',
        aee_auditiva: 'Deficiência Auditiva',
      };

      const diretriz = diretrizesPorPerfil[activeDna] || diretrizesPorPerfil.aee_tea;
      const perfil = perfilLabel[activeDna] || 'Necessidades Especiais';

      // Determine image mode: "com_imagem" (default) or "somente_texto"
      const isTextOnly = aeeImageMode === 'somente_texto';

      const imageInstruction = isTextOnly
        ? `\nMODO SOMENTE TEXTO ADAPTADO:
- NÃO inclua NENHUMA tag <img>, link de imagem ou URL de imagem.
- NÃO preencha o campo "imageUrl".
- COMPENSE a ausência de imagens com:
  1. DESCRIÇÕES VERBAIS RICAS: Em vez de mostrar uma forma geométrica, descreva-a com analogia concreta (ex: "um triângulo é como um pedaço de pizza" ou "um círculo é como uma roda de bicicleta 🚲").
  2. CONTEXTUALIZAÇÃO SIMPLES: Sempre relacione o problema com algo do dia a dia do aluno.
  3. PALAVRAS-CHAVE EM NEGRITO: Use <strong> nos termos centrais para ajudar na focalização.\n`
        : `\nREGRA DE IMAGENS: Para CADA questão, inclua no campo "imageUrl" uma URL no formato: https://image.pollinations.ai/prompt/{descrição-curta-em-inglês-do-conceito}?width=800&height=450&nologo=true
A descrição deve ser clara, educativa e relacionada ao tema da questão.
Além disso, dentro do campo "content" (HTML), inclua a tag: <img src="URL_POLLINATIONS" class="w-full h-auto rounded-3xl" />\n`;

      const questionTypeLabels: Record<string, string> = {
        multipla_visual: 'Múltipla Escolha Visual (com 4 alternativas A-D, cada uma acompanhada de emoji ou imagem)',
        verdadeiro_falso: 'Verdadeiro ou Falso (afirmações claras com V ou F)',
        ligar_colunas: 'Ligar Colunas (Coluna A com conceitos e Coluna B com definições/imagens, usando linhas para conexão)',
        perguntas_diretas: 'Perguntas Diretas (pergunta simples com espaço para resposta curta)',
      };

      let systemPromptAEE = `Você é um Pós-Doutor em Educação Especial, especialista em Desenho Universal para a Aprendizagem (DUA) e em Atendimento Educacional Especializado (AEE). Seu trabalho é criar materiais RADICALMENTE acessíveis para alunos com ${perfil}.

HIERARQUIA DE ADAPTAÇÃO (Estratégia Pedagógica por Matheus Lima Piffer):
1. LINGUAGEM SIMPLES (Plain Language): Use SEMPRE frases curtas, ordem direta (sujeito-verbo-complemento) e termos concretos do cotidiano do aluno.
2. CONTEXTUALIZAÇÃO: Relacione CADA conceito com algo do dia a dia (ex: rodas de bicicleta para raio/diâmetro, pizza para frações, escada para sequências numéricas).
3. DESTAQUE DE PALAVRAS-CHAVE: Use <strong> em termos centrais para auxiliar na focalização visual do aluno.
4. ESTRUTURA PREVISÍVEL: Mantenha o mesmo padrão visual em todas as questões para criar rotina cognitiva.

DIRETRIZES OBRIGATÓRIAS DO PERFIL:
${diretriz}
${imageInstruction}
REGRAS VISUAIS HTML:
- Use <div style="background:#ecfeff;border:2px solid #06b6d4;border-radius:16px;padding:20px;margin:16px 0"> para cada bloco de questão
- Use espaçamento generoso (margin: 16px 0) entre todos os elementos
- Use fonte grande implícita nos textos (tags <span style="font-size:1.15em">)
- Cada questão deve ter um número grande e colorido: <span style="font-size:1.5em;color:#0891b2;font-weight:bold">Questão 1 🎯</span>

Responda APENAS com JSON válido, sem markdown.
NUNCA use blocos de código markdown; retorne somente HTML cru no campo content.`;

      let userPromptAEE = '';

      if (aeeMode === 'gerar_novas') {
        const qtdType = questionTypeLabels[aeeQuestionType] || questionTypeLabels.multipla_visual;
        userPromptAEE = `Crie ${aeeQuestionCount || 5} questões adaptadas sobre o tema "${aeeTopic}" no formato: ${qtdType}.

Perfil do aluno: ${perfil}.
${aeeContent ? `\nCONTEXTO ADICIONAL DO PROFESSOR:\n${aeeContent.slice(0, 6000)}\n` : ''}
Responda em JSON:
{
  "questions": [
    {
      "content": "<HTML completo da questão com espaçamento, emojis, formatação acessível${isTextOnly ? ' e descrições verbais ricas substituindo qualquer visual' : ' E uma tag <img> do Pollinations'}>",
      "options": [{"letter": "A", "text": "...", "isCorrect": false}, ...],
      ${isTextOnly ? '' : '"imageUrl": "https://image.pollinations.ai/prompt/{descrição-em-inglês}?width=800&height=450&nologo=true",'}
      "skillCode": "AEE-${(activeDna || '').replace('aee_', '').toUpperCase()}",
      "descriptor": "${aeeTopic}"
    }
  ]
}`;
      } else if (aeeMode === 'adaptar_antigas') {
        systemPromptAEE += `\n\nMODO TRADUÇÃO: Você deve atuar como TRADUTORA de conteúdo convencional para formato inclusivo. Mantenha o conteúdo pedagógico original mas TRANSFORME completamente a apresentação visual, linguagem e estrutura para torná-lo acessível ao perfil ${perfil}.`;
        userPromptAEE = `TRADUZA o seguinte conteúdo/prova convencional para FORMATO INCLUSIVO adaptado a alunos com ${perfil}:

---
${(aeeContent || '').slice(0, 8000)}
---

Tema: "${aeeTopic}"

Mantenha o conteúdo original mas transforme:
- Linguagem → acessível ao perfil, frases curtas, ordem direta
- Layout → espaçado, com blocos visuais
- Alternativas → adaptadas conforme o perfil
- Adicione emojis e destaques visuais
- Destaque <strong>palavras-chave</strong> em negrito

Responda em JSON:
{
  "questions": [
    {
      "content": "<HTML completo adaptado>",
      "options": [{"letter": "A", "text": "...", "isCorrect": false}, ...],
      "skillCode": "AEE-ADAPT",
      "descriptor": "${aeeTopic}"
    }
  ]
}`;
      } else {
        userPromptAEE = `Crie uma APOSTILA / ROTEIRO VISUAL completo sobre "${aeeTopic}" adaptado para alunos com ${perfil}.

${aeeContent ? `MATERIAL DE REFERÊNCIA:\n${aeeContent.slice(0, 6000)}\n` : ''}
O material deve conter em HTML:
- <h1> com título grande, colorido e com emojis
- Resumo teórico em linguagem acessível com emojis e destaques visuais
- Destaques visuais em caixas coloridas
- Exercícios de fixação no formato mais adequado ao perfil
- Espaçamento generoso entre todos os elementos
- <strong>Palavras-chave</strong> em negrito para focalização

Responda em JSON:
{
  "questions": [
    {
      "content": "<HTML completo do roteiro visual>",
      "options": [],
      "skillCode": "AEE-ROTEIRO",
      "descriptor": "${aeeTopic}"
    }
  ]
}`;
      }

      const response = await fetchAIWithRetry(LOVABLE_API_KEY, "google/gemini-2.5-flash", [
        { role: "system", content: systemPromptAEE },
        { role: "user", content: userPromptAEE },
      ], 0.7);

      return await parseAIResponse(response, "conteúdo AEE");
    }

    // ══════ JOGOS / GAME FACTORY MODE ══════
    if (isJogos) {
      const gameLabels: Record<string, string> = {
        cruzadinha: 'Cruzadinha Temática (palavras cruzadas com dicas pedagógicas)',
        caca_palavras: 'Caça-Palavras (grade de letras com palavras escondidas)',
        sudoku: 'Sudoku Educativo (grade 4x4 ou 6x6 com conceitos em vez de números)',
        memoria: 'Jogo da Memória (pares de conceito + definição/imagem)',
      };

      const gameFormat: Record<string, string> = {
        cruzadinha: `Gere uma cruzadinha com ${count || 10} palavras. O output deve ter:
- Uma tabela HTML <table> representando a grade da cruzadinha (células vazias para preencher e células pretas)
- Lista numerada de "HORIZONTAIS" com dicas pedagógicas
- Lista numerada de "VERTICAIS" com dicas pedagógicas  
- GABARITO com as respostas no final`,
        caca_palavras: `Gere um caça-palavras com ${count || 10} palavras. O output deve ter:
- Uma tabela HTML <table> com grade de letras (mínimo 15x15) onde as palavras estão escondidas
- Lista das palavras a encontrar com uma breve definição de cada
- GABARITO indicando posição e direção de cada palavra`,
        sudoku: `Gere um Sudoku Educativo 6x6. Em vez de números, use 6 conceitos/termos do tema.
- Tabela HTML <table> com a grade parcialmente preenchida
- Legenda com os 6 conceitos usados e suas definições
- GABARITO com a solução completa`,
        memoria: `Gere ${count || 10} pares para Jogo da Memória. Cada par tem:
- CARTA A: O conceito/termo
- CARTA B: A definição ou imagem correspondente
- Formate como cards HTML em grid (grid 4 colunas), cada card com borda arredondada e fundo colorido`,
      };

      const systemPromptJogos = `Você é um Game Designer Educacional especialista em criar jogos pedagógicos envolventes e visualmente ricos em HTML. Seus jogos devem ser prontos para impressão em folha A4.${NO_IMG_RULE}\nResponda APENAS com JSON válido, sem markdown.`;

      const userPromptJogos = `Crie um jogo do tipo: ${gameLabels[gameType] || gameLabels.cruzadinha}

Tema: "${specificTopic || 'tema geral'}"
Série: ${serie || 'Ensino Fundamental'}
${customMaterial ? `\nMATERIAL DE REFERÊNCIA:\n${customMaterial.slice(0, 6000)}\n` : ''}

${gameFormat[gameType] || gameFormat.cruzadinha}

Use HTML rico com estilos inline: tabelas com bordas, cores de fundo, fonte legível.
Formate para impressão A4.

Responda em JSON:
{
  "questions": [
    {
      "content": "<HTML completo do jogo>",
      "options": [],
      "skillCode": "JOGO-${(gameType || '').toUpperCase()}",
      "descriptor": "${specificTopic || 'Jogo Educativo'}"
    }
  ]
}`;

      const response = await fetchAIWithRetry(LOVABLE_API_KEY, "google/gemini-2.5-flash", [
        { role: "system", content: systemPromptJogos },
        { role: "user", content: userPromptJogos },
      ], 0.8);

      return await parseAIResponse(response, "jogo");
    }

    // ══════ LITERATURA MODE ══════
    if (isLiteratura) {
      const litModelLabels: Record<string, string> = {
        lit_vestibular: 'Foco Vestibular — análise completa voltada para vestibulares (enredo, personagens, estilo, contexto, temas recorrentes em provas)',
        lit_capitulos: 'Resumo detalhado capítulo a capítulo da obra',
        lit_personagens: 'Análise aprofundada de todos os personagens (protagonistas, antagonistas, secundários), suas motivações, arcos e relações',
        lit_contexto: 'Contexto histórico, social e cultural da obra e do autor, movimento literário e influências',
      };
      const selectedLitModel = litModel || examModel || 'lit_vestibular';
      const litDirective = litModelLabels[selectedLitModel] || litModelLabels.lit_vestibular;
      const autorInfo = litAutorName ? ` do autor "${litAutorName}"` : '';
      const focusExtra = specificTopic ? `\nFoco adicional solicitado pelo professor: "${specificTopic}"` : '';

      const systemPromptLit = `Você é um Doutor em Literatura Brasileira e Universal, com especialização em obras cobradas nos principais vestibulares do Brasil (FUVEST, UNICAMP, ENEM, UNESP). Você possui conhecimento enciclopédico sobre todas as obras literárias mundiais.${NO_IMG_RULE}
REGRA CRÍTICA DE TAMANHO: Sua resposta TOTAL (incluindo o JSON) deve ter NO MÁXIMO 4000 palavras. Seja direto e objetivo. Priorize informações essenciais para vestibulares. NÃO escreva capítulos completos — faça RESUMOS CONCISOS de cada parte.
Responda APENAS com JSON válido, sem markdown, sem blocos de código.`;
      const userPromptLit = `Crie um DOSSIÊ LITERÁRIO CONCISO sobre a obra "${litObraName}"${autorInfo}.

DIRETRIZ: ${litDirective}${focusExtra}

IMPORTANTE: Seja OBJETIVO e CONCISO. Máximo 4000 palavras no total.
${examModel === 'lit_capitulos' ? 'Para resumo por capítulos: faça NO MÁXIMO 3-4 linhas por capítulo. Agrupe capítulos similares se necessário.' : ''}

O dossiê deve ser em HTML básico (sem estilos inline longos):
- <h1> com o título da obra e autor
- <h2> para cada seção principal
- <h3> para subseções
- Parágrafos <p> curtos e diretos
- Listas <ul><li> quando apropriado
- <blockquote> para citações da obra (máximo 2)

NÃO inclua formatação de prova, questões ou cabeçalho de escola. Este é um material de estudo/consulta.

Responda em JSON (SEM markdown, SEM blocos de código):
{
  "questions": [
    {
      "content": "<HTML do dossiê aqui>",
      "options": [],
      "skillCode": "Dossiê Literário",
      "descriptor": "${litObraName}",
      "answerLines": 0
    }
  ]
}`;

      const response = await fetchAIWithRetry(LOVABLE_API_KEY, "google/gemini-2.5-flash", [
        { role: "system", content: systemPromptLit },
        { role: "user", content: userPromptLit },
      ], 0.7, 3, 120000);

      return await parseAIResponse(response, "dossiê literário");
    }

    // ══════ STUDENT QUIZ MODE (fast path — lighter model) ══════
    if (studentMode) {
      const examLabelsStudent: Record<string, string> = {
        super_enem: 'ENEM', fuvest: 'FUVEST', unicamp: 'UNICAMP', unesp: 'UNESP',
        ufscar: 'UFSCar/Federais', vestibulinho_etec: 'ETEC', selecao_ifs: 'Instituto Federal',
        puc: 'PUC', mackenzie: 'Mackenzie', fgv: 'FGV', medicina: 'Medicina',
      };
      const studentCount = count || studentQCount || 10;
      const instLabel = tecnicoInstitution === 'ifs' ? 'Instituto Federal (IFs)' :
                        tecnicoInstitution === 'etec' ? 'ETEC / Centro Paula Souza' :
                        examLabelsStudent[activeSpecialty] || activeSpecialty || examType || 'ENEM';

      const systemPromptStudent = `Você é um Tutor Socrático para estudantes brasileiros. Gere questões de múltipla escolha (A-E) no estilo "${instLabel}". Para cada questão inclua "tutorExplanation" com 2 frases: o conceito-chave e uma dica prática.${NO_IMG_RULE}Responda APENAS com JSON válido.`;

      const userPromptStudent = `Gere ${studentCount} questões de múltipla escolha (A a E) no estilo "${instLabel}" para Ensino Médio/Fundamental.
${isFastTrackVestibulinho ? 'Distribua entre: Português, Matemática, Ciências da Natureza e Ciências Humanas.' : `Área: ${subjectArea || 'Conhecimentos Gerais'}.`}
Nível: médio. Questões contextualizadas com situações-problema.

JSON:
{"questions":[{"content":"enunciado","options":[{"letter":"A","text":"...","isCorrect":false}],"skillCode":"código","tutorExplanation":"explicação"}]}`;

      const response = await fetchAIWithRetry(LOVABLE_API_KEY, "google/gemini-2.5-flash-lite", [
        { role: "system", content: systemPromptStudent },
        { role: "user", content: userPromptStudent },
      ], 0.7);

      return await parseAIResponse(response, "quiz do aluno");
    }

    // Support multi-subject
    const subjectList: string[] = subjects && subjects.length > 0 ? subjects : subjectArea ? [subjectArea] : [];

    const topicInstruction = specificTopic ? `\nTEMA ESPECÍFICO: Foque TODO o conteúdo gerado no tema "${specificTopic}". Todos os enunciados, contextos e exercícios devem girar em torno deste tema.\n` : "";

    const serieInstruction = serie ? `\nSÉRIE ESCOLAR: O conteúdo deve ser calibrado para o nível "${serie}". Ajuste vocabulário, complexidade e profundidade dos conceitos de acordo com esta faixa etária.\n` : "";

    const generoInstruction = generoTextual ? `\nGÊNERO TEXTUAL OBRIGATÓRIO: A proposta de redação deve exigir a produção de um texto no gênero "${generoTextual}". Adapte o comando de escrita, os textos motivadores e os critérios de avaliação para este gênero específico.\n` : "";

    // Fast-Track Vestibulinho instruction
    const tecnicoInstLabel = tecnicoInstitution || 'Instituto Federal / ETEC';
    const fastTrackInstruction = isFastTrackVestibulinho
      ? tecnicoMode === 'por_area'
        ? `\nMODO SIMULADO POR ÁREA (${tecnicoInstLabel}): Gere exatamente ${count} questões de múltipla escolha (A a E) focadas nas disciplinas selecionadas: ${(subjects || []).join(', ')}. Respeite RIGOROSAMENTE o estilo de enunciado, o nível de dificuldade oficial e a contextualização típica de vestibulinhos da instituição ${tecnicoInstLabel}. As questões devem ser situações-problema contextualizadas.\n`
        : `\nMODO FAST-TRACK VESTIBULINHO COMPLETO (${tecnicoInstLabel}): Ignore COMPLETAMENTE filtros de disciplina individual. Gere exatamente 20 questões de múltipla escolha (A a E) distribuídas equilibradamente entre as matérias principais da banca: Língua Portuguesa (interpretação, gramática — ~5 questões), Matemática (aritmética, geometria, álgebra — ~5 questões), Ciências da Natureza (~5 questões) e Ciências Humanas (~5 questões). Respeite RIGOROSAMENTE o estilo de enunciado, o nível de dificuldade oficial e a contextualização típica de vestibulinhos de ${tecnicoInstLabel}. As questões devem ser interdisciplinares com situações-problema do cotidiano.\n`
      : "";

    let techDisciplineInstruction = "";
    if (technicalDiscipline && examModel === 'vest_publicos') {
      const bancaMap: Record<string, string> = {
        'Super ENEM': 'No estilo ENEM: questões contextualizadas com situações-problema, textos longos, gráficos e interdisciplinaridade. Foco nas competências da Matriz de Referência do ENEM.',
        'FUVEST (USP)': 'No estilo FUVEST/USP: rigor acadêmico máximo, questões analíticas com textos eruditos, exigindo profundidade conceitual e capacidade de síntese.',
        'UNICAMP': 'No estilo UNICAMP/Comvest: questões interdisciplinares com textos acadêmicos densos, interpretação de dados e raciocínio crítico avançado.',
        'UNESP': 'No estilo UNESP/Vunesp: questões objetivas e diretas com contextualização rica, exigindo domínio conceitual sólido.',
        'UFSCar / Federais': 'No estilo de vestibulares de Universidades Federais (UFSCar, UNIFESP, IFs): questões com rigor científico, interdisciplinaridade e contextualização social.',
      };
      techDisciplineInstruction = `\nBANCA VESTIBULAR PÚBLICA: ${bancaMap[technicalDiscipline] || `Questões no estilo do vestibular "${technicalDiscipline}" com alto rigor acadêmico.`}\n`;
    } else if (technicalDiscipline && examModel === 'vest_privados') {
      const bancaMap: Record<string, string> = {
        'PUC (Geral)': 'No estilo PUC: questões com tom formal e humanista, exigindo repertório cultural amplo e capacidade argumentativa.',
        'Mackenzie': 'No estilo Mackenzie: rigor clássico, questões que exigem domínio conceitual profundo e raciocínio analítico preciso.',
        'FGV (Administração/Direito)': 'No estilo FGV: questões com foco em atualidades, economia, geopolítica e raciocínio lógico-analítico de alto nível.',
        'Medicina (Einstein/Santa Casa)': 'No estilo de vestibulares de Medicina (Albert Einstein, Santa Casa): nível máximo de exigência em Ciências da Natureza, com questões multietapa e raciocínio clínico.',
        'ESPM': 'No estilo ESPM: foco em comunicação, marketing, atualidades e cultura geral com questões criativas e contextualizadas.',
      };
      techDisciplineInstruction = `\nBANCA VESTIBULAR PARTICULAR: ${bancaMap[technicalDiscipline] || `Questões no estilo do vestibular "${technicalDiscipline}" com foco em excelência acadêmica.`}\n`;
    } else if (technicalDiscipline && examModel === 'vestibulinhos') {
      techDisciplineInstruction = `\nVESTIBULINHO TÉCNICO — EXAME DE INGRESSO: A prova segue o perfil "${technicalDiscipline}". FOCO OBRIGATÓRIO: conhecimentos gerais do Ensino Fundamental II — Língua Portuguesa (interpretação de texto, gramática), Matemática (aritmética, geometria, álgebra básica) e Ciências (natureza e humanas). As questões devem ser interdisciplinares, com situações-problema do cotidiano e forte ênfase em leitura e raciocínio lógico. Nível compatível com vestibulinhos de escolas técnicas públicas de SP.\n`;
    } else if (technicalDiscipline && examModel === 'cursos_tecnicos') {
      techDisciplineInstruction = `\nCURSO PROFISSIONALIZANTE — COMPONENTE TÉCNICO: O simulado cobre a disciplina técnica "${technicalDiscipline}". FOCO OBRIGATÓRIO: conhecimentos ESPECÍFICOS da profissão. Exemplos: para T.I. → Lógica de Programação, Algoritmos, Redes; para Saúde → Anatomia, Fisiologia, Biossegurança; para Mecatrônica → Eletricidade, Automação, Desenho Técnico; para Administração → Contabilidade, Marketing, Gestão; para Química → Processos Químicos, Análises Laboratoriais; para Agropecuária → Solos, Cultivo, Zootecnia. Use terminologia técnica real da área profissional.\n`;
    } else if (technicalDiscipline) {
      techDisciplineInstruction = `\nDISCIPLINA TÉCNICA: O conteúdo deve ser focado na disciplina técnica "${technicalDiscipline}" da matriz curricular do ensino técnico. Use terminologia, conceitos e situações-problema específicas desta área profissional.\n`;
    }

    // Concurso Público — BNCC-focused, ignore série filters, COMPACT (max 10)
    const concursoInstruction = examModel === 'concurso_publico'
      ? `\nMODO CONCURSO PÚBLICO EDUCACIONAL — SIMULADO COMPACTO DE ELITE (MÁXIMO 10 QUESTÕES):
IGNORE completamente filtros de "Série" escolar. Gere NO MÁXIMO 10 questões de altíssima qualidade.
NÃO gere textos introdutórios longos, preâmbulos ou explicações. Vá direto às questões.
Foque 100% em Legislação Educacional e Conhecimentos Pedagógicos:
- BNCC (Base Nacional Comum Curricular), LDB (Lei de Diretrizes e Bases - Lei 9.394/96), ECA (Estatuto da Criança e do Adolescente).
- Anos Iniciais: Alfabetização, Letramento, Numeramento, Didática Ciclo I, Psicologia do Desenvolvimento Infantil.
- Anos Finais: Competências BNCC 6º-9º, Metodologias Ativas, Avaliação Formativa, Interdisciplinaridade.
- Ensino Médio: Itinerários Formativos, Protagonismo Juvenil, Projeto de Vida, PCNs, DCNs.
Rigor de banca examinadora (CESPE, FCC, Vunesp). Questões CURTAS e DIRETAS.\n`
      : "";

    // Redação, Aula, Concurso and Vestibulares modes don't strictly require subjects/grade
    const isConcursoMode = examModel === 'concurso_publico';
    const isVestibularesMode = examModel === 'vest_publicos' || examModel === 'vest_privados';
    if (!isRedacao && !isAula && !isConcursoMode && !isVestibularesMode && !isFastTrackVestibulinho && (subjectList.length === 0 || !grade || !count)) {
      return new Response(JSON.stringify({ error: "Disciplina(s), série e quantidade são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const examLabels: Record<string, string> = {
      saresp: "SARESP (Sistema de Avaliação de Rendimento Escolar do Estado de São Paulo)",
      prova_paulista: "Prova Paulista",
      ade: "Avaliação Diagnóstica Estadual (ADE)",
      saeb: "SAEB (Sistema de Avaliação da Educação Básica)",
    };

    const modelInstructions: Record<string, string> = {
      super_bncc_elite: `Foco em habilidades e competências transversais da BNCC de forma avançada, exigindo pensamento crítico, interpretação complexa e conexões interdisciplinares.`,
      senai_tecnico: `Baseado no estilo de provas do SENAI, com foco em raciocínio lógico, interpretação de diagramas técnicos, fluxogramas e resolução de problemas práticos do mundo do trabalho.`,
      vestibulares_paulistas: `Nível de exigência máximo, no estilo FUVEST/UNICAMP/UNESP. Questões interdisciplinares com textos acadêmicos densos, exigindo análise crítica aprofundada, domínio conceitual e capacidade de síntese.`,
      eixo_tecnico_cps: `No estilo dos vestibulinhos de colégios técnicos (CPS/ETEC/COTIL/COTUCA/COTIP). Questões objetivas e contextualizadas com situações práticas do cotidiano, exigindo interpretação e aplicação de conceitos.`,
      mackenzie: `No estilo das provas do Mackenzie. Tom formal e acadêmico com rigor clássico, questões que exigem domínio conceitual profundo e raciocínio analítico preciso.`,
      coc: `No estilo do sistema de ensino COC. Questões com contextualização rica e didática moderna, conectando conceitos a situações do cotidiano com linguagem acessível mas rigorosa.`,
      etapa: `No estilo das provas do Colégio Etapa. Nível de desafio elevado com questões técnicas e complexas que exigem raciocínio aprofundado e domínio avançado dos conteúdos.`,
      objetivo: `No estilo do sistema de ensino Objetivo. Foco em atualidades, questões diretas e objetivas com contextualização em eventos recentes e temas contemporâneos.`,
      obmep_mirim1: `No estilo da OBMEP Mirim 1 (2º e 3º ano). Questões lúdicas de raciocínio lógico-matemático com padrões visuais, sequências e desafios matemáticos acessíveis, sem uso de fórmulas mecânicas. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      obmep_mirim2: `No estilo da OBMEP Mirim 2 (4º e 5º ano). Problemas de geometria intuitiva, padrões numéricos e desafios criativos que estimulam o pensamento matemático sem mecanização. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      obmep_n1: `No estilo da OBMEP Nível 1 (6º e 7º ano). Problemas criativos que exigem raciocínio lógico, reconhecimento de padrões, contagem e geometria sem depender de fórmulas decoradas. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      obmep_n2: `No estilo da OBMEP Nível 2 (8º e 9º ano). Questões de raciocínio avançado envolvendo combinatória, teoria dos números, geometria e álgebra com abordagem investigativa. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      obmep_n3: `No estilo da OBMEP Nível 3 (Ensino Médio). Nível olímpico máximo com problemas desafiadores de teoria dos números, combinatória avançada, geometria euclidiana e álgebra, exigindo demonstrações e raciocínio criativo. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      super_enem: `No estilo do ENEM (Exame Nacional do Ensino Médio). Questões contextualizadas com situações-problema do cotidiano, interdisciplinares, com textos, gráficos e tabelas. Foco nas competências e habilidades da Matriz de Referência do ENEM.`,
      concurso_publico: `No estilo de concursos públicos brasileiros (CESPE/CEBRASPE, FCC, FGV, Vunesp). Questões objetivas com linguagem formal e técnica, cobrando legislação educacional, didática, BNCC e conhecimentos pedagógicos.`,
      redacao_fuvest: `Gere uma proposta de redação no estilo FUVEST: tema dissertativo-argumentativo com coletânea de textos motivadores (mínimo 3), exigindo posicionamento crítico e repertório cultural. Tom acadêmico e erudito.`,
      redacao_unicamp: `Gere uma proposta de redação no estilo UNICAMP: proposta com gênero textual específico (carta, artigo, manifesto, crônica), situação comunicativa definida e interlocutor claro. Inclua coletânea de textos de apoio.`,
      redacao_vunesp: `Gere uma proposta de redação no estilo VUNESP: dissertação argumentativa com tema contemporâneo, 2-3 textos motivadores curtos e objetivos, com foco em clareza argumentativa.`,
      redacao_enem: `Gere uma proposta de redação no estilo ENEM: tema dissertativo-argumentativo com 3-4 textos motivadores (verbais e não-verbais), exigindo proposta de intervenção que respeite os direitos humanos. Siga rigorosamente as 5 competências da redação ENEM.`,
    };

    const diffLabels: Record<string, string> = {
      easy: "fácil (nível Básico)",
      medium: "média (nível Adequado)",
      hard: "difícil (nível Avançado/Proficiente)",
    };

    const examLabel = examLabels[examType] || examLabels.saresp;
    const diffLabel = diffLabels[difficulty] || diffLabels.medium;
    const modelInstruction = modelInstructions[examModel] || "";
    const subjectString = subjectList.join(", ");
    const isMultiSubject = subjectList.length > 1;

    const antiFraudInstruction = (examModel === 'super_enem' || examModel === 'concurso_publico')
      ? `\nREGRA DE OURO: Questões 100% INÉDITAS, nunca antes publicadas na internet. Invente dados, nomes e situações hiper-realistas para evitar plágio ou busca no Google.\n`
      : "";

    const philSocInstruction = subjectList.some(s =>
      s.toLowerCase().includes("filosofia") || s.toLowerCase().includes("sociologia")
    ) ? `\nPara Filosofia e Sociologia, utilize textos e conceitos de autores clássicos e contemporâneos (ex: Aristóteles, Platão, Descartes, Kant, Marx, Foucault, Bauman, Hannah Arendt, Durkheim, Weber) com foco nas competências da BNCC para Ciências Humanas.` : "";

    const bloomLabels: Record<number, string> = {
      1: "Nível 1 (Identificação/Memória) — questões de reconhecimento direto, localização de informação e identificação de conceitos básicos.",
      2: "Nível 2 (Aplicação) — questões que exigem uso de conceitos em contextos novos, resolução de problemas simples e aplicação de procedimentos.",
      3: "Nível 3 (Análise) — questões de decomposição, comparação, inferência, avaliação de argumentos e relações causais.",
      4: "Nível 4 (Síntese Extrema / Hacker-ITA) — nível máximo de complexidade: criação, avaliação crítica, demonstrações, problemas multietapas com alto grau de abstração e raciocínio criativo.",
    };

    const bloomInstruction = bloomLevel ? `\nNÍVEL DE DIFICULDADE BLOOM: ${bloomLabels[bloomLevel] || bloomLabels[2]}\nTodas as questões devem obedecer RIGOROSAMENTE a este nível cognitivo da Taxonomia de Bloom.\n` : "";

    const normalizedSupportMaterial = normalizeSupportMaterial(customMaterial);
    const ragInstruction = normalizedSupportMaterial
      ? `\nMATERIAL DE REFERÊNCIA (RAG): use apenas os blocos abaixo como base factual. Se algum detalhe não estiver presente, não invente.\n---\n${normalizedSupportMaterial}\n---\n`
      : "";

    const multiSubjectInstruction = isMultiSubject
      ? `\nIMPORTANTE: Esta prova é multidisciplinar. Distribua as ${count} questões de forma equilibrada entre as disciplinas: ${subjectString}. Organize-as por blocos de disciplina, indicando claramente a qual disciplina cada questão pertence no campo skillCode.`
      : "";

    const formatLabels: Record<string, string> = {
      matematica: 'Matemática e Raciocínio Lógico',
      linguagens: 'Linguagens (Língua Portuguesa, Interpretação de Texto, Gramática)',
      natureza: 'Ciências da Natureza (Física, Química, Biologia)',
      humanas: 'Ciências Humanas e Atualidades (História, Geografia, Sociologia)',
    };
    const provaFormatInstruction = provaFormat && formatLabels[provaFormat]
      ? `\nRECORTE DA PROVA: Ignore a estrutura multidisciplinar oficial. Gere TODAS as ${count} questões focadas EXCLUSIVAMENTE na área "${formatLabels[provaFormat]}". Mantenha o estilo de enunciado e o nível de exigência da banca selecionada, mas restrinja o conteúdo a esta área do conhecimento.\n`
      : "";

    // REDAÇÃO MODE
    if (isRedacao) {
      const redacaoLabel = examModel.replace('redacao_', '').toUpperCase();
      const systemPromptRedacao = `Você é um Especialista em Propostas de Redação para vestibulares e exames oficiais brasileiros. ${modelInstruction}\n${antiFraudInstruction}${generoInstruction}${NO_IMG_RULE}\nResponda APENAS com JSON válido, sem markdown.`;
      const userPromptRedacao = `Gere uma Proposta de Redação Oficial completa no estilo ${redacaoLabel} para alunos do ${grade || 'Ensino Médio'}.

A proposta deve conter:
- Título do tema
- 3 a 4 textos motivadores (verbais, com fonte citada)
- Comando de escrita com instruções claras da banca
- Gênero textual esperado

Ao final, inclua uma folha pautada em HTML: 30 divs com classe "linha-pautada" (border-bottom cinza, height 25px).

Responda em JSON:
{
  "questions": [
    {
      "content": "<h2>PROPOSTA DE REDAÇÃO — ${redacaoLabel}</h2><h3>Tema: ...</h3><div class='textos-motivadores'>...</div><div class='comando'>...</div><div class='folha-pautada'>(30 linhas pautadas em HTML)</div>",
      "options": [],
      "skillCode": "Redação ${redacaoLabel}",
      "descriptor": "Produção Textual",
      "answerLines": 0
    }
  ]
}`;

      const response = await fetchAIWithRetry(LOVABLE_API_KEY, "google/gemini-2.5-flash", [
        { role: "system", content: systemPromptRedacao },
        { role: "user", content: userPromptRedacao },
      ], 0.8);

      return await parseAIResponse(response, "proposta de redação");
    }

    // AULA MODE
    if (isAula) {
      const aulaSubject = subjectList.length > 0 ? subjectList.join(", ") : specificTopic || "tema geral";
      const systemPromptAula = `Você é um Professor Doutor especialista em criar materiais didáticos envolventes e pedagogicamente sólidos. ${ragInstruction}${topicInstruction}${NO_IMG_RULE}\nResponda APENAS com JSON válido, sem markdown.`;
      const userPromptAula = `Crie uma APOSTILA/MATERIAL DIDÁTICO completo para alunos do ${grade || 'Ensino Médio'} sobre "${specificTopic || aulaSubject}".

O material deve conter em HTML:
- <h1> com título cativante e criativo
- <h2>Resumo Teórico</h2> com explicação clara em parágrafos e bullets (<ul><li>)
- <div class="curiosidade" style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:12px;margin:16px 0;border-radius:8px"><strong>💡 Curiosidade:</strong> um fato interessante relacionado ao tema</div>
- <h2>Exercícios de Fixação</h2> com 5 questões de múltipla escolha (A-E) para o aluno praticar
- Gabarito dos exercícios no final

Responda em JSON:
{
  "questions": [
    {
      "content": "<todo o HTML da apostila aqui>",
      "options": [],
      "skillCode": "Apostila Didática",
      "descriptor": "${specificTopic || aulaSubject}",
      "answerLines": 0
    }
  ]
}`;

      const response = await fetchAIWithRetry(LOVABLE_API_KEY, "google/gemini-2.5-flash", [
        { role: "system", content: systemPromptAula },
        { role: "user", content: userPromptAula },
      ], 0.7);

      return await parseAIResponse(response, "apostila");
    }

    // QUESTÕES MODE
    const questoesOnlyInstruction = isQuestoes
      ? `\nMODO QUESTÕES AVULSAS: Gere APENAS as questões solicitadas, sem cabeçalho de prova, sem folha de resposta e sem formatação de simulado. Foco total nas perguntas.\n`
      : "";

    const studentModeInstruction = studentMode
      ? `\nMODO TUTOR SOCRÁTICO (ALUNO): Para CADA questão, adicione um campo "tutorExplanation" no JSON com uma explicação pedagógica de 2-3 frases. NÃO dê apenas a resposta correta — atue como um Tutor Socrático.\n`
      : "";

    const questionFormatInstruction = isDiscursiva
      ? `As questões devem ser ABERTAS/DISCURSIVAS (2ª Fase). NÃO inclua alternativas (A-E). Cada questão deve ter espaço para o aluno desenvolver a resolução por escrito. Inclua um "Espelho de Correção" com resolução passo a passo e critérios de pontuação para cada questão.`
      : `Cada questão deve ter EXATAMENTE 5 alternativas (A a E), com apenas 1 correta. Use distratores plausíveis.`;

    // Cap concurso público to max 10 questions for timeout prevention
    const effectiveCount = examModel === 'concurso_publico' ? Math.min(count || 10, 10) : count;

    // For large counts, instruct the AI to be more concise
    const compactInstruction = effectiveCount > 5
      ? `\nOTIMIZAÇÃO: são ${effectiveCount} questões. Seja direto, com enunciados curtos, contexto mínimo necessário e sem floreios visuais.`
      : "";

    const leanFormattingInstruction = `\nFORMATAÇÃO ENXUTA: priorize conteúdo pedagógico e estrutura simples. Use apenas HTML básico necessário (parágrafos, listas, tabelas simples). Não adicione estilos inline longos, introduções extensas nem blocos decorativos.\nRESUMO NO CABEÇALHO: Se incluir um resumo ou descrição do simulado, ele deve ter NO MÁXIMO 500 caracteres. Seja direto, objetivo e conciso para que caiba perfeitamente no cabeçalho da prova sem estourar o layout.`;

    const systemPrompt = `Você cria avaliações brasileiras alinhadas ao formato ${examLabel}.
${modelInstruction ? `MODELO: ${modelInstruction}\n` : ""}${philSocInstruction}${bloomInstruction}${ragInstruction}${antiFraudInstruction}${topicInstruction}${serieInstruction}${questoesOnlyInstruction}${multiSubjectInstruction}${NO_IMG_RULE}${techDisciplineInstruction}${provaFormatInstruction}${studentModeInstruction}${fastTrackInstruction}${concursoInstruction}${compactInstruction}${leanFormattingInstruction}
${questionFormatInstruction}
Responda APENAS com JSON válido, sem markdown.`;

    const userPrompt = isDiscursiva
      ? `Gere ${effectiveCount} questão(ões) DISCURSIVA(S) de dificuldade ${diffLabel} para a(s) disciplina(s) "${subjectString}" no ${grade}.

Formato de avaliação: ${examLabel}

Responda em JSON:
{
  "questions": [
    {
      "content": "<p>Enunciado contextualizado em HTML</p>",
      "options": [],
      "skillCode": "Código da habilidade BNCC/SEDUC relacionada",
      "descriptor": "Descritor de competência associado",
      "answerLines": 10,
      "correctionMirror": "Resolução passo a passo com critérios de pontuação"
    }
  ]
}`
      : `Gere ${effectiveCount} questão(ões) de múltipla escolha de dificuldade ${diffLabel} para a(s) disciplina(s) "${subjectString}" no ${grade}.

Formato de avaliação: ${examLabel}

Responda em JSON:
{
  "questions": [
    {
      "content": "<p>Enunciado contextualizado em HTML</p>",
      "options": [
        {"letter": "A", "text": "Alternativa A", "isCorrect": false},
        {"letter": "B", "text": "Alternativa B", "isCorrect": false},
        {"letter": "C", "text": "Alternativa C (correta)", "isCorrect": true},
        {"letter": "D", "text": "Alternativa D", "isCorrect": false},
        {"letter": "E", "text": "Alternativa E", "isCorrect": false}
      ],
      "skillCode": "Código da habilidade BNCC/SEDUC relacionada",
      "descriptor": "Descritor de competência associado"
    }
  ]
}`;

    const response = await fetchAIWithRetry(LOVABLE_API_KEY, "google/gemini-2.5-flash", [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], 0.7);

    return await parseAIResponse(response, "questões do simulado");
  } catch (e) {
    console.error("generate-simulator-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
