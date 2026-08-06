import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserIdFromAuth, checkAndDecrementCredits } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST is allowed for generation
  if (req.method !== "POST") {
    return json({ error: "Método não permitido. Use POST." }, 405);
  }

  try {
    const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
    if (!userId) return json({ error: "Não autorizado. Faça login novamente." }, 401);

    let payload: { prompt?: string; image?: string; duration?: number };
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Corpo da requisição inválido." }, 400);
    }

    const prompt = (payload.prompt || "").trim();
    if (!prompt) return json({ error: "Prompt é obrigatório." }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Serviço de vídeo não configurado." }, 500);

    const creditCheck = await checkAndDecrementCredits(userId);
    if (!creditCheck.allowed) return json({ error: creditCheck.error }, 402);

    const authHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    // A API aceita apenas 4, 6 ou 8 segundos
    const requested = Number(payload.duration) || 8;
    const seconds = requested <= 4 ? "4" : requested <= 6 ? "6" : "8";

    const videoPayload: any = {
      model: "google/veo-3.1-lite",
      prompt: `${prompt} | no text, no letters, no English typography, clean background`,
      seconds,
      size: "1280x720",
    };

    if (payload.image) {
      videoPayload.input_reference = payload.image;
    }

    const createRes = await fetch("https://ai.gateway.lovable.dev/v1/videos", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(videoPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Video create failed:", createRes.status, errText);
      if (createRes.status === 402) return json({ error: "Créditos insuficientes para gerar vídeo." }, 402);
      if (createRes.status === 429) return json({ error: "Muitas gerações em andamento. Tente em instantes." }, 429);
      return json({ error: "Não foi possível iniciar a geração do vídeo." }, 500);
    }

    const job = await createRes.json();
    const jobId = job.id as string;

    // Poll until completed (up to ~4 minutes)
    let status = job.status as string;
    for (let i = 0; i < 48 && (status === "in_progress" || status === "queued"); i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollRes = await fetch(`https://ai.gateway.lovable.dev/v1/videos/${jobId}`, {
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      });
      if (!pollRes.ok) continue;
      const polled = await pollRes.json();
      status = polled.status;
      if (status === "failed") {
        console.error("Video job failed:", polled.error);
        return json({ error: polled?.error?.message || "A geração do vídeo falhou." }, 500);
      }
    }

    if (status !== "completed") {
      return json({ error: "Tempo limite de geração de vídeo excedido. Tente novamente." }, 504);
    }

    const contentRes = await fetch(`https://ai.gateway.lovable.dev/v1/videos/${jobId}/content`, {
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
    });
    if (!contentRes.ok) {
      console.error("Video download failed:", contentRes.status);
      return json({ error: "Não foi possível baixar o vídeo gerado." }, 500);
    }

    const bytes = new Uint8Array(await contentRes.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const dataUrl = `data:video/mp4;base64,${btoa(binary)}`;

    return json({ url: dataUrl });
  } catch (e) {
    console.error("generate-video error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
