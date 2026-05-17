"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTier, winRate } from "@/lib/elo";
import Link from "next/link";
import { OnlineDot } from "@/contexts/PresenceContext";
import { getBorderClass } from "@/lib/cosmetics";

interface Profile {
  id: string; username: string; elo: number;
  wins: number; losses: number; draws: number;
  avatar_url: string | null; accent_color: string | null;
  avatar_static_url: string | null;
  avatar_border_style: string | null;
  owned_cosmetics: string[] | null;
}
interface MonthlyEntry {
  id: string; username: string; elo: number;
  avatar_url: string | null; accent_color: string | null;
  avatar_static_url: string | null;
  avatar_border_style: string | null;
  owned_cosmetics: string[] | null;
  gained: number; wins: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** Returns a non-animated avatar URL, or null if the only option is a GIF without a static fallback */
function safeAvatar(avatar_url: string | null | undefined, avatar_static_url: string | null | undefined): string | null {
  if (avatar_static_url) return avatar_static_url;
  if (avatar_url?.toLowerCase().endsWith(".gif")) return null;
  return avatar_url ?? null;
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [monthly, setMonthly] = useState<MonthlyEntry[]>([]);
  const [tab, setTab] = useState<"alltime"|"monthly">("alltime");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [liveRooms, setLiveRooms] = useState<Record<string, string>>({}); // playerId → roomId
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      // All-time
      let query = supabase
        .from("profiles")
        .select("id, username, elo, wins, losses, draws, avatar_url, accent_color, avatar_static_url, avatar_border_style, owned_cosmetics")
        .order("elo", { ascending: false })
        .limit(50);
      if (search.trim()) query = query.ilike("username", `%${search}%`);
      const { data } = await query;
      setPlayers(data ?? []);

      // Monthly: matches from start of current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: matches } = await supabase
        .from("matches")
        .select("player1_id,player2_id,winner_id,p1_elo_change,p2_elo_change")
        .gte("played_at", monthStart);

      if (matches?.length) {
        const gainMap: Record<string, { gained: number; wins: number }> = {};
        for (const m of matches) {
          [
            { id: m.player1_id, delta: m.p1_elo_change, won: m.winner_id === m.player1_id },
            { id: m.player2_id, delta: m.p2_elo_change, won: m.winner_id === m.player2_id },
          ].forEach(({ id, delta, won }) => {
            if (!id) return;
            if (!gainMap[id]) gainMap[id] = { gained: 0, wins: 0 };
            gainMap[id].gained += delta;
            if (won) gainMap[id].wins++;
          });
        }
        const ids = Object.keys(gainMap);
        const { data: profiles } = await supabase
          .from("profiles").select("id,username,elo,avatar_url,accent_color,avatar_static_url,avatar_border_style,owned_cosmetics").in("id", ids);
        const entries: MonthlyEntry[] = (profiles ?? []).map((p: any) => ({
          ...p, gained: gainMap[p.id]?.gained ?? 0, wins: gainMap[p.id]?.wins ?? 0,
        })).sort((a: MonthlyEntry, b: MonthlyEntry) => b.gained - a.gained).slice(0, 50);
        setMonthly(entries);
      }

      setLoading(false);
    })();
  }, [search]);

  // Poll for live players every 8s
  useEffect(() => {
    async function fetchLive() {
      const { data } = await supabase.from("rooms")
        .select("id,player1_id,player2_id").eq("status", "active");
      const ids = new Set<string>();
      const rooms: Record<string, string> = {};
      for (const r of data ?? []) {
        if (r.player1_id) { ids.add(r.player1_id); rooms[r.player1_id] = r.id; }
        if (r.player2_id) { ids.add(r.player2_id); rooms[r.player2_id] = r.id; }
      }
      setLiveIds(ids);
      setLiveRooms(rooms);
    }
    fetchLive();
    const t = setInterval(fetchLive, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="min-h-screen px-4 py-12 relative z-10 max-w-lg mx-auto">
      {/* Header */}
      <Link href="/" className="text-sm text-white/30 hover:text-white/60 mb-6 inline-block transition-colors">← Home</Link>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Leaderboard</h1>
          <p className="text-white/40 text-sm">Top {players.length} players by ELO</p>
        </div>
        <Link href="/matchmaking">
          <button className="btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: 14 }}>
            ⚡ Play
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/4 rounded-xl p-1 mb-4">
        {([["alltime","🏆 All time"],["monthly","📅 This month"]] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={{background:tab===key?"rgba(83,74,183,0.35)":"transparent",color:tab===key?"#7F77DD":"rgba(255,255,255,0.35)"}}>
            {label}
          </button>
        ))}
      </div>

      {/* Search (only for all-time) */}
      {tab==="alltime"&&(
        <div className="mb-4">
          <input className="input-field" placeholder="Search player..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-white/30">Loading…</div>
      ) : tab==="alltime" ? (
        <div className="card-solid overflow-hidden">
          {players.length === 0 && (
            <div className="text-center py-12 text-white/30">
              <p>No players yet</p><p className="text-sm mt-1">Be the first to play!</p>
            </div>
          )}
          {players.map((p, i) => {
            const tier = getTier(p.elo);
            const wr = winRate(p.wins, p.losses);
            const total = p.wins + p.losses;
            const isLive = liveIds.has(p.id);
            const roomId = liveRooms[p.id];
            const borderCls = p.owned_cosmetics?.includes("pack1") ? getBorderClass(p.avatar_border_style) : "";
            return (
              <Link key={p.username} href={`/user/${p.username}`}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors">
                <span className="font-mono text-sm w-6 text-center flex-shrink-0"
                  style={{ color: i < 3 ? "#EF9F27" : "rgba(255,255,255,0.2)" }}>
                  {MEDALS[i] ?? i + 1}
                </span>
                <div className="relative flex-shrink-0">
                  <div className={borderCls || "relative"}>
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold"
                    style={{ background: (p.accent_color ?? tier.bg) + "33", color: p.accent_color ?? tier.color, border: borderCls ? "none" : `1.5px solid ${isLive ? "#1D9E75" : (p.accent_color ?? tier.color) + "33"}` }}>
                    {safeAvatar(p.avatar_url, p.avatar_static_url) ? <img src={safeAvatar(p.avatar_url, p.avatar_static_url)!} alt="" className="w-full h-full object-cover" /> : p.username.slice(0, 2).toUpperCase()}
                  </div>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <OnlineDot userId={p.id} size={9} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{p.username}</p>
                    {isLive && (
                      <Link href={`/duel/${roomId}`} onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-white hover:opacity-80 transition-opacity"
                        style={{ background: "rgba(29,158,117,0.25)", border: "1px solid rgba(29,158,117,0.4)", fontSize: 9 }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        LIVE
                      </Link>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: tier.bg + "22", color: tier.color }}>{tier.name}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm font-bold" style={{ color: tier.color }}>{p.elo}</p>
                  <p className="text-xs text-white/30">{total > 0 ? `${wr}% WR` : "—"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card-solid overflow-hidden">
          {monthly.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">No ranked matches this month yet</div>
          ) : monthly.map((p, i) => {
            const tier = getTier(p.elo);
            const color = p.accent_color ?? tier.color;
            const isLive = liveIds.has(p.id);
            const roomId = liveRooms[p.id];
            const borderClsM = p.owned_cosmetics?.includes("pack1") ? getBorderClass(p.avatar_border_style) : "";
            return (
              <Link key={p.id} href={`/user/${p.username}`}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors">
                <span className="font-mono text-sm w-6 text-center flex-shrink-0"
                  style={{ color: i < 3 ? "#EF9F27" : "rgba(255,255,255,0.2)" }}>
                  {MEDALS[i] ?? i + 1}
                </span>
                <div className="relative flex-shrink-0">
                  <div className={borderClsM || "relative"}>
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold"
                    style={{ background: color + "33", color, border: borderClsM ? "none" : `1.5px solid ${isLive ? "#1D9E75" : color + "33"}` }}>
                    {safeAvatar(p.avatar_url, p.avatar_static_url) ? <img src={safeAvatar(p.avatar_url, p.avatar_static_url)!} alt="" className="w-full h-full object-cover" /> : p.username.slice(0, 2).toUpperCase()}
                  </div>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <OnlineDot userId={p.id} size={9} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{p.username}</p>
                    {isLive && (
                      <Link href={`/duel/${roomId}`} onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-white hover:opacity-80 transition-opacity"
                        style={{ background: "rgba(29,158,117,0.25)", border: "1px solid rgba(29,158,117,0.4)", fontSize: 9 }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        LIVE
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-white/30">{p.wins} wins this month</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm font-bold" style={{ color: p.gained >= 0 ? "#5DCAA5" : "#E24B4A" }}>
                    {p.gained >= 0 ? "+" : ""}{p.gained}
                  </p>
                  <p className="text-xs text-white/30">ELO gained</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
