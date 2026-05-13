import { createClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Called via sendBeacon when the duel player closes/navigates away.
// Waits 8 seconds before executing so a page reload can cancel it.
export const maxDuration = 20;

const WIN = 10;

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const userId = searchParams.get("userId");

  if (!roomId || !userId) return NextResponse.json({ ok: false });

  const supabase = createClient();

  // Fetch room to verify player and get current state
  const { data: room } = await supabase
    .from("rooms").select("*").eq("id", roomId).single();

  if (!room || room.status !== "active") return NextResponse.json({ ok: false });
  if (room.player1_id !== userId && room.player2_id !== userId) {
    return NextResponse.json({ ok: false });
  }

  const forfeitRequestedAt = new Date();

  // Grace period — reload can cancel via /api/cancel-forfeit (which updates created_at)
  await new Promise(r => setTimeout(r, 8000));

  // Re-check room state
  const { data: refreshed } = await supabase
    .from("rooms").select("created_at, status").eq("id", roomId).single();

  if (!refreshed || refreshed.status !== "active") return NextResponse.json({ ok: false });

  // If created_at was bumped after we started (cancel signal), abort
  if (new Date(refreshed.created_at) > forfeitRequestedAt) {
    return NextResponse.json({ ok: false, reason: "cancelled" });
  }

  // Execute forfeit
  const winnerId = room.player1_id === userId ? room.player2_id : room.player1_id;
  const p1 = room.player1_id === userId ? 0 : WIN;
  const p2 = room.player2_id === userId ? 0 : WIN;

  await supabase.rpc("finish_match", {
    p_room_id: roomId,
    p_winner_id: winnerId,
    p_p1_score: p1,
    p_p2_score: p2,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
