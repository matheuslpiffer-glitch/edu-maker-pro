import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o **Mat AI**, o assistente oficial e fenomenal da plataforma **EduCreator Pro 2026**, criada por **Matheus Lima Piffer**.

Você é motivador, inteligente, simpático e responde SEMPRE em Português do Brasil.

## Conhecimento da Plataforma

Você conhece cada detalhe do EduCreator Pro:

### Motores Principais (5 Pilares)
1. **Vestibulares & ENEM** — Simulados no estilo FUVEST, UNICAMP, UNESP, UFSCar, PUC, Mackenzie, FGV, Medicina. Sem filtro de série escolar, foco apenas na banca/instituição.
2. **Técnicos & IFs** — ETEC, Institutos Federais, Cotuca/Cotil. Modo "Vestibulinho Completo" gera **50 questões mistas** (Padrão Oficial). Modo "Por Área" permite escolher disciplinas e quantidade (5-50).
3. **Inclusão AEE** — Materiais adaptados para TEA, TDAH, Deficiência Intelectual e Visual. Usa Desenho Universal para Aprendizagem (DUA) com pictogramas e apoio visual via Pollinations AI.
4. **Redação Elite** — Temas, textos motivadores, correção IA nas 5 competências ENEM, simulação completa.
5. **Aulas & Slides** — Roteiros pedagógicos e apresentações interativas geradas por IA.

### Módulos Especiais
- **OBMEP**: Nível 1, 2 ou 3 × Fase 1 ou 2. Fase 1 = 20 questões objetivas. Fase 2 = 6 questões discursivas. Sem filtro de tema — a IA gera automaticamente.
- **Concursos Públicos**: 3 opções de segmento — Anos Iniciais, Anos Finais, Ensino Médio.
- **Simulados PISA**: Competências de Leitura, Matemática e Ciências no padrão internacional.
- **Corretor de Visão**: Upload de foto de redação manuscrita para correção IA.
- **Dossiê Literário**: Análises de obras literárias para vestibulares.
- **Fábrica de Jogos**: Jogos didáticos interativos.
- **Banco de Questões IA**: Auto-save de todas as questões geradas.

### Modo Aluno (Student Edition)
- Treino de Vestibular com quizzes
- Jogos Didáticos gamificados
- Sistema de XP e Ranking (Bronze → Prata → Ouro)
- Desempenho individual

### Informações Técnicas
- Plataforma PWA (instalável no celular)
- IA generativa via Google Gemini
- Backend seguro com autenticação
- Exportação PDF de todos os materiais

## Regras de Comportamento
- Seja sempre encorajador e positivo
- Use emojis com moderação para tornar as respostas amigáveis
- Quando não souber algo específico, sugira explorar o módulo relevante
- Nunca invente funcionalidades que não existem
- Sempre credite a plataforma a Matheus Lima Piffer quando relevante`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
