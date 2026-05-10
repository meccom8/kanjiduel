"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const ELO_RANGE_START = 100;
const ELO_RANGE_EXPAND = 100;
const MAX_ELO_RANGE = 1000;

export default function Matchmaking() {
  const [dots, setDots] = useState(".");
  const [userId, setUserId] = useState<string | null>(null);
  const [myElo, setMyElo] = useState<number>(500);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<NodeJS.Timeout | null>(null);
  const searchedRef = useRef(false);
  const matchFoundRef = useRef(false);
  const roomIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const cleaningUpRef = useRef(false);

  const router = useRouter();
  const supabase = createClient();

  // ── Cleanup — marque la room comme cancelled (atomique, pas de race condition) ──
  async function cleanupRoom() {
    if (matchFoundRef.current) return;
    if (cleaningUpRef.current) return;
    cleaningUpRef.current = true;

    const uid = userIdRef.current;
    const rid = roomIdRef.current;

    try {
      // Mark as cancelled instantly — prevents other players from joining
      if (rid) {
        await supabase.from("rooms")
          .update({ status: "cancelled" })
          .eq("id", rid)
          .eq("status", "waiting");
      }
      if (uid) {
        await supabase.from("rooms")
          .update({ status: "cancelled" })
          .eq("player1_id", uid)
          .eq("status", "waiting");
      }
    } catch {}

    if (channelRef.current) {
      try { channelRef.current.unsubscribe(); } catch {}
      channelRef.current = null;
    }
    cleaningUpRef.current = false;
  }

  // ── Unmount cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (searchRef.current) clearTimeout(searchRef.current);
      cleanupRoom();
    };
  }, []);

  // ── Visibility change: cleanup when tab hidden/closed ─────────────────────
  // More reliable than beforeunload on mobile and modern browsers
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "hidden" && !matchFoundRef.current) {
        cleanupRoom();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // ── beforeunload: last resort cleanup ─────────────────────────────────────
  useEffect(() => {
    function handleUnload() {
      if (matchFoundRef.current) return;
      const rid = roomIdRef.current;
      const uid = userIdRef.current;
      // sendBeacon as last resort (may not work on all platforms)
      if (rid || uid) {
        const url = `/api/cleanup-room?roomId=${rid ?? ""}&userId=${uid ?? ""}`;
        try { navigator.sendBeacon(url); } catch {}
      }
    }
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      userIdRef.current = user.id;

      // Cleanup our own stale rooms immediately on load
      await supabase.from("rooms")
        .delete()
        .eq("player1_id", user.id)
        .in("status", ["waiting", "cancelled"]);

      // Also trigger server-side cleanup of ALL stale rooms (via RPC if available)
      try {
        await supabase.rpc("cleanup_stale_rooms");
      } catch {}

      const { data: profile } = await supabase
        .from("profiles").select("elo").eq("id", user.id).single();
      setMyElo(profile?.elo ?? 500);
    })();
  }, []);

  // ── Start search once userId + myElo ready ─────────────────────────────────
  useEffect(() => {
    if (userId && myElo && !searchedRef.current) {
      searchedRef.current = true;
      startSearch(userId, myElo, 0);
    }
  }, [userId, myElo]);

  // ── Dots animation ─────────────────────────────────────────────────────────
  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(i);
  }, []);

  // ── Search timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setSearchTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Poll for room activation ───────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    pollRef.current = setInterval(async () => {
      if (matchFoundRef.current) return;
      const { data } = await supabase
        .from("rooms").select("status").eq("id", roomId).single();
      if (data?.status === "active") {
        matchFoundRef.current = true;
        clearInterval(pollRef.current!);
        router.push(`/duel/${roomId}`);
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId]);

  // ── Core search ────────────────────────────────────────────────────────────
  async function startSearch(uid: string, elo: number, elapsed: number) {
    if (matchFoundRef.current) return;

    const currentRange = Math.min(
      MAX_ELO_RANGE,
      ELO_RANGE_START + Math.floor(elapsed / 15) * ELO_RANGE_EXPAND,
    );
    const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString();
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    // Clean stale rooms older than 15s (both waiting and cancelled)
    await supabase.from("rooms")
      .delete()
      .in("status", ["waiting", "cancelled"])
      .lt("created_at", fifteenSecondsAgo)
      .is("player2_id", null);

    // Look for fresh waiting rooms only (not cancelled)
    const { data: waitingRooms } = await supabase
      .from("rooms")
      .select("id, player1_id")
      .eq("status", "waiting")
      .neq("player1_id", uid)
      .gt("created_at", fifteenSecondsAgo)
      .is("player2_id", null)
      .order("created_at", { ascending: true })
      .limit(20);

    // Find best ELO match
    let bestRoom: any = null;
    let bestDiff = currentRange + 1;
    for (const room of waitingRooms ?? []) {
      const { data: oppProfile } = await supabase
        .from("profiles").select("elo").eq("id", room.player1_id).single();
      const oppElo = oppProfile?.elo ?? 500;
      const diff = Math.abs(oppElo - elo);
      if (diff <= currentRange && diff < bestDiff) {
        bestDiff = diff; bestRoom = room;
      }
    }

    if (bestRoom) {
      const { error } = await supabase.from("rooms")
        .update({ player2_id: uid, status: "active" })
        .eq("id", bestRoom.id)
        .eq("status", "waiting");
      if (!error) {
        matchFoundRef.current = true;
        router.push(`/duel/${bestRoom.id}`);
        return;
      }
    }

    // No match — create our waiting room if we don't have one yet
    if (!roomIdRef.current) {
      // Check first to avoid unique constraint error in console
      const { data: existing } = await supabase
        .from("rooms")
        .select("id")
        .eq("player1_id", uid)
        .eq("status", "waiting")
        .is("player2_id", null)
        .maybeSingle();

      if (existing) {
        // Room already exists (e.g. from a previous session) — reuse it
        roomIdRef.current = existing.id;
        setRoomId(existing.id);
      } else {
        const { data: newRoom } = await supabase
          .from("rooms")
          .insert({ player1_id: uid, status: "waiting", category: "all", rounds: 11 })
          .select().single();
        if (newRoom) {
          roomIdRef.current = newRoom.id;
          setRoomId(newRoom.id);
        }
      }

      const rid = roomIdRef.current;
      if (rid && !channelRef.current) {
        const channel = supabase
          .channel(`room-wait-${rid}`)
          .on("postgres_changes", {
            event: "UPDATE", schema: "public", table: "rooms",
            filter: `id=eq.${rid}`,
          }, (payload) => {
            if (payload.new.status === "active") {
              matchFoundRef.current = true;
              channel.unsubscribe();
              if (pollRef.current) clearInterval(pollRef.current);
              router.push(`/duel/${rid}`);
            }
          }).subscribe();
        channelRef.current = channel;
      }
    } else {
      // Heartbeat: refresh created_at so we're not deleted as stale
      await supabase.from("rooms")
        .update({ created_at: new Date().toISOString() })
        .eq("id", roomIdRef.current)
        .eq("status", "waiting");
    }

    // Retry in 5s
    searchRef.current = setTimeout(() => {
      startSearch(uid, elo, elapsed + 5);
    }, 5000);
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────
  async function cancelSearch() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (searchRef.current) clearTimeout(searchRef.current);
    await cleanupRoom();
    router.push("/");
  }

  const currentRange = Math.min(
    MAX_ELO_RANGE,
    ELO_RANGE_START + Math.floor(searchTime / 15) * ELO_RANGE_EXPAND,
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <div className="font-jp text-3xl mb-8 text-accent2">漢</div>
      <div className="card-solid w-full max-w-sm p-8 slide-up text-center">
        <div className="font-jp text-5xl mb-6 animate-pulse text-accent2">漢</div>
        <p className="text-lg font-medium mb-2">Finding a match{dots}</p>
        <p className="text-white/40 text-sm mb-1">Searching near {myElo} ELO</p>
        <p className="text-white/20 text-xs mb-6">
          ±{currentRange} ELO range{searchTime >= 15 ? " (expanding...)" : ""}
        </p>
        <div className="flex gap-1 justify-center mb-8">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent2"
              style={{ animation: `pdot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <button className="btn-ghost" onClick={cancelSearch}>Cancel</button>
      </div>
      <style>{`@keyframes pdot{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </main>
  );
}
