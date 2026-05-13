import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function makeClient(token?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined
  );
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const token  = searchParams.get("token") ?? undefined;

  if (!roomId) return NextResponse.json({ ok: false });

  const supabase = makeClient(token);

  await supabase
    .from("rooms")
    .update({ created_at: new Date().toISOString() })
    .eq("id", roomId)
    .eq("status", "active");

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
