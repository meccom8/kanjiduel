"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Phase = "setup" | "searching";

const CATEGORIES = [
  { value: "all", label: "All mixed" },
  { value: "numbers", label: "Numbers" },
  { value: "nature", label: "Nature" },
  { value: "body", label: "Body" },
  { value: "time", label: "Time" },
  { value: "people", label: "People" },
  { value: "verbs", label: "Verbs" },
];

export default function Matchmaking() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [category, setCategory] = useState("all");
  const [rounds, setRounds] = useState(10);
  const [dots, setDots] = useState(".");
  const [userId, setUserId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      // Cleanup any leftover waiting rooms from this user
      await supabase.from("rooms").delete()
        .eq("player1_id", user.id)
        .eq("status", "waiting");
    })();
  }, []);

  useEffect(() => {
    if (phase !== "searching") return;
    const i = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(i);
  }, [phase]);

  // Polling every 2s — works even if Supabase realtime is down
  useEffect(() => {
    if (!roomId) return;
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("rooms")
        .select("status")
        .eq("id", roomId)
        .single();
      if (data?.status === "active") {
        clearInterval(pollRef.current!);
        router.push(`/duel/${roomId}`);
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId]);

  async function startSearch() {
    if (!userId) return;
    setPhase("searching");

    const { data: openRoom } = await supabase
      .from("rooms")
      .select("*")
      .eq("status", "waiting")
      .neq("player1_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (openRoom) {
      await supabase
        .from("rooms")
        .update({ player2_id: userId, status: "active" })
        .eq("id", openRoom.id);
      router.push(`/duel/${openRoom.id}`);
      return;
    }

    const { data: newRoom } = await supabase
      .from("rooms")
      .insert({ player1_id: userId, status: "waiting", category, rounds })
      .select()
      .single();

    if (!newRoom) return;
    setRoomId(newRoom.id);

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
      })
      .subscribe();
  }

  async function cancelSearch() {
    if (pollRef.current) clearInterval(pollRef.current);
    // Delete any waiting room from this user
    if (userId) {
      await supabase.from("rooms").delete()
        .eq("player1_id", userId)
        .eq("status", "waiting");
    }
    setRoomId(null);
    setPhase("setup");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <div className="font-jp text-3xl mb-8 text-accent2">漢</div>
      <div className="card-solid w-full max-w-sm p-6 slide-up">
        {phase === "setup" && (
          <>
            <h1 className="text-xl font-semibold mb-1">Find a match</h1>
            <p className="text-white/40 text-sm mb-6">You will be matched with the next available player</p>
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">Category</label>
                <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} style={{ cursor: "pointer" }}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} style={{ background: "#13132a" }}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">Rounds</label>
                <select className="input-field" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} style={{ cursor: "pointer" }}>
                  {[5, 10, 15, 20].map((r) => (
                    <option key={r} value={r} style={{ background: "#13132a" }}>{r} rounds</option>
                  ))}
                </select>
              </div>
            </div>
            <button className="btn-primary" onClick={startSearch}>Find opponent</button>
            <button className="btn-ghost mt-2" onClick={() => router.push("/")}>Back</button>
          </>
        )}
        {phase === "searching" && (
          <div className="text-center py-8">
            <div className="font-jp text-5xl mb-6 animate-pulse text-accent2">漢</div>
            <p className="text-lg font-medium mb-2">Searching{dots}</p>
            <p className="text-white/40 text-sm mb-8">Waiting for an opponent to join</p>
            <div className="flex gap-1 justify-center mb-8">
              {[0,1,2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-accent2"
                  style={{ animation: `pdot 1.2s ease-in-out ${i*0.2}s infinite` }} />
              ))}
            </div>
            <button className="btn-ghost" onClick={cancelSearch}>Cancel</button>
          </div>
        )}
      </div>
      <style>{`@keyframes pdot{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </main>
  );
}
