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
3. Jamais utilize termos técnicos de programação ou infraestrutura de software na resposta visível ao usuário (EXCLUA palavras como: Supabase, Postgres, Backend, API, JSON, Schema, Query). NUNCA retorne blocos JSON crus ou metadados técnicos no corpo do Markdown.
4. SAÍDA DE VÍDEO: Se a ação for "video", retorne um ROTEIRO DE ATÉ 60 SEGUNDOS (1 minuto) focado em mídia visual, dividido em cenas curtas com narração em português. Estruture sempre nos 4 blocos de tempo padrão (ajustando proporcionalmente se a duração pedida for menor que 60s):
   • 0-10s: Gancho / Introdução Impactante
   • 10-35s: Explicando o Conceito com Exemplos Visuais
   • 35-50s: Aplicação Prática / Exercício Rápido
   • 50-60s: Resumo Final e Chamada para Ação (CTA)
   Para cada bloco, descreva em 1-2 lines a cena visual e a narração falada. Inclua obrigatoriamente a tag <video src="VIDEO_MEDIA" /> no Markdown para que a interface renderize o player.

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
9. INFOGRÁFICO / FOLDER (database == "infografico") - Ao detectar que o usuário deseja um infográfico, folder ilustrativo ou guia visual passo a passo, retorne um resumo em Markdown seguido obrigatoriamente pela tag <infografico subject="ASSUNTO" />. O sistema renderizará o componente visual automaticamente.

SISTEMA DE CONHECIMENTO DE EDUCAÇÃO PROFISSIONAL E TECNOLÓGICA (EPT):
Especialização em Mecânica, Eletromecânica, Dev, TI, Logística e cursos do futuro. Toda questão deve ter contexto prático real.

FORMATAÇÃO MATEMÁTICA:
Use EXCLUSIVAMENTE caracteres Unicode (π, ², √, etc.). LaTeX ($...$) é PROIBIDO.

DIRETRIZ DE GERAÇÃO: LISTA DE EXERCÍCIOS E AVALIAÇÕES FORMATADAS (PADRÃO MAT)
Quando o usuário solicitar uma lista de exercícios, prova ou simulado, utilize os modelos fornecidos (anexos) para construir as questões, garantindo rigor metodológico e conformidade com a BNCC.

Gere o documento rigorosamente na seguinte estrutura e ordem:

1. CABEÇALHO INSTITUCIONAL:
   - Nome do Aluno: _____________ | Turma/Ano: _______ | Data: __/__/2026 | Nota: ______
   - Título destacado em CAIXA ALTA (Ex: LISTA DE EXERCÍCIOS - FRAÇÕES)

2. ESTRUTURAÇÃO POR PARTES TEMÁTICAS (Divida em 3 a 4 blocos progressivos):
   - Cada parte deve focar em um subtópico específico.
   - Mescle questões de Múltipla Escolha (com alternativas a, b, c, d) e questões Dissertativas (com espaço para cálculo/justificativa).

3. PROBLEMAS CONTEXTUALIZADOS:
   - Inclua pelo menos 2 a 3 questões com problemas do cotidiano.

4. GABARITO COMENTADO E CHAVE DE RESPOSTAS (SEÇÃO FINAL OBRIGATÓRIA):
   - Crie uma seção intitulada: "GABARITO E CHAVE DE RESPOSTAS (Para o Professor / Autoavaliação)"
   - Apresente o gabarito obrigatoriamente no formato de TABELA MARKDOWN com 3 colunas:
     | Nº | Resposta / Solução | Explicação Sintética / Passo a Passo |`;

async function learnFromTurn(o: {
  supabase: any; userId: string; apiKey: string; userText: string; prevAnswer: string;
  existing: string[]; saveDocument: { name: string; text?: string; isPdf?: boolean } | null; pdfDataUrl?: string;
}) {
  const wantsDoc = !!o.saveDocument;
  if (!o.userText.trim() && !wantsDoc) return;
  const instructions = `Você analisa a mensagem de um professor para um assistente pedagógico e extrai APENAS fatos duradouros e úteis no futuro.
Categorias:
- "estilo": séries, disciplinas, metodologia, formato e tom preferidos.
- "turma": informações sobre turmas e alunos (dificuldades, resultados, perfil). Nunca guarde nomes de alunos; use "[Aluno A]".
- "correcao": quando o professor corrige ou ajusta a resposta anterior do assistente, registre a regra a seguir na próxima vez.
Não repita fatos já conhecidos: ${JSON.stringify(o.existing.slice(0, 40))}
Se não houver nada novo, devolva lista vazia. Cada fato com no máximo 160 caracteres, em português.
${wantsDoc ? 'Também gere "document_text": um resumo fiel e detalhado do documento anexado (até 6000 caracteres), preservando conteúdos, conceitos e exemplos para uso futuro.' : ''}
Responda só JSON: {"facts":[{"category":"estilo|turma|correcao","fact":"..."}]${wantsDoc ? ',"document_text":"..."' : ''}}`;
  const content: any[] = [{ type: 'text', text: `RESPOSTA ANTERIOR DO ASSISTENTE:\n${o.prevAnswer.slice(0, 2000)}\n\nMENSAGEM DO PROFESSOR:\n${o.userText.slice(0, 8000)}` }];
  if (o.pdfDataUrl) content.push({ type: 'image_url', image_url: { url: o.pdfDataUrl } });
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: 'POST',
    headers: { Authorization: `Bearer ${o.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-lite-preview',
      messages: [{ role: 'system', content: instructions }, { role: 'user', content }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) { console.error('learn ai', r.status, await r.text()); return; }
  const j = await r.json();
  let parsed: any = {};
  try { parsed = JSON.parse(String(j?.choices?.[0]?.message?.content ?? '{}').replace(/```json|```/g, '')); } catch { return; }
  const allowed = new Set(['estilo', 'turma', 'correcao']);
  const known = new Set(o.existing.map(s => s.toLowerCase().trim()));
  const facts = (Array.isArray(parsed.facts) ? parsed.facts : [])
    .filter((f: any) => f && allowed.has(f.category) && typeof f.fact === 'string' && f.fact.trim() && !known.has(f.fact.toLowerCase().trim()))
    .slice(0, 5)
    .map((f: any) => ({ user_id: o.userId, category: f.category, memory_fact: f.fact.trim().slice(0, 300) }));
  if (facts.length) await o.supabase.from('user_pedagogical_memory').insert(facts);
  if (o.saveDocument) {
    const text = o.saveDocument.text?.trim() || (typeof parsed.document_text === 'string' ? parsed.document_text : '');
    if (text) await o.supabase.from('mat_documents').insert({ user_id: o.userId, name: o.saveDocument.name.slice(0, 200), content: text.slice(0, 60000) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, image, documentIds, saveDocument } = await req.json();
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Memória do professor (estilo, turmas, correções)
    const { data: memoryData } = await supabase
      .from('user_pedagogical_memory')
      .select('category, memory_fact')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60);
    const labels: Record<string, string> = { estilo: 'JEITO DE ENSINAR', turma: 'TURMAS', correcao: 'CORREÇÕES QUE O PROFESSOR JÁ FEZ (NÃO REPITA ESSES ERROS)' };
    let pedagogicalContext = "";
    if (memoryData && memoryData.length) {
      const groups: Record<string, string[]> = {};
      for (const m of memoryData) (groups[m.category] ??= []).push(`- ${m.memory_fact}`);
      pedagogicalContext = "\n\nCONTEXTO DO EDUCADOR (MEMÓRIA APRENDIDA):\n" +
        Object.entries(groups).map(([k, v]) => `${labels[k] ?? k.toUpperCase()}:\n${v.join('\n')}`).join('\n') +
        "\nUse este contexto para personalizar as respostas sem citá-lo explicitamente.";
    }

    // Documentos guardados escolhidos pelo professor
    const ids = Array.isArray(documentIds) ? documentIds.filter((x: unknown) => typeof x === 'string').slice(0, 5) : [];
    if (ids.length) {
      const { data: docs } = await supabase.from('mat_documents').select('name, content').eq('user_id', userId).in('id', ids);
      if (docs?.length) {
        pedagogicalContext += "\n\nDOCUMENTOS DE BASE DO PROFESSOR:\n" + docs.map(d => `### ${d.name}\n"""\n${String(d.content).slice(0, 30000)}\n"""`).join('\n');
      }
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
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

    // Aprendizado em segundo plano (não atrasa a resposta)
    const lastUser = [...messages].reverse().find((m: any) => m?.role === 'user');
    const prevAssistant = [...messages].reverse().find((m: any) => m?.role === 'assistant');
    const learnTask = learnFromTurn({
      supabase, userId, apiKey: GEMINI_API_KEY,
      userText: typeof lastUser?.content === 'string' ? lastUser.content : '',
      prevAnswer: typeof prevAssistant?.content === 'string' ? prevAssistant.content : '',
      existing: (memoryData ?? []).map(m => m.memory_fact),
      saveDocument: saveDocument && typeof saveDocument.name === 'string' ? saveDocument : null,
      pdfDataUrl: saveDocument?.isPdf ? image : undefined,
    }).catch(e => console.error('learn error', e));
    // @ts-ignore EdgeRuntime existe no ambiente
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(learnTask);

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
