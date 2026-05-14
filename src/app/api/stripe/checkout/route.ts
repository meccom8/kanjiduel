import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

export async function POST(req: NextRequest) {
  const { priceId, type } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Always create a fresh Stripe customer (simple — no stripe_customer_id column needed)
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: profile?.username ?? undefined,
    metadata: { supabase_id: user.id },
  });

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: type === "subscription" ? "subscription" : "payment",
    success_url: `${origin}/shop?success=1`,
    cancel_url: `${origin}/shop?cancelled=1`,
    metadata: {
      supabase_id: user.id,
      type,
    },
  });

  return NextResponse.json({ url: session.url });
}
