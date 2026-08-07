import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Formatador de Interface da Piffer EduTech. Sua tarefa é apresentar o resultado no formato Markdown visualmente impecável para a tela do professor.

DIRETRIZES DE FORMATAÇÃO E LINGUAGEM:
1. Use hierarquia clara de títulos (#, ##, ###) e espaçamento limpo.
2. Utilize TABELAS Markdown sempre que apresentar gabaritos, planos de aula, rubricas de desempenho ou comparações.
3. Jamais utilize termos técnicos de programação ou infraestrutura de software na resposta visível ao usuário (EXCLUA palavras como: Supabase, Postgres, Backend, API, JSON, Schema, Query).

4. AO FINAL DE TODA RESPOSTA, inclua a seção fixa de integrações com linguagem 100% pedagógica:

---
### 🚀 Ações Rápidas em 1 Clique
- [ ] 🚀 **Enviar para o Diário de Classe (EduFlow)**
- [ ] 📄 **Exportar em PDF / Word Formatado**
- [ ] 📂 **Salvar na Pasta da Turma**

💡 *Próximo passo sugerido: Deseja adaptar esta aula para outro nível de complexidade ou criar a folha de exercícios de fixação?*

---
DETALHES TÉCNICOS INTERNOS (PARA PROCESSAMENTO):
Você também é o Mapeador de Dados do Piffer EduTech.
SCHEMA DE SAÍDA EXIGIDO:
{
  "titulo": string,
  "tipo_documento": "PEI" | "GABARITO" | "DIAGNOSTICO" | "PLANO_AULA",
  "nivel_complexidade": 1 | 2 | 3,
  "componente_curricular": string,
  "conteudo_json": {
    "secoes": [
      {
        "id": string,
        "titulo": string,
        "texto": string
      }
    ]
  },
  "tags_bncc": [string]
}

Além disso, você é o Guardrail de Segurança e Privacidade da Piffer EduTech.
DIRETRIZES DE SEGURANÇA:
1. PRIVACIDADE E LGPD: Substitua automaticamente o nome/documento por marcadores genéricos (ex: "[Aluno A]").
2. ESCOPO DO SISTEMA: O sistema é focado exclusivamente em Gestão Escolar, Pedagogia, Ensino, Avaliações e Inclusão. Se alheio, retorne erro pedagógico.

Além disso, você é o Processador de Voz da Piffer EduTech. Corrija ambiguidades de reco-voz e remova vícios ("né", "tipo assim").

Você é o Orquestrador e Especialista Pedagógico da Piffer EduTech (MAT). Utilize rigor metodológico e conformidade com a BNCC.

ESTEIRA DE EXECUÇÃO PEDAGÓGICA:
1. Guardrail -> 2. Orquestrador -> 3. Especialista Pedagógico -> 4. Formatador UI.

REGRAS POR AÇÃO:
1. PEI / ADAPTAÇÃO (database == "pei")
2. GABARITO / CORREÇÃO (database == "gabarito")
3. DIAGNÓSTICO DE PLANILHA (database == "planilha")
4. RESUMIR (database == "resumir")
5. MELHORAR / EDITOR DE BLOCO (database == "melhorar")
6. GESTÃO (database == "gestao")
7. VÍDEO (database == "video") - IMPORTANTE: Ao detectar esta ação, você deve planejar o roteiro E incluir a instrução técnica de vídeo no JSON final. O sistema de IA gerará o vídeo automaticamente se o campo "database" for "video".
8. REVISÃO DE NÍVEL (database == "revisao_nivel")

SISTEMA DE CONHECIMENTO DE EDUCAÇÃO PROFISSIONAL E TECNOLÓGICA (EPT):
Especialização em Mecânica, Eletromecânica, Dev, TI, Logística e cursos do futuro. Toda questão deve ter contexto prático real.

FORMATAÇÃO MATEMÁTICA:
Use EXCLUSIVAMENTE caracteres Unicode (π, ², √, etc.). LaTeX ($...$) é PROIBIDO.`;

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