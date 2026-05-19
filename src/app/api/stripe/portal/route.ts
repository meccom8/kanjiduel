import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" as any });

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find the Stripe customer by Supabase user ID stored in metadata
  const customers = await stripe.customers.search({
    query: `metadata['supabase_id']:'${user.id}'`,
    limit: 1,
  });

  if (!customers.data.length) {
    // No Stripe customer found — nothing to manage
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? "https://KanjiDual-eta.vercel.app";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: `${origin}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
