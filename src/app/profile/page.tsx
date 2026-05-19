"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { getTier, TIERS, winRate } from "@/lib/elo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OnlineDot } from "@/contexts/PresenceContext";
import { gifCropStyle } from "@/components/CropModal";
import { getBorderClass, RANK_BADGE_DEFS, SPECIAL_BADGE_DEFS, RARITY_COLORS } from "@/lib/cosmetics";
import { resolveAvatar } from "@/lib/avatar";

interface Profile {
  id: string; username: string; elo: number;
  wins: number; losses: number; draws: number;
  streak: number; best_streak: number;
  last_played_at: string | null; created_at: string;
  avatar_url: string | null;
  avatar_static_url: string | null;
  bio: string | null;
  title: string | null;
  accent_color: string | null;
  is_pro: boolean;
  owned_cosmetics: string[] | null;
  avatar_border: boolean | null;
  avatar_border_style: string | null;
  banner_url: string | null;
  avatar_crop: { tx: number; ty: number; zoom: number } | null;
  banner_crop: { tx: number; ty: number; zoom: number } | null;
  featured_badges: string[] | null;
}
interface Match {
  id: string; player1_id: string; player2_id: string;
  winner_id: string | null; p1_score: number; p2_score: number;
  p1_elo_change: number; p2_elo_change: number;
  rounds: number; category: string; played_at: string;
  opponent_username?: string;
  opponent_id?: string;
}
interface KanjiStat { kanji: string; jlpt: string; correct: number; wrong: number; }

const JLPT_COLORS: Record<string, string> = {
  N5: "#1D9E75", N4: "#4DB6AC", N3: "#B8860B", N2: "#D85A30", N1: "#C62828",
};

// ─── Badge definitions ────────────────────────────────────────────────────────
interface Badge {
  id: string; icon: string; name: string; desc: string;
  unlocked: boolean; rarity: "common" | "rare" | "epic" | "legendary";
}

function computeBadges(
  profile: Profile,
  matches: Match[],
  kanjiStats: KanjiStat[],
  jlptStats: Record<string, { correct: number; wrong: number }>,
): Badge[] {
  const totalSeen = kanjiStats.reduce((a, s) => a + s.correct + s.wrong, 0);
  const totalCorrect = kanjiStats.reduce((a, s) => a + s.correct, 0);
  const overallAcc = totalSeen > 0 ? totalCorrect / totalSeen : 0;
  const wins = profile.wins ?? 0;
  const wr = winRate(profile.wins, profile.losses);
  const n1Stats = jlptStats["N1"];
  const n1Acc = n1Stats ? n1Stats.correct / (n1Stats.correct + n1Stats.wrong) : 0;

  return [
    // ── Rank badges (one per rank tier) ───────────────────────────────────────
    ...RANK_BADGE_DEFS.map(b => ({
      id: b.id, icon: b.icon, name: b.name, desc: b.desc,
      unlocked: profile.elo >= b.minElo, rarity: b.rarity,
    })),
    // ── Special badges ────────────────────────────────────────────────────────
    {
      id: "cosmetics_pack", icon: "✨", name: "Cosmetics Pack", desc: "Own the Cosmetics Pack",
      unlocked: !!profile.owned_cosmetics?.includes("pack1"), rarity: "epic" as const,
    },
    {
      id: "kanjidual_pro", icon: "✦", name: "KanjiDual Pro", desc: "KanjiDual Pro subscriber",
      unlocked: !!profile.is_pro, rarity: "legendary" as const,
    },
    // ── Win badges ────────────────────────────────────────────────────────────
    { id: "first_win", icon: "⚔️", name: "First blood",  desc: "Win your first duel", unlocked: wins >= 1,   rarity: "common" as const },
    { id: "wins_10",   icon: "🏅", name: "Warrior",      desc: "Win 10 duels",         unlocked: wins >= 10,  rarity: "common" as const },
    { id: "wins_50",   icon: "🥇", name: "Veteran",      desc: "Win 50 duels",         unlocked: wins >= 50,  rarity: "rare" as const   },
    { id: "wins_100",  icon: "👑", name: "Legend",        desc: "Win 100 duels",        unlocked: wins >= 100, rarity: "epic" as const   },
    // ── Streak badges ─────────────────────────────────────────────────────────
    { id: "streak_3",  icon: "🔥", name: "On fire",       desc: "3-game win streak",  unlocked: (profile.best_streak ?? 0) >= 3,  rarity: "common" as const    },
    { id: "streak_7",  icon: "🌋", name: "Unstoppable",   desc: "7-game win streak",  unlocked: (profile.best_streak ?? 0) >= 7,  rarity: "rare" as const      },
    { id: "streak_15", icon: "☄️", name: "Godlike",       desc: "15-game win streak", unlocked: (profile.best_streak ?? 0) >= 15, rarity: "legendary" as const },
    // ── Kanji badges ──────────────────────────────────────────────────────────
    { id: "kanji_100",  icon: "📖", name: "Student", desc: "Study 100 kanji",  unlocked: kanjiStats.length >= 100,  rarity: "common" as const },
    { id: "kanji_500",  icon: "📚", name: "Scholar", desc: "Study 500 kanji",  unlocked: kanjiStats.length >= 500,  rarity: "rare" as const   },
    { id: "kanji_1000", icon: "🎓", name: "Master",  desc: "Study 1000 kanji", unlocked: kanjiStats.length >= 1000, rarity: "epic" as const   },
    // ── Accuracy & games ─────────────────────────────────────────────────────
    { id: "accuracy_80", icon: "🎯", name: "Sharp mind",  desc: "80%+ overall accuracy",        unlocked: overallAcc >= 0.8 && totalSeen >= 50, rarity: "rare" as const      },
    { id: "n1_master",   icon: "🗾", name: "N1 master",   desc: "80%+ accuracy on N1",           unlocked: n1Acc >= 0.8 && (n1Stats?.correct ?? 0) + (n1Stats?.wrong ?? 0) >= 20, rarity: "legendary" as const },
    { id: "winrate_60",  icon: "📈", name: "Consistent",  desc: "60%+ win rate (20+ games)",     unlocked: wr >= 60 && (profile.wins + profile.losses) >= 20,  rarity: "rare" as const   },
    { id: "games_50",    icon: "🎮", name: "Dedicated",   desc: "Play 50 games",                 unlocked: (profile.wins + profile.losses + profile.draws) >= 50,  rarity: "common" as const },
    { id: "games_100",   icon: "🕹️", name: "Hooked",     desc: "Play 100 games",                unlocked: (profile.wins + profile.losses + profile.draws) >= 100, rarity: "rare" as const   },
    { id: "games_200",   icon: "🎰", name: "Addicted",    desc: "Play 200 games",                unlocked: (profile.wins + profile.losses + profile.draws) >= 200, rarity: "epic" as const   },
    // ── Daily streak badges ───────────────────────────────────────────────────
    { id: "daily_30",    icon: "📅", name: "Monthly",     desc: "30-day activity streak",        unlocked: (profile.best_streak ?? 0) >= 30,  rarity: "rare" as const      },
    { id: "daily_100",   icon: "🗓️", name: "Century",    desc: "100-day activity streak",       unlocked: (profile.best_streak ?? 0) >= 100, rarity: "epic" as const      },
    { id: "daily_200",   icon: "🏆", name: "Immortal",    desc: "200-day activity streak",       unlocked: (profile.best_streak ?? 0) >= 200, rarity: "legendary" as const },
  ];
}

// ─── ELO Chart ───────────────────────────────────────────────────────────────
function EloChart({ matches, profileId, accentColor }: {
  matches: Match[]; profileId: string; accentColor: string;
}) {
  const points = useMemo(() => {
    // Build ELO timeline from match history (oldest first)
    const sorted = [...matches].reverse();
    let elo = 1000; // approximate starting point
    const pts: { elo: number; date: string; won: boolean | null }[] = [];

    // Work backwards from current: we know elo changes, so reconstruct
    // Actually we have elo_change per match, reconstruct forward
    for (const m of sorted) {
      const isP1 = m.player1_id === profileId;
      const change = isP1 ? m.p1_elo_change : m.p2_elo_change;
      const won = m.winner_id === profileId ? true : m.winner_id === null ? null : false;
      pts.push({ elo, date: m.played_at, won });
      elo += change;
    }
    // Add current ELO as last point
    pts.push({ elo, date: new Date().toISOString(), won: null });
    return pts;
  }, [matches, profileId]);

  if (points.length < 2) return (
    <div className="flex items-center justify-center h-32 text-white/20 text-sm">
      Play more matches to see your ELO curve
    </div>
  );

  const W = 320; const H = 100;
  const eloVals = points.map(p => p.elo);
  const minElo = Math.min(...eloVals) - 20;
  const maxElo = Math.max(...eloVals) + 20;
  const range = maxElo - minElo || 1;

  const toX = (i: number) => (i / (points.length - 1)) * W;
  const toY = (elo: number) => H - ((elo - minElo) / range) * H;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.elo).toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${H} L 0 ${H} Z`;

  const currentElo = eloVals[eloVals.length - 1];
  const firstElo = eloVals[0];
  const diff = currentElo - firstElo;
  const diffColor = diff >= 0 ? "#5DCAA5" : "#E24B4A";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">ELO progression</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: diffColor }}>
            {diff >= 0 ? "+" : ""}{diff} last {matches.length} games
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100, overflow: "visible" }}>
        <defs>
          <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaD} fill="url(#eloGrad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinejoin="round" />
        {/* Dots for wins/losses */}
        {points.slice(0, -1).map((p, i) => (
          p.won !== null ? (
            <circle key={i} cx={toX(i)} cy={toY(p.elo)} r="2.5"
              fill={p.won ? "#1D9E75" : "#E24B4A"}
              stroke="#0d0d1a" strokeWidth="1" />
          ) : null
        ))}
        {/* Current ELO dot */}
        <circle cx={toX(points.length - 1)} cy={toY(currentElo)} r="4"
          fill={accentColor} stroke="#0d0d1a" strokeWidth="1.5" />
        {/* Y labels */}
        <text x="0" y={toY(maxElo - 10)} fill="rgba(255,255,255,0.25)" fontSize="8" textAnchor="start">{Math.round(maxElo - 20)}</text>
        <text x="0" y={toY(minElo + 10) - 4} fill="rgba(255,255,255,0.25)" fontSize="8" textAnchor="start">{Math.round(minElo + 20)}</text>
      </svg>
      <div className="flex justify-between text-xs text-white/20 mt-1">
        <span>{matches.length} games ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}

// ─── Badge card ───────────────────────────────────────────────────────────────

function BadgeCard({ badge }: { badge: Badge }) {
  const rarityColor = RARITY_COLORS[badge.rarity];
  return (
    <div className="rounded-xl p-3 text-center transition-all"
      style={{
        background: badge.unlocked ? `${rarityColor}18` : "rgba(255,255,255,0.03)",
        border: `1px solid ${badge.unlocked ? rarityColor + "55" : "rgba(255,255,255,0.06)"}`,
        opacity: badge.unlocked ? 1 : 0.45,
      }}>
      <div className="text-2xl mb-1.5" style={{ filter: badge.unlocked ? "none" : "grayscale(1)" }}>
        {badge.icon}
      </div>
      <p className="text-xs font-medium leading-tight" style={{ color: badge.unlocked ? rarityColor : "rgba(255,255,255,0.3)" }}>
        {badge.name}
      </p>
      <p className="text-xs text-white/25 mt-0.5 leading-tight" style={{ fontSize: 10 }}>{badge.desc}</p>
      {badge.unlocked && (
        <div className="mt-1.5 text-center">
          <span className="text-xs px-1.5 py-0.5 rounded-full capitalize"
            style={{ background: rarityColor + "33", color: rarityColor, fontSize: 9 }}>
            {badge.rarity}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [kanjiStats, setKanjiStats] = useState<KanjiStat[]>([]);
  const [jlptStats, setJlptStats] = useState<Record<string, { correct: number; wrong: number }>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"matches" | "stats" | "elo" | "badges">("matches");
  const [showRanks, setShowRanks] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const [{ data: p }, { data: m }, { data: k }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("matches").select("*")
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .order("played_at", { ascending: false })
          .limit(50),
        supabase.from("kanji_stats").select("kanji,jlpt,correct,wrong")
          .eq("user_id", user.id).order("wrong", { ascending: false }),
      ]);
      setProfile(p);
      setKanjiStats(k ?? []);
      const jlpt: Record<string, { correct: number; wrong: number }> = {};
      for (const s of k ?? []) {
        if (!jlpt[s.jlpt]) jlpt[s.jlpt] = { correct: 0, wrong: 0 };
        jlpt[s.jlpt].correct += s.correct;
        jlpt[s.jlpt].wrong += s.wrong;
      }
      setJlptStats(jlpt);
      if (m && p) {
        const ids = [...new Set(
          m.map((x: Match) => x.player1_id === user.id ? x.player2_id : x.player1_id)
        )].filter((id): id is string => !!id);
        const map: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: opps } = await supabase.from("profiles").select("id,username").in("id", ids);
          opps?.forEach((o: any) => { map[o.id] = o.username; });
        }
        setMatches(m.map((x: Match) => {
          const oppId = x.player1_id === user.id ? x.player2_id : x.player1_id;
          return { ...x, opponent_id: oppId ?? undefined, opponent_username: oppId ? (map[oppId] ?? "Deleted user") : "Unknown" };
        }));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
    </div>
  );
  if (!profile) return null;

  const tier = getTier(profile.elo);
  const wr = winRate(profile.wins, profile.losses);
  const totalGames = profile.wins + profile.losses + profile.draws;
  const tidx = TIERS.findIndex(t => t.name === tier.name);
  const nextTier = TIERS[tidx + 1];
  const pct = nextTier ? Math.round(((profile.elo - tier.min) / (nextTier.min - tier.min)) * 100) : 100;
  const hardestWords = [...kanjiStats]
    .filter(s => s.correct + s.wrong >= 3)
    .sort((a, b) => (a.correct / (a.correct + a.wrong)) - (b.correct / (b.correct + b.wrong)))
    .slice(0, 10);
  const totalSeen = kanjiStats.reduce((a, s) => a + s.correct + s.wrong, 0);
  const totalCorrect = kanjiStats.reduce((a, s) => a + s.correct, 0);
  const accentColor = profile.accent_color ?? tier.color;

  const badges = computeBadges(profile, matches, kanjiStats, jlptStats);
  const unlockedCount = badges.filter(b => b.unlocked).length;

  const TABS = [
    { key: "matches", label: "Matches" },
    { key: "elo", label: "ELO curve" },
    { key: "badges", label: `Badges ${unlockedCount}/${badges.length}` },
    { key: "stats", label: "Stats" },
  ] as const;

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-white/30 hover:text-white/60 transition-colors">← Back</Link>
        <Link href="/edit-profile" className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "rgba(83,74,183,0.2)", color: "#7F77DD", border: "1px solid rgba(83,74,183,0.3)" }}>
          ✏️ Edit profile
        </Link>
      </div>

      {/* ── Profile card ── */}
      {(() => {
        const effectiveBorderStyle = profile.avatar_border_style
          ?? (profile.avatar_border !== false ? "rainbow" : null);
        const borderClass = profile.owned_cosmetics?.includes("pack1")
          ? getBorderClass(effectiveBorderStyle) : "";
        const hasBanner = !!profile.banner_url && !!profile.is_pro;
        const avatarInner = (
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold"
            style={{
              background: profile.avatar_url ? "transparent" : accentColor + "33",
              color: accentColor,
              border: borderClass ? "none" : `2px solid ${accentColor}55`,
              boxShadow: (hasBanner && !borderClass) ? "0 0 0 4px #0d0d1a" : "none",
            }}>
            {(() => {
              const src = resolveAvatar(profile.avatar_url, profile.avatar_static_url, profile.is_pro);
              return src
                ? <img src={src} alt="avatar" className="w-full h-full object-cover" style={src === profile.avatar_url ? gifCropStyle(profile.avatar_crop, 64, 64) : undefined} />
                : profile.username.slice(0, 2).toUpperCase();
            })()}
          </div>
        );
        return (
          <div className="card-solid overflow-hidden mb-4 slide-up relative" style={{ border: `1px solid ${accentColor}22` }}>
            {/* Banner */}
            {hasBanner && (
              <div className="w-full overflow-hidden relative" style={{ height: 150 }}>
                <img src={profile.banner_url!} alt="" className="w-full h-full object-cover" style={gifCropStyle(profile.banner_crop, 400, 150)} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(13,13,26,0.55))" }} />
              </div>
            )}
            {/* Avatar — absolute over banner/content boundary when banner exists */}
            {hasBanner && (
              <div className="absolute left-6" style={{ top: 118, zIndex: 10 }}>
                <div className={borderClass || "relative"}>
                  {avatarInner}
                  <span className="absolute bottom-0 right-0"><OnlineDot userId={profile.id} size={12} /></span>
                </div>
              </div>
            )}

            <div className={hasBanner ? "px-6 pb-6 pt-3" : "p-6"}>
              {/* Header row */}
              {hasBanner ? (
                <div className="flex items-start justify-between mb-4" style={{ paddingLeft: 80 }}>
                  <div className="flex-1 min-w-0 pl-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h1 className="text-xl font-semibold">{profile.username}</h1>
                      {profile.is_pro && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#EF9F2722", color: "#EF9F27", border: "1px solid #EF9F2744" }}>✦ Pro</span>
                      )}
                      {profile.title && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: accentColor + "22", color: accentColor, border: `1px solid ${accentColor}33` }}>
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
                    <p className="font-mono text-2xl font-bold" style={{ color: accentColor }}>{profile.elo}</p>
                    <p className="text-xs text-white/30">ELO</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 mb-4">
                  <div className={`relative flex-shrink-0 ${borderClass}`}>
                    {avatarInner}
                    <span className="absolute bottom-0 right-0"><OnlineDot userId={profile.id} size={12} /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h1 className="text-xl font-semibold">{profile.username}</h1>
                      {profile.is_pro && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#EF9F2722", color: "#EF9F27", border: "1px solid #EF9F2744" }}>✦ Pro</span>
                      )}
                      {profile.title && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: accentColor + "22", color: accentColor, border: `1px solid ${accentColor}33` }}>
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
                    <p className="font-mono text-2xl font-bold" style={{ color: accentColor }}>{profile.elo}</p>
                    <p className="text-xs text-white/30">ELO</p>
                  </div>
                </div>
              )}

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
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accentColor }} />
                  </div>
                  <p className="text-xs text-white/30 mt-1 text-right">{profile.elo} / {nextTier.min} ELO</p>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                {[
                  { label: "Wins", val: profile.wins, color: "#5DCAA5" },
                  { label: "Losses", val: profile.losses, color: "#E24B4A" },
                  { label: "Games", val: totalGames, color: "rgba(255,255,255,0.7)" },
                  { label: "Win rate", val: `${wr}%`, color: accentColor },
                ].map(s => (
                  <div key={s.label} className="bg-white/4 rounded-xl p-3">
                    <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.val}</p>
                    <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Streak + kanji */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: "🔥", val: profile.streak ?? 0, label: "Streak" },
                  { icon: "⚡", val: profile.best_streak ?? 0, label: "Best streak" },
                  { icon: "📖", val: kanjiStats.length, label: "Kanji seen" },
                ].map(s => (
                  <div key={s.label} className="bg-white/4 rounded-xl p-3 text-center">
                    <p className="text-xl mb-0.5">{s.icon}</p>
                    <p className="font-mono text-xl font-bold text-white">{s.val}</p>
                    <p className="text-xs text-white/30">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Featured badges */}
              {profile.featured_badges && profile.featured_badges.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-white/30 mb-2">Featured badges</p>
                  <div className="flex gap-2">
                    {profile.featured_badges.map(id => {
                      const b = badges.find(x => x.id === id);
                      if (!b) return null;
                      const rc = RARITY_COLORS[b.rarity];
                      return (
                        <div key={id} className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl"
                          style={{ background: rc + "18", border: `1px solid ${rc}44` }}>
                          <span className="text-xl">{b.icon}</span>
                          <span className="text-xs leading-tight" style={{ color: rc, fontSize: 9 }}>{b.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Quick badge preview */}
              {unlockedCount > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-white/30">{unlockedCount} badges unlocked</p>
                    <button onClick={() => setTab("badges")} className="text-xs hover:opacity-70 transition-opacity" style={{ color: accentColor }}>
                      View all →
                    </button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {badges.filter(b => b.unlocked).slice(0, 8).map(b => (
                      <span key={b.id} className="text-lg" title={b.name}>{b.icon}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Ranks modal ── */}
      {showRanks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowRanks(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: "#0d0d1a", border: "1px solid rgba(127,119,221,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Rank ladder</p>
                <p className="text-white/40 text-xs mt-0.5">Climb from Bronze to Grand Champion</p>
              </div>
              <button onClick={() => setShowRanks(false)} className="text-white/30 hover:text-white/60 text-lg">✕</button>
            </div>
            <div className="p-3 flex flex-col gap-1">
              {[
                { name: "Bronze I", min: 0, max: 200, color: "#8D6E63" },
                { name: "Bronze II", min: 200, max: 400, color: "#8D6E63" },
                { name: "Silver I", min: 400, max: 600, color: "#757575" },
                { name: "Silver II", min: 600, max: 800, color: "#757575" },
                { name: "Gold I", min: 800, max: 1000, color: "#B8860B" },
                { name: "Gold II", min: 1000, max: 1200, color: "#B8860B" },
                { name: "Platinum I", min: 1200, max: 1400, color: "#4DB6AC" },
                { name: "Platinum II", min: 1400, max: 1600, color: "#4DB6AC" },
                { name: "Diamond", min: 1600, max: 1800, color: "#5C6BC0" },
                { name: "Champion", min: 1800, max: 2000, color: "#7B1FA2" },
                { name: "Grand Champion", min: 2000, max: 9999, color: "#C62828" },
              ].map(r => {
                const isMe = profile.elo >= r.min && profile.elo < r.max;
                return (
                  <div key={r.name} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{
                      background: isMe ? r.color + "15" : "rgba(255,255,255,0.02)",
                      border: isMe ? `1px solid ${r.color}44` : "1px solid transparent",
                    }}>
                    <span style={{ color: r.color }}>⬡</span>
                    <span className="text-sm font-medium flex-1" style={{ color: r.color }}>{r.name}</span>
                    <span className="font-mono text-xs text-white/30">{r.min}+</span>
                    {isMe && <span className="text-xs text-white/40">← you</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-1 bg-white/4 rounded-xl p-1 min-w-max">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap"
              style={{
                background: tab === t.key ? "rgba(83,74,183,0.35)" : "transparent",
                color: tab === t.key ? "#7F77DD" : "rgba(255,255,255,0.3)",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Matches ── */}
      {tab === "matches" && (
        <div className="card-solid overflow-hidden">
          {matches.length === 0
            ? <div className="p-8 text-center text-white/30 text-sm">No matches yet</div>
            : <>
              {matches.slice(0, profile.is_pro ? 50 : 10).map(m => {
                const isP1 = m.player1_id === profile.id;
                const my = isP1 ? m.p1_score : m.p2_score;
                const opp = isP1 ? m.p2_score : m.p1_score;
                const elo = isP1 ? m.p1_elo_change : m.p2_elo_change;
                const won = m.winner_id === profile.id ? true : m.winner_id === null ? null : false;
                const date = new Date(m.played_at).toLocaleDateString("en", { month: "short", day: "numeric" });
                return (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0">
                    <div className="w-1.5 h-8 rounded-full flex-shrink-0"
                      style={{ background: won === true ? "#1D9E75" : won === false ? "#E24B4A" : "rgba(255,255,255,0.15)" }} />
                    <div className="flex-1 min-w-0">
                      {m.opponent_id ? (
                        <Link href={`/user/${m.opponent_username}`}>
                          <p className="text-sm font-medium hover:text-accent transition-colors cursor-pointer">
                            vs <span className="underline underline-offset-2 decoration-white/20">{m.opponent_username}</span>
                          </p>
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">vs {m.opponent_username}</p>
                      )}
                      <p className="text-xs text-white/30 mt-0.5">{date} · {m.p1_score + m.p2_score} rounds</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold">
                        <span style={{ color: "#7F77DD" }}>{my}</span>
                        <span className="text-white/20 mx-1">-</span>
                        <span style={{ color: "#D85A30" }}>{opp}</span>
                      </p>
                      {profile.is_pro ? (
                        <p className="text-xs font-mono mt-0.5" style={{ color: elo >= 0 ? "#5DCAA5" : "#E24B4A" }}>
                          {elo >= 0 ? "+" : ""}{elo} ELO
                        </p>
                      ) : (
                        <p className="text-xs font-mono mt-0.5 text-white/20">?? ELO</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {!profile.is_pro && matches.length > 10 && (
                <div className="px-5 py-3 text-center text-xs text-white/30 border-t border-white/5">
                  <Link href="/shop" className="text-accent hover:text-white transition-colors">
                    ✦ Upgrade to Pro
                  </Link>
                  {" "}to see full match history (50 matches)
                </div>
              )}
            </>
          }
        </div>
      )}

      {/* ── Tab: ELO Curve ── */}
      {tab === "elo" && (
        <div className="card-solid p-5">
          {!profile.is_pro ? (
            <div className="relative">
              <div className="blur-sm pointer-events-none select-none opacity-40">
                <EloChart matches={matches} profileId={profile.id} accentColor={accentColor} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="text-2xl">✦</span>
                <p className="text-sm font-semibold text-white">Pro feature</p>
                <p className="text-xs text-white/40 text-center">Unlock your ELO history chart with KanjiDual Pro</p>
                <Link href="/shop" className="mt-1 text-xs font-semibold px-4 py-2 rounded-xl"
                  style={{ background: "linear-gradient(135deg, #534AB7, #7F77DD)", color: "#fff" }}>
                  Upgrade — €2.99/mo
                </Link>
              </div>
            </div>
          ) : (
            <>
              <EloChart matches={matches} profileId={profile.id} accentColor={accentColor} />
              {/* ELO summary stats */}
              {matches.length > 0 && (() => {
                const eloChanges = matches.map(m =>
                  m.player1_id === profile.id ? m.p1_elo_change : m.p2_elo_change
                );
                const bestGain = Math.max(...eloChanges);
                const worstLoss = Math.min(...eloChanges);
                const avgChange = eloChanges.reduce((a, b) => a + b, 0) / eloChanges.length;
                const streak = (() => {
                  let cur = 0; let best = 0;
                  for (const m of matches) {
                    if (m.winner_id === profile.id) { cur++; best = Math.max(best, cur); }
                    else cur = 0;
                  }
                  return best;
                })();
                return (
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    {[
                      { label: "Best gain", val: `+${bestGain}`, color: "#5DCAA5" },
                      { label: "Worst loss", val: `${worstLoss}`, color: "#E24B4A" },
                      { label: "Avg change", val: (avgChange >= 0 ? "+" : "") + avgChange.toFixed(1), color: avgChange >= 0 ? "#5DCAA5" : "#E24B4A" },
                      { label: "Best win streak", val: `${streak}`, color: "#EF9F27" },
                    ].map(s => (
                      <div key={s.label} className="bg-white/4 rounded-xl p-3 text-center">
                        <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.val}</p>
                        <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Badges ── */}
      {tab === "badges" && (
        <div className="card-solid p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-white/40 uppercase tracking-widest">Achievements</p>
            <span className="text-xs font-mono" style={{ color: accentColor }}>
              {unlockedCount}/{badges.length} unlocked
            </span>
          </div>
          {/* Unlocked */}
          {unlockedCount > 0 && (
            <>
              <p className="text-xs text-white/30 mb-2">Unlocked</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {badges.filter(b => b.unlocked).map(b => <BadgeCard key={b.id} badge={b} />)}
              </div>
            </>
          )}
          {/* Locked */}
          {badges.some(b => !b.unlocked) && (
            <>
              <p className="text-xs text-white/30 mb-2">Locked</p>
              <div className="grid grid-cols-3 gap-2">
                {badges.filter(b => !b.unlocked).map(b => <BadgeCard key={b.id} badge={b} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Weakest Kanji ── */}
      {/* ── Tab: Stats ── */}
      {tab === "stats" && (
        <div className="flex flex-col gap-4">
          {totalSeen === 0 ? (
            <div className="card-solid p-8 text-center text-white/30 text-sm">
              Play practice or duel mode to build your stats
            </div>
          ) : (
            <>
              {/* ── Overview row ── */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Words seen", val: kanjiStats.length.toLocaleString() },
                  { label: "Total answers", val: totalSeen.toLocaleString() },
                  { label: "Overall acc.", val: `${Math.round(totalCorrect / totalSeen * 100)}%`,
                    color: totalCorrect / totalSeen >= 0.7 ? "#5DCAA5" : totalCorrect / totalSeen >= 0.4 ? "#EF9F27" : "#E24B4A" },
                ].map(s => (
                  <div key={s.label} className="card-solid p-3 text-center">
                    <p className="font-mono text-lg font-bold" style={{ color: (s as any).color ?? "rgba(255,255,255,0.9)" }}>{s.val}</p>
                    <p className="text-xs text-white/30 mt-0.5 leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Per-JLPT breakdown ── */}
              <div className="card-solid overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5">
                  <p className="text-xs text-white/40 uppercase tracking-widest">Accuracy by level</p>
                </div>
                {["N5", "N4", "N3", "N2", "N1", "X"].filter(l => jlptStats[l]).map(level => {
                  const s = jlptStats[level];
                  const total = s.correct + s.wrong;
                  const acc = Math.round(s.correct / total * 100);
                  const jlptColor = JLPT_COLORS[level] ?? "#9C27B0";
                  const accColor = acc >= 70 ? "#5DCAA5" : acc >= 40 ? "#EF9F27" : "#E24B4A";
                  const label = level === "X" ? "No JLPT" : level;
                  return (
                    <div key={level} className="px-5 py-3 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md w-16 text-center flex-shrink-0"
                          style={{ background: jlptColor + "22", color: jlptColor }}>{label}</span>
                        <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${acc}%`, background: accColor }} />
                        </div>
                        <span className="font-mono text-sm font-bold w-10 text-right flex-shrink-0"
                          style={{ color: accColor }}>{acc}%</span>
                      </div>
                      <div className="flex gap-3 text-xs pl-20">
                        <span className="text-white/30">{total} answers</span>
                        <span style={{ color: "#5DCAA5" }}>✓ {s.correct}</span>
                        <span style={{ color: "#E24B4A" }}>✗ {s.wrong}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Hardest words (min 3 attempts) ── */}
              {hardestWords.length > 0 && (
                <div className="card-solid overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <p className="text-xs text-white/40 uppercase tracking-widest">Hardest words</p>
                    <p className="text-xs text-white/20">min. 3 attempts</p>
                  </div>
                  {hardestWords.map(s => {
                    const total = s.correct + s.wrong;
                    const acc = Math.round(s.correct / total * 100);
                    const jlptColor = JLPT_COLORS[s.jlpt] ?? "#9C27B0";
                    const accColor = acc >= 70 ? "#5DCAA5" : acc >= 40 ? "#EF9F27" : "#E24B4A";
                    return (
                      <div key={s.kanji} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
                        <div className="font-jp text-2xl w-9 text-center flex-shrink-0">{s.kanji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: jlptColor + "22", color: jlptColor }}>
                              {s.jlpt === "X" ? "No JLPT" : s.jlpt}
                            </span>
                            <span className="text-xs text-white/25">{total} tries</span>
                          </div>
                          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${acc}%`, background: accColor }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 w-10">
                          <p className="font-mono text-sm font-bold" style={{ color: accColor }}>{acc}%</p>
                          <p className="text-xs text-white/25">{s.wrong} ✗</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
