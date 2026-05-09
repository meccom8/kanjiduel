"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { checkVocabAnswer, shuffle, type VocabWord } from "@/lib/vocab";
import { calcELO } from "@/lib/elo";
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
  current_kanji: VocabWord | null;
  question_type: string | null;
  round_started_at: string | null;
}

interface Profile { id: string; username: string; elo: number; }
type GamePhase = "loading" | "waiting" | "playing" | "round_result" | "finished";

const ROUND_TIME = 12;
const TOTAL_ROUNDS = 11;

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
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const isP1 = useRef(false);
  const lockedRef = useRef(false);
  const lastRoundRef = useRef(-1);
  const roundStartedAtRef = useRef<string | null>(null);

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

      if (roomData.status === "finished") {
        setPhase("finished");
      } else if (roomData.status === "active") {
        if (roomData.current_kanji) {
          lastRoundRef.current = roomData.current_round;
          setPhase("playing");
          startTimer(roomData.round_started_at);
        } else if (isP1.current) {
          await sendNextWord();
        } else {
          setPhase("playing");
        }
      } else {
        setPhase("waiting");
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Polling every 2.5s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (data) applyRoomUpdate(data);
    }, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [me]);

  // Realtime
  useEffect(() => {
    const sub = supabase
      .channel(`duel-${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => applyRoomUpdate(payload.new as Room))
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [me]);

  // Block back button
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const handlePopState = () => { concede(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.href);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [room, me]);

  function applyRoomUpdate(updated: Room) {
    setRoom(updated);
    if (updated.status === "finished") { setPhase("finished"); return; }
    if (
      updated.current_kanji &&
      updated.status === "active" &&
      updated.current_round !== lastRoundRef.current
    ) {
      lastRoundRef.current = updated.current_round;
      lockedRef.current = false;
      roundStartedAtRef.current = null; // Reset so new timer can start
      if (timerRef.current) clearInterval(timerRef.current);
      setAnswer("");
      setRoundWinner(null);
      setPhase("playing");
      startTimer(updated.round_started_at);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function startTimer(startedAt: string | null) {
    // Don't restart timer if same round already running
    if (startedAt && startedAt === roundStartedAtRef.current) return;
    roundStartedAtRef.current = startedAt;
    if (timerRef.current) clearInterval(timerRef.current);
    const started = startedAt ? new Date(startedAt).getTime() : Date.now();
    timerRef.current = setInterval(() => {
      const left = Math.max(0, ROUND_TIME - (Date.now() - started) / 1000);
      setTimeLeft(Math.ceil(left));
      if (left <= 0) { clearInterval(timerRef.current!); handleTimeout(); }
    }, 200);
  }

  async function sendNextWord() {
    const { data: words } = await supabase
      .from("vocabulary")
      .select("id, word, reading, romaji, meaning, jlpt, level")
      .limit(500);
    if (!words || words.length === 0) return;
    const word = shuffle(words as VocabWord[])[0];
    await supabase.from("rooms").update({
      current_kanji: word,
      question_type: "reading",
      round_started_at: new Date().toISOString(),
    }).eq("id", roomId);
  }

  async function handleTimeout() {
    if (lockedRef.current || !room) return;
    lockedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswer("");
    setRoundWinner("timeout");
    setPhase("round_result");
    setHistory(h => [...h, "timeout"]);

    const p1s = room.p1_score;
    const p2s = room.p2_score;
    if (p1s >= 6 || p2s >= 6) { await endGame(p1s, p2s); return; }

    if (isP1.current) {
      const nextRound = room.current_round + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        await endGame(p1s, p2s);
      } else {
        await supabase.from("rooms").update({ current_round: nextRound, current_kanji: null }).eq("id", roomId);
        setTimeout(async () => { lockedRef.current = false; await sendNextWord(); }, 2000);
      }
    } else {
      // P2: just unlock after delay, applyRoomUpdate will handle the new round
      setTimeout(() => { 
        lockedRef.current = false;
      }, 1500);
    }
  }

  async function submitAnswer(val: string) {
    if (lockedRef.current || !room || !room.current_kanji) return;
    if (!checkVocabAnswer(val, room.current_kanji)) return;

    lockedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setRoundWinner("me");
    setPhase("round_result");
    setHistory(h => [...h, "me"]);

    const p1Score = isP1.current ? room.p1_score + 1 : room.p1_score;
    const p2Score = isP1.current ? room.p2_score : room.p2_score + 1;
    const nextRound = room.current_round + 1;

    if (p1Score >= 6 || p2Score >= 6 || nextRound >= TOTAL_ROUNDS) {
      await supabase.from("rooms").update({ p1_score: p1Score, p2_score: p2Score, current_round: nextRound }).eq("id", roomId);
      await endGame(p1Score, p2Score);
    } else {
      await supabase.from("rooms").update({
        p1_score: p1Score, p2_score: p2Score,
        current_round: nextRound, current_kanji: null,
      }).eq("id", roomId);
      setTimeout(async () => { lockedRef.current = false; await sendNextWord(); }, 2000);
    }
  }

  async function concede() {
    if (!room || !me) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    const p1Score = isP1.current ? 0 : TOTAL_ROUNDS;
    const p2Score = isP1.current ? TOTAL_ROUNDS : 0;
    await endGame(p1Score, p2Score);
    router.push("/");
  }

  async function endGame(p1Score: number, p2Score: number) {
    if (!room) return;
    const p1Id = room.player1_id;
    const p2Id = room.player2_id;
    let winnerId: string | null = null;
    if (p1Score > p2Score) winnerId = p1Id;
    else if (p2Score > p1Score) winnerId = p2Id;

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
          rounds: TOTAL_ROUNDS, category: room.category,
        }),
      ]);
    }
    await supabase.from("rooms").update({ status: "finished" }).eq("id", roomId);
  }

  if (phase === "loading") return <FullPageMsg text="Loading duel…" pulse />;
  if (phase === "waiting") return <FullPageMsg text="Waiting for opponent…" pulse />;
  if (phase === "finished" && room) {
    return <ResultScreen room={room} me={me} opponent={opponent} isP1={isP1.current} router={router} />;
  }

  const myScore = isP1.current ? room?.p1_score ?? 0 : room?.p2_score ?? 0;
  const oppScore = isP1.current ? room?.p2_score ?? 0 : room?.p1_score ?? 0;
  const currentRound = (room?.current_round ?? 0) + 1;
  const word = room?.current_kanji as VocabWord | null;
  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const timerColor = timeLeft <= 3 ? "#E24B4A" : timeLeft <= 6 ? "#EF9F27" : "#534AB7";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md">
        {/* Scores */}
        <div className="grid grid-cols-3 items-center mb-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1 truncate">{me?.username ?? "You"}</p>
            <p className="font-mono text-3xl font-bold text-accent2">{myScore}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/40 font-mono">{currentRound}/{TOTAL_ROUNDS}</p>
            <p className="text-white/20 text-xs mt-1">round</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1 truncate">{opponent?.username ?? "Opponent"}</p>
            <p className="font-mono text-3xl font-bold" style={{ color: "#D85A30" }}>{oppScore}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{
              background: i < history.length
                ? history[i] === "me" ? "#534AB7" : history[i] === "opponent" ? "#D85A30" : "rgba(255,255,255,0.15)"
                : "rgba(255,255,255,0.08)"
            }} />
          ))}
        </div>

        {/* Timer bar */}
        <div className="h-0.5 bg-white/8 rounded-full mb-6 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-200" style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>

        {/* Word card */}
        <div className="card-solid p-8 text-center mb-4" style={{
          border: phase === "round_result"
            ? roundWinner === "me" ? "1px solid #1D9E75" : roundWinner === "opponent" ? "1px solid #D85A30" : "1px solid rgba(255,255,255,0.15)"
            : "1px solid rgba(83,74,183,0.35)"
        }}>
          {word && (
            <>
              <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
                style={{ background: "#FAEEDA22", color: "#EF9F27" }}>
                Reading
              </span>
              <div className="font-jp text-6xl mb-2 text-white pop-in">{word.word}</div>
              <p className="text-white/35 text-sm italic mb-2">{word.meaning}</p>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full mb-2"
                style={{
                  background: word.jlpt === "N5" ? "#1D9E7522" : word.jlpt === "N4" ? "#4DB6AC22" : word.jlpt === "N3" ? "#B8860B22" : word.jlpt === "N2" ? "#D85A3022" : "#C6282822",
                  color: word.jlpt === "N5" ? "#1D9E75" : word.jlpt === "N4" ? "#4DB6AC" : word.jlpt === "N3" ? "#B8860B" : word.jlpt === "N2" ? "#D85A30" : "#C62828",
                }}>
                {word.jlpt}
              </span>
              <p className="text-white/20 text-xs">Type the reading in hiragana or romaji</p>
            </>
          )}
          {phase === "round_result" && roundWinner && (
            <div className="mt-4 pop-in">
              <p className="text-sm font-medium" style={{
                color: roundWinner === "me" ? "#5DCAA5" : roundWinner === "timeout" ? "#9090a8" : "#D85A30"
              }}>
                {roundWinner === "me" ? "✓ You got it!" : roundWinner === "timeout" ? "Time up!" : "Opponent got it!"}
              </p>
              {roundWinner !== "me" && word && (
                <p className="text-white/40 text-xs mt-1">
                  Answer: <span className="text-white/70 font-mono">{word.reading}</span>
                  <span className="text-white/30 ml-1">({word.romaji})</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          className={`input-field text-center text-lg mb-3 ${phase === "round_result" && roundWinner === "me" ? "input-correct" : ""}`}
          placeholder="Type your answer…"
          value={answer}
          disabled={phase === "round_result"}
          autoComplete="off" autoCorrect="off" spellCheck={false}
          onChange={(e) => { setAnswer(e.target.value); submitAnswer(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") submitAnswer(answer); }}
        />

        <p className="text-center text-xs text-white/20 mb-4 font-mono">
          {timeLeft}s · first correct answer wins the round
        </p>

        <button onClick={concede}
          className="w-full text-xs text-white/15 hover:text-red-400/60 transition-colors py-2 border border-white/5 rounded-xl hover:border-red-400/20">
          🏳 Concede — forfeit the match
        </button>
      </div>
    </main>
  );
}

function ResultScreen({ room, me, opponent, isP1, router }: {
  room: Room; me: Profile | null; opponent: Profile | null;
  isP1: boolean; router: ReturnType<typeof useRouter>;
}) {
  const myScore = isP1 ? room.p1_score : room.p2_score;
  const oppScore = isP1 ? room.p2_score : room.p1_score;
  const iWon = myScore > oppScore;
  const isDraw = myScore === oppScore;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <div className="card-solid w-full max-w-sm p-6 text-center slide-up">
        <div className="font-jp text-4xl mb-4">{iWon ? "勝" : isDraw ? "引" : "敗"}</div>
        <h1 className="text-2xl font-semibold mb-1">{iWon ? "Victory!" : isDraw ? "Draw" : "Defeat"}</h1>
        <p className="text-white/40 text-sm mb-6">
          {iWon ? "You dominated" : isDraw ? "An even match" : "Better luck next time"}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: me?.username ?? "You", score: myScore, color: "#534AB7" },
            { label: opponent?.username ?? "Opponent", score: oppScore, color: "#D85A30" },
          ].map(s => (
            <div key={s.label} className="bg-white/4 rounded-xl p-4">
              <p className="text-xs text-white/40 truncate mb-1">{s.label}</p>
              <p className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.score}</p>
              <p className="text-white/20 text-xs">/ {TOTAL_ROUNDS}</p>
            </div>
          ))}
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

function FullPageMsg({ text, pulse }: { text: string; pulse?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className={`font-jp text-5xl text-accent2 ${pulse ? "animate-pulse" : ""}`}>漢</div>
      <p className="text-white/50">{text}</p>
    </div>
  );
}
