"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTier, TIERS, winRate } from "@/lib/elo";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Profile {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  best_streak: number;
  avatar_url: string | null;
  bio: string | null;
  title: string | null;
  accent_color: string | null;
}

const JLPT_COLORS: Record<string, string> = {
  N5: "#1D9E75", N4: "#4DB6AC", N3: "#B8860B", N2: "#D85A30", N1: "#C62828",
};

export default function UserProfile() {
  const params = useParams();
  const username = decodeURIComponent(params.username as string);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jlptStats, setJlptStats] = useState<Record<string, { correct: number; wrong: number }>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showRanks, setShowRanks] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, elo, wins, losses, draws, streak, best_streak, avatar_url, bio, title, accent_color")
        .eq("username", username)
        .single();

      if (!data) { setNotFound(true); setLoading(false); return; }
      setProfile(data);

      // Load JLPT stats
      const { data: kanjiData } = await supabase
        .from("kanji_stats")
        .select("jlpt, correct, wrong")
        .eq("user_id", data.id);

      const jlpt: Record<string, { correct: number; wrong: number }> = {};
      for (const s of kanjiData ?? []) {
        if (!jlpt[s.jlpt]) jlpt[s.jlpt] = { correct: 0, wrong: 0 };
        jlpt[s.jlpt].correct += s.correct;
        jlpt[s.jlpt].wrong += s.wrong;
      }
      setJlptStats(jlpt);

      // Load match history
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .or(`player1_id.eq.${data.id},player2_id.eq.${data.id}`)
        .order("played_at", { ascending: false })
        .limit(15);

      if (matchData) {
        const oppIds = [...new Set(matchData.map((m: any) =>
          m.player1_id === data.id ? m.player2_id : m.player1_id
        ))];
        const { data: opps } = await supabase
          .from("profiles").select("id, username").in("id", oppIds);
        const oppMap: Record<string, string> = {};
        opps?.forEach((o: any) => { oppMap[o.id] = o.username; });
        setMatches(matchData.map((m: any) => ({
          ...m,
          opponent_username: oppMap[m.player1_id === data.id ? m.player2_id : m.player1_id] ?? "?",
        })));
      }

      setLoading(false);
    })();
  }, [username]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
    </div>
  );

  if (notFound) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="font-jp text-5xl text-white/10 mb-4">迷</div>
      <h1 className="text-xl font-semibold mb-2">Player not found</h1>
      <p className="text-white/40 text-sm mb-6">No player with username "{username}"</p>
      <Link href="/leaderboard"><button className="btn-primary">View leaderboard</button></Link>
    </main>
  );

  if (!profile) return null;

  const tier = getTier(profile.elo);
  const wr = winRate(profile.wins, profile.losses);
  const totalGames = profile.wins + profile.losses + profile.draws;
  const color = profile.accent_color ?? tier.color;
  const tidx = TIERS.findIndex(t => t.name === tier.name);
  const nextTier = TIERS[tidx + 1];
  const pct = nextTier ? Math.round(((profile.elo - tier.min) / (nextTier.min - tier.min)) * 100) : 100;

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leaderboard" className="text-sm text-white/30 hover:text-white/60 transition-colors">← Leaderboard</Link>
      </div>

      {/* Profile card */}
      <div className="card-solid p-6 mb-4 slide-up" style={{ border: `1px solid ${color}22` }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: color + "33", color, border: `2px solid ${color}44` }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : profile.username.slice(0, 2).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-semibold">{profile.username}</h1>
              {profile.title && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: color + "22", color, border: `1px solid ${color}33` }}>
                  {profile.title}
                </span>
              )}
            </div>
            <button onClick={() => setShowRanks(true)}
              className="text-xs px-2.5 py-1 rounded-full font-medium hover:opacity-80 transition-opacity"
              style={{ background: tier.bg + "33", color: tier.color }}>
              ⬡ {tier.name}
            </button>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-mono text-2xl font-bold" style={{ color }}>{profile.elo}</p>
            <p className="text-xs text-white/30">ELO</p>
          </div>
        </div>

        {profile.bio && (
          <p className="text-white/50 text-sm mb-4 leading-relaxed">{profile.bio}</p>
        )}

        {/* Rank progress */}
        {nextTier && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-white/30 mb-1.5">
              <span>{tier.name}</span>
              <span>{nextTier.name}</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <p className="text-xs text-white/30 mt-1 text-right">{profile.elo} / {nextTier.min} ELO</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          {[
            { label: "Wins", val: profile.wins, color: "#5DCAA5" },
            { label: "Losses", val: profile.losses, color: "#E24B4A" },
            { label: "Games", val: totalGames, color: "rgba(255,255,255,0.7)" },
            { label: "Win rate", val: `${wr}%`, color },
          ].map(s => (
            <div key={s.label} className="bg-white/4 rounded-xl p-3">
              <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.val}</p>
              <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Streak */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/4 rounded-xl p-3 text-center">
            <p className="text-xl mb-0.5">🔥</p>
            <p className="font-mono text-xl font-bold text-white">{profile.streak ?? 0}</p>
            <p className="text-xs text-white/30">Current streak</p>
          </div>
          <div className="bg-white/4 rounded-xl p-3 text-center">
            <p className="text-xl mb-0.5">⚡</p>
            <p className="font-mono text-xl font-bold text-white">{profile.best_streak ?? 0}</p>
            <p className="text-xs text-white/30">Best streak</p>
          </div>
        </div>
      </div>

      {/* JLPT stats */}
      {Object.keys(jlptStats).length > 0 && (
        <div className="card-solid overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest">Stats by JLPT level</p>
          </div>
          {["N5","N4","N3","N2","N1"].filter(l => jlptStats[l]).map(level => {
            const s = jlptStats[level];
            const total = s.correct + s.wrong;
            const acc = Math.round(s.correct / total * 100);
            const c = JLPT_COLORS[level];
            return (
              <div key={level} className="px-5 py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: c + "22", color: c }}>{level}</span>
                  <span className="font-mono text-sm font-bold" style={{ color: acc >= 70 ? "#5DCAA5" : acc >= 40 ? "#EF9F27" : "#E24B4A" }}>{acc}%</span>
                </div>
                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${acc}%`, background: acc >= 70 ? "#1D9E75" : acc >= 40 ? "#EF9F27" : "#E24B4A" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Match history */}
      {matches.length > 0 && (
        <div className="card-solid overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest">Match history</p>
          </div>
          {matches.map((m, i) => {
            const isP1 = m.player1_id === profile.id;
            const myScore = isP1 ? m.p1_score : m.p2_score;
            const oppScore = isP1 ? m.p2_score : m.p1_score;
            const eloChange = isP1 ? m.p1_elo_change : m.p2_elo_change;
            const won = m.winner_id === profile.id ? true : m.winner_id === null ? null : false;
            return (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0">
                <div className="w-1.5 h-8 rounded-full flex-shrink-0"
                  style={{ background: won === true ? "#1D9E75" : won === false ? "#E24B4A" : "rgba(255,255,255,0.15)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">vs {m.opponent_username}</p>
                  <p className="text-xs text-white/30 mt-0.5">{m.rounds} rounds</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-sm font-bold">
                    <span style={{ color: "#7F77DD" }}>{myScore}</span>
                    <span className="text-white/20 mx-1">-</span>
                    <span style={{ color: "#D85A30" }}>{oppScore}</span>
                  </p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: eloChange >= 0 ? "#5DCAA5" : "#E24B4A" }}>
                    {eloChange >= 0 ? "+" : ""}{eloChange} ELO
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranks Modal */}
      {showRanks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowRanks(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: "#0d0d1a", border: "1px solid rgba(127,119,221,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <p className="font-semibold text-white">Rank ladder</p>
              <button onClick={() => setShowRanks(false)} className="text-white/30 hover:text-white/60 text-lg">✕</button>
            </div>
            <div className="p-3 flex flex-col gap-1">
              {[
                { name: "Bronze I",       min: 0,    max: 200,  color: "#8D6E63" },
                { name: "Bronze II",      min: 200,  max: 400,  color: "#8D6E63" },
                { name: "Silver I",       min: 400,  max: 600,  color: "#757575" },
                { name: "Silver II",      min: 600,  max: 800,  color: "#757575" },
                { name: "Gold I",         min: 800,  max: 1000, color: "#B8860B" },
                { name: "Gold II",        min: 1000, max: 1200, color: "#B8860B" },
                { name: "Platinum I",     min: 1200, max: 1400, color: "#4DB6AC" },
                { name: "Platinum II",    min: 1400, max: 1600, color: "#4DB6AC" },
                { name: "Diamond",        min: 1600, max: 1800, color: "#5C6BC0" },
                { name: "Champion",       min: 1800, max: 2000, color: "#7B1FA2" },
                { name: "Grand Champion", min: 2000, max: 9999, color: "#C62828" },
              ].map(r => {
                const isMe = profile.elo >= r.min && profile.elo < r.max;
                return (
                  <div key={r.name} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: isMe ? r.color + "15" : "rgba(255,255,255,0.02)", border: isMe ? `1px solid ${r.color}44` : "1px solid transparent" }}>
                    <span style={{ color: r.color }}>⬡</span>
                    <span className="text-sm font-medium flex-1" style={{ color: r.color }}>{r.name}</span>
                    <span className="font-mono text-xs text-white/30">{r.min}+</span>
                    {isMe && <span className="text-xs text-white/40">← {profile.username}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
