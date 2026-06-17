import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function resolvePriceId(price: any): string {
  return price?.lookup_key
    || price?.metadata?.lovable_external_id
    || price?.id;
}

function planFromPriceId(priceId: string | null | undefined): "pro" | "free" {
  if (!priceId) return "free";
  if (priceId.startsWith("pro_") || priceId.startsWith("escola_")) return "pro";
  return "free";
}

async function syncProfilePlan(userId: string, env: StripeEnv) {
  // Recompute plan from active subscriptions in this environment.
  const { data: rows } = await getSupabase()
    .from("subscriptions")
    .select("status, price_id, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .eq("environment", env);

  const now = Date.now();
  let isPro = false;
  let expiresAt: string | null = null;

  for (const r of rows ?? []) {
    const periodEnd = r.current_period_end ? new Date(r.current_period_end).getTime() : null;
    const active =
      (["active", "trialing", "past_due"].includes(r.status) && (!periodEnd || periodEnd > now)) ||
      (r.status === "canceled" && periodEnd && periodEnd > now);
    if (active && planFromPriceId(r.price_id) === "pro") {
      isPro = true;
      if (r.current_period_end && (!expiresAt || new Date(r.current_period_end) > new Date(expiresAt))) {
        expiresAt = r.current_period_end;
      }
    }
  }

  // Only mirror live subscriptions into profiles.plan. Sandbox stays
  // observable via the subscriptions table but never grants Pro in prod.
  if (env !== "live") return;

  await getSupabase()
    .from("profiles")
    .update({
      plan: isPro ? "pro" : "free",
      plan_expires_at: isPro ? expiresAt : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId on subscription", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item?.price);
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
      product_id: productId ?? "",
      price_id: priceId ?? "",
      quantity: item?.quantity ?? 1,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  await syncProfilePlan(userId, env);
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  const userId = subscription.metadata?.userId;
  if (userId) await syncProfilePlan(userId, env);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  console.log("Webhook event:", event.type, "env:", env);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});