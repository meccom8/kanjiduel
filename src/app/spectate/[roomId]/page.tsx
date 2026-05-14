"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTier } from "@/lib/elo";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Room {
  id: string; player1_id: string; player2_id: string | null;
  status: string; category: string;
  current_round: number; p1_score: number; p2_score: number;
  current_kanji: { word: string; meaning: string; jlpt: string } | null;
  round_started_at: string | null; winner_id: string | null;
  is_private: boolean;
}
interface Profile { id: string; username: string; elo: number; avatar_url: string | null; accent_color: string | null; }

const WIN = 10;

export default function SpectatePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const supabase = createClient();

  const [room, setRoom] = useState<Room | null>(null);
  const [p1, setP1] = useState<Profile | null>(null);
  const [p2, setP2] = useState<Profile | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const pollR = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerR = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBlitz = (room?.category ?? "").startsWith("blitz:");
  const roundTime = isBlitz ? 5 : 12;

  useEffect(() => {
    (async () => {
      const { data: rd } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (!rd) { setNotFound(true); return; }
      setRoom(rd);
      // Load both profiles
      const ids = [rd.player1_id, rd.player2_id].filter(Boolean);
      const { data: profiles } = await supabase.from("profiles")
        .select("id,username,elo,avatar_url,accent_color").in("id", ids);
      profiles?.forEach((p: Profile) => {
        if (p.id === rd.player1_id) setP1(p);
        else setP2(p);
      });
    })();

    // Poll every 2s
    pollR.current = setInterval(async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (data) {
        setRoom(data);
        // Load p2 if just joined
        if (data.player2_id) {
          setP2(prev => prev ?? null);
        }
      }
    }, 2000);

    return () => {
      if (pollR.current) clearInterval(pollR.current);
      if (timerR.current) clearInterval(timerR.current);
    };
  }, [roomId]);

  // Timer sync
  useEffect(() => {
    if (timerR.current) clearInterval(timerR.current);
    if (room?.status !== "active" || !room.round_started_at) return;
    const t0 = new Date(room.round_started_at).getTime();
    timerR.current = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil(roundTime - (Date.now() - t0) / 1000)));
    }, 300);
    return () => { if (timerR.current) clearInterval(timerR.current); };
  }, [room?.round_started_at, room?.status, roundTime]);

  if (notFound) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-white/40 mb-4">Match not found</p>
      <Link href="/" className="btn-ghost" style={{ width: "auto", padding: "10px 20px" }}>Home</Link>
    </main>
  );

  if (!room) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
    </div>
  );

  const c1 = p1?.accent_color ?? "#534AB7";
  const c2 = p2?.accent_color ?? "#D85A30";
  const pct = (timeLeft / roundTime) * 100;
  const category = room.category.replace(/^blitz:/, "") || "all";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">← Home</Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30 uppercase tracking-widest">👁 Spectating</span>
            {isBlitz && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#EF9F2722", color: "#EF9F27", border: "1px solid #EF9F2744" }}>⚡ BLITZ</span>}
            {category !== "all" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>{category}</span>}
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-3 items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: c1 + "33", color: c1, border: `1.5px solid ${c1}44` }}>
              {p1?.avatar_url ? <img src={p1.avatar_url} alt="" className="w-full h-full object-cover" /> : (p1?.username ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-white/40 truncate max-w-20">{p1?.username ?? "Player 1"}</p>
              <p className="font-mono text-2xl font-bold" style={{ color: c1 }}>{room.p1_score}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-white/30 font-mono">round {room.current_round + 1}</p>
            <p className="text-white/15 text-xs">first to {WIN}</p>
            {room.status === "finished" && (
              <p className="text-sm font-semibold mt-1" style={{ color: "#EF9F27" }}>Finished</p>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <div className="text-right">
              <p className="text-xs text-white/40 truncate max-w-20">{p2?.username ?? "Waiting…"}</p>
              <p className="font-mono text-2xl font-bold" style={{ color: c2 }}>{room.p2_score}</p>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: c2 + "33", color: c2, border: `1.5px solid ${c2}44` }}>
              {p2?.avatar_url ? <img src={p2.avatar_url} alt="" className="w-full h-full object-cover" /> : (p2?.username ?? "?").slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-0.5 bg-white/8 rounded-full mb-5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{
            width: room.status === "active" && room.current_kanji ? `${pct}%` : "0%",
            background: timeLeft <= 2 ? "#E24B4A" : timeLeft <= 4 ? "#EF9F27" : "#534AB7",
          }} />
        </div>

        {/* Word card — blurred for suspense */}
        <div className="card-solid p-7 text-center mb-4" style={{ border: "1px solid rgba(83,74,183,0.3)" }}>
          {room.status === "waiting" ? (
            <div className="text-white/30 text-sm py-4">Waiting for players…</div>
          ) : room.status === "finished" ? (
            <div className="py-4">
              <div className="font-jp text-5xl mb-3">{room.winner_id ? (room.winner_id === room.player1_id ? (p1?.username ?? "P1") : (p2?.username ?? "P2")) + " wins!" : "Draw"}</div>
              <p className="text-white/40 text-sm">Match ended</p>
              <div className="flex gap-2 mt-4 justify-center">
                <Link href={`/user/${p1?.username}`} className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: c1 + "22", color: c1, border: `1px solid ${c1}44` }}>
                  {p1?.username}
                </Link>
                <Link href={`/user/${p2?.username ?? ""}`} className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: c2 + "22", color: c2, border: `1px solid ${c2}44` }}>
                  {p2?.username ?? "P2"}
                </Link>
              </div>
            </div>
          ) : room.current_kanji ? (
            <>
              <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
                style={{ background: "#FAEEDA22", color: "#EF9F27" }}>Reading</span>
              <div className="font-jp text-6xl mb-2 text-white">{room.current_kanji.word}</div>
              <p className="text-white/35 text-sm italic mb-1">{room.current_kanji.meaning}</p>
              <div className="mt-2 h-8 flex items-center justify-center">
                <div className="bg-white/5 rounded-lg px-6 py-1.5 text-white/20 text-sm tracking-widest">
                  ??
                </div>
              </div>
            </>
          ) : (
            <div className="font-jp text-4xl text-white/10 animate-pulse py-4">漢</div>
          )}
        </div>

        <p className="text-center text-xs text-white/20">Read-only view · updates every 2s</p>
      </div>
    </main>
  );
}
