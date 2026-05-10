import { createClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Called via navigator.sendBeacon when the user closes/refreshes the page
// during matchmaking — cleans up their waiting room
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const userId = searchParams.get("userId");

  if (!roomId && !userId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createClient();

  if (roomId) {
    await supabase.from("rooms")
      .delete()
      .eq("id", roomId)
      .eq("status", "waiting");
  }

  if (userId) {
    await supabase.from("rooms")
      .delete()
      .eq("player1_id", userId)
      .eq("status", "waiting");
  }

  return NextResponse.json({ ok: true });
}

// sendBeacon uses POST but some browsers fall back to GET
export async function GET(req: NextRequest) {
  return POST(req);
}
