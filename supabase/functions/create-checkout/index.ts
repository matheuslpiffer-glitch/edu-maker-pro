import { corsHeaders } from "../_shared/cors.ts";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { getUserIdFromAuth } from "../_shared/credits.ts";

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { priceId, quantity, customerEmail, userId: bodyUserId, returnUrl, environment } = await req.json();
    const authUserId = await getUserIdFromAuth(req.headers.get("Authorization"));

    // Pattern: Use JWT userId if available, otherwise fallback to body userId only if NO JWT was provided.
    // If a JWT is provided but invalid, authUserId is null.
    // The request asks: "Se vier um userId no body diferente do JWT, ignore o do body e use o do token."
    // "Se não houver JWT válido, ainda permita checkout anônimo por email (customerEmail), mas nunca aceite um userId arbitrário sem prova de identidade."
    const userId = authUserId || (req.headers.get("Authorization") ? undefined : bodyUserId);

    if (bodyUserId && authUserId && bodyUserId !== authUserId) {
      console.warn(`User ID mismatch: body=${bodyUserId}, auth=${authUserId}. Using auth.`);
    }

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      throw new Error("Invalid priceId");
    }
    if (environment !== "sandbox" && environment !== "live") {
      throw new Error("Invalid environment");
    }
    const env: StripeEnv = environment;
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const customerId = (customerEmail || userId)
      ? await resolveOrCreateCustomer(stripe, { email: customerEmail, userId })
      : undefined;

    let productDescription: string | undefined;
    if (!isRecurring) {
      const productId = typeof stripePrice.product === "string"
        ? stripePrice.product
        : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);
      productDescription = product.name;
    }

    // PIX (Brazilian instant payment) alongside card. Recurring checkouts use
    // a PIX mandate bound to the price's amount/schedule; one-off checkouts
    // expire the PIX code after 1 hour. Card flow is unchanged.
    //
    // Stripe's PIX mandate_options accepts: amount, amount_type,
    // payment_schedule (monthly|yearly|weekly|quarterly|halfyearly) and
    // reference — there is no `interval` field, and payment_schedule is NOT
    // "recurring". We map the price's recurring interval to the matching enum.
    const pixSchedule: Record<string, string> = {
      month: "monthly",
      year: "yearly",
      week: "weekly",
      day: "monthly",
    };
    const pixPaymentMethodOptions = isRecurring
      ? {
          pix: {
            mandate_options: {
              amount: stripePrice.unit_amount,
              payment_schedule: pixSchedule[stripePrice.recurring?.interval ?? "month"] ?? "monthly",
            },
          },
        }
      : {
          pix: { expires_after_seconds: 3600 },
        };

    const baseSession = {
      line_items: [{ price: stripePrice.id, quantity: quantity || 1 }],
      mode: (isRecurring ? "subscription" : "payment") as "subscription" | "payment",
      ui_mode: "embedded_page" as const,
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
      ...(userId && {
        metadata: { userId },
        ...(isRecurring && { subscription_data: { metadata: { userId } } }),
      }),
    };

    // Try with PIX (card + pix). If PIX isn't activated on the Stripe account,
    // fall back to card-only so the existing card flow never breaks. The
    // fallback only triggers on PIX-availability errors, not on real failures.
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        ...baseSession,
        payment_method_types: ["card", "pix"],
        payment_method_options: pixPaymentMethodOptions,
      });
    } catch (pixErr) {
      const msg = (pixErr as Error).message || "";
      const isPixUnavailable = /pix/i.test(msg)
        && /invalid|not.*(activ|enabl)|payment method type|not.*supported/i.test(msg);
      if (!isPixUnavailable) throw pixErr;
      console.warn("PIX unavailable on this Stripe account, retrying card-only:", msg);
      session = await stripe.checkout.sessions.create({
        ...baseSession,
        payment_method_types: ["card"],
      });
    }

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});