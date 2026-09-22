import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/credits.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req);
  if (auth.response) return auth.response;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Only super admins may create accounts.
  const { data: isSuper } = await admin.rpc("has_role", {
    _user_id: auth.userId,
    _role: "super_admin",
  });
  if (!isSuper) return json({ error: "Apenas super administradores podem criar acessos." }, 403);

  let body: {
    email?: string;
    password?: string;
    displayName?: string;
    role?: string;
    plan?: string;
    trialDays?: number;
    credits?: number;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const displayName = (body.displayName || "").trim();
  const role = ["user", "student", "admin"].includes(body.role || "") ? body.role! : "user";
  const plan = body.plan === "free" ? "free" : "pro";
  const trialDays = Math.min(Math.max(Number(body.trialDays) || 15, 1), 365);
  const credits = Math.min(Math.max(Number(body.credits) || 9999, 1), 100000);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-mail inválido." }, 400);
  if (password.length < 8) return json({ error: "A senha precisa ter ao menos 8 caracteres." }, 400);

  let userId: string | null = null;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: displayName ? { full_name: displayName } : undefined,
  });

  if (created.error) {
    const msg = created.error.message || "";
    if (/weak|pwned|known to be weak/i.test(msg)) {
      return json({ error: "Senha muito fraca ou presente em vazamentos. Escolha outra." }, 400);
    }
    if (/already|registered|exists/i.test(msg)) {
      return json({ error: "Já existe uma conta com este e-mail." }, 409);
    }
    console.error("createUser error:", msg);
    return json({ error: "Não foi possível criar a conta." }, 400);
  }

  userId = created.data.user!.id;

  const expiresAt =
    plan === "pro" ? new Date(Date.now() + trialDays * 86400_000).toISOString() : null;

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        display_name: displayName || email.split("@")[0],
        plan,
        credits,
        plan_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  if (profileError) console.error("profile upsert error:", profileError.message);

  const { error: roleError } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  if (roleError) console.error("role upsert error:", roleError.message);

  return json({ ok: true, userId, email, plan, role, expiresAt });
});
