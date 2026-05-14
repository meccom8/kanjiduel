import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

// Use service role key to bypass RLS and update any profile
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const supabase = getAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_id;
    const type = session.metadata?.type;
    console.log("Checkout completed:", { userId, type });
    if (!userId) return NextResponse.json({ received: true });

    if (type === "subscription") {
      const { error } = await supabase
        .from("profiles")
        .update({ is_pro: true })
        .eq("id", userId);
      if (error) console.error("Failed to set is_pro:", error);
      else console.log("✅ is_pro set for", userId);
    } else if (type === "cosmetics") {
      const { data: profile } = await supabase
        .from("profiles").select("owned_cosmetics").eq("id", userId).single();
      const current: string[] = profile?.owned_cosmetics ?? [];
      if (!current.includes("pack1")) {
        const { error } = await supabase.from("profiles")
          .update({ owned_cosmetics: [...current, "pack1"] })
          .eq("id", userId);
        if (error) console.error("Failed to set cosmetics:", error);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
    const userId = customer.metadata?.supabase_id;
    if (userId) {
      await supabase.from("profiles").update({ is_pro: false }).eq("id", userId);
      console.log("❌ is_pro removed for", userId);
    }
  }

  return NextResponse.json({ received: true });
}
