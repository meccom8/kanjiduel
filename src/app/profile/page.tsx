"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTier, TIERS, winRate } from "@/lib/elo";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
}

interface Match {
  id: string;
  player1_id: string;
  player2_id: string;
  winner_id: string | null;
  p1_score: number;
  p2_score: number;
  p1_elo_change: number;
  p2_elo_change: number;
  rounds: number;
  category: string;
  played_at: string;
  // joined
  opponent_username?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const [{ data: profileData }, { data: matchData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("matches")
          .select("*")
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .order("played_at", { ascending: false })
          .limit(20),
      ]);

      setProfile(profileData);

      // Enrich matches with opponent username
      if (matchData && profileData) {
        const opponentIds = matchData.map((m: Match) =>
          m.player1_id === user.id ? m.player2_id : m.player1_id
        );
        const uniqueIds = [...new Set(opponentIds)];
        const { data: opponents } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", uniqueIds);

        const oppMap: Record<string, string> = {};
        opponents?.forEach((o: { id: string; username: string }) => {
          oppMap[o.id] = o.username;
        });

        const enriched = matchData.map((m: Match) => ({
          ...m,
          opponent_username:
            oppMap[m.player1_id === user.id ? m.player2_id : m.player1_id] ??
            "Unknown",
        }));
        setMatches(enriched);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
      </div>
    );
  }

  if (!profile) return null;

  const tier = getTier(profile.elo);
  const wr = winRate(profile.wins, profile.losses);
  const totalGames = profile.wins + profile.losses + profile.draws;

  // Progress to next tier
  const currentTierIdx = TIERS.findIndex((t) => t.name === tier.name);
  const nextTier = TIERS[currentTierIdx + 1];
  const progressPct = nextTier
    ? Math.round(
        ((profile.elo - tier.min) / (nextTier.min - tier.min)) * 100
      )
    : 100;

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      {/* Back */}
      <Link
        href="/"
        className="text-sm text-white/30 hover:text-white/60 transition-colors mb-6 inline-block"
      >
        ← Back
      </Link>

      {/* Profile header */}
      <div className="card-solid p-6 mb-4 slide-up">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0"
            style={{ background: tier.bg + "33", color: tier.color }}
          >
            {profile.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{profile.username}</h1>
            <span
              className="inline-block text-xs px-2.5 py-1 rounded-full mt-1 font-medium"
              style={{ background: tier.bg + "33", color: tier.color }}
            >
              ⬡ {tier.name}
            </span>
          </div>
          <div className="ml-auto text-right">
            <p className="font-mono text-2xl font-bold" style={{ color: tier.color }}>
              {profile.elo}
            </p>
            <p className="text-xs text-white/30">ELO</p>
          </div>
        </div>

        {/* Rank progress bar */}
        {nextTier && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-white/30 mb-1.5">
              <span>{tier.name}</span>
              <span>{nextTier.name}</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: tier.color }}
              />
            </div>
            <p className="text-xs text-white/30 mt-1 text-right">
              {profile.elo} / {nextTier.min} ELO
            </p>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Wins", val: profile.wins, color: "#5DCAA5" },
            { label: "Losses", val: profile.losses, color: "#E24B4A" },
            { label: "Games", val: totalGames, color: "rgba(255,255,255,0.7)" },
            { label: "Win rate", val: `${wr}%`, color: "#7F77DD" },
          ].map((s) => (
            <div key={s.label} className="bg-white/4 rounded-xl p-3">
              <p className="font-mono text-lg font-bold" style={{ color: s.color }}>
                {s.val}
              </p>
              <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Play button */}
      <Link href="/matchmaking">
        <button className="btn-primary mb-6">⚡ Find a match</button>
      </Link>

      {/* Match history */}
      <div>
        <h2 className="text-sm font-medium text-white/40 uppercase tracking-widest mb-3">
          Recent matches
        </h2>

        {matches.length === 0 ? (
          <div className="card-solid p-8 text-center text-white/30 text-sm">
            No matches played yet
          </div>
        ) : (
          <div className="card-solid overflow-hidden">
            {matches.map((m) => {
              const isP1 = m.player1_id === profile.id;
              const myScore = isP1 ? m.p1_score : m.p2_score;
              const oppScore = isP1 ? m.p2_score : m.p1_score;
              const eloChange = isP1 ? m.p1_elo_change : m.p2_elo_change;
              const won =
                m.winner_id === profile.id
                  ? true
                  : m.winner_id === null
                  ? null
                  : false;

              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0"
                >
                  {/* Result indicator */}
                  <div
                    className="w-1.5 h-8 rounded-full flex-shrink-0"
                    style={{
                      background:
                        won === true
                          ? "#1D9E75"
                          : won === false
                          ? "#E24B4A"
                          : "rgba(255,255,255,0.15)",
                    }}
                  />

                  {/* Opponent */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      vs {m.opponent_username}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5 capitalize">
                      {m.category === "all" ? "All mixed" : m.category} ·{" "}
                      {m.rounds} rounds
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-center">
                    <p className="font-mono text-sm font-bold">
                      <span style={{ color: "#7F77DD" }}>{myScore}</span>
                      <span className="text-white/20 mx-1">-</span>
                      <span style={{ color: "#D85A30" }}>{oppScore}</span>
                    </p>
                    <p
                      className="text-xs font-mono mt-0.5"
                      style={{ color: eloChange >= 0 ? "#5DCAA5" : "#E24B4A" }}
                    >
                      {eloChange >= 0 ? "+" : ""}
                      {eloChange} ELO
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
