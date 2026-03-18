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

    const { subject, topic, grade, purpose, questionType, difficulty, count } = await req.json();

    if (!subject || !topic || !grade || !count) {
      return new Response(JSON.stringify({ error: "Disciplina, tema, série e quantidade são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const purposeLabels: Record<string, string> = {
      regular: "Aula Regular",
      absence: "Atividade para Aluno Ausente (revisão do conteúdo perdido)",
      reinforcement: "Reforço Escolar (foco em consolidação de habilidades)",
    };

    const diffLabels: Record<string, string> = {
      easy: "fácil (nível Básico, linguagem acessível)",
      medium: "média (nível Adequado, equilíbrio entre acessibilidade e rigor)",
      hard: "difícil (nível Avançado, exigindo análise crítica)",
    };

    const purposeLabel = purposeLabels[purpose] || purposeLabels.regular;
    const diffLabel = diffLabels[difficulty] || diffLabels.medium;
    const isEssay = questionType === "essay";

    const systemPrompt = `Você é um especialista em criação de atividades pedagógicas do Estado de São Paulo. Gere exercícios alinhados ao Escopo e Sequência da SEDUC-SP e ao Currículo Paulista. A linguagem deve ser adequada à série indicada.

IMPORTANTE: Para cada questão, inclua um campo "justification" com a explicação pedagógica de por que a resposta correta é aquela, e por que cada distrator está errado (no caso de múltipla escolha). Esta justificativa é destinada ao professor.

Responda APENAS com JSON válido, sem markdown.`;

    let formatInstruction: string;
    if (isEssay) {
      formatInstruction = `Cada questão deve ser dissertativa com espaço para resposta aberta.
JSON format per question:
{"content": "<p>Enunciado em HTML</p>", "answer": "Resposta esperada detalhada", "justification": "Explicação pedagógica para o professor sobre os critérios de correção e a resposta esperada"}`;
    } else {
      formatInstruction = `Cada questão deve ter 4 alternativas (A-D), com apenas 1 correta. Os distratores devem refletir erros comuns de aprendizagem dos alunos.
JSON format per question:
{"content": "<p>Enunciado em HTML</p>", "options": [{"letter": "A", "text": "...", "isCorrect": false}, {"letter": "B", "text": "...", "isCorrect": true}, {"letter": "C", "text": "...", "isCorrect": false}, {"letter": "D", "text": "...", "isCorrect": false}], "justification": "Explicação de por que a alternativa correta é a certa e por que cada distrator está errado, citando os erros conceituais comuns que cada alternativa incorreta representa"}`;
    }

    const userPrompt = `Gere ${count} questão(ões) de dificuldade ${diffLabel} para:

Disciplina: ${subject}
Tema da Aula: ${topic}
Série: ${grade}
Finalidade: ${purposeLabel}

${formatInstruction}

Responda em JSON:
{"questions": [...]}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar atividades" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse:", content);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-exercise-list error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
