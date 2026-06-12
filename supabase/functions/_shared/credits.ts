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

export function getUserIdFromAuth(authHeader: string | null): string | null {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace("Bearer ", "");
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}
