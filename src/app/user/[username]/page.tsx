"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { getTier, TIERS, winRate } from "@/lib/elo";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { OnlineDot } from "@/contexts/PresenceContext";
import { gifCropStyle } from "@/components/CropModal";
import { getBorderClass, RANK_BADGE_DEFS, SPECIAL_BADGE_DEFS, RARITY_COLORS } from "@/lib/cosmetics";
import { resolveAvatar } from "@/lib/avatar";

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
  is_pro: boolean;
  owned_cosmetics: string[] | null;
  avatar_border: boolean | null;
  avatar_border_style: string | null;
  banner_url: string | null;
  avatar_crop: { tx: number; ty: number; zoom: number } | null;
  banner_crop: { tx: number; ty: number; zoom: number } | null;
  avatar_static_url: string | null;
  featured_badges: string[] | null;
}
interface Match {
  id: string; player1_id: string; player2_id: string;
  winner_id: string | null; p1_score: number; p2_score: number;
  p1_elo_change: number; p2_elo_change: number;
  rounds: number; played_at: string;
  is_forfeit?: boolean;
  opponent_username?: string;
  opponent_id?: string;
}
interface KanjiStat { kanji: string; jlpt: string; correct: number; wrong: number; }

const JLPT_COLORS: Record<string, string> = {
  N5: "#1D9E75", N4: "#4DB6AC", N3: "#B8860B", N2: "#D85A30", N1: "#C62828", X: "#9C27B0",
};

// ─── Badge definitions (same as profile page) ─────────────────────────────────
interface Badge {
  id: string; icon: string; name: string; desc: string;
  unlocked: boolean; rarity: "common" | "rare" | "epic" | "legendary";
}

function computeBadges(
  profile: Profile,
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
    // ── Rank badges ────────────────────────────────────────────────────────────
    ...RANK_BADGE_DEFS.map(b => ({
      id: b.id, icon: b.icon, name: b.name, desc: b.desc,
      unlocked: profile.elo >= b.minElo, rarity: b.rarity,
    })),
    // ── Special badges ─────────────────────────────────────────────────────────
    { id: "cosmetics_pack", icon: "✨", name: "Cosmetics Pack", desc: "Own the Cosmetics Pack",   unlocked: !!profile.owned_cosmetics?.includes("pack1"), rarity: "epic"      as const },
    { id: "kanjidual_pro",  icon: "✦",  name: "KanjiDual Pro",  desc: "KanjiDual Pro subscriber", unlocked: !!profile.is_pro,                               rarity: "legendary" as const },
    // ── Win badges ─────────────────────────────────────────────────────────────
    { id: "first_win", icon: "⚔️", name: "First blood",  desc: "Win your first duel", unlocked: wins >= 1,   rarity: "common" as const },
    { id: "wins_10",   icon: "🏅", name: "Warrior",      desc: "Win 10 duels",         unlocked: wins >= 10,  rarity: "common" as const },
    { id: "wins_50",   icon: "🥇", name: "Veteran",      desc: "Win 50 duels",         unlocked: wins >= 50,  rarity: "rare"   as const },
    { id: "wins_100",  icon: "👑", name: "Legend",        desc: "Win 100 duels",        unlocked: wins >= 100, rarity: "epic"   as const },
    // ── Streak badges ──────────────────────────────────────────────────────────
    { id: "streak_3",  icon: "🔥", name: "On fire",     desc: "3-game win streak",  unlocked: (profile.best_streak ?? 0) >= 3,  rarity: "common"    as const },
    { id: "streak_7",  icon: "🌋", name: "Unstoppable", desc: "7-game win streak",  unlocked: (profile.best_streak ?? 0) >= 7,  rarity: "rare"      as const },
    { id: "streak_15", icon: "☄️", name: "Godlike",     desc: "15-game win streak", unlocked: (profile.best_streak ?? 0) >= 15, rarity: "legendary" as const },
    // ── Kanji & accuracy ───────────────────────────────────────────────────────
    { id: "kanji_100",  icon: "📖", name: "Student",   desc: "Study 100 kanji",  unlocked: kanjiStats.length >= 100,  rarity: "common" as const },
    { id: "kanji_500",  icon: "📚", name: "Scholar",   desc: "Study 500 kanji",  unlocked: kanjiStats.length >= 500,  rarity: "rare"   as const },
    { id: "kanji_1000", icon: "🎓", name: "Master",    desc: "Study 1000 kanji", unlocked: kanjiStats.length >= 1000, rarity: "epic"   as const },
    { id: "accuracy_80", icon: "🎯", name: "Sharp mind", desc: "80%+ overall accuracy",    unlocked: overallAcc >= 0.8 && totalSeen >= 50, rarity: "rare" as const },
    { id: "n1_master",   icon: "🗾", name: "N1 master",  desc: "80%+ accuracy on N1",       unlocked: n1Acc >= 0.8 && (n1Stats?.correct ?? 0) + (n1Stats?.wrong ?? 0) >= 20, rarity: "legendary" as const },
    { id: "winrate_60",  icon: "📈", name: "Consistent", desc: "60%+ win rate (20+ games)", unlocked: wr >= 60 && (profile.wins + profile.losses) >= 20, rarity: "rare" as const },
    { id: "games_50",    icon: "🎮", name: "Dedicated",  desc: "Play 50 games",             unlocked: (profile.wins + profile.losses + profile.draws) >= 50,  rarity: "common" as const },
    { id: "games_100",   icon: "🕹️", name: "Hooked",    desc: "Play 100 games",            unlocked: (profile.wins + profile.losses + profile.draws) >= 100, rarity: "rare"   as const },
    { id: "games_200",   icon: "🎰", name: "Addicted",   desc: "Play 200 games",            unlocked: (profile.wins + profile.losses + profile.draws) >= 200, rarity: "epic"   as const },
    // ── Daily streak badges ───────────────────────────────────────────────────
    { id: "daily_30",    icon: "📅", name: "Monthly",    desc: "30-day activity streak",    unlocked: (profile.best_streak ?? 0) >= 30,  rarity: "rare"      as const },
    { id: "daily_100",   icon: "🗓️", name: "Century",   desc: "100-day activity streak",   unlocked: (profile.best_streak ?? 0) >= 100, rarity: "epic"      as const },
    { id: "daily_200",   icon: "🏆", name: "Immortal",   desc: "200-day activity streak",   unlocked: (profile.best_streak ?? 0) >= 200, rarity: "legendary" as const },
  ];
}

function BadgeCard({ badge }: { badge: Badge }) {
  const rarityColor = RARITY_COLORS[badge.rarity];
  return (
    <div className="rounded-xl p-3 text-center transition-all"
      style={{
        background: badge.unlocked ? `${rarityColor}18` : "rgba(255,255,255,0.03)",
        border: `1px solid ${badge.unlocked ? rarityColor + "55" : "rgba(255,255,255,0.06)"}`,
        opacity: badge.unlocked ? 1 : 0.4,
      }}>
      <div className="text-2xl mb-1.5" style={{ filter: badge.unlocked ? "none" : "grayscale(1)" }}>
        {badge.icon}
      </div>
      <p className="text-xs font-medium leading-tight" style={{ color: badge.unlocked ? rarityColor : "rgba(255,255,255,0.3)" }}>
        {badge.name}
      </p>
      <p className="text-white/25 mt-0.5 leading-tight" style={{ fontSize: 10 }}>{badge.desc}</p>
      {badge.unlocked && (
        <div className="mt-1.5">
          <span className="px-1.5 py-0.5 rounded-full capitalize"
            style={{ background: rarityColor + "33", color: rarityColor, fontSize: 9 }}>
            {badge.rarity}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── ELO Chart ────────────────────────────────────────────────────────────────
function EloChart({ matches, profileId, accentColor }: {
  matches: Match[]; profileId: string; accentColor: string;
}) {
  const points = useMemo(() => {
    const sorted = [...matches].reverse();
    let elo = 1000;
    const pts: { elo: number; won: boolean | null }[] = [];
    for (const m of sorted) {
      const isP1 = m.player1_id === profileId;
      const change = isP1 ? m.p1_elo_change : m.p2_elo_change;
      const won = m.winner_id === profileId ? true : m.winner_id === null ? null : false;
      pts.push({ elo, won });
      elo += change;
    }
    pts.push({ elo, won: null });
    return pts;
  }, [matches, profileId]);

  if (points.length < 2) return (
    <div className="flex items-center justify-center h-32 text-white/20 text-sm">
      Not enough match data
    </div>
  );

  const W = 320; const H = 100;
  const eloVals = points.map(p => p.elo);
  const minElo = Math.min(...eloVals) - 20;
  const maxElo = Math.max(...eloVals) + 20;
  const range = maxElo - minElo || 1;
  const toX = (i: number) => (i / (points.length - 1)) * W;
  const toY = (elo: number) => H - ((elo - minElo) / range) * H;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.elo).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${H} L 0 ${H} Z`;
  const diff = eloVals[eloVals.length - 1] - eloVals[0];
  const diffColor = diff >= 0 ? "#5DCAA5" : "#E24B4A";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">ELO progression</p>
        <span className="text-xs font-mono" style={{ color: diffColor }}>
          {diff >= 0 ? "+" : ""}{diff} last {matches.length} games
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100, overflow: "visible" }}>
        <defs>
          <linearGradient id="eloGradPub" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#eloGradPub)" />
        <path d={pathD} fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinejoin="round" />
        {points.slice(0, -1).map((p, i) =>
          p.won !== null ? (
            <circle key={i} cx={toX(i)} cy={toY(p.elo)} r="2.5"
              fill={p.won ? "#1D9E75" : "#E24B4A"} stroke="#0d0d1a" strokeWidth="1" />
          ) : null
        )}
        <circle cx={toX(points.length - 1)} cy={toY(eloVals[eloVals.length - 1])} r="4"
          fill={accentColor} stroke="#0d0d1a" strokeWidth="1.5" />
        <text x="0" y={toY(maxElo - 10)} fill="rgba(255,255,255,0.25)" fontSize="8">{Math.round(maxElo - 20)}</text>
        <text x="0" y={toY(minElo + 10) - 4} fill="rgba(255,255,255,0.25)" fontSize="8">{Math.round(minElo + 20)}</text>
      </svg>
      <div className="flex justify-between text-xs text-white/20 mt-1">
        <span>{matches.length} games ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UserProfile() {
  const params = useParams();
  const username = decodeURIComponent(params.username as string);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [kanjiStats, setKanjiStats] = useState<KanjiStat[]>([]);
  const [jlptStats, setJlptStats] = useState<Record<string, { correct: number; wrong: number }>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showRanks, setShowRanks] = useState(false);
  const [tab, setTab] = useState<"matches" | "elo" | "badges" | "stats">("matches");

  // Friend / challenge state
  const [meId, setMeId] = useState<string | null>(null);
  const [viewerIsPro, setViewerIsPro] = useState(false);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_sent" | "pending_received" | "friend">("none");
  const [challenging, setChallenging] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeCategory, setChallengeCategory] = useState("all");
  const [challengeBlitz, setChallengeBlitz] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState<{id:string;invite_code:string}|null>(null);
  const [activeRoom, setActiveRoom] = useState<{id:string}|null>(null);
  // My outgoing challenge room
  const [myChallengeRoomId, setMyChallengeRoomId] = useState<string|null>(null);
  const myChallengeRoomIdRef = useRef<string|null>(null);
  const challengeDoneRef = useRef(false);
  const [joiningChallenge, setJoiningChallenge] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMeId(user?.id ?? null);

      // Check if the viewer (current user) has Pro
      if (user) {
        const { data: me } = await supabase
          .from("profiles").select("is_pro").eq("id", user.id).single();
        setViewerIsPro(me?.is_pro ?? false);
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (!data) { setNotFound(true); setLoading(false); return; }
      setProfile(data);

      // Load friendship status + check if they have a waiting challenge room
      if (user && user.id !== data.id) {
        const [{ data: fs }, { data: wr }, { data: ar }] = await Promise.all([
          supabase.from("friendships")
            .select("id, requester_id, addressee_id, status")
            .or(`and(requester_id.eq.${user.id},addressee_id.eq.${data.id}),and(requester_id.eq.${data.id},addressee_id.eq.${user.id})`)
            .maybeSingle(),
          supabase.from("rooms").select("id, invite_code")
            .eq("player1_id", data.id).eq("status", "waiting").eq("is_private", true)
            .is("player2_id", null).maybeSingle(),
          supabase.from("rooms").select("id")
            .or(`player1_id.eq.${data.id},player2_id.eq.${data.id}`)
            .eq("status", "active").maybeSingle(),
        ]);

        if (fs) {
          setFriendshipId(fs.id);
          if (fs.status === "accepted") setFriendStatus("friend");
          else if (fs.status === "pending" && fs.requester_id === user.id) setFriendStatus("pending_sent");
          else if (fs.status === "pending" && fs.addressee_id === user.id) setFriendStatus("pending_received");
        }
        if (wr) setWaitingRoom(wr);
        if (ar) setActiveRoom(ar);
      }

      const [{ data: kanjiData }, { data: matchData }] = await Promise.all([
        supabase.from("kanji_stats").select("kanji, jlpt, correct, wrong").eq("user_id", data.id),
        supabase.from("matches").select("*")
          .or(`player1_id.eq.${data.id},player2_id.eq.${data.id}`)
          .order("played_at", { ascending: false })
          .limit(50),
      ]);

      setKanjiStats(kanjiData ?? []);

      const jlpt: Record<string, { correct: number; wrong: number }> = {};
      for (const s of kanjiData ?? []) {
        if (!jlpt[s.jlpt]) jlpt[s.jlpt] = { correct: 0, wrong: 0 };
        jlpt[s.jlpt].correct += s.correct;
        jlpt[s.jlpt].wrong += s.wrong;
      }
      setJlptStats(jlpt);

      if (matchData) {
        const oppIds = [...new Set(
          matchData.map((m: any) => m.player1_id === data.id ? m.player2_id : m.player1_id)
        )].filter((id): id is string => !!id);
        const oppMap: Record<string, string> = {};
        if (oppIds.length > 0) {
          const { data: opps } = await supabase.from("profiles").select("id, username").in("id", oppIds);
          opps?.forEach((o: any) => { oppMap[o.id] = o.username; });
        }
        setMatches(matchData.map((m: any) => {
          const oppId = m.player1_id === data.id ? m.player2_id : m.player1_id;
          return { ...m, opponent_id: oppId ?? undefined, opponent_username: oppId ? (oppMap[oppId] ?? "Deleted user") : "Unknown" };
        }));
      }

      setLoading(false);
    })();
  }, [username]);

  // Poll every 3s: opponent's waiting challenge room + active room + tiebreaker
  useEffect(() => {
    if (!meId || !profile || meId === profile.id) return;
    const pid = profile.id;
    const t = setInterval(async () => {
      const [{ data: wr }, { data: ar }] = await Promise.all([
        supabase.from("rooms").select("id,invite_code")
          .eq("player1_id", pid).eq("status", "waiting").eq("is_private", true)
          .is("player2_id", null).maybeSingle(),
        supabase.from("rooms").select("id")
          .or(`player1_id.eq.${pid},player2_id.eq.${pid}`)
          .eq("status", "active").maybeSingle(),
      ]);
      setWaitingRoom(wr ?? null);
      setActiveRoom(ar ?? null);

      // Tiebreaker: both clicked Challenge simultaneously → lower UUID joins
      const oppRid = wr?.id;
      if (oppRid && myChallengeRoomIdRef.current && !challengeDoneRef.current && meId < pid) {
        challengeDoneRef.current = true;
        const myRid = myChallengeRoomIdRef.current;
        myChallengeRoomIdRef.current = null;
        setMyChallengeRoomId(null);
        await supabase.from("rooms").delete().eq("id", myRid).eq("status", "waiting");
        const { error } = await supabase.from("rooms")
          .update({ player2_id: meId, status: "active" })
          .eq("id", oppRid).eq("status", "waiting");
        if (!error) router.push(`/duel/${oppRid}`);
        else challengeDoneRef.current = false;
      }
    }, 3000);
    return () => clearInterval(t);
  }, [meId, profile]);

  // Poll own challenge room until opponent joins → auto-navigate
  useEffect(() => {
    if (!myChallengeRoomId) return;
    const t = setInterval(async () => {
      if (challengeDoneRef.current) return;
      const { data } = await supabase.from("rooms").select("player2_id")
        .eq("id", myChallengeRoomId).single();
      if (data?.player2_id) {
        challengeDoneRef.current = true;
        clearInterval(t);
        router.push(`/duel/${myChallengeRoomId}`);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [myChallengeRoomId]);

  async function sendFriendRequest() {
    if (!meId || !profile) return;
    const { data } = await supabase.from("friendships").insert({
      requester_id: meId, addressee_id: profile.id, status: "pending",
    }).select().single();
    if (data) { setFriendshipId(data.id); setFriendStatus("pending_sent"); }
  }

  async function acceptFriendRequest() {
    if (!friendshipId) return;
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    setFriendStatus("friend");
  }

  async function removeFriend() {
    if (!friendshipId) return;
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setFriendshipId(null); setFriendStatus("none");
  }

  async function challengePlayer() {
    if (!meId || !profile || challenging) return;
    setShowChallengeModal(false);
    setChallenging(true);
    const code = Array.from({ length: 6 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
    ).join("");
    const cat = challengeBlitz ? `blitz:${challengeCategory}` : challengeCategory;
    const { data: room } = await supabase.from("rooms").insert({
      player1_id: meId, status: "waiting", category: cat, rounds: 11,
      is_private: true, invite_code: code,
    }).select().single();
    if (room) { myChallengeRoomIdRef.current = room.id; setMyChallengeRoomId(room.id); }
    setChallenging(false);
  }

  async function cancelChallenge() {
    if (!myChallengeRoomId) return;
    await supabase.from("rooms").delete().eq("id", myChallengeRoomId).eq("status", "waiting");
    myChallengeRoomIdRef.current = null;
    setMyChallengeRoomId(null);
  }

  async function joinChallenge() {
    if (!waitingRoom || !meId || joiningChallenge) return;
    setJoiningChallenge(true);
    const { error } = await supabase.from("rooms")
      .update({ player2_id: meId, status: "active" })
      .eq("id", waitingRoom.id).eq("status", "waiting");
    if (!error) { challengeDoneRef.current = true; router.push(`/duel/${waitingRoom.id}`); }
    else setJoiningChallenge(false);
  }

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
  const accentColor = profile.accent_color ?? tier.color;
  const tidx = TIERS.findIndex(t => t.name === tier.name);
  const nextTier = TIERS[tidx + 1];
  const pct = nextTier ? Math.round(((profile.elo - tier.min) / (nextTier.min - tier.min)) * 100) : 100;
  const totalSeen = kanjiStats.reduce((a, s) => a + s.correct + s.wrong, 0);
  const totalCorrect = kanjiStats.reduce((a, s) => a + s.correct, 0);
  const hardestWords = [...kanjiStats]
    .filter(s => s.correct + s.wrong >= 3)
    .sort((a, b) => (a.correct / (a.correct + a.wrong)) - (b.correct / (b.correct + b.wrong)))
    .slice(0, 10);

  const badges = computeBadges(profile, kanjiStats, jlptStats);
  const unlockedCount = badges.filter(b => b.unlocked).length;

  const TABS = [
    { key: "matches", label: "Matches" },
    { key: "elo", label: "ELO curve" },
    { key: "badges", label: `Badges ${unlockedCount}/${badges.length}` },
    { key: "stats", label: "Stats" },
  ] as const;

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-sm text-white/30 hover:text-white/60 transition-colors">← Back</button>
      </div>

      {/* ── Profile card ── */}
      {(() => {
        const effectiveBorderStyle = profile.avatar_border_style
          ?? (profile.avatar_border !== false ? "rainbow" : null);
        const borderClass = profile.owned_cosmetics?.includes("pack1")
          ? getBorderClass(effectiveBorderStyle) : "";
        const hasBanner = !!profile.banner_url && !!profile.is_pro;
        const avatarSrc = resolveAvatar(profile.avatar_url, profile.avatar_static_url, profile.is_pro);
        const avatarInner = (
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold"
            style={{
              background: profile.avatar_url ? "transparent" : accentColor + "33",
              color: accentColor,
              border: borderClass ? "none" : `2px solid ${accentColor}55`,
              boxShadow: (hasBanner && !borderClass) ? "0 0 0 4px #0d0d1a" : "none",
            }}>
            {avatarSrc
              ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" style={avatarSrc === profile.avatar_url ? gifCropStyle(profile.avatar_crop, 64, 64) : undefined} />
              : profile.username.slice(0, 2).toUpperCase()}
          </div>
        );
        return (
          <div className="card-solid overflow-hidden mb-4 slide-up relative" style={{ border: `1px solid ${accentColor}22` }}>
            {/* Banner — only shown for Pro users */}
            {hasBanner && (
              <div className="w-full overflow-hidden relative" style={{ height: 150 }}>
                <img src={profile.banner_url!} alt="" className="w-full h-full object-cover" style={gifCropStyle(profile.banner_crop, 400, 150)} loading="eager" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(13,13,26,0.55))" }} />
              </div>
            )}
            {/* Avatar — absolute over banner/content boundary */}
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
                      style={{ background: tier.bg + "33", color: tier.color }}>⬡ {tier.name}</button>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-2xl font-bold" style={{ color: accentColor }}>{profile.elo}</p>
                    <p className="text-xs text-white/30">ELO</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 mb-4">
                  <div className={`flex-shrink-0 ${borderClass || "relative"}`}>
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
                      style={{ background: tier.bg + "33", color: tier.color }}>⬡ {tier.name}</button>
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

              {/* ── Friend / Challenge buttons ── */}
              {meId && meId !== profile.id && (
                <div className="flex gap-2 mb-4">
                  {waitingRoom && !myChallengeRoomId ? (
                    <button onClick={joinChallenge} disabled={joiningChallenge}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ background: "linear-gradient(135deg,#1D9E75,#4DB6AC)", color: "#fff" }}>
                      {joiningChallenge ? "Joining…" : `⚡ Join ${profile.username}'s challenge!`}
                    </button>
                  ) : myChallengeRoomId ? (
                    <button onClick={cancelChallenge}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      ⏳ Waiting for {profile.username}… Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => { setChallengeCategory("all"); setChallengeBlitz(false); setShowChallengeModal(true); }}
                      disabled={challenging}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ background: accentColor + "22", color: accentColor, border: `1px solid ${accentColor}44` }}>
                      {challenging ? "…" : "⚡ Challenge"}
                    </button>
                  )}
                  {friendStatus === "none" && (
                    <button onClick={sendFriendRequest}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      + Add friend
                    </button>
                  )}
                  {friendStatus === "pending_sent" && (
                    <div className="flex-1 py-2 rounded-xl text-sm text-center text-white/30 border border-white/8">Request sent</div>
                  )}
                  {friendStatus === "pending_received" && (
                    <button onClick={acceptFriendRequest}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ background: "#1D9E7522", color: "#5DCAA5", border: "1px solid #1D9E7544" }}>
                      ✓ Accept request
                    </button>
                  )}
                  {friendStatus === "friend" && (
                    <button onClick={removeFriend}
                      className="flex-1 py-2 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 transition-colors border border-white/8">
                      ✓ Friends
                    </button>
                  )}
                </div>
              )}

              {/* Watch live */}
              {activeRoom && meId !== profile.id && (
                <Link href={`/duel/${activeRoom.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium mb-4 transition-all"
                  style={{ background: "rgba(29,158,117,0.15)", color: "#5DCAA5", border: "1px solid rgba(29,158,117,0.3)" }}>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Watch live
                </Link>
              )}

              {/* Rank progress */}
              {nextTier && (
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-white/30 mb-1.5">
                    <span>{tier.name}</span><span>{nextTier.name}</span>
                  </div>
                  <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accentColor }} />
                  </div>
                  <p className="text-xs text-white/30 mt-1 text-right">{profile.elo} / {nextTier.min} ELO</p>
                </div>
              )}

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
                          <span className="leading-tight" style={{ color: rc, fontSize: 9 }}>{b.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Badge preview */}
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

      {/* ── Challenge config modal ── */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6"
          style={{background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)"}}
          onClick={()=>setShowChallengeModal(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 slide-up"
            style={{background:"#0d0d1a",border:"1px solid rgba(127,119,221,0.3)"}}
            onClick={e=>e.stopPropagation()}>
            <p className="font-semibold mb-1">Challenge {profile.username}</p>
            <p className="text-xs text-white/40 mb-4">Pick a category and mode</p>
            <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">Category</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["all","N5","N4","N3","N2","N1"].map(c=>(
                <button key={c} onClick={()=>setChallengeCategory(c)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: challengeCategory===c ? "rgba(127,119,221,0.3)" : "rgba(255,255,255,0.05)",
                    border: challengeCategory===c ? "1px solid #7F77DD" : "1px solid rgba(255,255,255,0.08)",
                    color: challengeCategory===c ? "#7F77DD" : "rgba(255,255,255,0.5)",
                  }}>{c==="all"?"All levels":c}</button>
              ))}
            </div>
            <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">Mode</p>
            <div className="flex gap-2 mb-5">
              {[{id:false,label:"Normal · 12s"},{id:true,label:"⚡ Blitz · 5s"}].map(m=>(
                <button key={String(m.id)} onClick={()=>setChallengeBlitz(m.id)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: challengeBlitz===m.id ? (m.id?"rgba(239,159,39,0.2)":"rgba(127,119,221,0.2)") : "rgba(255,255,255,0.05)",
                    border: challengeBlitz===m.id ? (m.id?"1px solid #EF9F27":"1px solid #7F77DD") : "1px solid rgba(255,255,255,0.08)",
                    color: challengeBlitz===m.id ? (m.id?"#EF9F27":"#7F77DD") : "rgba(255,255,255,0.5)",
                  }}>{m.label}</button>
              ))}
            </div>
            <button onClick={challengePlayer}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{background:"linear-gradient(135deg,#534AB7,#7F77DD)",color:"#fff"}}>
              ⚡ Send challenge
            </button>
          </div>
        </div>
      )}

      {/* ── Ranks modal ── */}
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
              {matches.slice(0, viewerIsPro ? 50 : 10).map(m => {
                const isP1 = m.player1_id === profile.id;
                const myScore = isP1 ? m.p1_score : m.p2_score;
                const oppScore = isP1 ? m.p2_score : m.p1_score;
                const eloChange = isP1 ? m.p1_elo_change : m.p2_elo_change;
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
                      <p className="text-xs text-white/30 mt-0.5">
                        {date} · {m.is_forfeit ? <span style={{color:"#EF9F27"}}>FF</span> : `${m.p1_score + m.p2_score} rounds`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold">
                        <span style={{ color: "#7F77DD" }}>{myScore}</span>
                        <span className="text-white/20 mx-1">-</span>
                        <span style={{ color: "#D85A30" }}>{oppScore}</span>
                      </p>
                      {viewerIsPro ? (
                        <p className="text-xs font-mono mt-0.5" style={{ color: eloChange >= 0 ? "#5DCAA5" : "#E24B4A" }}>
                          {eloChange >= 0 ? "+" : ""}{eloChange} ELO
                        </p>
                      ) : (
                        <p className="text-xs font-mono mt-0.5 text-white/20">?? ELO</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {!viewerIsPro && matches.length > 10 && (
                <div className="px-5 py-3 text-center text-xs text-white/30 border-t border-white/5">
                  <Link href="/shop" className="text-accent hover:text-white transition-colors">✦ Upgrade to Pro</Link>
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
          {!viewerIsPro ? (
            <div className="relative">
              <div className="blur-sm pointer-events-none select-none opacity-40">
                <EloChart matches={matches} profileId={profile.id} accentColor={accentColor} />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="text-2xl">✦</span>
                <p className="text-sm font-semibold text-white">Pro feature</p>
                <p className="text-xs text-white/40 text-center">Unlock ELO charts for all players with Pro</p>
                <Link href="/shop" className="mt-1 text-xs font-semibold px-4 py-2 rounded-xl"
                  style={{ background: "linear-gradient(135deg, #534AB7, #7F77DD)", color: "#fff" }}>
                  Upgrade — €2.99/mo
                </Link>
              </div>
            </div>
          ) : (
            <>
              <EloChart matches={matches} profileId={profile.id} accentColor={accentColor} />
              {matches.length > 0 && (() => {
                const eloChanges = matches.map(m =>
                  m.player1_id === profile.id ? m.p1_elo_change : m.p2_elo_change
                );
                const bestGain = Math.max(...eloChanges);
                const worstLoss = Math.min(...eloChanges);
                const avgChange = eloChanges.reduce((a, b) => a + b, 0) / eloChanges.length;
                return (
                  <div className="grid grid-cols-3 gap-2 mt-5">
                    {[
                      { label: "Best gain", val: `+${bestGain}`, color: "#5DCAA5" },
                      { label: "Worst loss", val: `${worstLoss}`, color: "#E24B4A" },
                      { label: "Avg change", val: (avgChange >= 0 ? "+" : "") + avgChange.toFixed(1), color: avgChange >= 0 ? "#5DCAA5" : "#E24B4A" },
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
          {unlockedCount > 0 && (
            <>
              <p className="text-xs text-white/30 mb-2">Unlocked</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {badges.filter(b => b.unlocked).map(b => <BadgeCard key={b.id} badge={b} />)}
              </div>
            </>
          )}
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

      {/* ── Tab: Stats ── */}
      {tab === "stats" && (
        <div className="flex flex-col gap-4">
          {totalSeen === 0 ? (
            <div className="card-solid p-8 text-center text-white/30 text-sm">
              No practice data available for this player
            </div>
          ) : (
            <>
              {/* Overview row */}
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

              {/* Per-JLPT breakdown */}
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

              {/* Hardest words */}
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
