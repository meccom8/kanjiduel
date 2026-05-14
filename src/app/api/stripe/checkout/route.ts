import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

export async function POST(req: NextRequest) {
  const { priceId, type } = await req.json();

  // Auth via Bearer token (Supabase stores session in localStorage, not cookies)
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: profile?.username ?? undefined,
    metadata: { supabase_id: user.id },
  });

  const origin = req.headers.get("origin") ?? "https://kanjiduel-eta.vercel.app";

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: type === "subscription" ? "subscription" : "payment",
    success_url: `${origin}/shop?success=1`,
    cancel_url: `${origin}/shop?cancelled=1`,
    metadata: { supabase_id: user.id, type },
  });

  return NextResponse.json({ url: session.url });
}
