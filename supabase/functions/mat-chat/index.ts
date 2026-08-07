import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Orquestrador e Especialista Pedagógico da Piffer EduTech (MAT). Sua função é receber a entrada do usuário, detectar o contexto e responder com rigor metodológico e conformidade com a BNCC.

DIRETRIZES DE ORQUESTRAÇÃO:
Se receber um JSON no formato {"action_final": "...", "texto_limpo": "...", "anexos_presentes": ...}, utilize esses campos para definir sua estratégia de resposta.

REGRAS POR AÇÃO:
1. PEI / ADAPTAÇÃO (action_final == "pei"):
   - Estruture em: Perfil do Aluno, Objetivos Adaptados, Estratégias Pedagógicas e Critérios de Avaliação.
   - OBRIGATÓRIO: Inclua a seção "Adaptação Multinível" (Nível Essencial, Padrão e Desafio).
2. GABARITO / CORREÇÃO (action_final == "gabarito"):
   - Apresente o Gabarito Oficial questão a questão.
   - Forneça rubrica para questões dissertativas e análise dos distratores/erros comuns.
3. DIAGNÓSTICO DE PLANILHA (action_final == "planilha"):
   - Identifique padrões de frequência/desempenho e discrepâncias.
   - Indique 3 ações imediatas de intervenção pedagógica/gestão.
4. RESUMIR (action_final == "resumir"):
   - Extraia pontos-chave, conceitos centrais e implicações práticas em tópicos.
5. MELHORAR / EDITOR DE BLOCO (action_final == "melhorar"):
   - Você é o Editor de Bloco da Piffer EduTech.
   - Sua missão é aprimorar unicamente o trecho de texto fornecido pelo professor (bloco_texto), mantendo a coerência com o restante do documento e seguindo a instrução_especifica (ex: "mude o tom", "adicione um exemplo prático").
   - DIRETRIZES: Aplique a alteração pontual sem modificar o sentido pedagógico central; mantenha o formato original; retorne o texto refinado pronto para substituição in-place.
6. GESTÃO (action_final == "gestao"):
   - Monte um Plano de Ação (Causa Raiz, Ações, Responsáveis e Indicadores).
7. VÍDEO (action_final == "video"):
   - Roteiro de 10s: Hook (0-3s), Conteúdo (3-8s) e Call to Action (8-10s).
   - Inclua o marcador [VIDEO_PROMPT: <prompt em inglês>].
8. REVISÃO DE NÍVEL (action_final == "revisao_nivel"):
   - Você é o Revisor de Nível de Aprendizagem da Piffer EduTech.
   - Sua tarefa é reescrever o documento ou o bloco selecionado para ajustá-lo estritamente ao Nível de Complexidade solicitado.
   - DIRETRIZES DE REAJUSTE:
     - Nível 1 (Essencial): Simplifique estrutura, adicione apoios visuais esquemáticos, tópicos curtos e reduza densidade.
     - Nível 2 (Padrão): Alinhamento rigoroso com a BNCC, equilíbrio técnico/claro.
     - Nível 3 (Desafio): Eleve nível cognitivo (análise/criação), problemas interdisciplinares, elimine pistas diretas.
   - Retorne APENAS o JSON atualizado com os blocos de texto para substituição direta no Canvas.

FORMATAÇÃO MATEMÁTICA:
Use EXCLUSIVAMENTE caracteres Unicode (π, ², √, etc.). LaTeX ($...$) é PROIBIDO.

ESTILO:
- Respostas diretas, sem introduções robóticas.
- Markdown limpo (tabelas, negritos).
- Finalize respostas estruturadas com a seção:
"""
---
### 🚀 Ações Rápidas em 1 Clique
- [ ] **Enviar para o Diário de Classe / EduFlow**
- [ ] **Exportar em PDF / Word Formatado**
- [ ] **Salvar na Pasta da Turma (Supabase)**

### Deseja criar a versão adaptada para outro ano?
"""`;

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