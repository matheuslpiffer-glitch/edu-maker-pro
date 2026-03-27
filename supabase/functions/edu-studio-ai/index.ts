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

    const { tool, params } = await req.json();
    if (!tool) return new Response(JSON.stringify({ error: "Ferramenta não especificada" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let prompt = "";

    if (tool === "simulados") {
      const { grade, subject, matrix, level, count } = params || {};
      const isAEE = level === "aee";
      const matrixDesc = matrix === "mackenzie"
        ? "diretrizes do Sistema Mackenzie para escolas da Rede Gustavo Franco (RGF)"
        : "descritores do SARESP (Sistema de Avaliação de Rendimento Escolar do Estado de São Paulo)";

      prompt = `Você é um especialista em avaliação educacional brasileira.

Gere ${count || 5} questões INÉDITAS de ${subject || "Matemática"} para o ${grade || "9º Ano"}, alinhadas com ${matrixDesc}.

${isAEE ? `VERSÃO ADAPTADA PARA EDUCAÇÃO ESPECIAL (AEE):
- Use vocabulário simples e acessível
- Reduza para 3 alternativas (A, B, C)
- Adicione um campo "suporte_visual" com uma descrição de imagem de apoio para cada questão
- Frases curtas e diretas
- Mantenha a habilidade avaliada original` : `VERSÃO REGULAR:
- 5 alternativas (A, B, C, D, E)
- Distratores plausíveis e bem construídos
- Vocabulário adequado ao nível da série`}

Para CADA questão inclua:
- "enunciado": texto do enunciado (sem LaTeX, use Unicode: ², ³, √, π, ÷, ×)
- "alternativas": array de objetos { "letra": "A", "texto": "...", "correta": true/false }
- "gabarito": letra da alternativa correta
- "justificativa": explicação detalhada de por que a resposta está correta e por que as outras estão erradas
- "habilidade": código e descrição da habilidade BNCC/SARESP avaliada
${isAEE ? '- "suporte_visual": descrição de imagem de apoio para o professor' : ''}

REGRAS:
- NUNCA use LaTeX ($), HTML (<sup>) ou Markdown
- Use APENAS Unicode: ², ³, √, π, ÷, ×, ≠, ≤, ≥, →
- Retorne JSON PURO (sem crases de markdown)

Formato:
{ "questoes": [ { "enunciado": "...", "alternativas": [...], "gabarito": "C", "justificativa": "...", "habilidade": "..." } ] }`;

    } else if (tool === "atividades") {
      const { theme, grade, duration } = params || {};

      prompt = `Você é um especialista em Educação Maker e metodologias ativas.

Crie um roteiro completo de atividade prática Maker sobre o tema "${theme || "Sustentabilidade"}" para alunos do ${grade || "6º Ano"}, com duração estimada de ${duration || "50"} minutos.

Esta atividade deve ser AUTOEXPLICATIVA, para que os alunos possam realizá-la de forma autônoma (na ausência do professor).

O roteiro deve conter:
1. "titulo": Um título criativo e engajador
2. "objetivo": Objetivo de aprendizagem claro (1-2 frases)
3. "materiais": Lista de materiais simples e acessíveis
4. "tempo_estimado": Duração em minutos
5. "passos": Array de objetos { "numero": 1, "titulo": "...", "instrucao": "...", "dica": "..." } com 5-8 passos detalhados
6. "pergunta_reflexiva": Uma pergunta filosófica/reflexiva final (estilo Frei José) que conecte a atividade ao aprendizado
7. "conexao_bncc": Habilidade BNCC relacionada
8. "nivel_dificuldade": "Fácil", "Médio" ou "Desafiador"

REGRAS:
- Linguagem acessível e motivadora
- Materiais que qualquer escola tem (papel, tesoura, cola, materiais recicláveis)
- Instruções claras passo a passo
- Retorne JSON PURO (sem crases de markdown)

Formato:
{ "titulo": "...", "objetivo": "...", "materiais": [...], "tempo_estimado": 50, "passos": [...], "pergunta_reflexiva": "...", "conexao_bncc": "...", "nivel_dificuldade": "..." }`;

    } else if (tool === "redacao") {
      const { tema, grade } = params || {};

      prompt = `Você é um especialista em produção textual e preparação para vestibulares/ENEM.

Dado o tema de redação: "${tema || "Inteligência Artificial na Educação"}", gere um DOSSIÊ DE LEITURA NORTEADOR completo para alunos do ${grade || "Ensino Médio"}.

O dossiê deve conter:

1. "tema": O tema formatado
2. "contextualizacao": Um parágrafo de contextualização do tema (máx 100 palavras)
3. "textos_apoio": Array com 2 textos de apoio curtos (máx 150 palavras cada), cada um com:
   - "titulo": título do texto
   - "fonte": fonte confiável (jornais, revistas, institutos de pesquisa)
   - "conteudo": o texto em si
4. "perguntas_debate": Array com 3 perguntas provocativas para debate em sala
5. "estrutura_sugerida": Objeto com:
   - "introducao": sugestão de abordagem para a introdução
   - "desenvolvimento_1": primeiro argumento sugerido
   - "desenvolvimento_2": segundo argumento sugerido
   - "conclusao": proposta de intervenção/fechamento
6. "palavras_chave": Array com 5-8 palavras-chave relevantes
7. "armadilhas": Array com 2-3 erros comuns a evitar neste tema

REGRAS:
- Textos de apoio devem ser informativos e com dados/estatísticas quando possível
- Perguntas devem provocar reflexão crítica
- A estrutura sugerida deve seguir o modelo dissertativo-argumentativo
- Retorne JSON PURO (sem crases de markdown)

Formato:
{ "tema": "...", "contextualizacao": "...", "textos_apoio": [...], "perguntas_debate": [...], "estrutura_sugerida": {...}, "palavras_chave": [...], "armadilhas": [...] }`;

    } else {
      return new Response(JSON.stringify({ error: "Ferramenta desconhecida: " + tool }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Aguarde alguns segundos e tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos em Configurações > Workspace > Uso." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
