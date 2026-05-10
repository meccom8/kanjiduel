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
  const matchFoundRef = useRef(false); // prevent cleanup if we actually found a match
  const roomIdRef = useRef<string | null>(null); // always-fresh ref for cleanup
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);

  const router = useRouter();
  const supabase = createClient();

  // ── Cleanup helper — deletes our waiting room ──────────────────────────────
  async function cleanupRoom() {
    if (matchFoundRef.current) return; // don't delete if we navigated to a duel
    const uid = userIdRef.current;
    const rid = roomIdRef.current;
    if (rid) {
      await supabase.from("rooms").delete().eq("id", rid).eq("status", "waiting");
    }
    if (uid) {
      await supabase.from("rooms").delete().eq("player1_id", uid).eq("status", "waiting");
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }

  // ── On unmount: cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (searchRef.current) clearTimeout(searchRef.current);
      cleanupRoom();
    };
  }, []);

  // ── beforeunload: sync cleanup via sendBeacon ──────────────────────────────
  useEffect(() => {
    function handleUnload() {
      if (matchFoundRef.current) return;
      const rid = roomIdRef.current;
      const uid = userIdRef.current;
      // Best-effort: use REST directly since async/await won't work in unload
      if (rid) {
        navigator.sendBeacon(
          `/api/cleanup-room?roomId=${rid}&userId=${uid ?? ""}`,
        );
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

      // Delete any leftover waiting rooms from this user
      await supabase.from("rooms")
        .delete()
        .eq("player1_id", user.id)
        .eq("status", "waiting");

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

  // ── Animate dots ──────────────────────────────────────────────────────────
  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(i);
  }, []);

  // ── Track search time ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setSearchTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Poll for room activation (fallback if realtime fails) ──────────────────
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

  // ── Core search logic ──────────────────────────────────────────────────────
  async function startSearch(uid: string, elo: number, elapsed: number) {
    if (matchFoundRef.current) return;

    const currentRange = Math.min(
      MAX_ELO_RANGE,
      ELO_RANGE_START + Math.floor(elapsed / 15) * ELO_RANGE_EXPAND,
    );
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    // Clean up stale rooms (older than 30s)
    await supabase.from("rooms")
      .delete()
      .eq("status", "waiting")
      .lt("created_at", thirtySecondsAgo)
      .is("player2_id", null);

    // Look for compatible waiting rooms
    const { data: waitingRooms } = await supabase
      .from("rooms")
      .select("id, player1_id")
      .eq("status", "waiting")
      .neq("player1_id", uid)
      .gt("created_at", thirtySecondsAgo)
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
        bestDiff = diff;
        bestRoom = room;
      }
    }

    if (bestRoom) {
      const { error } = await supabase.from("rooms")
        .update({ player2_id: uid, status: "active" })
        .eq("id", bestRoom.id)
        .eq("status", "waiting"); // guard: only update if still waiting
      if (!error) {
        matchFoundRef.current = true;
        router.push(`/duel/${bestRoom.id}`);
        return;
      }
      // If error (race condition — another player grabbed it), fall through to create
    }

    // No match — create our waiting room (only once)
    if (!roomIdRef.current) {
      const { data: newRoom } = await supabase
        .from("rooms")
        .insert({ player1_id: uid, status: "waiting", category: "all", rounds: 11 })
        .select().single();

      if (newRoom) {
        roomIdRef.current = newRoom.id;
        setRoomId(newRoom.id);

        // Realtime subscription
        const channel = supabase
          .channel(`room-wait-${newRoom.id}`)
          .on("postgres_changes", {
            event: "UPDATE", schema: "public", table: "rooms",
            filter: `id=eq.${newRoom.id}`,
          }, (payload) => {
            if (payload.new.status === "active") {
              matchFoundRef.current = true;
              channel.unsubscribe();
              if (pollRef.current) clearInterval(pollRef.current);
              router.push(`/duel/${newRoom.id}`);
            }
          }).subscribe();

        channelRef.current = channel;
      }
    }

    // Retry search in 5s with updated elapsed time
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
