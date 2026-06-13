import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "./cors.ts";

export async function checkAndDecrementCredits(userId: string): Promise<{ allowed: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Use the RPC function we created in the migration
  const { data: allowed, error } = await supabase.rpc("decrement_user_credits", {
    user_id: userId,
  });

  if (error) {
    console.error("Error decrementing credits:", error);
    return { allowed: false, error: "Erro ao verificar créditos." };
  }

  if (!allowed) {
    return {
      allowed: false,
      error: "Seus créditos do plano grátis acabaram — assine o Pro para continuar usando.",
    };
  }

  return { allowed: true };
}

/**
 * Verifies the Authorization Bearer JWT against Supabase auth and returns the user id.
 * Returns null when the header is missing, malformed, or the signature/claims are invalid.
 * This MUST be used (with await) before any paid AI call so unauthenticated requests
 * cannot drain the workspace credits.
 */
export async function getUserIdFromAuth(authHeader: string | null | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token || token.split(".").length !== 3) return null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY for auth verification");
      return null;
    }
    const supabase = createClient(supabaseUrl, anonKey);
    // getClaims verifies signature + expiry against the project's signing keys.
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return data.claims.sub as string;
  } catch (e) {
    console.error("Auth verification error:", e);
    return null;
  }
}

/**
 * Helper that returns either { userId } for authenticated requests or
 * { response } with a ready-to-return 401 for unauthenticated ones.
 */
export async function requireUser(req: Request): Promise<{ userId: string; response?: undefined } | { userId?: undefined; response: Response }> {
  const userId = await getUserIdFromAuth(req.headers.get("Authorization"));
  if (!userId) {
    return {
      response: new Response(
        JSON.stringify({ error: "Não autorizado. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }
  return { userId };
}