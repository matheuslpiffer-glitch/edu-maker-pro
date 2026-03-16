import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthContext(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return { error: jsonResponse({ error: "Backend secrets are not configured." }, 500) };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await authClient.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  return {
    userId: data.claims.sub,
    serviceClient,
  };
}

function normalizeJob(row: any) {
  return {
    jobId: row.id,
    status: row.status === 'pending' ? 'queued' : row.status,
    progress: row.progress ?? 0,
    totalSteps: Number(row.prompt_payload?.totalSteps ?? 0),
    partialResult: Array.isArray(row.partial_result) ? row.partial_result : [],
    result: row.result ?? undefined,
    error: row.error_message ?? undefined,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await getAuthContext(req);
    if ("error" in auth) return auth.error;

    const { action, jobId, metadata, progress, status, partialResult, result, errorMessage } = await req.json();

    if (action === "create") {
      const { data, error } = await auth.serviceClient
        .from("generation_jobs")
        .insert({
          user_id: auth.userId,
          job_type: "simulator",
          status: "pending",
          progress: 0,
          prompt_payload: metadata ?? {},
          partial_result: [],
        })
        .select("*")
        .single();

      if (error || !data) {
        return jsonResponse({ error: error?.message || "Não foi possível criar o job de geração." }, 500);
      }

      return jsonResponse(normalizeJob(data));
    }

    if (!jobId) {
      return jsonResponse({ error: "jobId é obrigatório." }, 400);
    }

    if (action === "get") {
      const { data, error } = await auth.serviceClient
        .from("generation_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", auth.userId)
        .maybeSingle();

      if (error || !data) {
        return jsonResponse({ error: "Job não encontrado." }, 404);
      }

      return jsonResponse(normalizeJob(data));
    }

    if (action === "update") {
      const updates: Record<string, unknown> = {};

      if (typeof progress === "number") updates.progress = Math.max(0, Math.min(100, progress));
      if (typeof status === "string") updates.status = status === 'queued' ? 'pending' : status;
      if (Array.isArray(partialResult)) updates.partial_result = partialResult;
      if (result !== undefined) updates.result = result;
      if (typeof errorMessage === "string") updates.error_message = errorMessage;
      if (status === "processing") updates.started_at = new Date().toISOString();
      if (status === "completed" || status === "failed" || status === "cancelled") {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await auth.serviceClient
        .from("generation_jobs")
        .update(updates)
        .eq("id", jobId)
        .eq("user_id", auth.userId)
        .select("*")
        .single();

      if (error || !data) {
        return jsonResponse({ error: error?.message || "Não foi possível atualizar o job." }, 500);
      }

      return jsonResponse(normalizeJob(data));
    }

    return jsonResponse({ error: "Ação inválida." }, 400);
  } catch (error) {
    console.error("simulator-generation-job error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
