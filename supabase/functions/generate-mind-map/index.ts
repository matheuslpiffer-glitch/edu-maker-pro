import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const { theme, mode, subject, grade, aee, questionPrompt } = await req.json();
    if (!theme) return new Response(JSON.stringify({ error: "Tema obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Question generation mode
    if (mode === 'questions' && questionPrompt) {
      const qPrompt = `Você é a Dra. IA Doutora, especialista em Pedagogia e Interpretação de Infográficos.

${questionPrompt}

REGRAS:
- Gere exatamente 5 perguntas de análise e interpretação.
- As perguntas devem exigir observação do infográfico (conexões, setas, hierarquia).
- Inclua uma resposta esperada para cada pergunta.
- Padrão: FONTE ARIAL 11, TUDO EM MAIÚSCULAS, ENUNCIADOS EM NEGRITO.
- Adapte o nível para: ${grade || 'Ensino Médio'}${subject ? `, disciplina: ${subject}` : ''}.

Retorne JSON PURO (sem markdown):
{
  "questions": [
    { "question": "PERGUNTA EM MAIÚSCULAS", "answer": "RESPOSTA ESPERADA EM MAIÚSCULAS" }
  ]
}`;

      const qRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: qPrompt }],
          temperature: 0.6,
        }),
      });

      if (!qRes.ok) {
        const errText = await qRes.text();
        throw new Error(`AI error ${qRes.status}: ${errText}`);
      }

      const qData = await qRes.json();
      let qRaw = qData.choices?.[0]?.message?.content || "";
      qRaw = qRaw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(qRaw);

      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Schedule generation mode
    if (mode === 'schedule' && questionPrompt) {
      const sPrompt = `Você é a Dra. IA Doutora, especialista em Planejamento Pedagógico e Gestão de Estudos.

${questionPrompt}

REGRAS:
- Gere exatamente 5 dias (SEGUNDA a SEXTA).
- Cada missão deve ser curta, objetiva e prática (1-2 frases).
- Tempo sugerido entre 10 e 30 minutos.
- TUDO EM MAIÚSCULAS.
- Adapte o nível para: ${grade || 'Ensino Médio'}${subject ? `, disciplina: ${subject}` : ''}.

Retorne JSON PURO (sem markdown):
{
  "schedule": [
    { "day": "SEGUNDA", "mission": "MISSÃO EM MAIÚSCULAS", "time": "15 MINUTOS" },
    { "day": "TERÇA", "mission": "MISSÃO EM MAIÚSCULAS", "time": "20 MINUTOS" },
    { "day": "QUARTA", "mission": "MISSÃO EM MAIÚSCULAS", "time": "10 MINUTOS" },
    { "day": "QUINTA", "mission": "MISSÃO EM MAIÚSCULAS", "time": "15 MINUTOS" },
    { "day": "SEXTA", "mission": "MISSÃO EM MAIÚSCULAS", "time": "30 MINUTOS" }
  ]
}`;

      const sRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: sPrompt }],
          temperature: 0.6,
        }),
      });

      if (!sRes.ok) {
        const errText = await sRes.text();
        throw new Error(`AI error ${sRes.status}: ${errText}`);
      }

      const sData = await sRes.json();
      let sRaw = sData.choices?.[0]?.message?.content || "";
      sRaw = sRaw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const sParsed = JSON.parse(sRaw);

      return new Response(JSON.stringify(sParsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aeeOverlay = aee ? `

AJUSTE AEE OBRIGATÓRIO (sobreponha qualquer estilo):
- Use ALTO CONTRASTE: fundo escuro com textos claros OU fundo branco com textos pretos.
- Tipografia amigável para dislexia: fontes sans-serif, espaçamento extra entre letras.
- Reduza DRASTICAMENTE o texto: máximo 3 palavras por nó.
- AUMENTE os ícones/emojis: use 2-3 emojis grandes por conceito.
- Use 'Pistas Visuais': cores específicas para tipos de informação (azul=definição, verde=exemplo, amarelo=atenção, vermelho=importante).
- Cada branch DEVE ter a propriedade "aee_hint" com uma dica visual curta.
- Simplifique vocabulário ao máximo, use linguagem concreta e direta.` : '';

    const modeInstructions: Record<string, string> = {
      infantil: `Estilo "Explorador Mirim" para Anos Iniciais (1º ao 5º ano):
- Layout circular/nuvem com NO MÁXIMO 5 ramificações.
- Cada nó: máximo 3 palavras-chave simples e concretas.
- Emojis GIGANTES e expressivos (2-3 por nó).
- Conectores com verbos simples: "tem", "é", "usa", "faz".
- Vocabulário adequado para 6–10 anos, frases curtas e divertidas.
- Cores PASTÉIS vibrantes: #F9A8D4, #93C5FD, #86EFAC, #FDE68A, #C4B5FD, #FDBA74.
- NÃO inclua children/sub-ramificações.
- Cada summary: NO MÁXIMO 1 frase curta, lúdica e memorável.
- Inclua "memory_trick" em cada branch: uma rima, acrônimo ou associação para memorização.`,

      fundamental: `Estilo "Conexão Analítica" para Fundamental II (6º ao 9º ano):
- Layout ramificado analítico com 5 a 7 ramificações.
- Título curto + resumo de 1-2 frases com GATILHOS MENTAIS para memorização.
- Conectores com VERBOS DE AÇÃO: "gera", "causa", "resulta em", "é composto por", "influencia", "depende de".
- 2-3 children (sub-conceitos) com exemplos práticos do cotidiano do aluno.
- Emojis como suporte visual contextual.
- Cores contrastantes por braço: #3B82F6, #10B981, #F59E0B, #EF4444, #8B5CF6, #EC4899, #06B6D4.
- Inclua "memory_trick" em cada branch: mnemônicos, associações ou analogias.`,

      medio: `Estilo "Síntese Acadêmica" para Ensino Médio:
- Layout denso hierárquico estilo cartaz de revisão com 6 a 8 ramificações.
- Definições técnicas PRECISAS e completas em cada nó.
- Use APENAS caracteres Unicode para fórmulas (², ³, √, π, ÷, ×, ≠, ≤, ≥, →, ←, ↔, ∞, Σ, Δ, ∫).
- Conexões INTERDISCIPLINARES entre braços quando possível.
- Gatilhos mentais e palavras-chave para memorização rápida.
- 3-4 sub-ramificações por braço com "detail" técnico de 1 frase.
- Cores profissionais e sóbrias: #1E40AF, #047857, #B45309, #B91C1C, #6D28D9, #BE185D, #0E7490, #4338CA.
- Inclua "memory_trick" em cada branch: mnemônicos acadêmicos, regras práticas ou associações.
- Inclua "cross_link" quando um braço se conecta a outro (ex: "ver também: Braço 3").`,
    };

    const instruction = modeInstructions[mode] || modeInstructions.medio;

    const gradeContext = grade ? `\nSérie/Ano do aluno: ${grade}. Adapte TODO o vocabulário, profundidade e complexidade para este nível específico.` : '';

    const prompt = `Você é a Dra. Mapa Mental, uma especialista doutora em Neuroeducação e Design Instrucional Visual com 20 anos de experiência em Visual Thinking e técnicas de memorização.

Sua missão: criar mapas mentais que FACILITEM A MEMORIZAÇÃO, promovam CONEXÃO DE IDEIAS e apliquem princípios de Visual Thinking adaptados rigorosamente à série de ensino.

Gere um mapa mental sobre o tema: "${theme}"${subject ? ` na disciplina de ${subject}` : ''}.${gradeContext}

${instruction}${aeeOverlay}

REGRAS INVIOLÁVEIS:
- NUNCA use LaTeX ($, $$), tags HTML (<sup>, <sub>, <b>) ou Markdown.
- Use APENAS caracteres Unicode para símbolos: ², ³, √, π, ÷, ×, ≠, ≤, ≥, →, ←, ↔, ∞, Σ, Δ, ∫, ≈, ∈, ∉, ⊂, ∪, ∩, ∀, ∃.
- Para frações use barra: 1/2, 3/4.
- Os summaries devem ser DENSOS em informação mas CONCISOS em palavras.
- Cada branch DEVE ter uma cor HEX distinta.
- Aplique princípios de Neuroeducação: hierarquia visual clara, agrupamento lógico, uso estratégico de cores.

Retorne um JSON PURO (sem markdown, sem crases) com esta estrutura:
{
  "center": { "label": "Tema Central", "emoji": "🎯" },
  "branches": [
    {
      "label": "Conceito",
      "emoji": "📘",
      "color": "#3B82F6",
      "summary": "Resumo técnico do conceito",
      "connector": "verbo de conexão",
      "memory_trick": "dica de memorização",${aee ? '\n      "aee_hint": "pista visual para AEE",' : ''}
      "children": [
        { "label": "Sub-conceito", "detail": "explicação técnica curta" }
      ]
    }
  ]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content || "";
    const mindMap = extractJson(raw);

    return new Response(JSON.stringify(mindMap), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function extractJson(response: string): any {
  let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  const isArr = start !== -1 && cleaned[start] === "[";
  const end = cleaned.lastIndexOf(isArr ? "]" : "}");
  if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    let repaired = cleaned
      .replace(/[\x00-\x1F\x7F]/g, " ")
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");
    // balance braces/brackets
    const opens = (repaired.match(/\{/g) || []).length;
    const closes = (repaired.match(/\}/g) || []).length;
    const opensB = (repaired.match(/\[/g) || []).length;
    const closesB = (repaired.match(/\]/g) || []).length;
    repaired += "]".repeat(Math.max(0, opensB - closesB));
    repaired += "}".repeat(Math.max(0, opens - closes));
    try {
      return JSON.parse(repaired);
    } catch (e2) {
      throw new Error(`Falha ao parsear JSON do mapa mental: ${(e2 as Error).message}`);
    }
  }
}
