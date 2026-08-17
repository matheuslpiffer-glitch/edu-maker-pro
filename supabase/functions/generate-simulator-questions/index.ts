import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

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

  // Fix invalid backslash escapes inside JSON strings (LaTeX like \sqrt, \text, \frac).
  // JSON only allows \" \\ \/ \b \f \n \r \t \uXXXX. Anything else must be escaped to \\.
  cleaned = escapeInvalidBackslashes(cleaned);

  // Fix truncated strings: if we end mid-string, close it
  const quoteCount = (cleaned.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    // Remove the last partial key-value and close
    cleaned = cleaned.replace(/,?\s*"[^"]*$/, "");
  }

  // Remove trailing commas again after truncation fix
  cleaned = cleaned.replace(/,\s*$/g, "");

  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;

  for (let i = 0; i < openBrackets - closeBrackets; i++) cleaned += "]";
  for (let i = 0; i < openBraces - closeBraces; i++) cleaned += "}";

  return JSON.parse(cleaned);
}

function escapeInvalidBackslashes(input: string): string {
  let out = "";
  let inStr = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (!inStr) {
      out += ch;
      if (ch === '"') inStr = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inStr = false;
      continue;
    }
    if (ch === "\\") {
      const next = input[i + 1];
      if (next === undefined) { out += "\\\\"; continue; }
      if ('"\\/bfnrtu'.includes(next)) {
        out += ch + next;
        i++;
      } else {
        // invalid escape - double the backslash so JSON.parse accepts it
        out += "\\\\";
      }
      continue;
    }
    out += ch;
  }
  return out;
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
        // Try to extract complete question objects from truncated response
        try {
          const questionsMatch = candidate.match(/"questions"\s*:\s*\[/);
          if (questionsMatch) {
            const arrStart = candidate.indexOf("[", candidate.indexOf('"questions"'));
            const sub = candidate.slice(arrStart + 1); // content after the opening [
            // Walk the string tracking braces while respecting JSON strings,
            // collecting the end-index of each fully-closed top-level object.
            const completeEnds: number[] = [];
            let depth = 0;
            let inStr = false;
            let escape = false;
            for (let i = 0; i < sub.length; i++) {
              const ch = sub[i];
              if (escape) { escape = false; continue; }
              if (inStr) {
                if (ch === "\\") { escape = true; continue; }
                if (ch === '"') inStr = false;
                continue;
              }
              if (ch === '"') { inStr = true; continue; }
              if (ch === "{") depth++;
              else if (ch === "}") {
                depth--;
                if (depth === 0) completeEnds.push(i);
              }
            }
            if (completeEnds.length > 0) {
              const lastEnd = completeEnds[completeEnds.length - 1];
              const partial = "[" + sub.slice(0, lastEnd + 1) + "]";
              const repaired = '{"questions":' + partial + "}";
              try {
                const parsed = JSON.parse(escapeInvalidBackslashes(repaired));
                const qs = (parsed as any)?.questions;
                if (Array.isArray(qs) && qs.length > 0) {
                  console.warn(`Recovered ${qs.length} complete question(s) from truncated response (dropped trailing incomplete object).`);
                  return parsed;
                }
              } catch (e) {
                console.warn("Partial recovery JSON.parse failed:", (e as Error).message);
              }
            } else {
              console.warn("Truncated response had no complete question objects to recover.");
            }
          }
        } catch {
          // fall through
        }
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
      lastResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: currentModel, messages, temperature, max_tokens: 16384 }),
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
        if (attempt === 0) currentModel = "gemini-2.5-flash";
        if (attempt === 1) currentModel = "gemini-2.5-flash-lite";
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

const NO_IMG_RULE = `
REGRA ABSOLUTA: NÃO inclua NENHUMA tag <img>, link de imagem ou URL de imagem. Todo o conteúdo deve ser 100% textual. NUNCA use blocos de código markdown (\`\`\`html). Retorne somente HTML cru nos campos de conteúdo.

FORMATAÇÃO MATEMÁTICA — REGRA INVIOLÁVEL (somente Unicode):
A interface NÃO renderiza LaTeX. É TERMINANTEMENTE PROIBIDO usar LaTeX ou o cifrão "$" como delimitador de fórmula. Qualquer comando LaTeX (frac, sqrt, text, cdot, pi, alpha, sum, int) ou delimitador de barra invertida com parêntese/colchete aparece como texto cru e quebra a questão.
Toda notação matemática — no enunciado, nas alternativas E no gabarito — deve usar EXCLUSIVAMENTE texto puro Unicode:
π ² ³ √ ± × ÷ ° % ≠ ≤ ≥ ≈ ∞ ½ ⅓ ¼ ¾ α β γ δ θ Δ Σ Ω ∈ ⊂ ∪ ∩ ∅ ℝ ℕ ℤ.
- Frações: barra comum (1/3, 2/7) ou ½ ⅓ ¼ ¾.
- Expoentes: ⁰¹²³⁴⁵⁶⁷⁸⁹ (escreva x², não x^2).
- Subscritos de letra: escreva junto, sem underline (Vc, não V_c).
- Multiplicação: × ou · (ex.: Vc = (π × D × N) / 1000).
- Dinheiro é a ÚNICA exceção do "$": escreva "R$ 50,00" normalmente.
VALIDAÇÃO FINAL: antes de responder, confirme que no JSON não há cifrão (exceto "R$"), nem barra invertida, nem "frac", "sqrt", "text".
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado. Faça login novamente." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const creditCheck = await checkAndDecrementCredits(userId);
    if (!creditCheck.allowed) {
      return new Response(JSON.stringify({ error: creditCheck.error }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

     const { examType, examModel, litModel, subjectArea, subjects, grade, difficulty, count, isDiscursiva, isRedacao, isAula, isQuestoes, isLiteratura, isInclusao, isJogos, gameType, activeDna, aeeProfiles, aeeMode, aeeTopic, aeeContent, aeeQuestionCount, aeeQuestionType, aeeImageMode, customMaterial, bloomLevel, specificTopic, serie, includeImages, technicalDiscipline, provaFormat, generoTextual, litObraName, litAutorName, studentMode, questionCount: studentQCount, activeSpecialty, isFastTrackVestibulinho, tecnicoInstitution, tecnicoMode, isSenaiMode, senaiEixo, senaiSpMatrix, senaiVestibulinho, nivelComplexidade, subject } = await req.json();

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
        aee_dislexia: `Use fonte ACESSÍVEL (estilo sans-serif, equivalente a OpenDyslexic/Arial) com ESPAÇAMENTO AMPLIADO entre linhas (line-height ~1.8) e entre palavras (word-spacing aumentado). Frases CURTAS (máximo 12 palavras) e divididas em BLOCOS PEQUENOS de 1 a 2 linhas, com bastante espaço em branco entre eles. DESTAQUE visualmente sílabas tônicas e palavras-chave em <strong>negrito</strong> (ex.: "<strong>fo-tos-sín-te-se</strong>"). EVITE textos longos corridos, justificação e itálico. Prefira alinhamento à ESQUERDA. Cada enunciado deve ser autoexplicativo e segmentado visualmente.`,
        aee_baixa_visao: `Use FONTE AMPLIADA (equivalente a 18–24pt) e ALTO CONTRASTE (texto escuro em fundo claro ou vice-versa). Forneça DESCRIÇÕES TEXTUAIS DETALHADAS (audiodescrição) de qualquer imagem, gráfico ou elemento visual citado. NUNCA dependa apenas de cor para transmitir informação (ex.: "o item em vermelho" → "o item destacado em vermelho e marcado com ★"). Instruções VERBAIS CLARAS, diretas e objetivas. Espaçamento ampliado entre linhas e blocos. Alinhamento à ESQUERDA, sem itálico e sem efeitos visuais sutis.`,
        aee_surdez: `Priorize RECURSOS VISUAIS e IMAGENS: sugira pictogramas/emojis ao lado das palavras-chave (ex.: "água 💧", "planta 🌱"). Use linguagem DIRETA e OBJETIVA na estrutura SUJEITO–VERBO–OBJETO (ex.: "A planta absorve a água."). EVITE qualquer dependência de áudio, música, rima ou sonoridade. Use vocabulário CONCRETO e cotidiano, sem metáforas, expressões idiomáticas ou duplo sentido. DESTAQUE verbos de comando em <strong>negrito</strong> (ex.: "<strong>MARQUE</strong>", "<strong>ESCREVA</strong>"). Cada instrução deve ser compreensível apenas pela leitura visual, com apoio de ícones nas palavras-chave.`,
        aee_altas_habilidades: `ENRIQUEÇA as questões com APROFUNDAMENTO conceitual e DESAFIOS EXTRAS de raciocínio (itens "Desafio +" ao final de cada questão). Eleve a COMPLEXIDADE mantendo o rigor científico/conceitual: use níveis altos da taxonomia de Bloom (analisar, avaliar, criar). Inclua CONEXÕES INTERDISCIPLINARES explícitas (ex.: relacionar o tema com matemática, história, arte ou tecnologia). Proponha INVESTIGAÇÕES abertas ao final ("Pesquise...", "Elabore uma hipótese...", "Justifique com pelo menos dois argumentos."). Evite simplificações; ofereça alternativas plausíveis e sofisticadas, exigindo análise fina.`,
        aee_toc: `Use ESTRUTURA PREVISÍVEL e ROTINA CLARA em todas as questões (sempre o mesmo padrão visual: enunciado → alternativas → marcação). Evite quantidades ou números "abertos" que induzam à contagem repetitiva (prefira valores fechados e exatos). Forneça INSTRUÇÕES OBJETIVAS e únicas por questão ("faça 1 vez", "marque apenas 1 alternativa"). Use checklists simples (☐) para tarefas em etapas, com critério de conclusão EXPLÍCITO. EVITE linguagem ambígua, perfeccionista ou que sugira "fazer de novo até ficar certo". Tom calmo, validador e sem urgência.`,
        aee_tag: `Use tom ACOLHEDOR, CALMO e PREVISÍVEL. Reduza a carga cognitiva: frases curtas, UMA pergunta por vez, sem armadilhas. Evite cronômetros, contagem regressiva ou linguagem de pressão ("rápido", "urgente", "você tem X segundos"). Inclua FRASES DE SEGURANÇA no enunciado (ex.: "Não tem problema errar, vamos pensar juntos."). Ofereça DICAS escalonadas (Dica 1, Dica 2) para evitar travamento. Encerre cada bloco com uma mensagem de reforço positivo (🌿💙). Alternativas devem ser claramente distintas, sem pegadinhas.`,
        aee_tpac: `Priorize CANAL VISUAL e ESCRITO; NÃO dependa de áudio, ritmo, rima, entonação ou discriminação sonora. Use frases CURTAS na ordem direta (sujeito–verbo–objeto). DESTAQUE palavras-chave em <strong>negrito</strong> e separe instruções em passos numerados (1, 2, 3). Apoie cada palavra-chave com um ícone/emoji (ex.: "ouvir 👂", "escrever ✏️"). EVITE instruções longas faladas ou que exijam memorização auditiva. Toda informação essencial deve estar ESCRITA e VISÍVEL ao lado da questão.`,
        aee_tdl: `Use VOCABULÁRIO SIMPLES e de ALTA FREQUÊNCIA (palavras do dia a dia). Frases CURTAS (máx. 8 palavras) na ordem direta (sujeito–verbo–objeto), sem orações subordinadas longas. EVITE metáforas, expressões idiomáticas, sinônimos raros e duplo sentido. Apoie cada conceito com IMAGEM/EMOJI ao lado da palavra-chave (ex.: "chuva 🌧️", "planta 🌱"). Reformule a pergunta de DUAS formas diferentes quando possível ("Em outras palavras: ..."). Alternativas devem ser CURTAS, com no máximo uma ideia cada. Inclua um GLOSSÁRIO mínimo no final, definindo as palavras novas em linguagem simples.`,
        aee_sensorial: `Reduza a SOBRECARGA SENSORIAL: layout LIMPO, muito espaço em branco, sem bordas piscantes, sem cores saturadas ou contrastes agressivos. Use no máximo 1 imagem por questão e evite poluição visual (muitos ícones, molduras, sombras). Linguagem CURTA, calma e previsível. EVITE descrições de estímulos intensos (barulho alto, luzes piscantes, texturas desagradáveis); quando o tema exigir, descreva de forma neutra e ofereça alternativa de resposta escrita. Inclua pausas sugeridas entre blocos de questões (ex.: "🌿 Pausa: respire fundo antes da próxima."). Permita que o aluno marque a alternativa apenas circulando ou apontando, sem exigir gestos complexos.`,
      };

      const perfilLabel: Record<string, string> = {
        aee_tea: 'TEA (Transtorno do Espectro Autista)',
        aee_tdah: 'TDAH (Transtorno de Déficit de Atenção e Hiperatividade)',
        aee_intelectual: 'Deficiência Intelectual (DI)',
        aee_visual: 'Deficiência Visual / Dislexia',
        aee_dm: 'Deficiência Múltipla (DM)',
        aee_tod: 'TOD (Transtorno Opositivo Desafiador)',
        aee_auditiva: 'Deficiência Auditiva',
        aee_dislexia: 'Dislexia',
        aee_baixa_visao: 'Baixa Visão',
        aee_surdez: 'Surdez',
        aee_altas_habilidades: 'Altas Habilidades / Superdotação',
        aee_toc: 'TOC (Transtorno Obsessivo-Compulsivo)',
        aee_tag: 'TAG (Transtorno de Ansiedade Generalizada)',
        aee_tpac: 'TPAC (Transtorno do Processamento Auditivo Central)',
        aee_tdl: 'TDL (Transtorno do Desenvolvimento da Linguagem)',
        aee_sensorial: 'Transtorno do Processamento Sensorial',
      };

      // Support multiple profiles (aeeProfiles array) for crossed adaptations
      const profileKeys: string[] = Array.isArray(aeeProfiles) && aeeProfiles.length > 0
        ? aeeProfiles
        : (activeDna ? activeDna.split(',').map((s: string) => s.trim()).filter(Boolean) : ['aee_tea']);

      const diretriz = profileKeys.map(k => diretrizesPorPerfil[k] || '').filter(Boolean).join('\n\n');
      const perfil = profileKeys.map(k => perfilLabel[k] || k).join(' + ');

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

       const gradeLabel: Record<string, string> = {
         fundamental_1: 'Ensino Fundamental I (1º ao 5º ano)',
         fundamental_2: 'Ensino Fundamental II (6º ao 9º ano)',
         ensino_medio: 'Ensino Médio (1ª a 3ª série)',
       };

       const complexityInstruction = nivelComplexidade === 'robusto'
         ? `\nAtenção máxima: O conteúdo deve ter ALTA complexidade cognitiva. Exija raciocínio lógico profundo, dedução e análise crítica. NÃO facilite a resposta ou o conceito.\n`
         : nivelComplexidade === 'intermediario'
         ? `\nComplexidade Intermediária: Exija que o aluno relacione conceitos e aplique o conhecimento.\n`
         : `\nComplexidade Básica: O desafio cognitivo deve ser focado em memorização e compreensão concreta.\n`;

      const questionTypeLabels: Record<string, string> = {
        multipla_visual: 'Múltipla Escolha Visual (com 4 alternativas A-D, cada uma acompanhada de emoji ou imagem)',
        verdadeiro_falso: 'Verdadeiro ou Falso (afirmações claras com V ou F)',
        ligar_colunas: 'Ligar Colunas (Coluna A com conceitos e Coluna B com definições/imagens, usando linhas para conexão)',
        perguntas_diretas: 'Perguntas Diretas (pergunta simples com espaço para resposta curta)',
      };

       let systemPromptAEE = `Atue como um especialista em Desenho Universal para a Aprendizagem (DUA). Gere as questões para a disciplina de ${subject || 'Geral'} focada em alunos do ${gradeLabel[serie] || serie || 'Ensino Básico'}.
 
 Seu trabalho é criar materiais RADICALMENTE acessíveis para alunos com ${perfil}.
 
 HIERARQUIA DE ADAPTAÇÃO (Estratégia Pedagógica por Matheus Lima Piffer):
1. LINGUAGEM SIMPLES (Plain Language): Use SEMPRE frases curtas, ordem direta (sujeito-verbo-complemento) e termos concretos do cotidiano do aluno.
2. CONTEXTUALIZAÇÃO: Relacione CADA conceito com algo do dia a dia (ex: rodas de bicicleta para raio/diâmetro, pizza para frações, escada para sequências numéricas).
3. DESTAQUE DE PALAVRAS-CHAVE: Use <strong> em termos centrais para auxiliar na focalização visual do aluno.
4. ESTRUTURA PREVISÍVEL: Mantenha o mesmo padrão visual em todas as questões para criar rotina cognitiva.

DIRETRIZES OBRIGATÓRIAS DO PERFIL:
${diretriz}
${imageInstruction}
 ${complexityInstruction}
 
 REGRA DE OURO INEGOCIÁVEL: Independente do nível de complexidade, a adaptação AEE deve ocorrer EXCLUSIVAMENTE na acessibilidade do formato: use frases curtas, ordem direta, elimine duplas negações, evite pegadinhas, estruture visualmente o texto com clareza e sugira o uso de imagens de apoio visual. O formato deve ser acessível, mas a expectativa de aprendizagem deve respeitar a série e a complexidade solicitadas.
 
 REGRAS VISUAIS HTML:
- Use <div style="background:#ecfeff;border:2px solid #06b6d4;border-radius:16px;padding:20px;margin:16px 0"> para cada bloco de questão
- Use espaçamento generoso (margin: 16px 0) entre todos os elementos
- Use fonte grande implícita nos textos (tags <span style="font-size:1.15em">)
- Cada questão deve ter um número grande e colorido: <span style="font-size:1.5em;color:#0891b2;font-weight:bold">Questão 1 🎯</span>

FORMATAÇÃO BLINDADA — REGRA INVIOLÁVEL (Acessibilidade para Leitores de Tela):
Está TERMINANTEMENTE PROIBIDO o uso de:
- Delimitadores LaTeX: $...$ , $$...$$ , \\( ... \\) , \\[ ... \\] , \\frac, \\cfrac, \\sqrt, \\pi, \\alpha ou qualquer comando LaTeX
- Tags HTML de formatação nas ALTERNATIVAS: <sup>, <sub>, <b>, <i>, <em>, <strong>, <span> — ZERO tags HTML nas alternativas
- No campo "text" das options, use APENAS texto puro Unicode sem nenhuma tag HTML
Use EXCLUSIVAMENTE caracteres Unicode: π, ², ³, √, ±, ×, ÷, ≠, ≤, ≥, ≈, ∞, ½, ⅓, ¼, ¾, α, β, γ, δ, θ, Δ, Σ, Ω.
Para frações não-padrão use barra comum: 1/3, 2/7. Para sobrescritos: ⁰¹²³⁴⁵⁶⁷⁸⁹. Para subscritos: ₀₁₂₃₄₅₆₇₈₉.
VALIDAÇÃO FINAL: Antes de retornar o JSON, verifique que NENHUM $ ou <sup>/<sub>/<b>/<i>/<span> exista no campo "text" das alternativas.
Exceção: <strong> é permitido APENAS no campo "content" (enunciado) para destacar palavras-chave pedagógicas.

${profileKeys.length > 1 ? `CRUZAMENTO DE ADAPTAÇÕES: O aluno possui MÚLTIPLOS perfis (${perfil}). Você DEVE cruzar TODAS as diretrizes acima simultaneamente. Priorize as adaptações mais restritivas quando houver conflito (ex: se um perfil pede 4 alternativas e outro pede 3, use 3).` : ''}

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

      const response = await fetchAIWithRetry(GEMINI_API_KEY, "gemini-2.5-flash", [
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
        nuvem_palavras: 'Nuvem de Palavras (15 termos essenciais em destaque visual)',
        labirinto_decisao: 'Labirinto de Decisão (3 perguntas Se/Então que levam ao sucesso)',
        caca_erros: 'Detetive de Falhas / Caça-Erros (parágrafo com 3 erros ocultos)',
        cruzadinha_termos: 'Cruzadinha de Termos Técnicos (termos com dicas contextualizadas)',
        stop_industrial: 'Stop Industrial (tabela com categorias técnicas)',
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
        nuvem_palavras: `Gere uma NUVEM DE PALAVRAS com ${count || 15} termos essenciais da aula.
- Liste os termos em uma <div> estilizada com font-size variado (os mais importantes maiores: 2em, médios: 1.4em, menores: 1em)
- Use cores variadas (inline style) e disposição visual rica (display:inline-block com padding e margin variados)
- Abaixo, inclua um GLOSSÁRIO TÉCNICO: cada termo com definição curta de 1 linha
- Inclua campo "Nome do Agente: ___________" e "Assinatura do Instrutor: ___________" no rodapé`,
        labirinto_decisao: `Gere um LABIRINTO DE DECISÃO com 3 perguntas tipo "Se/Então".
- Apresente como uma "Missão Técnica" ou "Ordem de Serviço" com tom desafiador (ex: "Agente, detectamos um gargalo...")
- Cada pergunta tem 2 caminhos: o CORRETO leva à próxima etapa, o ERRADO leva a uma "falha de missão" com explicação do erro
- Use <div> com bordas, setas (→) e cores: verde para caminho correto, vermelho para falha
- Ao final do caminho correto, exiba "✅ MISSÃO CONCLUÍDA — Procedimento executado com segurança"
- Inclua campo "Assinatura do Instrutor: ___________" no rodapé
- Se envolver procedimento perigoso, SEMPRE cite o EPI correspondente`,
        caca_erros: `Gere um DETETIVE DE FALHAS (Caça-Erros Técnico).
- Escreva um parágrafo de 8-12 linhas descrevendo um procedimento técnico da área com EXATAMENTE 3 ERROS OCULTOS
- Os erros devem ser técnicos e sutis (nomenclatura errada, passo fora de ordem, ferramenta inadequada, EPI faltando)
- Abaixo do texto, inclua 3 campos numerados: "Erro 1: ___________", "Erro 2: ___________", "Erro 3: ___________"
- Em uma seção de GABARITO (em <details><summary>Ver Gabarito</summary>...) revele os 3 erros com a correção
- Use tom de "Engenheiro, inspecione o procedimento abaixo..." 
- Inclua campo "Assinatura do Instrutor: ___________" no rodapé`,
        cruzadinha_termos: `Gere uma CRUZADINHA DE TERMOS TÉCNICOS com ${count || 8} palavras.
- Uma tabela HTML <table> representando a grade (células vazias para preencher e células pretas com background:#1e293b)
- Lista de "HORIZONTAIS" com dicas contextualizadas ao curso técnico
- Lista de "VERTICAIS" com dicas contextualizadas ao curso técnico
- GABARITO com as respostas no final
- Inclua campo "Assinatura do Instrutor: ___________" no rodapé`,
        stop_industrial: `Gere uma tabela de STOP INDUSTRIAL.
- Crie uma tabela HTML <table> com as colunas: Componente | Ferramenta | Norma NR | Ação Técnica | EPI Obrigatório
- Preencha a PRIMEIRA linha como exemplo e deixe ${count || 8} linhas em branco para o aluno preencher
- Abaixo, inclua um BANCO DE PALAVRAS com 20 termos técnicos da área para auxiliar o preenchimento
- Use tom de "Ordem de Serviço" no cabeçalho
- Inclua campo "Assinatura do Instrutor: ___________" no rodapé`,
      };

      const isLudicaTecnica = ['nuvem_palavras', 'labirinto_decisao', 'caca_erros', 'cruzadinha_termos', 'stop_industrial'].includes(gameType);

      const systemPromptJogos = isLudicaTecnica
        ? `Aja como um Designer Instrucional Sênior da EduCreator Maker Space. Sua tarefa é gerar uma Atividade Lúdica Extra baseada no conteúdo técnico fornecido.

DIRETRIZES DE GERAÇÃO:
1. CONTEXTUALIZAÇÃO TOTAL: A atividade deve usar os termos técnicos e o cenário da aula (ex: se a aula é de Solda, use termos como 'Arco' e 'Eletrodo').
2. ESTÉTICA INDUSTRIAL: O tom deve ser de 'Missão' ou 'Ordem de Serviço'. Use linguagem que desafie o aluno (ex: 'Agente, detectamos um gargalo...', 'Engenheiro, inspecione a junta...').
3. DIAGRAMAÇÃO PARA IMPRESSÃO: O conteúdo deve ser conciso para caber em meia folha A4. Inclua sempre campo de 'Assinatura do Instrutor' no final.
4. REGRAS DE SEGURANÇA: Nunca sugira procedimentos perigosos sem citar o EPI correspondente. Siga rigorosamente a nomenclatura da Matriz Técnica Industrial.
${NO_IMG_RULE}
Responda APENAS com JSON válido, sem markdown.`
        : `Você é um Game Designer Educacional especialista em criar jogos pedagógicos envolventes e visualmente ricos em HTML. Seus jogos devem ser prontos para impressão em folha A4.${NO_IMG_RULE}\nResponda APENAS com JSON válido, sem markdown.`;

      const userPromptJogos = `Crie um jogo/atividade do tipo: ${gameLabels[gameType] || gameLabels.cruzadinha}

Tema: "${specificTopic || 'tema geral'}"
Série: ${serie || 'Ensino Fundamental'}
${customMaterial ? `\nCONTEXTO / DISCIPLINA TÉCNICA:\n${customMaterial.slice(0, 6000)}\n` : ''}

${gameFormat[gameType] || gameFormat.cruzadinha}

Use HTML rico com estilos inline: tabelas com bordas, cores de fundo (#1e293b para cabeçalhos, #f8fafc para corpo), fonte legível (font-family: system-ui).
Formate para impressão ${isLudicaTecnica ? 'em MEIA FOLHA A4 (layout compacto)' : 'A4'}.

Responda em JSON:
{
  "questions": [
    {
      "content": "<HTML completo do jogo/atividade>",
      "options": [],
      "skillCode": "${isLudicaTecnica ? 'LUDICA' : 'JOGO'}-${(gameType || '').toUpperCase()}",
      "descriptor": "${specificTopic || 'Atividade Educativa'}"
    }
  ]
}`;

      if (gameType === 'cruzadinha' || gameType === 'cruzadinha_termos') {
        const systemPromptCruzadinha = `Atue como um criador de jogos pedagógicos. Com base no tema fornecido, crie dados para uma palavra cruzada. REGRA CRÍTICA: Retorne APENAS um objeto JSON válido, sem formatação markdown, contendo um array chamado "words". Cada item do array deve ter duas chaves: "answer" (a palavra da resposta, em MAIÚSCULAS, sem espaços e sem acentos) e "clue" (a dica pedagógica clara e objetiva para o aluno adivinhar a palavra). Gere entre 6 e 10 palavras no máximo.`;
        const userPromptCruzadinha = `Tema: "${specificTopic || 'tema geral'}"\nSérie: ${serie || 'Ensino Fundamental'}${customMaterial ? `\nContexto: ${customMaterial.slice(0, 2000)}` : ''}`;
        
        const response = await fetchAIWithRetry(GEMINI_API_KEY, "gemini-2.5-flash", [
          { role: "system", content: systemPromptCruzadinha },
          { role: "user", content: userPromptCruzadinha },
        ], 0.7);

        if (!response.ok) return handleErrorResponse(response, "cruzadinha");
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        try {
          const parsed = extractJsonFromMixedResponse(content);
          return new Response(JSON.stringify({ questions: [{ content: JSON.stringify(parsed), skillCode: "GAME-CRUZADINHA", descriptor: specificTopic || 'Cruzadinha' }] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (error) {
          console.error("Failed to parse cruzadinha JSON:", content, error);
          return new Response(JSON.stringify({ error: "Erro ao processar dados da cruzadinha." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        const response = await fetchAIWithRetry(GEMINI_API_KEY, "gemini-2.5-flash", [
          { role: "system", content: systemPromptJogos },
          { role: "user", content: userPromptJogos },
        ], 0.8);

        return await parseAIResponse(response, "jogo");
      }
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

      const systemPromptLit = `Você é um Doutor em Literatura Brasileira e Universal, com especialização em obras cobradas nos principais vestibulares do Brasil (principais bancas acadêmicas do Brasil). Você possui conhecimento enciclopédico sobre todas as obras literárias mundiais.${NO_IMG_RULE}
REGRA CRÍTICA DE TAMANHO: Sua resposta TOTAL (incluindo o JSON) deve ter NO MÁXIMO 4000 palavras. Seja direto e objetivo. Priorize informações essenciais para vestibulares. NÃO escreva capítulos completos — faça RESUMOS CONCISOS de cada parte.
Responda em formato JSON simplificado, limitando cada seção a no máximo 3 parágrafos. Não use explicações prolixas.
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

      const response = await fetchAIWithRetry(GEMINI_API_KEY, "gemini-2.5-flash", [
        { role: "system", content: systemPromptLit },
        { role: "user", content: userPromptLit },
      ], 0.7, 3, 120000);

      return await parseAIResponse(response, "dossiê literário");
    }

    // ══════ STUDENT QUIZ MODE (fast path — lighter model) ══════
    if (studentMode) {
      const examLabelsStudent: Record<string, string> = {
        super_enem: 'Banca Padrão Nacional', fuvest: 'Banca Acadêmica', unicamp: 'Banca de Excelência', unesp: 'Avaliação Técnica',
        ufscar: 'UFSCar/Federais', vestibulinho_etec: 'ETEC', selecao_ifs: 'Instituto Federal',
        puc: 'Centro Universitário Alpha', mackenzie: 'Rede Vértice', fgv: 'Faculdade Delta', medicina: 'Medicina',
      };
      const studentCount = count || studentQCount || 10;
      const instLabel = tecnicoInstitution === 'ifs' ? 'Instituto Federal (IFs)' :
                        tecnicoInstitution === 'etec' ? 'ETEC / Centro Paula Souza' :
                        examLabelsStudent[activeSpecialty] || activeSpecialty || examType || 'Banca Padrão Nacional';

      const systemPromptStudent = `Você é um Tutor Socrático para estudantes brasileiros. Gere questões de múltipla escolha (A-E) no estilo "${instLabel}". Para cada questão inclua "tutorExplanation" com 2 frases: o conceito-chave e uma dica prática.${NO_IMG_RULE}Responda APENAS com JSON válido.`;

      const userPromptStudent = `Gere ${studentCount} questões de múltipla escolha (A a E) no estilo "${instLabel}" para Ensino Médio/Fundamental.
${isFastTrackVestibulinho ? 'Distribua entre: Português, Matemática, Ciências da Natureza e Ciências Humanas.' : `Área: ${subjectArea || 'Conhecimentos Gerais'}.`}
Nível: médio. Questões contextualizadas com situações-problema.

JSON:
{"questions":[{"content":"enunciado","options":[{"letter":"A","text":"...","isCorrect":false}],"skillCode":"código","tutorExplanation":"explicação"}]}`;

      const response = await fetchAIWithRetry(GEMINI_API_KEY, "gemini-2.5-flash-lite", [
        { role: "system", content: systemPromptStudent },
        { role: "user", content: userPromptStudent },
      ], 0.7);

      return await parseAIResponse(response, "quiz do aluno");
    }

    // Support multi-subject
    const subjectList: string[] = subjects && subjects.length > 0 ? subjects : subjectArea ? [subjectArea] : [];

    const topicInstruction = specificTopic ? `\nTEMA ESPECÍFICO: Foque TODO o conteúdo gerado no tema "${specificTopic}". Todos os enunciados, contextos e exercícios devem girar em torno deste tema.\n` : "";

    // ── Ciclo Escolar Completo — Matheus Lima Piffer ──
    const isInfantil = ['bercario', 'maternal_1', 'maternal_2', 'mini_maternal', 'maternal', 'jardim_1', 'jardim_2', 'pre'].includes(serie || '');
    const isAlfabetizacao = ['ano_1', 'ano_2'].includes(serie || '');
    const isAnosIniciais = ['ano_3', 'ano_4', 'ano_5'].includes(serie || '');

    let serieInstruction = '';
    if (isInfantil) {
      serieInstruction = `\nSÉRIE ESCOLAR: EDUCAÇÃO INFANTIL ("${serie}").
DIRETRIZES OBRIGATÓRIAS:
- Use linguagem LÚDICA, com frases curtíssimas e vocabulário concreto do universo infantil (brinquedos, animais, frutas, cores).
- Foco em CAMPOS DE EXPERIÊNCIA (BNCC): O eu/outro/nós, Corpo/gestos/movimentos, Traços/sons/cores/formas, Escuta/fala/pensamento/imaginação, Espaços/tempos/quantidades/relações/transformações.
- As questões devem ser ORIENTAÇÕES PARA O PROFESSOR/MEDIADOR realizar ATIVIDADES PRÁTICAS com a criança (recorte, pintura, roda de conversa, jogo).
- NÃO gere questões de múltipla escolha tradicionais. Gere roteiros de atividades lúdicas com materiais simples.
- Inclua emojis como apoio visual (🎨🧩🎶🌈).
- Tom acolhedor e afetivo.\n`;
    } else if (isAlfabetizacao) {
      serieInstruction = `\nSÉRIE ESCOLAR: ${serie === 'ano_1' ? '1º ANO (ALFABETIZAÇÃO)' : '2º ANO'}.
DIRETRIZES OBRIGATÓRIAS:
- Use frases MUITO CURTAS (máximo 1 linha) com palavras simples do cotidiano.
- Priorize SÍLABAS, LETRAS e PALAVRAS-CHAVE em destaque.
- Alternativas com no máximo 5 palavras cada.
- Inclua pistas visuais textuais (emojis: 🍎📚✏️) para apoiar a leitura.
- Sugira ao professor onde inserir imagens de apoio: [INSERIR IMAGEM: descrição].
- Conteúdo alinhado à BNCC para alfabetização/letramento e numeramento inicial.\n`;
    } else if (isAnosIniciais) {
      serieInstruction = `\nSÉRIE ESCOLAR: ${serie} (Anos Iniciais do Ensino Fundamental).
DIRETRIZES: Use linguagem acessível com frases curtas. Vocabulário adequado para crianças de 8-10 anos. Contextualize problemas com situações do dia a dia (escola, família, brincadeiras). Alternativas claras e diretas.\n`;
    } else if (serie) {
      serieInstruction = `\nSÉRIE ESCOLAR: O conteúdo deve ser calibrado para o nível "${serie}". Ajuste vocabulário, complexidade e profundidade dos conceitos de acordo com esta faixa etária.\n`;
    }

    const generoInstruction = generoTextual ? `\nGÊNERO TEXTUAL OBRIGATÓRIO: A proposta de redação deve exigir a produção de um texto no gênero "${generoTextual}". Adapte o comando de escrita, os textos motivadores e os critérios de avaliação para este gênero específico.\n` : "";

    // Fast-Track Vestibulinho instruction
    const tecnicoInstLabel = tecnicoInstitution || 'Instituto Federal / ETEC';
    const fastTrackInstruction = isFastTrackVestibulinho
      ? tecnicoMode === 'por_area'
        ? `\nMODO SIMULADO POR ÁREA (${tecnicoInstLabel}): Gere exatamente ${count} questões de múltipla escolha (A a E) focadas nas disciplinas selecionadas: ${(subjects || []).join(', ')}. Respeite RIGOROSAMENTE o estilo de enunciado, o nível de dificuldade oficial e a contextualização típica de vestibulinhos da instituição ${tecnicoInstLabel}. As questões devem ser situações-problema contextualizadas.\n`
        : `\nMODO FAST-TRACK VESTIBULINHO COMPLETO (${tecnicoInstLabel}): Ignore COMPLETAMENTE filtros de disciplina individual. Gere exatamente 20 questões de múltipla escolha (A a E) distribuídas equilibradamente entre as matérias principais da banca: Língua Portuguesa (interpretação, gramática — ~5 questões), Matemática (aritmética, geometria, álgebra — ~5 questões), Ciências da Natureza (~5 questões) e Ciências Humanas (~5 questões). Respeite RIGOROSAMENTE o estilo de enunciado, o nível de dificuldade oficial e a contextualização típica de vestibulinhos de ${tecnicoInstLabel}. As questões devem ser interdisciplinares com situações-problema do cotidiano.\n`
      : "";

    // Industrial Mode
    const senaiInstruction = isSenaiMode
      ? `\nMODO SIMULADO TÉCNICO INDUSTRIAL — PADRÃO INDUSTRIAL (MATRIZ REGIONAL SÃO PAULO):
Você é um Engenheiro de Segurança do Trabalho e Instrutor Técnico especializado no eixo "${senaiEixo || 'Mecânica Industrial'}".
${senaiSpMatrix ? `\nMATRIZ CURRICULAR SP — CONTEÚDO OBRIGATÓRIO PARA ESTE EIXO:\n${senaiSpMatrix}\nTodas as questões DEVEM abordar os tópicos acima com exemplos do contexto industrial paulista.\n` : ''}
${senaiVestibulinho ? `\nMODO VESTIBULINHO TÉCNICO INDUSTRIAL (60 QUESTÕES):
A prova deve seguir o peso oficial:
- 20 questões de LÍNGUA PORTUGUESA (interpretação de texto técnico, gramática aplicada, comunicação empresarial)
- 20 questões de MATEMÁTICA (cálculos industriais, medidas, proporções, estatística aplicada ao chão de fábrica)
- 20 questões de CIÊNCIAS (Física aplicada: mecânica, eletricidade; Química: materiais, reações industriais; Biologia: saúde ocupacional, ergonomia)
Todas contextualizadas no universo técnico-industrial do eixo "${senaiEixo}".
Numere as questões de 1 a ${count || 60} sequencialmente.
O cabeçalho conceitual é: "AVALIAÇÃO DE DESEMPENHO TÉCNICO — MATRIZ INDUSTRIAL".\n` : `
ESTILO DAS QUESTÕES:
- Gere EXATAMENTE ${count || 10} questões de múltipla escolha (A a E) no nível de cursos técnicos industriais.
- As questões devem abordar: cálculos técnicos (módulo de engrenagens, relação de transmissão, dimensionamento), leitura de diagramas e esquemas, procedimentos de montagem/desmontagem, nomenclatura técnica industrial.
- Contextualize com situações reais de chão de fábrica, linha de produção ou manutenção industrial.`}

VERIFICAÇÃO DE NORMAS DE SEGURANÇA (NR-12, NR-35, NR-10):
- Para CADA questão que envolva operação com máquinas, motores, eletricidade ou trabalho em altura, INCLUA obrigatoriamente no enunciado ou nas alternativas referências a EPIs (óculos de proteção, luvas, protetor auricular, calçado de segurança).
- Se o texto da questão mencionar montagem com motores sem citar óculos de proteção, CORRIJA incluindo este item.
- Inclua pelo menos 2 questões específicas sobre segurança do trabalho e normas regulamentadoras.

CAMPO "skillCode": Use códigos como "NR-12", "NR-35", "TEC-MEC", "TEC-ELE", "TEC-AUT", "TEC-LOG", "TEC-ADM", "TEC-SOL", "TEC-DEV" conforme o eixo.
CAMPO "descriptor": Descreva brevemente a competência técnica avaliada.\n`
      : "";

    let techDisciplineInstruction = "";
    if (technicalDiscipline && examModel === 'vest_publicos') {
      const bancaMap: Record<string, string> = {
        'Banca Padrão Nacional': 'No estilo padrão nacional: questões contextualizadas com situações-problema, textos longos, gráficos e interdisciplinaridade. Foco nas competências da Matriz de Referência Nacional.',
        'Banca Acadêmica (Elite)': 'No estilo banca acadêmica de elite: rigor acadêmico máximo, questões analíticas com textos eruditos, exigindo profundidade conceitual e capacidade de síntese.',
        'Banca de Excelência': 'No estilo banca de excelência: questões interdisciplinares com textos acadêmicos densos, interpretação de dados e raciocínio crítico avançado.',
        'Avaliação Técnica': 'No estilo avaliação técnica: questões objetivas e diretas com contextualização rica, exigindo domínio conceitual sólido.',
        'UFSCar / Federais': 'No estilo de vestibulares de Universidades Federais (UFSCar, UNIFESP, IFs): questões com rigor científico, interdisciplinaridade e contextualização social.',
      };
      techDisciplineInstruction = `\nBANCA VESTIBULAR PÚBLICA: ${bancaMap[technicalDiscipline] || `Questões no estilo do vestibular "${technicalDiscipline}" com alto rigor acadêmico.`}\n`;
    } else if (technicalDiscipline && examModel === 'vest_privados') {
      const bancaMap: Record<string, string> = {
        'Centro Universitário Alpha': 'No estilo acadêmico humanista: questões com tom formal e humanista, exigindo repertório cultural amplo e capacidade argumentativa.',
        'Rede Vértice': 'No estilo acadêmico de alto rigor: rigor clássico, questões que exigem domínio conceitual profundo e raciocínio analítico preciso.',
        'Faculdade Delta': 'No estilo analítico: questões com foco em atualidades, economia, geopolítica e raciocínio lógico-analítico de alto nível.',
        'Medicina (Academia Superior)': 'No estilo de vestibulares de Medicina de alto nível: nível máximo de exigência em Ciências da Natureza, com questões multietapa e raciocínio clínico.',
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
    if (!isRedacao && !isAula && !isConcursoMode && !isVestibularesMode && !isFastTrackVestibulinho && !isSenaiMode && (subjectList.length === 0 || !grade || !count)) {
      return new Response(JSON.stringify({ error: "Disciplina(s), série e quantidade são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const examLabels: Record<string, string> = {
      saresp: "Avaliação Paulista (baseada nos descritores de proficiência do Estado de São Paulo)",
      prova_paulista: "Avaliação Regional",
      ade: "Avaliação Diagnóstica Estadual (ADE)",
      saeb: "SAEB (Sistema de Avaliação da Educação Básica)",
    };

    const modelInstructions: Record<string, string> = {
      super_bncc_elite: `Foco em habilidades e competências transversais da BNCC de forma avançada, exigindo pensamento crítico, interpretação complexa e conexões interdisciplinares.`,
      senai_tecnico: `Baseado no estilo de provas técnicas industriais, com foco em raciocínio lógico, interpretação de diagramas técnicos, fluxogramas e resolução de problemas práticos do mundo do trabalho.`,
      vestibulares_paulistas: `Nível de exigência máximo, no estilo das principais bancas acadêmicas. Questões interdisciplinares com textos acadêmicos densos, exigindo análise crítica aprofundada, domínio conceitual e capacidade de síntese.`,
      eixo_tecnico_cps: `No estilo dos vestibulinhos de colégios técnicos (CPS/ETEC/COTIL/COTUCA/COTIP). Questões objetivas e contextualizadas com situações práticas do cotidiano, exigindo interpretação e aplicação de conceitos.`,
      mackenzie: `No estilo das provas de redes acadêmicas de elite. Tom formal e acadêmico com rigor clássico, questões que exigem domínio conceitual profundo e raciocínio analítico preciso.`,
      coc: `No estilo acadêmico integrado. Questões com contextualização rica e didática moderna, conectando conceitos a situações do cotidiano com linguagem acessível mas rigorosa.`,
      etapa: `No estilo das provas do Colégio Etapa. Nível de desafio elevado com questões técnicas e complexas que exigem raciocínio aprofundado e domínio avançado dos conteúdos.`,
      objetivo: `No estilo acadêmico direto e objetivo. Foco em atualidades, questões diretas e objetivas com contextualização em eventos recentes e temas contemporâneos.`,
      obmep_mirim1: `No estilo da OBMEP Mirim 1 (2º e 3º ano). Questões lúdicas de raciocínio lógico-matemático com padrões visuais, sequências e desafios matemáticos acessíveis, sem uso de fórmulas mecânicas. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      obmep_mirim2: `No estilo da OBMEP Mirim 2 (4º e 5º ano). Problemas de geometria intuitiva, padrões numéricos e desafios criativos que estimulam o pensamento matemático sem mecanização. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      obmep_n1: `No estilo da OBMEP Nível 1 (6º e 7º ano). Problemas criativos que exigem raciocínio lógico, reconhecimento de padrões, contagem e geometria sem depender de fórmulas decoradas. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      obmep_n2: `No estilo da OBMEP Nível 2 (8º e 9º ano). Questões de raciocínio avançado envolvendo combinatória, teoria dos números, geometria e álgebra com abordagem investigativa. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      obmep_n3: `No estilo da OBMEP Nível 3 (Ensino Médio). Nível olímpico máximo com problemas desafiadores de teoria dos números, combinatória avançada, geometria euclidiana e álgebra, exigindo demonstrações e raciocínio criativo. A disciplina é SEMPRE Matemática/Raciocínio Lógico.`,
      super_enem: `No estilo padrão nacional de avaliação. Questões contextualizadas com situações-problema do cotidiano, interdisciplinares, com textos, gráficos e tabelas. Foco nas competências e habilidades da Matriz de Referência Nacional.`,
      concurso_publico: `No estilo de concursos públicos brasileiros (bancas organizadoras oficiais). Questões objetivas com linguagem formal e técnica, cobrando legislação educacional, didática, BNCC e conhecimentos pedagógicos.`,
      redacao_fuvest: `Gere uma proposta de redação no estilo banca acadêmica: tema dissertativo-argumentativo com coletânea de textos motivadores (mínimo 3), exigindo posicionamento crítico e repertório cultural. Tom acadêmico e erudito.`,
      redacao_unicamp: `Gere uma proposta de redação no estilo banca de excelência: proposta com gênero textual específico (carta, artigo, manifesto, crônica), situação comunicativa definida e interlocutor claro. Inclua coletânea de textos de apoio.`,
      redacao_vunesp: `Gere uma proposta de redação no estilo avaliação técnica: dissertação argumentativa com tema contemporâneo, 2-3 textos motivadores curtos e objetivos, com foco em clareza argumentativa.`,
      redacao_enem: `Gere uma proposta de redação no padrão nacional: tema dissertativo-argumentativo com 3-4 textos motivadores (verbais e não-verbais), exigindo proposta de intervenção que respeite os direitos humanos. Siga rigorosamente as 5 competências da redação oficial.`,
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

    // ── EDUCAÇÃO FINANCEIRA (tema contemporâneo transversal BNCC) ──
    const isFinanceira = subjectList.some((s: string) =>
      (s || '').toLowerCase().includes('financeira')
    ) || (specificTopic || '').toLowerCase().includes('educação financeira');

    const finEduInstruction = isFinanceira
      ? `\nDISCIPLINA: EDUCAÇÃO FINANCEIRA (Tema Contemporâneo Transversal — BNCC, macroárea "Economia": Trabalho, Educação Financeira e Educação Fiscal).
DIRETRIZES OBRIGATÓRIAS:
- Toda questão deve partir de uma SITUAÇÃO-PROBLEMA REAL de consumo, poupança, renda, planejamento ou cidadania fiscal, com dados numéricos plausíveis em REAIS (use "R$" seguido de espaço, ex.: R$ 1.250,00).
- Integre competências de Matemática (porcentagem, proporção, juros, função) com leitura crítica de gráficos, tabelas, boletos, extratos, faturas e anúncios.
- Desenvolva atitudes: consumo consciente, diferença entre desejo e necessidade, prevenção ao endividamento, ética financeira e sustentabilidade.
PROGRESSÃO POR SÉRIE (calibre ao nível informado):
- Educação Infantil: noções de troca, valor, "guardar para depois", cuidado com os próprios objetos — em atividades lúdicas.
- 1º e 2º anos: reconhecer cédulas e moedas do Real, comparar preços simples, contar dinheiro em situações de brincadeira (mercadinho).
- 3º ao 5º ano: somar e subtrair valores, troco, listas de compras, mesada, poupança simples, desejo x necessidade.
- 6º ao 9º ano: porcentagem, descontos, acréscimos, orçamento familiar, comparação à vista x parcelado, juros simples, propaganda e consumo consciente.
- Ensino Médio: juros compostos, inflação, financiamento, investimentos (poupança, CDB, Tesouro), impostos e tributos, crédito, score, previdência, planejamento de vida financeira e empreendedorismo.
- Cursos técnicos/profissionalizantes: custos, precificação, fluxo de caixa, margem de lucro, capital de giro, tributos sobre serviços.
CAMPO "skillCode": use códigos BNCC de Matemática quando houver correspondência (ex.: EF06MA13, EF09MA05, EM13MAT203) e prefixe com "EDFIN — " (ex.: "EDFIN — EF09MA05").
CAMPO "descriptor": descreva a competência financeira avaliada (ex.: "Comparar compra à vista e parcelada").\n`
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

      const response = await fetchAIWithRetry(GEMINI_API_KEY, "gemini-2.5-flash", [
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

      const response = await fetchAIWithRetry(GEMINI_API_KEY, "gemini-2.5-flash", [
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

    const isMixed = provaFormat === 'mista';
    const questionFormatInstruction = isMixed
      ? `MODO MISTO: Gere um simulado com uma mescla de questões OBJETIVAS (múltipla escolha A-E) e questões DISCURSIVAS (abertas). Distribua aproximadamente 50/50 entre os dois tipos. Para as objetivas, inclua alternativas A-E. Para as discursivas, não inclua alternativas e forneça o espelho de correção.`
      : isDiscursiva
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
${modelInstruction ? `MODELO: ${modelInstruction}\n` : ""}${philSocInstruction}${bloomInstruction}${ragInstruction}${antiFraudInstruction}${topicInstruction}${serieInstruction}${finEduInstruction}${questoesOnlyInstruction}${multiSubjectInstruction}${NO_IMG_RULE}${techDisciplineInstruction}${provaFormatInstruction}${studentModeInstruction}${fastTrackInstruction}${concursoInstruction}${senaiInstruction}${compactInstruction}${leanFormattingInstruction}
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
      "skillCode": "Código da habilidade BNCC/Gestor de Ensino relacionada",
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
      "skillCode": "Código da habilidade BNCC/Gestor de Ensino relacionada",
      "descriptor": "Descritor de competência associado"
    }
  ]
}`;

    const response = await fetchAIWithRetry(GEMINI_API_KEY, "gemini-2.5-flash", [
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
