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
  streak: number;
  best_streak: number;
}

const NAV_ITEMS = [
  { href: "/matchmaking", label: "Find a match", icon: "⚡", primary: true },
  { href: "/daily", label: "Daily challenge", icon: "🗓", primary: false },
  { href: "/practice", label: "Practice solo", icon: "📖", primary: false },
  { href: "/dictionary", label: "Dictionary", icon: "📚", primary: false },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆", primary: false },
  { href: "/profile", label: "My profile", icon: "👤", primary: false },
];

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data);
      }
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
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: tier.bg + "33", color: tier.color, border: `1.5px solid ${tier.color}44` }}>
                {profile.username.slice(0, 2).toUpperCase()}
              </div>
              {profile.streak > 0 && (
                <div className="absolute -top-1 -right-1 text-xs bg-orange-500 rounded-full w-4 h-4 flex items-center justify-center"
                  style={{ fontSize: "9px" }}>🔥</div>
              )}
            </div>

            {/* Name + tier */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{profile.username}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: tier.bg + "22", color: tier.color, border: `1px solid ${tier.color}33` }}>
                  ⬡ {tier.name}
                </span>
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
                <span className={`text-sm font-medium ${item.primary ? "text-white" : "text-white/70 group-hover:text-white"} transition-colors`}>
                  {item.label}
                </span>
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

      {/* Stats strip */}
      <div className="mt-8 flex gap-10 text-center slide-up">
        {[
          { label: "Words", val: "7,238" },
          { label: "Ranks", val: "11" },
          { label: "JLPT levels", val: "5" },
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
