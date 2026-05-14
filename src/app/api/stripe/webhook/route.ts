import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const supabase = await createClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_id;
    const type = session.metadata?.type;
    if (!userId) return NextResponse.json({ received: true });

    if (type === "subscription") {
      await supabase.from("profiles").update({ is_pro: true }).eq("id", userId);
    } else if (type === "cosmetics") {
      // Append cosmetics pack to owned_cosmetics array
      const { data: profile } = await supabase
        .from("profiles").select("owned_cosmetics").eq("id", userId).single();
      const current: string[] = profile?.owned_cosmetics ?? [];
      if (!current.includes("pack1")) {
        await supabase.from("profiles")
          .update({ owned_cosmetics: [...current, "pack1"] })
          .eq("id", userId);
      }
    }
  }

  // Handle subscription cancellation
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
    const userId = customer.metadata?.supabase_id;
    if (userId) {
      await supabase.from("profiles").update({ is_pro: false }).eq("id", userId);
    }
  }

  return NextResponse.json({ received: true });
}
