"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTier, winRate } from "@/lib/elo";
import Link from "next/link";

interface Profile {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  avatar_url: string | null;
  accent_color: string | null;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, elo, wins, losses, draws, avatar_url, accent_color")
        .order("elo", { ascending: false })
        .limit(50);
      setPlayers(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen px-4 py-12 relative z-10 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="font-jp text-xl text-accent2 hover:opacity-70 transition-opacity block mb-1">漢</Link>
          <h1 className="text-2xl font-semibold">Leaderboard</h1>
          <p className="text-white/40 text-sm">Top {players.length} players by ELO</p>
        </div>
        <Link href="/matchmaking">
          <button className="btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: 14 }}>
            ⚡ Play
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-white/30">Loading…</div>
      ) : (
        <div className="card-solid overflow-hidden">
          {players.length === 0 && (
            <div className="text-center py-12 text-white/30">
              <p>No players yet</p>
              <p className="text-sm mt-1">Be the first to play!</p>
            </div>
          )}
          {players.map((p, i) => {
            const tier = getTier(p.elo);
            const wr = winRate(p.wins, p.losses);
            const total = p.wins + p.losses;
            return (
              <Link
                key={p.username}
                href={`/user/${p.username}`}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors cursor-pointer"
              >
                {/* Rank */}
                <span className="font-mono text-sm w-6 text-center flex-shrink-0"
                  style={{ color: i < 3 ? "#EF9F27" : "rgba(255,255,255,0.2)" }}>
                  {MEDALS[i] ?? i + 1}
                </span>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{ background: tier.bg + "33", color: tier.color }}
                >
                  {p.username.slice(0, 2).toUpperCase()}
                </div>

                {/* Name + tier */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.username}</p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: tier.bg + "22", color: tier.color }}
                  >
                    {tier.name}
                  </span>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm font-bold" style={{ color: tier.color }}>{p.elo}</p>
                  <p className="text-xs text-white/30">{total > 0 ? `${wr}% WR` : "—"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
