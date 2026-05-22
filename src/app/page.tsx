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
  { href: "/daily",       label: "Daily challenge", icon: "🗓",  primary: false },
  { href: "/practice",    label: "Practice solo",   icon: "📖",  primary: false },
  { href: "/friends",     label: "Friends",          icon: "👥",  primary: false },
  { href: "/dictionary",  label: "Dictionary",       icon: "📚",  primary: false },
  { href: "/leaderboard", label: "Leaderboard",      icon: "🏆",  primary: false },
  { href: "/shop",        label: "Shop",             icon: "✨",  primary: false },
  { href: "/settings",    label: "Settings",         icon: "⚙️", primary: false },
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
  const accentColor = profile.accent_color ?? tier.color;

  const RankModal = () => showRanks ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={() => setShowRanks(false)}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden slide-up"
        style={{ background: "#0e0c0b", border: "1px solid rgba(232,100,64,0.3)" }}
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#1a1410" }}>
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
                background: profile.elo >= r.min && profile.elo < (r.min + 200) ? r.bg + "15" : "#100e08",
                border: profile.elo >= r.min && profile.elo < (r.min + 200) ? `1px solid ${r.color}44` : "1px solid transparent",
              }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
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
  ) : null;

  return (
    <>
      <RankModal />

      {/* ─── MOBILE LAYOUT (< lg) ──────────────────────────────────── */}
      <main className="lg:hidden min-h-screen flex flex-col items-center justify-center px-4 py-12 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 slide-up">
          <div className="font-jp text-7xl mb-3" style={{
            background: "linear-gradient(135deg, #E86440, #4DB6AC)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 30px rgba(232,100,64,0.4))"
          }}>漢</div>
          <h1 className="font-mono text-sm tracking-[0.3em] text-white/30 uppercase">KanjiDual</h1>
        </div>

        {/* Main card */}
        <div className="w-full max-w-sm slide-up" style={{
          background: "#161210",
          border: "1px solid rgba(232,100,64,0.2)",
          borderRadius: "20px",
          boxShadow: "0 0 60px rgba(207,69,32,0.1)",
        }}>
          {/* Player info */}
          <div className="p-5 border-b" style={{ borderColor: "#1a1410" }}>
            <div className="flex items-center gap-3">
              {(() => {
                const borderCls = profile.owned_cosmetics?.includes("pack1") ? getBorderClass(profile.avatar_border_style) : "";
                return (
                  <Link href="/profile" className="relative shrink-0 group">
                    <div className={borderCls || "relative"}>
                      <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold transition-opacity group-hover:opacity-75"
                        style={{ background: accentColor + "33", color: accentColor, border: borderCls ? "none" : `1.5px solid ${accentColor}44` }}>
                        {(() => {
                          const src = resolveAvatar(profile.avatar_url, profile.avatar_static_url, profile.is_pro);
                          return src ? <img src={src} alt="avatar" className="w-full h-full object-cover" /> : profile.username.slice(0, 2).toUpperCase();
                        })()}
                      </div>
                    </div>
                    {profile.streak > 0 && (
                      <div className="absolute -top-1 -right-1 text-xs bg-orange-500 rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: "9px" }}>🔥</div>
                    )}
                  </Link>
                );
              })()}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{profile.username}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <button onClick={() => setShowRanks(true)}
                    className="text-xs px-2 py-0.5 rounded-full cursor-pointer transition-opacity hover:opacity-70"
                    style={{ background: tier.bg + "22", color: tier.color, border: `1px solid ${tier.color}33` }}>
                    ⬡ {tier.name}
                  </button>
                  {profile.streak > 0 && <span className="text-xs text-orange-400">{profile.streak}d streak</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-lg font-bold" style={{ color: tier.color }}>{profile.elo}</p>
                <p className="text-xs text-white/30">{wr}% WR</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <div className="p-3 flex flex-col gap-1.5">
            {NAV_ITEMS.map((item, i) => (
              <Link key={item.href} href={item.href}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group"
                  style={{
                    background: item.primary ? "linear-gradient(135deg, #CF4520, #E86440)" : "#121008",
                    border: item.primary ? "none" : "1px solid rgba(255,255,255,0.09)",
                    animationDelay: `${i * 0.05}s`,
                  }}
                  onMouseEnter={e => { if (!item.primary) { (e.currentTarget as HTMLElement).style.background = "#1e1812"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(207,69,32,0.3)"; } }}
                  onMouseLeave={e => { if (!item.primary) { (e.currentTarget as HTMLElement).style.background = "#121008"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; } }}
                >
                  <span className="text-base w-6 text-center">{item.icon}</span>
                  <span className={`text-sm font-medium flex-1 ${item.primary ? "text-white" : "text-white/70 group-hover:text-white"} transition-colors`}>
                    {item.label}
                  </span>
                  {item.href === "/friends" && pendingFriends > 0 && (
                    <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "#EF9F27", color: "#000", fontSize: 10, minWidth: 18, textAlign: "center" }}>
                      {pendingFriends}
                    </span>
                  )}
                  {!item.primary && <span className="ml-auto text-white/20 group-hover:text-white/40 transition-colors text-xs">→</span>}
                </button>
              </Link>
            ))}
          </div>

          <div className="px-5 pb-4 text-center">
            <button onClick={async () => { const s = createClient(); await s.auth.signOut(); window.location.reload(); }}
              className="text-xs text-white/20 hover:text-white/40 transition-colors">
              Sign out
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-8 flex gap-10 text-center slide-up">
          {[
            { label: "Words", val: wordCount },
            { label: "Ranks", val: "11" },
            { label: "JLPT levels", val: "5+1" },
          ].map(s => (
            <div key={s.label}>
              <p className="font-mono text-lg font-bold" style={{ color: "#E86440" }}>{s.val}</p>
              <p className="text-white/25 text-xs uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ─── DESKTOP LAYOUT (lg+) ──────────────────────────────────── */}
      <main className="hidden lg:block min-h-screen relative z-10 px-10 py-10">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-1">
            おかえり,{" "}
            <span style={{ color: accentColor }}>{profile.username}</span>
          </h1>
          <p className="text-white/40 text-sm">
            {tier.name} · {profile.elo} ELO · {wr}% WR
            {profile.streak > 0 && ` · 🔥 ${profile.streak}d streak`}
          </p>
        </div>

        {/* Dashboard grid — fills available width */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 340px" }}>

          {/* ── Left: Actions ── */}
          <div className="col-span-2 flex flex-col gap-4">

            {/* Find a match — hero CTA */}
            <Link href="/matchmaking">
              <div
                className="rounded-2xl p-6 flex items-center gap-5 group cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: "linear-gradient(135deg, rgba(207,69,32,0.22), rgba(232,100,64,0.08))",
                  border: "1px solid rgba(207,69,32,0.4)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "rgba(207,69,32,0.18)", border: "1px solid rgba(207,69,32,0.3)" }}
                >⚡</div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-white">Find a match</p>
                  <p className="text-white/50 text-sm mt-0.5">Ranked play against real opponents</p>
                </div>
                <span className="text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all text-lg">→</span>
              </div>
            </Link>

            {/* Daily + Practice */}
            <div className="grid grid-cols-2 gap-4">
              <Link href="/daily" className="group">
                <div className="rounded-2xl p-5 h-full cursor-pointer transition-all group-hover:border-white/20"
                  style={{ background: "#161210", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="text-2xl mb-3">🗓</div>
                  <p className="font-semibold text-white mb-1">Daily Challenge</p>
                  <p className="text-white/40 text-xs">10 new words every day</p>
                </div>
              </Link>
              <Link href="/practice" className="group">
                <div className="rounded-2xl p-5 h-full cursor-pointer transition-all group-hover:border-white/20"
                  style={{ background: "#161210", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="text-2xl mb-3">📖</div>
                  <p className="font-semibold text-white mb-1">Practice Solo</p>
                  <p className="text-white/40 text-xs">All JLPT levels, no pressure</p>
                </div>
              </Link>
            </div>

            {/* Secondary actions row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { href: "/friends",     icon: "👥", label: "Friends",     badge: pendingFriends },
                { href: "/leaderboard", icon: "🏆", label: "Leaderboard", badge: 0 },
                { href: "/dictionary",  icon: "📚", label: "Dictionary",  badge: 0 },
              ].map(item => (
                <Link key={item.href} href={item.href} className="group">
                  <div className="rounded-xl px-4 py-3 flex items-center gap-2.5 cursor-pointer transition-all group-hover:border-white/20"
                    style={{ background: "#161210", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-base">{item.icon}</span>
                    <span className="text-sm font-medium text-white/60 group-hover:text-white/90 transition-colors flex-1">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "#EF9F27", color: "#000" }}>{item.badge}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Right 1/3: Stats ── */}
          <div className="flex flex-col gap-4">

            {/* Player stats card */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "#161210", border: "1px solid rgba(207,69,32,0.2)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(207,69,32,0.1)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Your stats</p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">ELO</span>
                  <span className="font-mono font-bold text-xl" style={{ color: tier.color }}>{profile.elo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Rank</span>
                  <button onClick={() => setShowRanks(true)}
                    className="text-xs px-2.5 py-1 rounded-full cursor-pointer transition-opacity hover:opacity-70"
                    style={{ background: tier.bg + "22", color: tier.color, border: `1px solid ${tier.color}33` }}>
                    ⬡ {tier.name}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Win rate</span>
                  <span className="text-sm font-semibold text-white">{wr}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">W / L / D</span>
                  <span className="text-xs font-mono text-white/60">
                    {profile.wins} / {profile.losses} / {profile.draws}
                  </span>
                </div>
                {profile.streak > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">Streak</span>
                    <span className="text-sm text-orange-400">🔥 {profile.streak} days</span>
                  </div>
                )}
                {profile.best_streak > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">Best streak</span>
                    <span className="text-xs text-white/50">{profile.best_streak} days</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vocabulary count */}
            <div className="rounded-2xl p-5"
              style={{ background: "#161210", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="font-mono text-3xl font-bold" style={{ color: "#E86440" }}>{wordCount}</p>
              <p className="text-xs text-white/35 mt-1.5 uppercase tracking-widest">vocabulary words</p>
              <div className="mt-3 flex gap-3 text-center">
                {[["11", "Ranks"], ["5+1", "JLPT"]].map(([v, l]) => (
                  <div key={l} className="flex-1 rounded-xl py-2"
                    style={{ background: "rgba(207,69,32,0.08)", border: "1px solid rgba(207,69,32,0.12)" }}>
                    <p className="font-mono text-sm font-bold" style={{ color: "#E86440" }}>{v}</p>
                    <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro CTA */}
            {!profile.is_pro && (
              <Link href="/shop">
                <div className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ background: "rgba(239,159,39,0.07)", border: "1px solid rgba(239,159,39,0.22)" }}>
                  <p className="text-sm font-semibold" style={{ color: "#EF9F27" }}>✦ Upgrade to Pro</p>
                  <p className="text-xs text-white/40 mt-0.5">ELO history, 50 match history & more</p>
                </div>
              </Link>
            )}

            {/* Shop / Settings */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/shop",     icon: "✨", label: "Shop"     },
                { href: "/settings", icon: "⚙️", label: "Settings" },
              ].map(item => (
                <Link key={item.href} href={item.href} className="group">
                  <div className="rounded-xl px-3 py-2.5 flex items-center gap-2 cursor-pointer transition-all group-hover:border-white/18"
                    style={{ background: "#161210", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-xs font-medium text-white/50 group-hover:text-white/80 transition-colors">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl animate-pulse" style={{
        background: "linear-gradient(135deg, #E86440, #4DB6AC)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>漢</div>
    </div>
  );
}
