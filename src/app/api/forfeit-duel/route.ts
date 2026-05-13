import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

const WIN = 10;

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
  const userId = searchParams.get("userId");
  const token  = searchParams.get("token") ?? undefined;

  if (!roomId || !userId) return NextResponse.json({ ok: false });

  const supabase = makeClient(token);

  const { data: room } = await supabase
    .from("rooms").select("*").eq("id", roomId).single();

  if (!room || room.status !== "active") return NextResponse.json({ ok: false });
  if (room.player1_id !== userId && room.player2_id !== userId) {
    return NextResponse.json({ ok: false });
  }

  const forfeitRequestedAt = new Date();

  await new Promise(r => setTimeout(r, 8000));

  const { data: refreshed } = await supabase
    .from("rooms").select("created_at, status").eq("id", roomId).single();

  if (!refreshed || refreshed.status !== "active") return NextResponse.json({ ok: false });
  if (new Date(refreshed.created_at) > forfeitRequestedAt) {
    return NextResponse.json({ ok: false, reason: "cancelled" });
  }

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
