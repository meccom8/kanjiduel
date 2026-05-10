"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { checkVocabAnswer, fetchRandomWords, type VocabWord } from "@/lib/vocab";
import { useImeInput } from "@/hooks/useImeInput";
import { useRouter, useParams } from "next/navigation";

interface Room {
  id: string;
  player1_id: string; player2_id: string;
  status: string; category: string; rounds: number;
  current_round: number;
  p1_score: number; p2_score: number;
  current_kanji: VocabWord | null;
  question_type: string | null;
  round_started_at: string | null;
  winner_id?: string | null;
  invite_code?: string | null;
  is_private?: boolean;
}
interface Profile {
  id: string; username: string; elo: number;
  avatar_url?: string | null; accent_color?: string | null;
}
type GamePhase = "loading" | "waiting" | "playing" | "round_result" | "finished";
interface RoundLog { winner: "me" | "opponent" | "timeout"; word: VocabWord; answer: string; }

const ROUND_TIME = 12;
const TOTAL_ROUNDS = 11;
const WIN_SCORE = 6;

function playTone(type: "correct" | "wrong" | "timeout") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === "correct") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === "wrong") {
      osc.frequency.setValueAtTime(200, ctx.currentTime); osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

export default function DuelPage() {
  const params = useParams();
  const roomId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [me, setMe] = useState<Profile | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [roundWinner, setRoundWinner] = useState<"me" | "opponent" | "timeout" | null>(null);
  const [history, setHistory] = useState<("me" | "opponent" | "timeout")[]>([]);
  const [roundLog, setRoundLog] = useState<RoundLog[]>([]);
  const [eloChange, setEloChange] = useState<number | null>(null);
  const [conceded, setConceded] = useState(false);
  const [displayRoom, setDisplayRoom] = useState<Room | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [hiraganaMode, setHiraganaMode] = useState(false);
  const [showRomaji, setShowRomaji] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const ime = useImeInput(hiraganaMode);

  const roomRef = useRef<Room | null>(null);
  const meRef = useRef<Profile | null>(null);
  const isP1 = useRef(false);
  const lockedRef = useRef(false);
  const lastRoundRef = useRef(-1);
  const roundStartedAtRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const soundRef = useRef(true);
  // KEY: blocks poll from overriding round_result screen during countdown
  const inCountdownRef = useRef(false);
  // stores a room update that arrived while countdown was running
  const pendingRoomRef = useRef<Room | null>(null);
  const roundWinnerRef = useRef<"me" | "opponent" | "timeout" | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const hm = localStorage.getItem("pref_hiragana_mode") === "true";
      const sr = localStorage.getItem("pref_show_romaji") !== "false";
      const se = localStorage.getItem("pref_sound") !== "false";
      setHiraganaMode(hm); setShowRomaji(sr); setSoundEnabled(se);
      soundRef.current = se;
    } catch {}
  }, []);

  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { meRef.current = me; }, [me]);
  useEffect(() => { roundWinnerRef.current = roundWinner; }, [roundWinner]);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: roomData } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (!roomData) { router.push("/"); return; }

      roomRef.current = roomData;
      isP1.current = roomData.player1_id === user.id;
      const oppId = isP1.current ? roomData.player2_id : roomData.player1_id;

      const [{ data: myProfile }, { data: oppProfile }] = await Promise.all([
        supabase.from("profiles").select("id, username, elo, avatar_url, accent_color").eq("id", user.id).single(),
        supabase.from("profiles").select("id, username, elo, avatar_url, accent_color").eq("id", oppId).single(),
      ]);
      setMe(myProfile); setOpponent(oppProfile);
      setDisplayRoom(roomData);

      if (roomData.status === "finished") {
        await loadEloChange(user.id, roomData); setPhase("finished");
      } else if (roomData.status === "active") {
        if (roomData.current_kanji) {
          lastRoundRef.current = roomData.current_round;
          setPhase("playing"); startTimer(roomData.round_started_at);
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
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── Poll ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      if (finishedRef.current) return;
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (data) handleRoomUpdate(data);
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Back button ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onPopState = () => { if (!finishedRef.current) handleConcede(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    window.history.pushState(null, "", window.location.href);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // ── Countdown 3-2-1 — blocks poll during display ────────────────────────────
  function startCountdown(onDone: () => void) {
    inCountdownRef.current = true;
    setCountdown(3);
    let n = 3;
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownRef.current!);
        inCountdownRef.current = false;
        setCountdown(null);
        // Process any update that arrived while we were showing the result screen
        if (pendingRoomRef.current) {
          const pending = pendingRoomRef.current;
          pendingRoomRef.current = null;
          applyRoomUpdate(pending);
        }
        onDone();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }

  // ── Handle room update from poll ─────────────────────────────────────────────
  function handleRoomUpdate(updated: Room) {
    // If we're showing the result screen with countdown, defer until countdown ends
    if (inCountdownRef.current) {
      pendingRoomRef.current = updated;
      return;
    }
    applyRoomUpdate(updated);
  }

  function applyRoomUpdate(updated: Room) {
    const prev = roomRef.current;
    roomRef.current = updated;
    setDisplayRoom(updated);

    if (updated.status === "finished" && !finishedRef.current) {
      finishedRef.current = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      const uid = isP1.current ? updated.player1_id : updated.player2_id;
      loadEloChange(uid, updated).then(() => setPhase("finished"));
      return;
    }

    if (
      updated.current_kanji &&
      updated.current_round !== lastRoundRef.current &&
      !lockedRef.current
    ) {
      // Detect what happened to the previous round (for P2 who didn't answer)
      if (prev?.current_kanji && prev.current_round !== updated.current_round) {
        const prevOpp = isP1.current ? prev.p2_score : prev.p1_score;
        const newOpp = isP1.current ? updated.p2_score : updated.p1_score;
        const w = prev.current_kanji as VocabWord;

        if (newOpp > prevOpp) {
          if (soundRef.current) playTone("wrong");
          setRoundLog(l => [...l, { winner: "opponent", word: w, answer: w.reading }]);
          setHistory(h => [...h, "opponent"]);
          setRoundWinner("opponent");
          setPhase("round_result");
          // Show for 3s then transition
          startCountdown(() => {});
        } else {
          if (soundRef.current) playTone("timeout");
          setRoundLog(l => [...l, { winner: "timeout", word: w, answer: "(time up)" }]);
          setHistory(h => [...h, "timeout"]);
          setRoundWinner("timeout");
          setPhase("round_result");
          startCountdown(() => {});
        }
      }

      lastRoundRef.current = updated.current_round;
      lockedRef.current = false;
      roundStartedAtRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
      ime.reset();

      // Only transition to playing if countdown isn't running (not already started above)
      if (!inCountdownRef.current) {
        setCountdown(null);
        setRoundWinner(null);
        setPhase("playing");
        startTimer(updated.round_started_at);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        // Countdown is running — store the timer start for when it ends
        pendingRoomRef.current = updated;
      }
    }

    if (!updated.current_kanji && lockedRef.current && updated.status === "active") {
      lockedRef.current = false;
    }
  }

  // ── Timer ───────────────────────────────────────────────────────────────────
  function startTimer(startedAt: string | null) {
    if (startedAt && startedAt === roundStartedAtRef.current) return;
    roundStartedAtRef.current = startedAt;
    if (timerRef.current) clearInterval(timerRef.current);
    const started = startedAt ? new Date(startedAt).getTime() : Date.now();
    const elapsed = (Date.now() - started) / 1000;
    const effectiveStart = elapsed > ROUND_TIME * 0.6 ? Date.now() - elapsed * 1000 : started;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, ROUND_TIME - (Date.now() - effectiveStart) / 1000);
      setTimeLeft(Math.ceil(left));
      if (left <= 0) { clearInterval(timerRef.current!); handleTimeout(); }
    }, 200);
  }

  async function sendNextWord() {
    const words = await fetchRandomWords(supabase, 10);
    if (!words.length) return;
    const word = words[0];
    await supabase.from("rooms").update({
      current_kanji: word, question_type: "reading",
      round_started_at: new Date().toISOString(),
    }).eq("id", roomId);
  }

  async function handleTimeout() {
    if (lockedRef.current) return;
    const room = roomRef.current;
    if (!room) return;
    lockedRef.current = true;
    if (soundRef.current) playTone("timeout");

    const w = room.current_kanji as VocabWord;
    if (w) setRoundLog(l => [...l, { winner: "timeout", word: w, answer: "(time up)" }]);
    setHistory(h => [...h, "timeout"]);
    setRoundWinner("timeout");
    setPhase("round_result");
    ime.reset();

    if (isP1.current) {
      const nextRound = room.current_round + 1;
      const p1s = room.p1_score, p2s = room.p2_score;
      if (p1s >= WIN_SCORE || p2s >= WIN_SCORE || nextRound >= TOTAL_ROUNDS) {
        await callFinishMatch(p1s, p2s);
      } else {
        await supabase.from("rooms").update({ current_round: nextRound, current_kanji: null }).eq("id", roomId);
        startCountdown(async () => {
          lockedRef.current = false;
          roundStartedAtRef.current = null;
          await sendNextWord();
        });
      }
    } else {
      startCountdown(() => {
        lockedRef.current = false;
        roundStartedAtRef.current = null;
      });
    }
  }

  async function submitAnswer(val: string) {
    if (lockedRef.current) return;
    const room = roomRef.current;
    if (!room?.current_kanji) return;
    if (!checkVocabAnswer(val, room.current_kanji)) return;

    lockedRef.current = true;
    // Timer keeps running — don't clearInterval here
    if (soundRef.current) playTone("correct");

    const w = room.current_kanji as VocabWord;
    setRoundLog(l => [...l, { winner: "me", word: w, answer: val.trim() }]);
    setHistory(h => [...h, "me"]);
    setRoundWinner("me");
    setPhase("round_result");
    ime.reset();

    const p1Score = isP1.current ? room.p1_score + 1 : room.p1_score;
    const p2Score = isP1.current ? room.p2_score : room.p2_score + 1;
    const nextRound = room.current_round + 1;

    if (p1Score >= WIN_SCORE || p2Score >= WIN_SCORE || nextRound >= TOTAL_ROUNDS) {
      await supabase.from("rooms").update({ p1_score: p1Score, p2_score: p2Score }).eq("id", roomId);
      await callFinishMatch(p1Score, p2Score);
    } else {
      await supabase.from("rooms").update({
        p1_score: p1Score, p2_score: p2Score,
        current_round: nextRound, current_kanji: null,
      }).eq("id", roomId);

      if (isP1.current) {
        startCountdown(async () => {
          lockedRef.current = false;
          roundStartedAtRef.current = null;
          await sendNextWord();
        });
      } else {
        startCountdown(() => {
          lockedRef.current = false;
          roundStartedAtRef.current = null;
        });
      }
    }
  }

  async function callFinishMatch(p1Score: number, p2Score: number) {
    const room = roomRef.current;
    if (!room) return;
    const winnerId = p1Score > p2Score ? room.player1_id : p2Score > p1Score ? room.player2_id : null;
    if (!winnerId) {
      await supabase.from("rooms").update({ status: "finished", p1_score: p1Score, p2_score: p2Score }).eq("id", roomId);
      return;
    }
    await supabase.rpc("finish_match", {
      p_room_id: roomId, p_winner_id: winnerId,
      p_p1_score: p1Score, p_p2_score: p2Score,
    });
  }

  async function loadEloChange(userId: string, r: Room) {
    const { data } = await supabase.from("matches")
      .select("player1_id, p1_elo_change, p2_elo_change")
      .eq("player1_id", r.player1_id).eq("player2_id", r.player2_id)
      .order("played_at", { ascending: false }).limit(1).single();
    if (data) setEloChange(data.player1_id === userId ? data.p1_elo_change : data.p2_elo_change);
  }

  async function handleConcede() {
    const me = meRef.current;
    if (!me || finishedRef.current) return;
    const room = roomRef.current;
    if (!room) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    const winnerId = isP1.current ? room.player2_id : room.player1_id;
    const p1Score = isP1.current ? 0 : WIN_SCORE;
    const p2Score = isP1.current ? WIN_SCORE : 0;
    await supabase.rpc("finish_match", {
      p_room_id: roomId, p_winner_id: winnerId,
      p_p1_score: p1Score, p_p2_score: p2Score,
    });
    await loadEloChange(me.id, room);
    setConceded(true);
    setPhase("finished");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (phase === "loading") return <FullPageMsg text="Loading duel…" pulse />;
  if (phase === "waiting") {
    const room = displayRoom;
    const isPrivate = room?.is_private && room?.invite_code;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
        <div className="card-solid w-full max-w-sm p-8 text-center slide-up">
          <div className="font-jp text-5xl mb-5 animate-pulse text-accent2">漢</div>

          {isPrivate ? (
            <>
              <p className="text-lg font-medium mb-1">Waiting for opponent…</p>
              <p className="text-white/40 text-sm mb-6">Share this code or link with your friend</p>
              <div className="bg-white/4 rounded-2xl p-4 mb-3"
                style={{ border: "1px solid rgba(127,119,221,0.2)" }}>
                <p className="font-mono text-3xl font-bold tracking-widest mb-3 text-accent2">
                  {room.invite_code}
                </p>
                <CopyButton
                  text={`${typeof window !== "undefined" ? window.location.origin : ""}/play/${room.invite_code}`}
                  label="Copy invite link"
                />
              </div>
              <p className="text-xs text-white/25 mb-6">
                They can also go to <span className="font-mono text-white/40">/play/{room.invite_code}</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium mb-2">Finding a match…</p>
              <p className="text-white/40 text-sm mb-6">Waiting for an opponent</p>
            </>
          )}

          <button
            onClick={async () => {
              if (pollRef.current) clearInterval(pollRef.current);
              await supabase.from("rooms")
                .update({ status: "cancelled" })
                .eq("id", roomId)
                .eq("status", "waiting");
              router.push("/");
            }}
            className="btn-ghost w-full">
            Cancel
          </button>
        </div>
      </main>
    );
  }
  if (phase === "finished" && displayRoom) {
    return <ResultScreen room={displayRoom} me={me} opponent={opponent}
      isP1={isP1.current} router={router} roundLog={roundLog}
      eloChange={eloChange} conceded={conceded} showRomaji={showRomaji} />;
  }

  const room = displayRoom;
  const myScore = room ? (isP1.current ? room.p1_score : room.p2_score) : 0;
  const oppScore = room ? (isP1.current ? room.p2_score : room.p1_score) : 0;
  const word = room?.current_kanji as VocabWord | null;
  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const myAccent = me?.accent_color ?? "#534AB7";
  const oppAccent = opponent?.accent_color ?? "#D85A30";

  // Card border color based on round result
  const cardBorder = phase === "round_result"
    ? roundWinner === "me" ? "1px solid #1D9E75"
    : roundWinner === "opponent" ? `1px solid #E24B4A`
    : roundWinner === "timeout" ? "1px solid rgba(255,255,255,0.15)"
    : "1px solid rgba(83,74,183,0.35)"
    : "1px solid rgba(83,74,183,0.35)";

  // Timer bar color
  const timerBarColor = (roundWinner === "opponent" || roundWinner === "timeout")
    ? "#E24B4A"
    : timeLeft <= 3 ? "#E24B4A" : timeLeft <= 6 ? "#EF9F27" : "#534AB7";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md">

        {/* ── Scores + ELO ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: myAccent + "33", color: myAccent, border: `1.5px solid ${myAccent}44` }}>
              {me?.avatar_url ? <img src={me.avatar_url} alt="" className="w-full h-full object-cover" /> : (me?.username ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-white/40 truncate max-w-20">{me?.username ?? "You"}</p>
              <p className="font-mono text-2xl font-bold" style={{ color: myAccent }}>{myScore}</p>
              <p className="text-xs font-mono opacity-60" style={{ color: myAccent }}>{me?.elo ?? "—"}</p>
            </div>
          </div>

          {/* Round + countdown */}
          <div className="text-center">
            <p className="text-xs text-white/40 font-mono">{(room?.current_round ?? 0) + 1}/{TOTAL_ROUNDS}</p>
            <p className="text-white/20 text-xs">round</p>
            {countdown !== null && (
              <div className="mt-1">
                <p className="font-mono font-bold text-3xl" style={{ color: "#EF9F27", textShadow: "0 0 20px #EF9F2799" }}>
                  {countdown}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <div className="text-right">
              <p className="text-xs text-white/40 truncate max-w-20">{opponent?.username ?? "Opp"}</p>
              <p className="font-mono text-2xl font-bold" style={{ color: oppAccent }}>{oppScore}</p>
              <p className="text-xs font-mono opacity-60" style={{ color: oppAccent }}>{opponent?.elo ?? "—"}</p>
            </div>
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: oppAccent + "33", color: oppAccent, border: `1.5px solid ${oppAccent}44` }}>
              {opponent?.avatar_url ? <img src={opponent.avatar_url} alt="" className="w-full h-full object-cover" /> : (opponent?.username ?? "?").slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{
              background: i < history.length
                ? history[i] === "me" ? myAccent : history[i] === "opponent" ? "#E24B4A" : "rgba(255,255,255,0.15)"
                : "rgba(255,255,255,0.08)"
            }} />
          ))}
        </div>

        {/* Timer bar — always running */}
        <div className="h-0.5 bg-white/8 rounded-full mb-5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-200"
            style={{ width: `${timerPct}%`, background: timerBarColor }} />
        </div>

        {/* ── Word card ───────────────────────────────────────────────────── */}
        <div className="card-solid p-7 text-center mb-4" style={{ border: cardBorder }}>
          {word ? (
            <>
              <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
                style={{ background: "#FAEEDA22", color: "#EF9F27" }}>Reading</span>
              <div className="font-jp text-6xl mb-2 text-white pop-in">{word.word}</div>
              <p className="text-white/35 text-sm italic mb-2">{word.meaning}</p>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full" style={{
                background: word.jlpt === "N5" ? "#1D9E7522" : word.jlpt === "N4" ? "#4DB6AC22" : word.jlpt === "N3" ? "#B8860B22" : word.jlpt === "N2" ? "#D85A3022" : "#C6282822",
                color: word.jlpt === "N5" ? "#1D9E75" : word.jlpt === "N4" ? "#4DB6AC" : word.jlpt === "N3" ? "#B8860B" : word.jlpt === "N2" ? "#D85A30" : "#C62828",
              }}>{word.jlpt}</span>
              {phase === "playing" && (
                <p className="text-white/20 text-xs mt-2">
                  {hiraganaMode ? "Type romaji — auto-converts to hiragana" : "Type the reading in hiragana or romaji"}
                </p>
              )}
            </>
          ) : (
            <div className="font-jp text-4xl text-white/10 animate-pulse">漢</div>
          )}

          {/* ── Round result message ── */}
          {phase === "round_result" && roundWinner && (
            <div className="mt-5 pop-in">
              {roundWinner === "me" && (
                <div>
                  <p className="text-base font-semibold mb-1" style={{ color: "#5DCAA5" }}>✓ You got it!</p>
                  <p className="text-xs text-white/30">Next round in {countdown ?? 0}s</p>
                </div>
              )}
              {roundWinner === "opponent" && (
                <div>
                  <p className="text-base font-semibold mb-1" style={{ color: "#E24B4A" }}>
                    ✗ {opponent?.username ?? "Opponent"} answered first!
                  </p>
                  <p className="text-white/50 text-sm">
                    Answer: <span className="font-mono text-white/80">{word?.reading}</span>
                    {showRomaji && <span className="text-white/30 ml-2">({word?.romaji})</span>}
                  </p>
                  <p className="text-xs text-white/30 mt-1">Next round in {countdown ?? 0}s</p>
                </div>
              )}
              {roundWinner === "timeout" && (
                <div>
                  <p className="text-base font-semibold mb-1 text-white/50">⏱ Time up!</p>
                  <p className="text-white/50 text-sm">
                    Answer: <span className="font-mono text-white/80">{word?.reading}</span>
                    {showRomaji && <span className="text-white/30 ml-2">({word?.romaji})</span>}
                  </p>
                  <p className="text-xs text-white/30 mt-1">Next round in {countdown ?? 0}s</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Input ──────────────────────────────────────────────────────── */}
        <div className="relative mb-3">
          <input
            ref={inputRef}
            className={`input-field text-center text-lg w-full transition-all ${
              phase === "round_result" && roundWinner === "me" ? "input-correct" :
              phase === "round_result" && (roundWinner === "opponent" || roundWinner === "timeout") ? "input-wrong" : ""
            }`}
            placeholder={hiraganaMode ? "ka · shi · tsu → か · し · つ" : "Type your answer…"}
            value={ime.displayed}
            disabled={phase === "round_result"}
            autoComplete="off" autoCorrect="off" spellCheck={false}
            onChange={(e) => { ime.onChange(e); submitAnswer(ime.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") submitAnswer(ime.value); }}
          />
          {hiraganaMode && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>あ</div>
          )}
        </div>

        <p className="text-center text-xs mb-4 font-mono" style={{
          color: (roundWinner === "opponent" || roundWinner === "timeout") ? "#E24B4A" : "rgba(255,255,255,0.2)"
        }}>
          {timeLeft}s · {
            roundWinner === "opponent" ? `${opponent?.username ?? "Opponent"} answered first!` :
            roundWinner === "me" ? "Next round soon…" :
            roundWinner === "timeout" ? "Time up!" :
            "first correct answer wins the round"
          }
        </p>

        <button onClick={handleConcede}
          className="w-full text-xs text-white/15 hover:text-red-400/60 transition-colors py-2 border border-white/5 rounded-xl hover:border-red-400/20">
          🏳 Concede — forfeit the match
        </button>
      </div>
    </main>
  );
}

// ── Result screen ──────────────────────────────────────────────────────────────
function ResultScreen({ room, me, opponent, isP1, router, roundLog, eloChange, conceded, showRomaji }: {
  room: Room; me: Profile | null; opponent: Profile | null;
  isP1: boolean; router: ReturnType<typeof useRouter>;
  roundLog: RoundLog[]; eloChange: number | null;
  conceded: boolean; showRomaji: boolean;
}) {
  const myScore = isP1 ? room.p1_score : room.p2_score;
  const oppScore = isP1 ? room.p2_score : room.p1_score;
  const myId = isP1 ? room.player1_id : room.player2_id;
  const iWon = room.winner_id ? room.winner_id === myId : myScore > oppScore;
  const isDraw = !room.winner_id && myScore === oppScore;

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <div className="card-solid p-6 text-center mb-4 slide-up">
        <div className="font-jp text-5xl mb-3">{iWon ? "勝" : isDraw ? "引" : "敗"}</div>
        <h1 className="text-2xl font-semibold mb-1">{iWon ? "Victory!" : isDraw ? "Draw" : "Defeat"}</h1>
        {conceded && !iWon && <p className="text-white/30 text-xs mb-1">You conceded the match</p>}
        {conceded && iWon && <p className="text-white/30 text-xs mb-1">{opponent?.username} conceded</p>}

        <div className="flex items-center justify-center gap-4 my-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold"
              style={{ background: (me?.accent_color ?? "#534AB7") + "33", color: me?.accent_color ?? "#7F77DD", border: `2px solid ${me?.accent_color ?? "#534AB7"}44` }}>
              {me?.avatar_url ? <img src={me.avatar_url} alt="" className="w-full h-full object-cover" /> : (me?.username ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <p className="text-xs text-white/50">{me?.username ?? "You"}</p>
          </div>
          <span className="text-white/20 text-sm">vs</span>
          <a href={`/user/${opponent?.username}`} className="flex flex-col items-center gap-1 hover:opacity-80">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold"
              style={{ background: (opponent?.accent_color ?? "#D85A30") + "33", color: opponent?.accent_color ?? "#D85A30", border: `2px solid ${opponent?.accent_color ?? "#D85A30"}44` }}>
              {opponent?.avatar_url ? <img src={opponent.avatar_url} alt="" className="w-full h-full object-cover" /> : (opponent?.username ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <p className="text-xs text-white/50">{opponent?.username ?? "?"}</p>
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: me?.username ?? "You", score: myScore, color: me?.accent_color ?? "#534AB7" },
            { label: opponent?.username ?? "Opp", score: oppScore, color: opponent?.accent_color ?? "#D85A30" },
          ].map(s => (
            <div key={s.label} className="bg-white/4 rounded-xl p-3">
              <p className="text-xs text-white/40 truncate mb-1">{s.label}</p>
              <p className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.score}</p>
              <p className="text-white/20 text-xs">/ {TOTAL_ROUNDS}</p>
            </div>
          ))}
        </div>

        {eloChange !== null && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4"
            style={{
              background: eloChange >= 0 ? "rgba(29,158,117,0.15)" : "rgba(226,75,74,0.15)",
              border: eloChange >= 0 ? "1px solid #1D9E7544" : "1px solid #E24B4A44",
            }}>
            <span className="font-mono text-lg font-bold" style={{ color: eloChange >= 0 ? "#5DCAA5" : "#E24B4A" }}>
              {eloChange >= 0 ? "+" : ""}{eloChange}
            </span>
            <span className="text-xs text-white/40">ELO</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button className="btn-primary" onClick={() => router.push("/matchmaking")}>⚡ Play again</button>
          <button className="btn-ghost" onClick={() => router.push("/")}>Home</button>
        </div>
      </div>

      {roundLog.length > 0 && (
        <div className="card-solid overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest">Round recap</p>
          </div>
          {roundLog.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
              <span className="font-mono text-xs text-white/20 w-5 flex-shrink-0">{i + 1}</span>
              <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{
                background: r.winner === "me" ? (me?.accent_color ?? "#534AB7") : r.winner === "opponent" ? "#E24B4A" : "rgba(255,255,255,0.15)"
              }} />
              <div className="font-jp text-xl w-12 text-center flex-shrink-0">{r.word.word}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/30 truncate">{r.word.meaning}</p>
                <p className="text-sm font-mono text-white/60">{r.word.reading}</p>
                {showRomaji && <p className="text-xs font-mono text-white/25">{r.word.romaji}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-medium" style={{
                  color: r.winner === "me" ? "#5DCAA5" : r.winner === "opponent" ? "#E24B4A" : "#9090a8"
                }}>
                  {r.winner === "me" ? "✓ You" : r.winner === "opponent" ? `✓ ${opponent?.username ?? "Opp"}` : "⏱ Time"}
                </p>
                <p className="text-xs text-white/20 font-mono">{r.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); } catch {}
        setCopied(true); setTimeout(() => setCopied(false), 2000);
      }}
      className="w-full text-sm py-2 rounded-xl transition-all"
      style={{ background: "rgba(127,119,221,0.2)", color: "#7F77DD", border: "1px solid rgba(127,119,221,0.3)" }}>
      {copied ? "✓ Copied!" : label}
    </button>
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
