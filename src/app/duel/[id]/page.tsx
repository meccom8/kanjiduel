"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { getPool, checkAnswer, shuffle } from "@/lib/kanji";
import { calcELO, getTier } from "@/lib/elo";
import { useRouter, useParams } from "next/navigation";

interface Room {
  id: string;
  player1_id: string;
  player2_id: string;
  status: string;
  category: string;
  rounds: number;
  current_round: number;
  p1_score: number;
  p2_score: number;
  current_kanji: { k: string; m: string; r: string } | null;
  question_type: "meaning" | "onyomi" | "kunyomi" | null;
  round_started_at: string | null;
}

interface Profile { id: string; username: string; elo: number; }

type GamePhase = "loading" | "waiting" | "playing" | "round_result" | "finished";

const ROUND_TIME = 12;

export default function DuelPage() {
  const params = useParams();
  const roomId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [roundWinner, setRoundWinner] = useState<"me" | "opponent" | "timeout" | null>(null);
  const [history, setHistory] = useState<("me" | "opponent" | "timeout")[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isP1 = useRef(false);
  const lockedRef = useRef(false);

  // Load initial data
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: roomData } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (!roomData) { router.push("/"); return; }

      isP1.current = roomData.player1_id === user.id;
      const oppId = isP1.current ? roomData.player2_id : roomData.player1_id;

      const [{ data: myProfile }, { data: oppProfile }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("profiles").select("*").eq("id", oppId).single(),
      ]);

      setMe(myProfile);
      setOpponent(oppProfile);
      setRoom(roomData);

      if (roomData.status === "active") {
        if (roomData.current_kanji) {
          setPhase("playing");
          startTimer(roomData.round_started_at);
        } else if (isP1.current) {
          await sendNextKanji(roomData);
        }
      } else {
        setPhase("waiting");
      }
    })();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const sub = supabase
      .channel(`duel-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        const updated = payload.new as Room;
        setRoom(updated);
        handleRoomUpdate(updated);
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [me]);

  function startTimer(startedAt: string | null) {
    if (timerRef.current) clearInterval(timerRef.current);
    const started = startedAt ? new Date(startedAt).getTime() : Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      const left = Math.max(0, ROUND_TIME - elapsed);
      setTimeLeft(Math.ceil(left));
      if (left <= 0) {
        clearInterval(timerRef.current!);
        handleTimeout();
      }
    }, 200);
  }

  function handleRoomUpdate(updated: Room) {
    if (updated.status === "finished") {
      setPhase("finished");
      return;
    }
    if (updated.current_kanji && updated.status === "active") {
      lockedRef.current = false;
      setAnswer("");
      setRoundWinner(null);
      setPhase("playing");
      startTimer(updated.round_started_at);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function sendNextKanji(currentRoom: Room) {
    const pool = shuffle(getPool(currentRoom.category));
    const kanji = pool[0];
    const roll = Math.random();
    const type = roll < 0.4 ? "meaning" : roll < 0.7 ? "onyomi" : "kunyomi";
    await supabase.from("rooms").update({
      current_kanji: kanji,
      question_type: type,
      round_started_at: new Date().toISOString(),
    }).eq("id", roomId);
  }

  async function handleTimeout() {
    if (lockedRef.current || !room) return;
    lockedRef.current = true;
    setRoundWinner("timeout");
    setPhase("round_result");
    const newHistory = [...history, "timeout" as const];
    setHistory(newHistory);

    if (isP1.current) {
      const nextRound = (room.current_round ?? 0) + 1;
      if (nextRound >= room.rounds) {
        await endGame(room.p1_score, room.p2_score);
      } else {
        await supabase.from("rooms").update({
          current_round: nextRound,
          current_kanji: null,
        }).eq("id", roomId);
        setTimeout(async () => {
          const { data: fresh } = await supabase.from("rooms").select("*").eq("id", roomId).single();
          if (fresh) await sendNextKanji(fresh);
        }, 2000);
      }
    }
  }

  async function submitAnswer(val: string) {
    if (lockedRef.current || !room || !room.current_kanji || !room.question_type) return;
    const qk = room.current_kanji as any;
    const answers = room.question_type === "meaning"
      ? qk.m.split("/").map((s: string) => s.trim().toLowerCase())
      : room.question_type === "onyomi"
      ? [(qk.on ?? "").trim()]
      : [(qk.kun ?? "").trim()];

    if (!checkAnswer(val, answers)) return;

    lockedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const iWon = true;
    setRoundWinner("me");
    setPhase("round_result");
    const newHistory = [...history, "me" as const];
    setHistory(newHistory);

    const p1Score = isP1.current ? room.p1_score + 1 : room.p1_score;
    const p2Score = isP1.current ? room.p2_score : room.p2_score + 1;
    const nextRound = (room.current_round ?? 0) + 1;

    if (nextRound >= room.rounds) {
      await supabase.from("rooms").update({
        p1_score: p1Score,
        p2_score: p2Score,
        current_round: nextRound,
      }).eq("id", roomId);
      await endGame(p1Score, p2Score);
    } else {
      await supabase.from("rooms").update({
        p1_score: p1Score,
        p2_score: p2Score,
        current_round: nextRound,
        current_kanji: null,
      }).eq("id", roomId);
      setTimeout(async () => {
        const { data: fresh } = await supabase.from("rooms").select("*").eq("id", roomId).single();
        if (fresh) await sendNextKanji(fresh);
      }, 2000);
    }
  }

  async function endGame(p1Score: number, p2Score: number) {
    if (!room || !me || !opponent) return;
    const p1Id = room.player1_id;
    const p2Id = room.player2_id;

    let winnerId: string | null = null;
    if (p1Score > p2Score) winnerId = p1Id;
    else if (p2Score > p1Score) winnerId = p2Id;

    // ELO
    const { data: p1Profile } = await supabase.from("profiles").select("elo,wins,losses").eq("id", p1Id).single();
    const { data: p2Profile } = await supabase.from("profiles").select("elo,wins,losses").eq("id", p2Id).single();

    if (p1Profile && p2Profile && winnerId) {
      const winnerIsP1 = winnerId === p1Id;
      const { winnerDelta, loserDelta } = calcELO(
        winnerIsP1 ? p1Profile.elo : p2Profile.elo,
        winnerIsP1 ? p2Profile.elo : p1Profile.elo
      );

      await Promise.all([
        supabase.from("profiles").update({
          elo: Math.max(0, p1Profile.elo + (winnerIsP1 ? winnerDelta : loserDelta)),
          wins: winnerIsP1 ? p1Profile.wins + 1 : p1Profile.wins,
          losses: winnerIsP1 ? p1Profile.losses : p1Profile.losses + 1,
        }).eq("id", p1Id),
        supabase.from("profiles").update({
          elo: Math.max(0, p2Profile.elo + (winnerIsP1 ? loserDelta : winnerDelta)),
          wins: winnerIsP1 ? p2Profile.wins : p2Profile.wins + 1,
          losses: winnerIsP1 ? p2Profile.losses + 1 : p2Profile.losses,
        }).eq("id", p2Id),
        supabase.from("matches").insert({
          player1_id: p1Id, player2_id: p2Id,
          winner_id: winnerId, p1_score: p1Score, p2_score: p2Score,
          p1_elo_change: winnerIsP1 ? winnerDelta : loserDelta,
          p2_elo_change: winnerIsP1 ? loserDelta : winnerDelta,
          rounds: room.rounds, category: room.category,
        }),
      ]);
    }

    await supabase.from("rooms").update({ status: "finished" }).eq("id", roomId);
  }

  // Render
  if (phase === "loading") {
    return <FullPageMessage icon="漢" text="Loading duel…" />;
  }

  if (phase === "waiting") {
    return <FullPageMessage icon="漢" text="Waiting for opponent…" pulse />;
  }

  if (phase === "finished" && room) {
    return <ResultScreen room={room} me={me} opponent={opponent} isP1={isP1.current} router={router} />;
  }

  const myScore = isP1.current ? room?.p1_score ?? 0 : room?.p2_score ?? 0;
  const oppScore = isP1.current ? room?.p2_score ?? 0 : room?.p1_score ?? 0;
  const currentRound = (room?.current_round ?? 0) + 1;
  const totalRounds = room?.rounds ?? 10;
  const kanji = room?.current_kanji;
  const qType = room?.question_type;
  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const timerColor = timeLeft <= 3 ? "#E24B4A" : timeLeft <= 6 ? "#EF9F27" : "#534AB7";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md">
        {/* Scores */}
        <div className="grid grid-cols-3 items-center mb-4">
          <div className="text-left">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{me?.username ?? "You"}</p>
            <p className="font-mono text-3xl font-bold text-accent2">{myScore}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/40 font-mono">{currentRound}/{totalRounds}</p>
            <p className="text-white/20 text-xs mt-1">round</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{opponent?.username ?? "Opponent"}</p>
            <p className="font-mono text-3xl font-bold" style={{ color: "#D85A30" }}>{oppScore}</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: totalRounds }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full"
              style={{
                background: i < history.length
                  ? (history[i] === "me" ? "#534AB7" : history[i] === "opponent" ? "#D85A30" : "rgba(255,255,255,0.15)")
                  : "rgba(255,255,255,0.08)"
              }} />
          ))}
        </div>

        {/* Timer bar */}
        <div className="h-0.5 bg-white/8 rounded-full mb-6 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-200"
            style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>

        {/* Kanji card */}
        <div className="card-solid p-8 text-center mb-4 pulse-border">
          {kanji && (
            <>
              <span
                className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
                style={qType === "meaning"
                  ? { background: "#EEEDFE22", color: "#7F77DD" }
                  : qType === "onyomi"
                  ? { background: "#FAEEDA22", color: "#EF9F27" }
                  : { background: "#E0F2F122", color: "#4DB6AC" }}
              >
                {qType === "meaning" ? "Meaning" : qType === "onyomi" ? "On\'yomi" : "Kun\'yomi"}
              </span>
              <div className="font-jp text-8xl mb-3 text-white pop-in">{kanji.k}</div>
              <p className="text-white/20 text-sm">
                {qType === "meaning" ? "What does this kanji mean?" : qType === "onyomi" ? "Type the on\'yomi reading" : "Type the kun\'yomi reading"}
              </p>
            </>
          )}
          {phase === "round_result" && roundWinner && (
            <div className="mt-4 pop-in">
              <p className="text-sm font-medium"
                style={{ color: roundWinner === "me" ? "#5DCAA5" : roundWinner === "timeout" ? "#9090a8" : "#D85A30" }}>
                {roundWinner === "me" ? "✓ You got it!" : roundWinner === "timeout" ? `Time up — ${kanji?.m ?? kanji?.r}` : `Opponent got it — ${kanji?.m ?? kanji?.r}`}
              </p>
            </div>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          className={`input-field text-center text-lg ${roundWinner === "me" ? "input-correct" : ""}`}
          placeholder="Type your answer…"
          value={answer}
          disabled={phase === "round_result"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setAnswer(e.target.value);
            submitAnswer(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitAnswer(answer);
          }}
        />

        <p className="text-center text-xs text-white/20 mt-3 font-mono">
          {timeLeft}s remaining · first correct answer wins the round
        </p>
      </div>
    </main>
  );
}

function ResultScreen({ room, me, opponent, isP1, router }: {
  room: Room; me: Profile | null; opponent: Profile | null; isP1: boolean; router: ReturnType<typeof useRouter>;
}) {
  const myScore = isP1 ? room.p1_score : room.p2_score;
  const oppScore = isP1 ? room.p2_score : room.p1_score;
  const iWon = myScore > oppScore;
  const isDraw = myScore === oppScore;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <div className="card-solid w-full max-w-sm p-6 text-center slide-up">
        <div className="font-jp text-4xl mb-4">{iWon ? "勝" : isDraw ? "引" : "敗"}</div>
        <h1 className="text-2xl font-semibold mb-1">
          {iWon ? "Victory!" : isDraw ? "Draw" : "Defeat"}
        </h1>
        <p className="text-white/40 text-sm mb-6">
          {iWon ? "You dominated this round" : isDraw ? "An even match" : "Better luck next time"}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <ScoreStat label={me?.username ?? "You"} score={myScore} rounds={room.rounds} color="#534AB7" />
          <ScoreStat label={opponent?.username ?? "Opponent"} score={oppScore} rounds={room.rounds} color="#D85A30" />
        </div>

        <div className="flex flex-col gap-2">
          <button className="btn-primary" onClick={() => router.push("/matchmaking")}>⚡ Play again</button>
          <button className="btn-ghost" onClick={() => router.push("/")}>Home</button>
          <button className="btn-ghost" onClick={() => router.push("/leaderboard")}>Leaderboard</button>
        </div>
      </div>
    </main>
  );
}

function ScoreStat({ label, score, rounds, color }: { label: string; score: number; rounds: number; color: string }) {
  return (
    <div className="bg-white/4 rounded-xl p-4">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-1 truncate">{label}</p>
      <p className="font-mono text-2xl font-bold" style={{ color }}>{score}</p>
      <p className="text-white/20 text-xs">/ {rounds} rounds</p>
    </div>
  );
}

function FullPageMessage({ icon, text, pulse }: { icon: string; text: string; pulse?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className={`font-jp text-5xl text-accent2 ${pulse ? "animate-pulse" : ""}`}>{icon}</div>
      <p className="text-white/50 text-base">{text}</p>
    </div>
  );
}
