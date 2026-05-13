import { createClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Called when the duel page detects it was reloaded (not navigated away).
// Updates created_at on the room so the forfeit-duel API sees the reconnect signal.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) return NextResponse.json({ ok: false });

  const supabase = createClient();

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
