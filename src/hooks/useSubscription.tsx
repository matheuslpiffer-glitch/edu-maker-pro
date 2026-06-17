import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

export interface SubscriptionRow {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  product_id: string;
  price_id: string;
  quantity: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

function computeIsActive(row: SubscriptionRow | null): boolean {
  if (!row) return false;
  const now = Date.now();
  const end = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
  if (["active", "trialing", "past_due"].includes(row.status)) {
    return !end || end > now;
  }
  if (row.status === "canceled" && end && end > now) return true;
  return false;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user || !isPaymentsConfigured()) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    let env: string;
    try { env = getStripeEnvironment(); } catch { setLoading(false); return; }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as SubscriptionRow | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("subscription-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch]);

  return {
    subscription,
    isActive: computeIsActive(subscription),
    loading,
    refetch,
  };
}