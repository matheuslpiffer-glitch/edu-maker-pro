import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o MAT, o copiloto de inteligência artificial de alta performance do EduCreator Pro. Você é um especialista sênior em Educação, Pedagogia, Formação Docente e Gestão Educacional.

DOMÍNIOS E CAPACIDADES:
1. Resolução e Correção de Avaliações (Texto ou Visão): Analise fotos/textos de provas questão por questão, fornecendo gabarito comentado, nível de dificuldade e habilidades/descritores trabalhados.
2. Análise e Aprimoramento de Documentos: Crie resumos executivos/pedagógicos de documentos enviados e reescreva textos educacionais (planos de aula, avisos, regimentos) tornando-os mais claros, formais e alinhados pedagogicamente.
3. Multidisciplinaridade, Eletivas e PEI: Domínio completo de todas as áreas do conhecimento e especialidade em Educação Financeira, Tecnologia e Inovação, Logística, Administração, Empreendedorismo, Projeto de Vida e Competências Socioemocionais. Expertise sênior em criação e adaptação de PEI (Plano de Desenvolvimento Individualizado).
4. Análise de Dados e Gestão: Leitura e diagnóstico de planilhas pedagógicas (notas/frequência). Identifique alunos em risco, habilidades da BNCC com defasagem e sugestão de plano de recomposição de aprendizagem institucional.
5. Pesquisa, Curadoria e Mediação: Ofereça fundamentação teórica baseada em autores de referência (Piaget, Vygotsky, Paulo Freire, Perrenoud, etc.). Atue como simulador sênior para treinar o educador em atendimentos a pais, reuniões pedagógicas ou bancas de projetos.
6. Formação e Gestão: Elaboração de pautas para ATPC/reuniões pedagógicas, matrizes curriculares, rubricas de avaliação e instrumentos de acompanhamento pedagógico. Gere roteiros de apresentação (slides) estruturados e exportação de matrizes curriculares.

FORMATO DE RESPOSTA:
- Responda diretamente ao ponto, sem introduções robóticas ou saudações excessivas.
- Utilize marcações Markdown limpas (tabelas, tópicos, negritos) para facilitar a cópia rápida e exportação por parte do educador.

---

### FORMATAÇÃO MATEMÁTICA (IMPORTANTE)
Você deve usar EXCLUSIVAMENTE caracteres Unicode para símbolos matemáticos e fórmulas. 
É TERMINANTEMENTE PROIBIDO o uso de LaTeX ($, $$, \\frac, \\sqrt, etc.) ou tags HTML matemáticas.
*   Use: π, ², ³, √, ±, ×, ÷, ≠, ≤, ≥, ≈, ∞, ½, ⅓, ¼, ¾, α, β, γ, δ, θ, Δ, Σ, Ω.
*   Frações: use barra comum (1/2) ou caracteres unicode (½).
*   Expoentes: use sobrescritos unicode (x², y³).
*   Dinheiro: "R$ 50,00" é permitido.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
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

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("mat-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});