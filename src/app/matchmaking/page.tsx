"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const ELO_RANGE_START = 300;
const ELO_RANGE_EXPAND = 100; // Expand range every 15s
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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // Cleanup leftover waiting rooms
      await supabase.from("rooms").delete().eq("player1_id", user.id).eq("status", "waiting");

      // Get my ELO
      const { data: profile } = await supabase.from("profiles").select("elo").eq("id", user.id).single();
      setMyElo(profile?.elo ?? 500);
    })();
  }, []);

  // Start search once userId + myElo ready
  useEffect(() => {
    if (userId && myElo && !searchedRef.current) {
      searchedRef.current = true;
      startSearch(userId, myElo);
    }
  }, [userId, myElo]);

  // Animate dots
  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(i);
  }, []);

  // Track search time and expand range
  useEffect(() => {
    const t = setInterval(() => setSearchTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll for room activation
  useEffect(() => {
    if (!roomId) return;
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.from("rooms").select("status").eq("id", roomId).single();
      if (data?.status === "active") {
        clearInterval(pollRef.current!);
        router.push(`/duel/${roomId}`);
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId]);

  async function startSearch(uid: string, elo: number) {
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    // Cleanup stale rooms
    await supabase.from("rooms").delete().eq("status", "waiting").lt("created_at", thirtySecondsAgo);

    // Expand ELO range over time
    const elapsed = searchTime;
    const currentRange = Math.min(MAX_ELO_RANGE, ELO_RANGE_START + Math.floor(elapsed / 15) * ELO_RANGE_EXPAND);

    // Look for rooms within ELO range
    const { data: waitingRooms } = await supabase
      .from("rooms")
      .select("id, player1_id, profiles!player1_id(elo)")
      .eq("status", "waiting")
      .neq("player1_id", uid)
      .gt("created_at", thirtySecondsAgo)
      .order("created_at", { ascending: true })
      .limit(20);

    // Find best ELO match within range
    let bestRoom: any = null;
    let bestDiff = currentRange + 1;
    for (const room of waitingRooms ?? []) {
      const oppElo = (room.profiles as any)?.elo ?? 500;
      const diff = Math.abs(oppElo - elo);
      if (diff <= currentRange && diff < bestDiff) {
        bestDiff = diff;
        bestRoom = room;
      }
    }

    if (bestRoom) {
      const { error } = await supabase.from("rooms")
        .update({ player2_id: uid, status: "active" }).eq("id", bestRoom.id);
      if (!error) { router.push(`/duel/${bestRoom.id}`); return; }
    }

    // No match found — create room if not already done
    if (!roomId) {
      const { data: newRoom } = await supabase
        .from("rooms")
        .insert({ player1_id: uid, status: "waiting", category: "all", rounds: 11 })
        .select().single();

      if (newRoom) {
        setRoomId(newRoom.id);

        // Realtime listener
        const sub = supabase
          .channel(`room-wait-${newRoom.id}`)
          .on("postgres_changes", {
            event: "UPDATE", schema: "public", table: "rooms",
            filter: `id=eq.${newRoom.id}`,
          }, (payload) => {
            if (payload.new.status === "active") {
              sub.unsubscribe();
              if (pollRef.current) clearInterval(pollRef.current);
              router.push(`/duel/${newRoom.id}`);
            }
          }).subscribe();
      }
    } else {
      // Room exists, retry search with expanded range
      searchRef.current = setTimeout(() => startSearch(uid, elo), 5000);
    }
  }

  async function cancelSearch() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (roomId) await supabase.from("rooms").delete().eq("id", roomId);
    if (userId) await supabase.from("rooms").delete().eq("player1_id", userId).eq("status", "waiting");
    router.push("/");
  }

  const elapsed = searchTime;
  const currentRange = Math.min(MAX_ELO_RANGE, ELO_RANGE_START + Math.floor(elapsed / 15) * ELO_RANGE_EXPAND);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <div className="font-jp text-3xl mb-8 text-accent2">漢</div>
      <div className="card-solid w-full max-w-sm p-8 slide-up text-center">
        <div className="font-jp text-5xl mb-6 animate-pulse text-accent2">漢</div>
        <p className="text-lg font-medium mb-2">Finding a match{dots}</p>
        <p className="text-white/40 text-sm mb-1">Searching near {myElo} ELO</p>
        <p className="text-white/20 text-xs mb-6">
          ±{currentRange} ELO range{elapsed >= 15 ? " (expanding...)" : ""}
        </p>
        <div className="flex gap-1 justify-center mb-8">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent2"
              style={{ animation: `pdot 1.2s ease-in-out ${i*0.2}s infinite` }} />
          ))}
        </div>
        <button className="btn-ghost" onClick={cancelSearch}>Cancel</button>
      </div>
      <style>{`@keyframes pdot{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </main>
  );
}
