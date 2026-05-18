import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service-role client — bypasses RLS so players can read/update each other's rooms
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ELO_RANGE_START = 200;
const ELO_RANGE_EXPAND = 100;
const MAX_ELO_RANGE = 1000;

export async function POST(req: NextRequest) {
  try {
    const { userId, elo, elapsed } = await req.json();
    if (!userId || elo === undefined || elapsed === undefined) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Verify caller is who they claim to be
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentRange = Math.min(
      MAX_ELO_RANGE,
      ELO_RANGE_START + Math.floor(elapsed / 10) * ELO_RANGE_EXPAND,
    );
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();

    // 1. Clean global stale rooms (> 60s, no opponent yet)
    await admin.from("rooms")
      .delete()
      .eq("status", "waiting")
      .lt("created_at", sixtySecondsAgo)
      .is("player2_id", null);

    // 2. Find all waiting rooms (not ours, fresh, no opponent)
    const { data: waitingRooms } = await admin
      .from("rooms")
      .select("id, player1_id")
      .eq("status", "waiting")
      .neq("player1_id", userId)
      .gt("created_at", sixtySecondsAgo)
      .is("player2_id", null)
      .order("created_at", { ascending: true })
      .limit(20);

    // 3. Find the best ELO match within range
    let bestRoom: { id: string; player1_id: string } | null = null;
    let bestDiff = currentRange + 1;
    for (const room of waitingRooms ?? []) {
      const { data: opp } = await admin
        .from("profiles").select("elo").eq("id", room.player1_id).single();
      const oppElo = (opp as any)?.elo ?? 500;
      const diff = Math.abs(oppElo - elo);
      if (diff <= currentRange && diff < bestDiff) {
        bestDiff = diff;
        bestRoom = room;
      }
    }

    // 4. Try to join atomically (WHERE status='waiting' prevents double-join)
    if (bestRoom) {
      const { error: joinErr } = await admin.from("rooms")
        .update({ player2_id: userId, status: "active" })
        .eq("id", bestRoom.id)
        .eq("status", "waiting");

      if (!joinErr) {
        // Delete our own waiting room if we created one
        await admin.from("rooms")
          .delete().eq("player1_id", userId).eq("status", "waiting");
        return NextResponse.json({ action: "joined", roomId: bestRoom.id });
      }
      // Room was just taken by someone else — fall through to waiting logic
    }

    // 5. No match yet — find or create our own waiting room
    const { data: existing } = await admin
      .from("rooms")
      .select("id")
      .eq("player1_id", userId)
      .eq("status", "waiting")
      .is("player2_id", null)
      .maybeSingle();

    if (existing) {
      // Heartbeat: keep the room fresh so it's not GC'd as stale
      await admin.from("rooms")
        .update({ created_at: new Date().toISOString() })
        .eq("id", (existing as any).id)
        .eq("status", "waiting");
      return NextResponse.json({ action: "waiting", roomId: (existing as any).id });
    }

    // Create a fresh room
    const { data: newRoom, error: createErr } = await admin
      .from("rooms")
      .insert({ player1_id: userId, status: "waiting", category: "all", rounds: 11 })
      .select().single();

    if (createErr || !newRoom) {
      return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
    }

    return NextResponse.json({ action: "waiting", roomId: (newRoom as any).id });

  } catch (e) {
    console.error("[matchmake]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
