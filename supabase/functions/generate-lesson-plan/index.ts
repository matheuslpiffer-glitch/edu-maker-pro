import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { theme, grade, subject, aee, tecnoMaker } = await req.json();
    if (!theme) {
      return new Response(JSON.stringify({ error: "Tema é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");


    let aeeInstruction = "";
    if (aee) {
      aeeInstruction = `
ADAPTAÇÃO AEE OBRIGATÓRIA:
- Simplifique a linguagem usando frases curtas e vocabulário acessível.
- Substitua termos técnicos por explicações simples.
- Sugira atividades multissensoriais (táteis, auditivas, visuais).
- Se o tema envolver Música, inclua musicografia braille e experiências de vibração sonora.
- Reduza a carga cognitiva: máximo 3 informações por etapa.
- Use Desenho Universal para a Aprendizagem (DUA).`;
    }

    let tecnoMakerInstruction = "";
    if (tecnoMaker) {
      tecnoMakerInstruction = `
MODO TECNO-MAKER ATIVADO:
- Inclua uma seção extra "🔧 Atividade Mão na Massa" com roteiro passo a passo.
- Priorize Unplugged Computing (sem uso de computador) ou projetos com materiais recicláveis.
- Se possível, sugira extensões com Arduino ou robótica educacional.
- O roteiro deve ter: materiais necessários, tempo estimado, passo a passo numerado e variação para turmas sem recursos tecnológicos.`;
    }

    const systemPrompt = `Você é uma Doutora em Pedagogia e Currículo, especialista em planejamento de aulas baseadas na BNCC e Currículo Paulista.

REGRAS OBRIGATÓRIAS:
1. RIGOR BNCC: Use apenas códigos de habilidades reais (ex: EM13MAT, EM13CNT). Proibido inventar códigos ou descrições.
2. TEXTO CONCISO: Objetivos e desenvolvimentos devem ser diretos. Máximo 2 frases por etapa.
3. RESPOSTA EM JSON LIMPO: Responda exclusivamente com um objeto JSON válido, sem tags markdown (como \`\`\`json) e sem qualquer introdução textual. Se quebrar esta regra, o sistema falhará.
4. ESTUDO DE CASO: Deve ser uma situação-problema prática conectada ao cotidiano real do aluno.
${aeeInstruction}
${tecnoMakerInstruction}`;

    const userPrompt = `Gere um plano de aula completo sobre o tema: "${theme}"
Série/Ano: ${grade || "Não especificada"}
Disciplina: ${subject || "Interdisciplinar"}

Retorne o JSON com esta estrutura:
{
  "title": "Título criativo do plano de aula",
  "theme": "${theme}",
  "subject": "${subject || 'Interdisciplinar'}",
  "grade": "${grade || 'Geral'}",
  "duration": "Duração sugerida (ex: 2 aulas de 50 min)",
  "objective": {
    "general": "Objetivo geral alinhado à BNCC",
    "specific": ["Objetivo específico 1", "Objetivo específico 2", "Objetivo específico 3"],
    "bnccSkills": ["Código BNCC 1", "Código BNCC 2"]
  },
  "methodology": {
    "approach": "Abordagem metodológica principal",
    "strategies": ["Estratégia 1", "Estratégia 2"]
  },
  "development": [
    { "step": 1, "title": "Título da etapa", "duration": "10 min", "description": "Descrição detalhada", "resources": ["Recurso 1"] },
    { "step": 2, "title": "Título da etapa", "duration": "15 min", "description": "Descrição detalhada", "resources": ["Recurso 1"] },
    { "step": 3, "title": "Título da etapa", "duration": "20 min", "description": "Descrição detalhada", "resources": ["Recurso 1"] }
  ],
  "caseStudy": {
    "title": "Título do estudo de caso",
    "situation": "Descrição da situação-problema real",
    "questions": ["Pergunta provocativa 1", "Pergunta provocativa 2"],
    "expectedOutcome": "O que se espera que os alunos concluam"
  },
  "assessment": {
    "formative": ["Critério formativo 1", "Critério formativo 2"],
    "summative": "Atividade avaliativa final",
    "rubric": [
      { "criteria": "Critério", "excellent": "Descrição", "good": "Descrição", "developing": "Descrição" }
    ]
  }${tecnoMaker ? `,
  "tecnoMaker": {
    "title": "Título da atividade maker",
    "materials": ["Material 1", "Material 2"],
    "estimatedTime": "30 min",
    "steps": ["Passo 1", "Passo 2", "Passo 3"],
    "lowTechAlternative": "Alternativa sem tecnologia"
  }` : ""}${aee ? `,
  "aeeAdaptations": {
    "sensoryActivities": ["Atividade sensorial 1"],
    "simplifiedInstructions": "Versão simplificada das instruções",
    "supportMaterials": ["Material de apoio 1"]
  }` : ""}
}`;

    const creditCheck = await checkAndDecrementCredits(userId);
    if (!creditCheck.allowed) {
      return new Response(JSON.stringify({ error: creditCheck.error }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let response;
    for (let i = 0; i < 4; i++) {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        }
      );
      if (response.ok || (response.status !== 503 && response.status !== 500 && response.status !== 429)) break;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }


    if (!response!.ok) {
      const status = response!.status;
      if (status === 429)
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      if (status === 402)
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Configurações > Workspace > Uso." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      const t = await response!.text();
      console.error("AI error:", status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar plano de aula." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response!.json();
    const raw = data.choices?.[0]?.message?.content || "";
    let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.search(/[\{\[]/);
    const end = cleaned.lastIndexOf(cleaned[start] === "[" ? "]" : "}");
    if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);

    let plan;
    try {
      plan = JSON.parse(cleaned);
    } catch {
      console.error("Raw content:", raw);
      return new Response(
        JSON.stringify({ error: "Erro ao processar resposta da IA.", raw: cleaned }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
