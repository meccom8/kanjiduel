"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { checkVocabAnswer, shuffle, getEloMaxLevel, type VocabWord } from "@/lib/vocab";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Phase = "loading" | "setup" | "playing" | "feedback" | "finished";
type Filter = "all" | "N5" | "N4" | "N3" | "N2" | "N1";

interface RoundStat {
  word: VocabWord;
  correct: boolean;
  userAnswer: string;
}

const FILTER_OPTIONS = [
  { value: "all" as Filter, label: "All levels", color: "#7F77DD" },
  { value: "N5" as Filter, label: "JLPT N5", color: "#1D9E75" },
  { value: "N4" as Filter, label: "JLPT N4", color: "#4DB6AC" },
  { value: "N3" as Filter, label: "JLPT N3", color: "#B8860B" },
  { value: "N2" as Filter, label: "JLPT N2", color: "#D85A30" },
  { value: "N1" as Filter, label: "JLPT N1", color: "#C62828" },
];

const ROUND_TIME = 15;
const TOTAL_ROUNDS = 20;

export default function Practice() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [filter, setFilter] = useState<Filter>("N5");
  const [allWords, setAllWords] = useState<Record<string, VocabWord[]>>({});
  const [queue, setQueue] = useState<VocabWord[]>([]);
  const [current, setCurrent] = useState<VocabWord | null>(null);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [stats, setStats] = useState<RoundStat[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [roundNum, setRoundNum] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Load words from Supabase on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("vocabulary")
        .select("id, word, reading, romaji, meaning, jlpt, level")
        .order("level", { ascending: true });

      if (data) {
        const grouped: Record<string, VocabWord[]> = { all: data };
        for (const w of data) {
          if (!grouped[w.jlpt]) grouped[w.jlpt] = [];
          grouped[w.jlpt].push(w);
        }
        setAllWords(grouped);
      }
      setPhase("setup");
    })();
  }, []);

  function startSession() {
    const pool = allWords[filter] ?? allWords["all"] ?? [];
    const q = shuffle(pool).slice(0, TOTAL_ROUNDS);
    setQueue(q);
    setStats([]);
    setRoundNum(0);
    loadRound(q, 0);
  }

  function loadRound(q: VocabWord[], idx: number) {
    if (idx >= q.length) { setPhase("finished"); return; }
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
        setTimeout(() => setPhase("finished"), correct ? 1200 : 2000);
      } else {
        setTimeout(() => loadRound(queue, newStats.length), correct ? 1200 : 2000);
      }
      return newStats;
    });
    setPhase("feedback");
  }

  function submitAnswer(val: string) {
    if (phase !== "playing" || !current) return;
    if (!checkVocabAnswer(val, current)) return;
    handleResult(current, true, val.trim());
  }

  function skipQuestion() {
    if (!current) return;
    handleResult(current, false, "(skipped)");
  }

  const score = stats.filter(s => s.correct).length;
  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const timerColor = timeLeft <= 4 ? "#E24B4A" : timeLeft <= 8 ? "#EF9F27" : "#534AB7";
  const filterInfo = FILTER_OPTIONS.find(f => f.value === filter)!;

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
        <Link href="/" className="font-jp text-3xl mb-8 text-accent2 hover:opacity-70 block">漢</Link>
        <div className="card-solid w-full max-w-sm p-6 slide-up">
          <h1 className="text-xl font-semibold mb-1">Practice mode</h1>
          <p className="text-white/40 text-sm mb-6">Solo training · {TOTAL_ROUNDS} words · no ELO impact</p>

          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Choose level</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {FILTER_OPTIONS.map(opt => {
              const count = (allWords[opt.value] ?? []).length;
              return (
                <button key={opt.value} onClick={() => setFilter(opt.value)}
                  className="py-3 px-4 rounded-xl text-sm font-medium transition-all text-left"
                  style={{
                    background: filter === opt.value ? opt.color + "22" : "rgba(255,255,255,0.04)",
                    border: filter === opt.value ? `1.5px solid ${opt.color}` : "1px solid rgba(255,255,255,0.08)",
                    color: filter === opt.value ? opt.color : "rgba(255,255,255,0.5)",
                  }}>
                  {opt.label}
                  <span className="block text-xs opacity-60 mt-0.5">{count} words</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white/4 rounded-xl p-3 mb-5 text-xs text-white/40">
            Read the kanji word · type the reading in hiragana or romaji
          </div>

          <button className="btn-primary" onClick={startSession}>Start practice</button>
          <Link href="/"><button className="btn-ghost mt-2">Back</button></Link>
        </div>
      </main>
    );
  }

  if (phase === "finished") {
    const pct = stats.length > 0 ? Math.round((score / stats.length) * 100) : 0;
    return (
      <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
        <div className="card-solid p-6 text-center mb-4 slide-up">
          <div className="text-4xl mb-3">{pct >= 80 ? "🏆" : pct >= 60 ? "👍" : pct >= 40 ? "😓" : "💀"}</div>
          <h1 className="text-2xl font-semibold mb-1">Session complete</h1>
          <p className="text-sm mb-4" style={{ color: filterInfo.color }}>{filterInfo.label}</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Correct", val: score, color: "#1D9E75" },
              { label: "Wrong", val: stats.length - score, color: "#E24B4A" },
              { label: "Score", val: `${pct}%`, color: "#7F77DD" },
            ].map(s => (
              <div key={s.label} className="bg-white/4 rounded-xl p-3">
                <p className="font-mono text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
                <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button className="btn-primary" onClick={startSession}>Practice again</button>
            <button className="btn-ghost" onClick={() => setPhase("setup")}>Change level</button>
            <Link href="/"><button className="btn-ghost">Home</button></Link>
          </div>
        </div>

        <div className="card-solid overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest">Review</p>
          </div>
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
              <div className="w-1.5 h-8 rounded-full flex-shrink-0"
                style={{ background: s.correct ? "#1D9E75" : "#E24B4A" }} />
              <div className="font-jp text-xl w-12 text-center flex-shrink-0">{s.word.word}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/30">{s.word.jlpt} · {s.word.meaning}</p>
                <p className="text-sm font-mono">{s.word.reading}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono" style={{ color: s.correct ? "#5DCAA5" : "#E24B4A" }}>
                  {s.userAnswer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // PLAYING / FEEDBACK
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-white/40">{roundNum + 1} / {TOTAL_ROUNDS}</span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: filterInfo.color + "22", color: filterInfo.color }}>
            {filterInfo.label}
          </span>
          <span className="font-mono text-sm font-bold" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>

        <div className="flex gap-1 mb-4">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{
              background: i < stats.length
                ? stats[i].correct ? "#534AB7" : "#E24B4A"
                : i === roundNum ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)"
            }} />
          ))}
        </div>

        <div className="h-0.5 bg-white/8 rounded-full mb-6 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-200"
            style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>

        {current && (
          <div className="card-solid p-8 text-center mb-4 transition-all" style={{
            border: phase === "feedback"
              ? isCorrect ? "1px solid #1D9E75" : "1px solid #E24B4A"
              : "1px solid rgba(83,74,183,0.35)"
          }}>
            <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
              style={{ background: "#FAEEDA22", color: "#EF9F27" }}>
              Reading
            </span>
            <div className="font-jp text-6xl mb-3 text-white pop-in">{current.word}</div>
            <p className="text-white/35 text-sm italic mb-2">{current.meaning}</p>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: filterInfo.color + "22", color: filterInfo.color }}>
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
          className={`input-field text-center text-lg mb-2 ${
            phase === "feedback" && isCorrect ? "input-correct" :
            phase === "feedback" ? "input-wrong" : ""
          }`}
          placeholder="Type the reading..."
          value={input}
          disabled={phase === "feedback"}
          autoComplete="off" autoCorrect="off" spellCheck={false}
          onChange={(e) => { setInput(e.target.value); if (phase === "playing") submitAnswer(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter" && phase === "playing") submitAnswer(input); }}
        />

        <p className="text-center text-xs text-white/20 mb-2">
          Hiragana or romaji accepted
        </p>

        {phase === "playing" && (
          <button onClick={skipQuestion}
            className="w-full text-xs text-white/15 hover:text-white/35 transition-colors py-1.5">
            Skip →
          </button>
        )}

        <div className="flex justify-between items-center text-xs mt-3">
          <span style={{ color: "#5DCAA5" }}>✓ {score}</span>
          <Link href="/" className="text-white/20 hover:text-white/50 transition-colors">← Home</Link>
          <span style={{ color: "#E24B4A" }}>✗ {stats.length - score}</span>
        </div>
      </div>
    </main>
  );
}
