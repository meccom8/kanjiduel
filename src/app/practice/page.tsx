"use client";
import { useState, useEffect, useRef } from "react";
import { KANJI_LIST, checkAnswer, shuffle, type Kanji, type QuestionType } from "@/lib/kanji";
import Link from "next/link";

type Phase = "setup" | "playing" | "feedback" | "finished";
type Filter = "all" | "N5" | "N4" | "N3" | "N2" | "N1";

interface SessionStat {
  kanji: Kanji;
  type: QuestionType;
  label: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
}

const FILTER_OPTIONS: { value: Filter; label: string; color: string }[] = [
  { value: "all", label: "All levels", color: "#7F77DD" },
  { value: "N5",  label: "JLPT N5",    color: "#1D9E75" },
  { value: "N4",  label: "JLPT N4",    color: "#4DB6AC" },
  { value: "N3",  label: "JLPT N3",    color: "#B8860B" },
  { value: "N2",  label: "JLPT N2",    color: "#D85A30" },
  { value: "N1",  label: "JLPT N1",    color: "#C62828" },
];

const ROUND_TIME = 15;
const TOTAL_ROUNDS = 20;

export default function Practice() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [filter, setFilter] = useState<Filter>("N5");
  const [queue, setQueue] = useState<Kanji[]>([]);
  const [current, setCurrent] = useState<Kanji | null>(null);
  const [qType, setQType] = useState<QuestionType>("meaning");
  const [qLabel, setQLabel] = useState("Meaning");
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [stats, setStats] = useState<SessionStat[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [roundNum, setRoundNum] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickType(kanji: Kanji) {
    // Only reading questions — meaning shown as decoration
    const options: { type: QuestionType; label: string; ans: string[] }[] = [];
    if (kanji.on !== "-") options.push({ type: "onyomi", label: "On'yomi", ans: kanji.on.split("/").map(s => s.trim()) });
    if (kanji.kun !== "-") options.push({ type: "kunyomi", label: "Kun'yomi", ans: kanji.kun.split("/").map(s => s.trim()) });
    if (options.length === 0) options.push({ type: "onyomi", label: "On'yomi", ans: [kanji.on] });
    return options[Math.floor(Math.random() * options.length)];
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

  function loadRound(q: Kanji[], idx: number) {
    if (idx >= TOTAL_ROUNDS || idx >= q.length) { setPhase("finished"); return; }
    const kanji = q[idx];
    const picked = pickType(kanji);
    setCurrent(kanji);
    setQType(picked.type);
    setQLabel(picked.label);
    setAnswers(picked.ans);
    setInput("");
    setRoundNum(idx);
    setPhase("playing");
    startTimer(() => handleResult(kanji, picked.type, picked.label, picked.ans, false, "(time up)"));
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleResult(
    kanji: Kanji, type: QuestionType, label: string,
    ans: string[], correct: boolean, userAns: string
  ) {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCorrect(correct);
    setStats(s => [...s, { kanji, type, label, correct, userAnswer: userAns, correctAnswer: ans[0] }]);
    setPhase("feedback");
  }

  function submitAnswer(val: string) {
    if (phase !== "playing" || !current) return;
    if (!checkAnswer(val, answers)) return;
    handleResult(current, qType, qLabel, answers, true, val.trim());
  }

  function skipQuestion() {
    if (!current) return;
    handleResult(current, qType, qLabel, answers, false, "(skipped)");
  }

  // Auto-advance after feedback
  useEffect(() => {
    if (phase !== "feedback") return;
    const t = setTimeout(() => loadRound(queue, roundNum + 1), isCorrect ? 1200 : 2000);
    return () => clearTimeout(t);
  }, [phase]);

  function startSession() {
    const filtered = filter === "all" ? KANJI_LIST : KANJI_LIST.filter(k => k.jlpt === filter);
    const q = shuffle(filtered).slice(0, TOTAL_ROUNDS);
    setQueue(q);
    setStats([]);
    setRoundNum(0);
    loadRound(q, 0);
  }

  const score = stats.filter(s => s.correct).length;
  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const timerColor = timeLeft <= 4 ? "#E24B4A" : timeLeft <= 8 ? "#EF9F27" : "#534AB7";
  const filterInfo = FILTER_OPTIONS.find(f => f.value === filter)!;
  const kanjiCount = filter === "all" ? KANJI_LIST.length : KANJI_LIST.filter(k => k.jlpt === filter).length;

  // ── SETUP ──
  if (phase === "setup") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
        <Link href="/" className="font-jp text-3xl mb-8 text-accent2 hover:opacity-70 transition-opacity block">漢</Link>
        <div className="card-solid w-full max-w-sm p-6 slide-up">
          <h1 className="text-xl font-semibold mb-1">Practice mode</h1>
          <p className="text-white/40 text-sm mb-6">
            Solo training · {TOTAL_ROUNDS} questions · no ELO impact
          </p>

          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Choose level</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {FILTER_OPTIONS.map(opt => {
              const count = opt.value === "all" ? KANJI_LIST.length : KANJI_LIST.filter(k => k.jlpt === opt.value).length;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className="py-3 px-4 rounded-xl text-sm font-medium transition-all text-left"
                  style={{
                    background: filter === opt.value ? opt.color + "22" : "rgba(255,255,255,0.04)",
                    border: filter === opt.value ? `1.5px solid ${opt.color}` : "1px solid rgba(255,255,255,0.08)",
                    color: filter === opt.value ? opt.color : "rgba(255,255,255,0.5)",
                  }}
                >
                  {opt.label}
                  <span className="block text-xs opacity-60 mt-0.5">{count} kanji</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white/4 rounded-xl p-3 mb-5 text-xs text-white/40 leading-relaxed">
            Questions mix: <span className="text-white/70">Meaning</span> · <span className="text-white/70">On&apos;yomi</span> · <span className="text-white/70">Kun&apos;yomi</span>
            <br />Type directly — no multiple choice
          </div>

          <button className="btn-primary" onClick={startSession}>
            Start practice
          </button>
          <Link href="/"><button className="btn-ghost mt-2">Back</button></Link>
        </div>
      </main>
    );
  }

  // ── FINISHED ──
  if (phase === "finished") {
    const pct = stats.length > 0 ? Math.round((score / stats.length) * 100) : 0;
    return (
      <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
        <div className="card-solid p-6 text-center mb-4 slide-up">
          <div className="text-4xl mb-3">
            {pct >= 80 ? "🏆" : pct >= 60 ? "👍" : pct >= 40 ? "😓" : "💀"}
          </div>
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

        {/* Review */}
        <div className="card-solid overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest">Review all answers</p>
          </div>
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
              <div className="w-1.5 h-8 rounded-full flex-shrink-0"
                style={{ background: s.correct ? "#1D9E75" : "#E24B4A" }} />
              <div className="font-jp text-2xl w-8 text-center flex-shrink-0">{s.kanji.k}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/30">{s.label} · {s.kanji.jlpt}</p>
                <p className="text-sm font-medium truncate">{s.kanji.m}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono" style={{ color: s.correct ? "#5DCAA5" : "#E24B4A" }}>
                  {s.userAnswer}
                </p>
                {!s.correct && (
                  <p className="text-xs text-white/30 font-mono">{s.correctAnswer}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // ── PLAYING / FEEDBACK ──
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-white/40">{roundNum + 1} / {TOTAL_ROUNDS}</span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: filterInfo.color + "22", color: filterInfo.color }}>
            {filterInfo.label}
          </span>
          <span className="font-mono text-sm font-bold transition-colors" style={{ color: timerColor }}>
            {timeLeft}s
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{
              background: i < stats.length
                ? stats[i].correct ? "#534AB7" : "#E24B4A"
                : i === roundNum ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)"
            }} />
          ))}
        </div>

        {/* Timer bar */}
        <div className="h-0.5 bg-white/8 rounded-full mb-6 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-200"
            style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>

        {/* Kanji card */}
        {current && (
          <div className="card-solid p-8 text-center mb-4 transition-all" style={{
            border: phase === "feedback"
              ? isCorrect ? "1px solid #1D9E75" : "1px solid #E24B4A"
              : "1px solid rgba(83,74,183,0.35)"
          }}>
            <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
              style={qType === "meaning"
                ? { background: "#EEEDFE22", color: "#7F77DD" }
                : qType === "onyomi"
                ? { background: "#FAEEDA22", color: "#EF9F27" }
                : { background: "#E0F2F122", color: "#4DB6AC" }}>
              {qLabel}
            </span>

            <div className="font-jp text-8xl mb-2 text-white pop-in">{current.k}</div>

            {/* Primary meaning — decorative only */}
            <p className="text-white/35 text-sm mb-2 italic">{current.m.split("/")[0].trim()}</p>

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
                      Answer: <span className="text-white font-medium font-mono">{answers[0]}</span>
                    </p>
                    <p className="text-white/25 text-xs mt-1">{current.m}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          className={`input-field text-center text-lg mb-2 ${
            phase === "feedback" && isCorrect ? "input-correct" :
            phase === "feedback" && !isCorrect ? "input-wrong" : ""
          }`}
          placeholder={
            qType === "onyomi" ? "Type on'yomi reading..."
            : "Type kun'yomi reading..."
          }
          value={input}
          disabled={phase === "feedback"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setInput(e.target.value);
            if (phase === "playing") submitAnswer(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && phase === "playing") submitAnswer(input);
          }}
        />

        {/* Hint line */}
        {phase === "playing" && current && (
          <p className="text-center text-xs text-white/20 mb-2">
            {qType === "meaning" && "Answer in English · press Enter to submit"}
            {qType === "onyomi" && "Type the on\'yomi reading"}
            {qType === "kunyomi" && "Type the kun\'yomi reading"}
          </p>
        )}

        {/* Skip */}
        {phase === "playing" && (
          <button onClick={skipQuestion}
            className="w-full text-xs text-white/15 hover:text-white/35 transition-colors py-1.5">
            Skip →
          </button>
        )}

        {/* Score + home */}
        <div className="flex justify-between items-center text-xs mt-3">
          <span style={{ color: "#5DCAA5" }}>✓ {score} correct</span>
          <Link href="/" className="text-white/20 hover:text-white/50 transition-colors">← Home</Link>
          <span style={{ color: "#E24B4A" }}>✗ {stats.length - score} wrong</span>
        </div>
      </div>
    </main>
  );
}
