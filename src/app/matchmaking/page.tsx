"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Matchmaking() {
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
      await supabase.from("rooms").delete().eq("player1_id", user.id).eq("status", "waiting");
    })();
  }, []);

  useEffect(() => {
    if (userId) startSearch(userId);
  }, [userId]);

  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(i);
  }, []);

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

  async function startSearch(uid: string) {
    const { data: openRoom } = await supabase
      .from("rooms").select("*")
      .eq("status", "waiting")
      .neq("player1_id", uid)
      .order("created_at", { ascending: true })
      .limit(1).single();

    if (openRoom) {
      await supabase.from("rooms").update({ player2_id: uid, status: "active" }).eq("id", openRoom.id);
      router.push(`/duel/${openRoom.id}`);
      return;
    }

    const { data: newRoom } = await supabase
      .from("rooms")
      .insert({ player1_id: uid, status: "waiting", category: "all", rounds: 11 })
      .select().single();

    if (!newRoom) return;
    setRoomId(newRoom.id);

    const sub = supabase
      .channel(`room-wait-${newRoom.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${newRoom.id}` },
        (payload) => {
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
    if (roomId) await supabase.from("rooms").delete().eq("id", roomId);
    if (userId) await supabase.from("rooms").delete().eq("player1_id", userId).eq("status", "waiting");
    setRoomId(null);
    router.push("/");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <div className="font-jp text-3xl mb-8 text-accent2">漢</div>
      <div className="card-solid w-full max-w-sm p-8 slide-up text-center">
        <div className="font-jp text-5xl mb-6 animate-pulse text-accent2">漢</div>
        <p className="text-lg font-medium mb-2">Finding a match{dots}</p>
        <p className="text-white/40 text-sm mb-8">Waiting for an opponent</p>
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
