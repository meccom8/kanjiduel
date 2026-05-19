"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTier, winRate } from "@/lib/elo";
import Link from "next/link";
import { getBorderClass } from "@/lib/cosmetics";
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
  avatar_static_url: string | null;
  accent_color: string | null;
  avatar_border_style: string | null;
  owned_cosmetics: string[] | null;
  is_pro: boolean | null;
}

const NAV_ITEMS = [
  { href: "/matchmaking", label: "Find a match", icon: "⚡", primary: true },
  { href: "/daily", label: "Daily challenge", icon: "🗓", primary: false },
  { href: "/practice", label: "Practice solo", icon: "📖", primary: false },
  { href: "/friends", label: "Friends", icon: "👥", primary: false },
  { href: "/dictionary", label: "Dictionary", icon: "📚", primary: false },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆", primary: false },
  { href: "/shop", label: "Shop", icon: "✨", primary: false },
  { href: "/settings", label: "Settings", icon: "⚙️", primary: false },
];

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRanks, setShowRanks] = useState(false);
  const [pendingFriends, setPendingFriends] = useState(0);
  const [wordCount, setWordCount] = useState<string>("…");
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [profileRes, friendRes, vocabRes] = await Promise.all([
        user ? supabase.from("profiles").select("*").eq("id", user.id).single() : Promise.resolve({ data: null }),
        user ? supabase.from("friendships").select("id", { count: "exact", head: true }).eq("addressee_id", user.id).eq("status", "pending") : Promise.resolve({ count: 0 }),
        supabase.from("vocabulary").select("id", { count: "exact", head: true }),
      ]);
      if (user) {
        setProfile(profileRes.data);
        setPendingFriends((friendRes as any).count ?? 0);
      }
      const total = (vocabRes as any).count ?? 0;
      setWordCount(total >= 1000 ? `${(total / 1000).toFixed(0)},000+` : String(total));
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingScreen />;

  if (!profile) {
    if (typeof window !== "undefined") window.location.replace("/landing");
    return <LoadingScreen />;
  }

  const tier = getTier(profile.elo);
  const wr = winRate(profile.wins, profile.losses);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative z-10">
      {/* Logo */}
      <div className="text-center mb-10 slide-up">
        <div className="font-jp text-7xl mb-3" style={{
          background: "linear-gradient(135deg, #7F77DD, #4DB6AC)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: "drop-shadow(0 0 30px rgba(127,119,221,0.4))"
        }}>漢</div>
        <h1 className="font-mono text-sm tracking-[0.3em] text-white/30 uppercase">KanjiDuel</h1>
      </div>

      {/* Main card */}
      <div className="w-full max-w-sm slide-up" style={{
        background: "rgba(13,13,26,0.8)",
        border: "1px solid rgba(127,119,221,0.2)",
        borderRadius: "20px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 0 60px rgba(83,74,183,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
      }}>
        {/* Player info */}
        <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            {/* Avatar — click to go to profile */}
            {(() => {
              const borderCls = profile.owned_cosmetics?.includes("pack1") ? getBorderClass(profile.avatar_border_style) : "";
              return (
                <Link href="/profile" className="relative flex-shrink-0 group">
                  <div className={borderCls || "relative"}>
                    <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold transition-opacity group-hover:opacity-75 cursor-pointer"
                      style={{ background: (profile.accent_color ?? tier.bg) + "33", color: profile.accent_color ?? tier.color, border: borderCls ? "none" : `1.5px solid ${profile.accent_color ?? tier.color}44` }}>
                      {(() => {
                        const src = resolveAvatar(profile.avatar_url, profile.avatar_static_url, profile.is_pro);
                        return src
                          ? <img src={src} alt="avatar" className="w-full h-full object-cover" />
                          : profile.username.slice(0, 2).toUpperCase();
                      })()}
                    </div>
                  </div>
                  {profile.streak > 0 && (
                    <div className="absolute -top-1 -right-1 text-xs bg-orange-500 rounded-full w-4 h-4 flex items-center justify-center"
                      style={{ fontSize: "9px" }}>🔥</div>
                  )}
                </Link>
              );
            })()}

            {/* Name + tier */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{profile.username}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <button onClick={() => setShowRanks(true)}
                  className="text-xs px-2 py-0.5 rounded-full cursor-pointer transition-opacity hover:opacity-70"
                  style={{ background: tier.bg + "22", color: tier.color, border: `1px solid ${tier.color}33` }}>
                  ⬡ {tier.name}
                </button>
                {profile.streak > 0 && (
                  <span className="text-xs text-orange-400">
                    {profile.streak}d streak
                  </span>
                )}
              </div>
            </div>

            {/* ELO + WR */}
            <div className="text-right flex-shrink-0">
              <p className="font-mono text-lg font-bold" style={{ color: tier.color }}>{profile.elo}</p>
              <p className="text-xs text-white/30">{wr}% WR</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3 flex flex-col gap-1.5">
          {NAV_ITEMS.map((item, i) => (
            <Link key={item.href} href={item.href}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group"
                style={{
                  background: item.primary
                    ? "linear-gradient(135deg, #534AB7, #7F77DD)"
                    : "rgba(255,255,255,0.03)",
                  border: item.primary
                    ? "none"
                    : "1px solid rgba(255,255,255,0.06)",
                  animationDelay: `${i * 0.05}s`,
                }}
                onMouseEnter={e => {
                  if (!item.primary) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(83,74,183,0.3)";
                  }
                }}
                onMouseLeave={e => {
                  if (!item.primary) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                  }
                }}
              >
                <span className="text-base w-6 text-center">{item.icon}</span>
                <span className={`text-sm font-medium ${item.primary ? "text-white" : "text-white/70 group-hover:text-white"} transition-colors flex-1`}>
                  {item.label}
                </span>
                {item.href === "/friends" && pendingFriends > 0 && (
                  <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{background:"#EF9F27",color:"#000",fontSize:10,minWidth:18,textAlign:"center"}}>
                    {pendingFriends}
                  </span>
                )}
                {!item.primary && (
                  <span className="ml-auto text-white/20 group-hover:text-white/40 transition-colors text-xs">→</span>
                )}
              </button>
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div className="px-5 pb-4 text-center">
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Ranks Modal */}
      {showRanks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowRanks(false)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden slide-up"
            style={{ background: "#0d0d1a", border: "1px solid rgba(127,119,221,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">Rank ladder</p>
                <button onClick={() => setShowRanks(false)} className="text-white/30 hover:text-white/60 transition-colors text-lg">✕</button>
              </div>
              <p className="text-white/40 text-xs mt-0.5">Climb from Bronze to Grand Champion</p>
            </div>
            <div className="p-3 flex flex-col gap-1">
              {[
                { name: "Bronze I",       min: 0,    color: "#8D6E63", bg: "#EFEBE9" },
                { name: "Bronze II",      min: 200,  color: "#8D6E63", bg: "#EFEBE9" },
                { name: "Silver I",       min: 400,  color: "#757575", bg: "#F5F5F5" },
                { name: "Silver II",      min: 600,  color: "#757575", bg: "#F5F5F5" },
                { name: "Gold I",         min: 800,  color: "#B8860B", bg: "#FFFDE7" },
                { name: "Gold II",        min: 1000, color: "#B8860B", bg: "#FFFDE7" },
                { name: "Platinum I",     min: 1200, color: "#4DB6AC", bg: "#E0F2F1" },
                { name: "Platinum II",    min: 1400, color: "#4DB6AC", bg: "#E0F2F1" },
                { name: "Diamond",        min: 1600, color: "#5C6BC0", bg: "#E8EAF6" },
                { name: "Champion",       min: 1800, color: "#7B1FA2", bg: "#F3E5F5" },
                { name: "Grand Champion", min: 2000, color: "#C62828", bg: "#FFEBEE" },
              ].map(r => (
                <div key={r.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: profile.elo >= r.min && profile.elo < (r.min + 200) ? r.bg + "15" : "rgba(255,255,255,0.02)",
                    border: profile.elo >= r.min && profile.elo < (r.min + 200) ? `1px solid ${r.color}44` : "1px solid transparent",
                  }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: r.bg + "33", color: r.color }}>⬡</div>
                  <span className="text-sm font-medium flex-1" style={{ color: r.color }}>{r.name}</span>
                  <span className="font-mono text-xs text-white/30">{r.min}+ ELO</span>
                  {profile.elo >= r.min && profile.elo < (r.min + 200) && (
                    <span className="text-xs text-white/50">← you</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="mt-8 flex gap-10 text-center slide-up">
        {[
          { label: "Words", val: wordCount },
          { label: "Ranks", val: "11" },
          { label: "JLPT levels", val: "5+1" },
        ].map(s => (
          <div key={s.label}>
            <p className="font-mono text-lg font-bold" style={{ color: "#7F77DD" }}>{s.val}</p>
            <p className="text-white/25 text-xs uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl animate-pulse" style={{
        background: "linear-gradient(135deg, #7F77DD, #4DB6AC)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>漢</div>
    </div>
  );
}
