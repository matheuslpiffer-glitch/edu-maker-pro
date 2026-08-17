import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado. Faça login novamente." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { fileBase64, fileMime, aeeProfileLabels, aeeTopic, serie, aeeMode } = await req.json();
    if (!fileBase64 || !fileMime) {
      return new Response(JSON.stringify({ error: "Arquivo e tipo são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp", "text/plain"];
    if (!allowed.includes(String(fileMime).toLowerCase())) {
      return new Response(JSON.stringify({ error: `Formato não suportado (${fileMime}). Envie PDF, imagem (PNG/JPG/WEBP) ou TXT. Arquivos Word/Excel devem ser salvos como PDF antes do envio.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const creditCheck = await checkAndDecrementCredits(userId);
    if (!creditCheck.allowed) {
      return new Response(JSON.stringify({ error: creditCheck.error }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const perfil = (aeeProfileLabels && String(aeeProfileLabels).trim()) || "necessidades educacionais especiais";
    const prompt = `Você é uma especialista em Educação Especial (AEE) e no Desenho Universal para a Aprendizagem (DUA).

TAREFA: O arquivo em anexo é uma prova/material convencional. Primeiro LEIA e EXTRAIA fielmente todo o conteúdo (enunciados, questões, alternativas, textos de apoio). Depois TRADUZA esse conteúdo para FORMATO INCLUSIVO adaptado a alunos com ${perfil}${serie ? ", no nível de " + serie : ""}.

REGRAS (mantenha o conteúdo pedagógico, transforme a apresentação):
- Linguagem acessível: frases curtas, ordem direta, sem ambiguidade.
- Layout espaçado, blocos visuais, <strong>palavras-chave</strong> em negrito.
- Alternativas adaptadas ao perfil. Preserve o número e a intenção de cada questão original.
- Emojis e destaques visuais com moderação para apoiar a leitura.

FORMATAÇÃO MATEMÁTICA: NÃO use LaTeX nem "$". Use apenas Unicode (π, ², ³, √, ×, ÷, °, ½, ≤, ≥). Frações com barra (1/3). "R$" só para dinheiro.

Responda APENAS com JSON válido (sem markdown), no formato:
{"questions":[{"content":"<HTML adaptado>","options":[{"letter":"A","text":"...","isCorrect":false}],"skillCode":"AEE-ADAPT","descriptor":"${aeeTopic || "Material adaptado"}"}]}
Se não houver alternativas (texto/apostila), use "options": [].`;

    const callGemini = async () => fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [ { text: prompt }, { inline_data: { mime_type: fileMime, data: fileBase64 } } ] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
        }) });

    let response = await callGemini();
    let attempts = 0;
    while (!response.ok && [429, 500, 503].includes(response.status) && attempts < 2) {
      attempts++; await new Promise((r) => setTimeout(r, 900 * attempts)); response = await callGemini();
    }
    if (!response.ok) {
      const t = await response.text(); console.error("Gemini error:", response.status, t);
      const msg = response.status === 429 ? "Limite de requisições excedido. Tente em instantes."
        : response.status === 413 ? "Arquivo muito grande. Tente um PDF com menos páginas."
        : "Erro ao ler o arquivo com a IA.";
      return new Response(JSON.stringify({ error: msg }), {
        status: response.status === 429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("A IA não retornou conteúdo legível do arquivo.");
    cleaned = cleaned.substring(start, end + 1);
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch { cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, " "); parsed = JSON.parse(cleaned); }
    if (!parsed?.questions) parsed = { questions: [] };
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("adapt-vision error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});