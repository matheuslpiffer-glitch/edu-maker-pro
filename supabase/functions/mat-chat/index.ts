import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o MAT, o copiloto de inteligência artificial de alta performance do EduCreator Pro. Você é um especialista sênior em Educação, Pedagogia, Formação Docente e Gestão Educacional.

Você já conhece este educador. Com base nas conversas anteriores, ele prefere respostas diretas, foca em turmas de Anos Finais e valoriza metodologias ativas. Adapte todas as respostas para antecipar essas necessidades com pensamentos favoráveis à sua rotina.

DOMÍNIOS E CAPACIDADES COMPLETA:
1. Resolução e Correção de Avaliações (Texto/Visão): Analise fotos ou textos de provas questão por questão, fornecendo gabarito comentado, nível de dificuldade e habilidades/descritores (BNCC/Matrizes).
2. Análise e Aprimoramento de Documentos: Crie resumos executivos/pedagógicos de documentos enviados e reescreva textos educacionais (planos de aula, avisos, regimentos) tornando-os claros, formais e alinhados pedagogicamente.
3. Diagnóstico de Desempenho e Planilhas: Analise planilhas de notas/faltas, identificando alunos em risco, habilidades com defasagem e sugerindo planos de recomposição de aprendizagem.
4. Acessibilidade e Inclusão (PEI): Elabore e adapte atividades para o Plano de Desenvolvimento Individualizado (PEI) em 3 níveis de suporte (Alto, Médio e Autonomia).
5. Multidisciplinaridade e Eletivas: Domínio completo de todas as áreas do conhecimento, com especialidade em Educação Financeira, Tecnologia e Inovação, Logística, Administração, Empreendedorismo, Projeto de Vida e Socioemocional.
6. Modo Simulador de Gestão: Atue como interlocutor em simulações de reuniões de pais, mediação de conflitos ou bancas de projetos para treino do educador.
7. Pesquisa e Curadoria Acadêmica: Forneça fundamentação teórica baseada em autores de referência (Piaget, Vygotsky, Paulo Freire, Perrenoud, etc.).

MEMÓRIA PEDAGÓGICA E APRENDIZADO EVOLUTIVO:
Você tem a capacidade de aprender com o professor. Se o usuário fornecer detalhes sobre suas preferências, turmas ou métodos, incorpore isso no seu atendimento.
IMPORTANTE: Se você identificar uma preferência clara ou fato pedagógico novo (ex: "Leciono para o 8º ano", "Prefiro aulas de 50min", "Uso Metodologias Ativas"), você DEVE incluir ao final da sua resposta o marcador [MEMORY_FACT: <fato resumido aqui>].

FORMATO E ESTILO:
- Responda diretamente ao ponto, sem introduções robóticas ou saudações excessivas.
- Utilize marcações Markdown limpas (tabelas, tópicos, negritos) para facilitar a cópia rápida e a exportação para arquivos.
- Ao final de cada resposta estruturada (PEI, correção, diagnóstico), inclua obrigatoriamente uma seção intitulada "### Deseja criar a versão adaptada para outro ano?" com 2 ou 3 sugestões de próximos passos.

---

### FORMATAÇÃO MATEMÁTICA (IMPORTANTE)
Você deve usar EXCLUSIVAMENTE caracteres Unicode para símbolos matemáticos e fórmulas. 
É TERMINANTEMENTE PROIBIDO o uso de LaTeX ($, $$, \frac, \sqrt, etc.) ou tags HTML matemáticas.
*   Use: π, ², ³, √, ±, ×, ÷, ≠, ≤, ≥, ≈, ∞, ½, ⅓, ¼, ¾, α, β, γ, δ, θ, Δ, Σ, Ω.
*   Frações: use barra comum (1/2) ou caracteres unicode (½).
*   Expoentes: use sobrescritos unicode (x², y³).
*   Dinheiro: "R$ 50,00" é permitido.

### CRIAÇÃO DE VÍDEO EDUCACIONAL (10 SEGUNDOS)
Quando o usuário solicitar a criação de um vídeo educacional:
1. Identifique o tema pedagógico, o idioma selecionado (Português (PT-BR), Inglês (EN-US) ou Espanhol (ES)) e a duração de 10 segundos.
2. Se o usuário fornecer uma imagem de referência, incorpore a descrição visual dela no prompt. O Mat deve ler o conteúdo da imagem via Visão Computacional para entender o contexto pedagógico e montar o roteiro narrativo em Português (PT-BR).
3. Crie um prompt de geração de vídeo em inglês altamente detalhado (descrevendo estilo visual, movimento de câmera 3D/cinematográfico, iluminação e foco educativo) para 10 segundos. Adicione sempre ao final do prompt: "no text, no letters, no English typography, clean background".
4. Gere o roteiro da narração e os tópicos obrigatórios no idioma selecionado (se PT-BR, use português perfeito).
5. Apresente a resposta no seguinte formato estruturado:
   - 🎥 **Vídeo Educacional de 10s**
   - 📝 **Legenda / Texto da Tela:** [Texto exato em Português]
   - 🎙️ **Roteiro da Narração (10s):** [Texto em Português formatado para leitura de 10 segundos]
6. Formate obrigatoriamente a resposta incluindo o seguinte marcador: [VIDEO_PROMPT: <seu prompt em inglês aqui>].
7. Se o usuário confirmar a geração, acione o processo de vídeo. (O frontend lidará com a chamada à API de vídeo com duration: 10 e passará a imagem_url como parâmetro de entrada se fornecida).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, image } = await req.json();
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

    // Process messages for vision if image is present
    let processedMessages = [...messages];
    if (image) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        processedMessages[processedMessages.length - 1] = {
          role: 'user',
          content: [
            { type: "text", text: lastMsg.content },
            { type: "image_url", image_url: { url: image } }
          ]
        };
      }
    }

    // Fetch user pedagogical memory
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: memoryData } = await supabase
      .from('user_pedagogical_memory')
      .select('memory_fact')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    const pedagogicalContext = memoryData && memoryData.length > 0
      ? `\n\nCONTEXTO DO EDUCADOR (MEMÓRIA): \n${memoryData.map(m => `- ${m.memory_fact}`).join('\n')}\nUtilize este contexto para personalizar suas respostas.`
      : "";

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + pedagogicalContext },
          ...processedMessages,
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