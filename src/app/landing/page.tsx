"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

const KANJI_PAIRS = [
  { word: "勝者", reading: "しょうしゃ", meaning: "winner" },
  { word: "挑戦", reading: "ちょうせん", meaning: "challenge" },
  { word: "最強", reading: "さいきょう", meaning: "strongest" },
  { word: "競争", reading: "きょうそう", meaning: "competition" },
  { word: "栄光", reading: "えいこう", meaning: "glory" },
  { word: "天才", reading: "てんさい", meaning: "genius" },
];

const RANKS = [
  { name: "Bronze I & II", color: "#CD7F32", elo: "0–400" },
  { name: "Silver I & II", color: "#9E9E9E", elo: "400–800" },
  { name: "Gold I & II", color: "#B8860B", elo: "800–1200" },
  { name: "Platinum I & II", color: "#4DB6AC", elo: "1200–1600" },
  { name: "Diamond", color: "#5C6BC0", elo: "1600–1800" },
  { name: "Champion", color: "#7B1FA2", elo: "1800–2000" },
  { name: "Grand Champion", color: "#C62828", elo: "2000+" },
];

const FEATURES = [
  { icon: "⚡", title: "Real-time duels", desc: "Same word, same time. Type the reading first — win the round." },
  { icon: "🏆", title: "Ranked ELO system", desc: "Climb from Bronze to Grand Champion. Every match counts." },
  { icon: "📖", title: "7,000+ vocabulary words", desc: "Full JLPT N5 to N1 coverage. All levels, all words." },
  { icon: "🗓", title: "Daily challenge", desc: "10 words every day. One shot. Global leaderboard." },
  { icon: "🔥", title: "Streak system", desc: "Play every day. Build your streak. Don't break the chain." },
  { icon: "📊", title: "Deep stats", desc: "Track your weakest words. See your progress by JLPT level." },
];

export default function Landing() {
  const [activeKanji, setActiveKanji] = useState(0);
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [wordCount, setWordCount] = useState<string>("…");
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({});
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const levels = ["N5", "N4", "N3", "N2", "N1", "X"];
      const [totalRes, ...levelRes] = await Promise.all([
        supabase.from("vocabulary").select("id", { count: "exact", head: true }),
        ...levels.map(l => supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("jlpt", l)),
      ]);
      const total = (totalRes as any).count ?? 0;
      setWordCount(total >= 1000 ? `${Math.floor(total / 1000).toLocaleString()},000+` : String(total));
      const counts: Record<string, number> = {};
      levels.forEach((l, i) => { counts[l] = (levelRes[i] as any).count ?? 0; });
      setLevelCounts(counts);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveKanji(i => (i + 1) % KANJI_PAIRS.length);
      setTyped("");
      setRevealed(false);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const target = KANJI_PAIRS[activeKanji].reading;
    let i = 0;
    const t = setInterval(() => {
      if (i <= target.length) { setTyped(target.slice(0, i)); i++; }
      else { setRevealed(true); clearInterval(t); }
    }, 80);
    return () => clearInterval(t);
  }, [activeKanji]);

  const current = KANJI_PAIRS[activeKanji];

  return (
    <main className="min-h-screen relative overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(10,10,20,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2">
          <span className="font-jp text-xl text-accent2">漢</span>
          <span className="font-mono text-sm text-white font-bold tracking-widest">KanjiDual</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="text-sm text-white/50 hover:text-white transition-colors px-4 py-2">Sign in</button>
          </Link>
          <Link href="/register">
            <button className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "#CF4520", color: "#fff" }}>
              Play free
            </button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium"
          style={{ background: "rgba(207,69,32,0.15)", border: "1px solid rgba(207,69,32,0.3)", color: "#E86440" }}>
          ⚔️ Real-time ranked vocabulary battles
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight" style={{ letterSpacing: "-0.02em" }}>
          Beat your opponents.<br />
          <span style={{
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundImage: "linear-gradient(135deg, #CF4520, #E86440, #4DB6AC)",
            backgroundClip: "text"
          }}>
            Master Japanese.
          </span>
        </h1>

        <p className="text-white/50 text-lg max-w-md mb-10">
          The only Japanese vocabulary app where you duel real players in real time.
          Type the reading first — win the round.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Link href="/register">
            <button className="px-8 py-4 rounded-xl text-base font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #CF4520, #E86440)" }}>
              Start playing — it&apos;s free
            </button>
          </Link>
          <Link href="/leaderboard">
            <button className="px-8 py-4 rounded-xl text-base font-medium text-white/60 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              View leaderboard
            </button>
          </Link>
        </div>

        {/* Demo card */}
        <div className="w-full max-w-sm mx-auto card-solid p-6 text-center" style={{ border: "1px solid rgba(207,69,32,0.4)" }}>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-4">Live demo</div>
          <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
            style={{ background: "#FAEEDA22", color: "#EF9F27" }}>Reading</span>
          <div className="font-jp text-6xl mb-2 text-white">{current.word}</div>
          <p className="text-white/35 text-sm italic mb-4">{current.meaning}</p>
          <div className="w-full px-4 py-3 rounded-xl text-center font-mono text-lg transition-all duration-300"
            style={{
              background: revealed ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.05)",
              border: revealed ? "1.5px solid #1D9E75" : "1.5px solid rgba(255,255,255,0.1)",
              color: revealed ? "#5DCAA5" : "#fff",
            }}>
            {typed || <span style={{ color: "rgba(255,255,255,0.2)" }}>Type the reading...</span>}
            {!revealed && <span className="animate-pulse ml-0.5">|</span>}
          </div>
          {revealed && <div className="mt-2 text-xs text-white/30 font-mono">{current.reading}</div>}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-24 relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl font-bold text-white">Simple. Fast. Brutal.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "01", title: "Get matched", desc: "Find an opponent in seconds. No lobbies, no waiting." },
            { step: "02", title: "Same word, same time", desc: "Both players see the same word. Type the reading first to win the round." },
            { step: "03", title: "First to 6 wins", desc: "11 rounds per match. Dominate 6 rounds to claim victory and gain ELO." },
          ].map(s => (
            <div key={s.step} className="card-solid p-6">
              <div className="font-mono text-5xl font-bold mb-4" style={{ color: "rgba(207,69,32,0.25)" }}>{s.step}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-4 py-24 relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl font-bold text-white">Everything you need to level up.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="card-solid p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-base font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RANKS */}
      <section className="px-4 py-24 relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Ranked ladder</p>
          <h2 className="text-3xl font-bold text-white">Where do you stand?</h2>
          <p className="text-white/40 mt-3 max-w-sm mx-auto">
            Your ELO reflects your true skill. Harder vocabulary unlocks as you climb.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {RANKS.map(r => (
            <div key={r.name} className="card-solid p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm"
                style={{ background: r.color + "22", color: r.color }}>⬡</div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{r.name}</p>
                <p className="text-xs text-white/30 font-mono">{r.elo}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* JLPT */}
      <section className="px-4 py-24 relative z-10 max-w-4xl mx-auto">
        <div className="card-solid p-8 text-center" style={{ border: "1px solid rgba(207,69,32,0.3)" }}>
          <h2 className="text-3xl font-bold text-white mb-3">{wordCount} words. N5 to No JLPT.</h2>
          <p className="text-white/40 mb-8 max-w-sm mx-auto">
            From total beginner to beyond N1. Your rank unlocks harder vocabulary as you improve.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {[
              { level: "N5",      key: "N5", color: "#1D9E75" },
              { level: "N4",      key: "N4", color: "#4DB6AC" },
              { level: "N3",      key: "N3", color: "#B8860B" },
              { level: "N2",      key: "N2", color: "#D85A30" },
              { level: "N1",      key: "N1", color: "#C62828" },
              { level: "No JLPT", key: "X",  color: "#9C27B0" },
            ].map(l => {
              const c = levelCounts[l.key];
              const label = c ? (c >= 1000 ? `${(c / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(c)) : "…";
              return (
                <div key={l.level} className="px-5 py-3 rounded-xl text-center"
                  style={{ background: l.color + "15", border: `1px solid ${l.color}33` }}>
                  <p className="font-mono font-bold text-sm" style={{ color: l.color }}>{l.level}</p>
                  <p className="text-xs text-white/30 mt-0.5">{label} words</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-32 text-center relative z-10">
        <div className="font-jp text-6xl mb-6 text-accent2">漢</div>
        <h2 className="text-4xl font-bold text-white mb-4">Ready to duel?</h2>
        <p className="text-white/40 mb-8 max-w-sm mx-auto">
          Free forever. No credit card. Just you, your opponent, and the words.
        </p>
        <Link href="/register">
          <button className="px-10 py-5 rounded-xl text-lg font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #CF4520, #E86440)" }}>
            Create your account
          </button>
        </Link>
        <p className="text-white/20 text-sm mt-4">
          Already playing?{" "}
          <Link href="/login" className="text-accent2 hover:opacity-70">Sign in</Link>
        </p>
      </section>

      {/* FOOTER */}
      <footer className="px-4 py-8 text-center relative z-10" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="font-jp text-lg text-accent2">漢</span>
          <span className="font-mono text-sm text-white/30 tracking-widest">KanjiDual</span>
        </div>
        <p className="text-white/20 text-xs">Built for Japanese learners who want to compete.</p>
      </footer>

    </main>
  );
}
