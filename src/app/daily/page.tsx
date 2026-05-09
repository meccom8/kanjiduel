"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { checkVocabAnswer, getDailyWords, type VocabWord } from "@/lib/vocab";
import { updateStreak } from "@/lib/stats";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Phase = "loading" | "already_done" | "playing" | "feedback" | "finished";

interface RoundStat {
  word: VocabWord;
  correct: boolean;
  userAnswer: string;
}

const ROUND_TIME = 12;
const MEDALS = ["🥇", "🥈", "🥉"];

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export default function DailyChallenge() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [queue, setQueue] = useState<VocabWord[]>([]);
  const [roundNum, setRoundNum] = useState(0);
  const [current, setCurrent] = useState<VocabWord | null>(null);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [stats, setStats] = useState<RoundStat[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ username: string; score: number; total: number }[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const today = getTodayDate();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // Check if already played today
      const { data: existing } = await supabase
        .from("daily_results").select("score, total")
        .eq("user_id", user.id).eq("date", today).single();

      if (existing) {
        setPreviousScore(existing.score);
        await loadLeaderboard();
        setPhase("already_done");
        return;
      }

      // Load vocabulary for today
      const { data: words } = await supabase
        .from("vocabulary")
        .select("id, word, reading, romaji, meaning, jlpt, level");

      if (!words || words.length === 0) {
        router.push("/");
        return;
      }

      const todayWords = getDailyWords(words, today, 10);
      setQueue(todayWords);
      loadRound(todayWords, 0);
    })();
  }, []);

  async function loadLeaderboard() {
    const { data } = await supabase
      .from("daily_results")
      .select("score, total, profiles(username)")
      .eq("date", today)
      .order("score", { ascending: false })
      .limit(10);

    if (data) {
      setLeaderboard(data.map((r: any) => ({
        username: r.profiles?.username ?? "?",
        score: r.score,
        total: r.total,
      })));
    }
  }

  function loadRound(q: VocabWord[], idx: number) {
    if (idx >= q.length) return;
    setCurrent(q[idx]);
    setInput("");
    setRoundNum(idx);
    setPhase("playing");
    startTimer(() => handleResult(q[idx], false, "(time up)"));
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function startTimer(onEnd: () => void) {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(ROUND_TIME);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const left = Math.max(0, ROUND_TIME - (Date.now() - start) / 1000);
      setTimeLeft(Math.ceil(left));
      if (left <= 0) { clearInterval(timerRef.current!); onEnd(); }
    }, 200);
  }

  function handleResult(word: VocabWord, correct: boolean, userAns: string) {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCorrect(correct);
    setStats(s => {
      const newStats = [...s, { word, correct, userAnswer: userAns }];
      if (newStats.length >= queue.length) {
        setTimeout(() => finishChallenge(newStats), correct ? 1200 : 2000);
      } else {
        setTimeout(() => loadRound(queue, newStats.length), correct ? 1200 : 2000);
      }
      return newStats;
    });
    setPhase("feedback");
  }

  async function finishChallenge(finalStats: RoundStat[]) {
    if (!userId) return;
    const score = finalStats.filter(s => s.correct).length;
    await Promise.all([
      supabase.from("daily_results").insert({
        user_id: userId, date: today,
        score, total: finalStats.length,
      }),
      updateStreak(userId),
    ]);
    await loadLeaderboard();
    setPhase("finished");
  }

  function submitAnswer(val: string) {
    if (phase !== "playing" || !current) return;
    if (!checkVocabAnswer(val, current)) return;
    handleResult(current, true, val.trim());
  }

  const score = stats.filter(s => s.correct).length;
  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const timerColor = timeLeft <= 3 ? "#E24B4A" : timeLeft <= 6 ? "#EF9F27" : "#534AB7";

  if (phase === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="font-jp text-4xl text-accent2 animate-pulse">漢</div></div>;
  }

  if (phase === "already_done") {
    return (
      <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
        <Link href="/" className="text-sm text-white/30 hover:text-white/60 mb-6 inline-block">← Back</Link>
        <div className="card-solid p-6 text-center mb-4 slide-up">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-xl font-semibold mb-1">Already done today!</h1>
          <p className="text-white/40 text-sm mb-4">Come back tomorrow for new words</p>
          <div className="bg-white/4 rounded-xl p-4 mb-4">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Your score</p>
            <p className="font-mono text-3xl font-bold text-accent2">{previousScore} / 10</p>
          </div>
        </div>
        <LeaderboardPanel data={leaderboard} medals={MEDALS} />
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/practice"><button className="btn-primary">📖 Practice more</button></Link>
          <Link href="/matchmaking"><button className="btn-ghost">⚡ Find a match</button></Link>
        </div>
      </main>
    );
  }

  if (phase === "finished") {
    const pct = Math.round((score / queue.length) * 100);
    return (
      <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
        <div className="card-solid p-6 text-center mb-4 slide-up">
          <div className="text-4xl mb-3">{pct >= 80 ? "🏆" : pct >= 60 ? "👍" : pct >= 40 ? "😓" : "💀"}</div>
          <h1 className="text-2xl font-semibold mb-1">Daily complete!</h1>
          <p className="text-white/40 text-sm mb-4">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white/4 rounded-xl p-3">
              <p className="font-mono text-2xl font-bold text-accent2">{score}/{queue.length}</p>
              <p className="text-xs text-white/30 mt-0.5">Score</p>
            </div>
            <div className="bg-white/4 rounded-xl p-3">
              <p className="font-mono text-2xl font-bold" style={{ color: "#EF9F27" }}>{pct}%</p>
              <p className="text-xs text-white/30 mt-0.5">Accuracy</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/practice"><button className="btn-primary">📖 Practice more</button></Link>
            <Link href="/"><button className="btn-ghost">Home</button></Link>
          </div>
        </div>

        <LeaderboardPanel data={leaderboard} medals={MEDALS} />

        <div className="card-solid overflow-hidden mt-4">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest">Review</p>
          </div>
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
              <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: s.correct ? "#1D9E75" : "#E24B4A" }} />
              <div className="font-jp text-xl w-12 text-center">{s.word.word}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/30">{s.word.jlpt} · {s.word.meaning}</p>
                <p className="text-sm font-mono">{s.word.reading}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono" style={{ color: s.correct ? "#5DCAA5" : "#E24B4A" }}>{s.userAnswer}</p>
                {!s.correct && <p className="text-xs text-white/30 font-mono">{s.word.reading}</p>}
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-white/40">{roundNum + 1} / {queue.length}</span>
          <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "#534AB722", color: "#7F77DD" }}>
            🗓 Daily Challenge
          </span>
          <span className="font-mono text-sm font-bold" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>

        <div className="flex gap-1 mb-4">
          {Array.from({ length: queue.length }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{
              background: i < stats.length
                ? stats[i].correct ? "#534AB7" : "#E24B4A"
                : i === roundNum ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)"
            }} />
          ))}
        </div>

        <div className="h-0.5 bg-white/8 rounded-full mb-6 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-200" style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>

        {current && (
          <div className="card-solid p-8 text-center mb-4 transition-all" style={{
            border: phase === "feedback"
              ? isCorrect ? "1px solid #1D9E75" : "1px solid #E24B4A"
              : "1px solid rgba(83,74,183,0.35)"
          }}>
            <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
              style={{ background: "#FAEEDA22", color: "#EF9F27" }}>Reading</span>
            <div className="font-jp text-6xl mb-3 text-white pop-in">{current.word}</div>
            <p className="text-white/35 text-sm italic mb-2">{current.meaning}</p>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#7F77DD22", color: "#7F77DD" }}>
              {current.jlpt}
            </span>
            {phase === "feedback" && (
              <div className="mt-4 pop-in">
                {isCorrect ? (
                  <p className="text-sm font-medium" style={{ color: "#5DCAA5" }}>✓ Correct!</p>
                ) : (
                  <div>
                    <p className="text-sm" style={{ color: "#E24B4A" }}>✗ Wrong</p>
                    <p className="text-white/50 text-sm mt-1">
                      Answer: <span className="text-white font-mono">{current.reading}</span>
                      <span className="text-white/30 ml-2">({current.romaji})</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          className={`input-field text-center text-lg mb-2 ${phase === "feedback" && isCorrect ? "input-correct" : phase === "feedback" ? "input-wrong" : ""}`}
          placeholder="Type the reading..."
          value={input}
          disabled={phase === "feedback"}
          autoComplete="off" autoCorrect="off" spellCheck={false}
          onChange={(e) => { setInput(e.target.value); submitAnswer(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") submitAnswer(input); }}
        />

        <div className="flex justify-between items-center text-xs mt-3">
          <span style={{ color: "#5DCAA5" }}>✓ {score}</span>
          <Link href="/" className="text-white/20 hover:text-white/50 transition-colors">← Home</Link>
          <span style={{ color: "#E24B4A" }}>✗ {stats.length - score}</span>
        </div>
      </div>
    </main>
  );
}

function LeaderboardPanel({ data, medals }: { data: { username: string; score: number; total: number }[]; medals: string[] }) {
  if (!data.length) return null;
  return (
    <div className="card-solid overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5">
        <p className="text-xs text-white/40 uppercase tracking-widest">Today's leaderboard</p>
      </div>
      {data.map((r, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
          <span className="text-sm w-6 text-center" style={{ color: i < 3 ? "#EF9F27" : "rgba(255,255,255,0.2)" }}>
            {medals[i] ?? i + 1}
          </span>
          <span className="flex-1 text-sm font-medium">{r.username}</span>
          <span className="font-mono text-sm" style={{ color: "#7F77DD" }}>{r.score}/{r.total}</span>
        </div>
      ))}
    </div>
  );
}
