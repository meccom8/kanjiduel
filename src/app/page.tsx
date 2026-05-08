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

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative z-10">
      {/* Header */}
      <div className="text-center mb-12 slide-up">
        <div className="font-jp text-6xl mb-4">漢</div>
        <h1 className="text-4xl font-semibold tracking-tight mb-2">KanjiDuel</h1>
        <p className="text-white/40 text-base max-w-sm mx-auto">
          Real-time kanji battles. Type the meaning or reading first — win the round. Climb the ladder.
        </p>
      </div>

      {/* Main card */}
      <div className="card-solid w-full max-w-sm p-6 slide-up">
        {profile ? (
          <LoggedInLobby profile={profile} />
        ) : (
          <GuestLobby />
        )}
      </div>

      {/* Stats strip */}
      <div className="mt-8 flex gap-8 text-center slide-up">
        {[
          { label: "Kanji", val: "80+" },
          { label: "Categories", val: "6" },
          { label: "Ranks", val: "11" },
        ].map((s) => (
          <div key={s.label}>
            <p className="font-mono text-xl text-accent2">{s.val}</p>
            <p className="text-white/30 text-xs uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function LoggedInLobby({ profile }: { profile: Profile }) {
  const tier = getTier(profile.elo);
  const wr = winRate(profile.wins, profile.losses);

  return (
    <>
      {/* Player info */}
      <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/8">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ background: tier.bg, color: tier.color }}
        >
          {profile.username.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{profile.username}</p>
          <span
            className="tier-badge text-xs mt-0.5"
            style={{ background: tier.bg + "33", color: tier.color }}
          >
            ⬡ {tier.name} · {profile.elo} ELO
          </span>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-white/60">{wr}%</p>
          <p className="text-xs text-white/30">win rate</p>
        </div>
      </div>

      {/* Streak */}
      {profile.streak > 0 && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white/4 mb-2">
          <span className="text-lg">🔥</span>
          <span className="text-sm font-medium text-white/80">{profile.streak} day streak</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Link href="/matchmaking">
          <button className="btn-primary">⚡ Find a match</button>
        </Link>
        <Link href="/daily">
          <button className="btn-ghost">🗓 Daily challenge</button>
        </Link>
        <Link href="/practice">
          <button className="btn-ghost">📖 Practice solo</button>
        </Link>
        <Link href="/leaderboard">
          <button className="btn-ghost">Leaderboard</button>
        </Link>
        <Link href="/profile">
          <button className="btn-ghost">My profile</button>
        </Link>
      </div>

      <div className="mt-4 text-center">
        <LogoutButton />
      </div>
    </>
  );
}

function GuestLobby() {
  return (
    <>
      <p className="text-white/50 text-sm text-center mb-5">
        Create an account to save your ELO and compete on the leaderboard
      </p>
      <div className="flex flex-col gap-3">
        <Link href="/register">
          <button className="btn-primary">Create account</button>
        </Link>
        <Link href="/login">
          <button className="btn-ghost">Sign in</button>
        </Link>
        <Link href="/leaderboard">
          <button className="btn-ghost" style={{ opacity: 0.6 }}>View leaderboard</button>
        </Link>
      </div>
    </>
  );
}

function LogoutButton() {
  const supabase = createClient();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.reload();
      }}
      className="text-xs text-white/30 hover:text-white/50 transition-colors"
    >
      Sign out
    </button>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl text-accent animate-pulse">漢</div>
    </div>
  );
}
