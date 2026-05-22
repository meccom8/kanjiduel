"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTier } from "@/lib/elo";
import { getBorderClass } from "@/lib/cosmetics";
import { resolveAvatar } from "@/lib/avatar";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/matchmaking", label: "Find a match", icon: "⚡" },
  { href: "/daily",       label: "Daily",         icon: "🗓" },
  { href: "/practice",    label: "Practice",       icon: "📖" },
  { href: "/friends",     label: "Friends",        icon: "👥" },
  { href: "/leaderboard", label: "Leaderboard",    icon: "🏆" },
  { href: "/dictionary",  label: "Dictionary",     icon: "📚" },
  { href: "/shop",        label: "Shop",           icon: "✨" },
  { href: "/settings",    label: "Settings",       icon: "⚙️" },
];

// Pages where the desktop nav must not appear
const NO_NAV_EXACT = ["/landing", "/login", "/signup", "/register"];
const NO_NAV_PREFIX = ["/duel/"];

interface Profile {
  id: string; username: string; elo: number;
  avatar_url: string | null; avatar_static_url: string | null;
  accent_color: string | null; avatar_border_style: string | null;
  owned_cosmetics: string[] | null; is_pro: boolean | null;
}

export default function DesktopNav() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, setPending] = useState(0);
  const pathname = usePathname();
  const supabase = createClient();

  const hidden =
    NO_NAV_EXACT.includes(pathname) ||
    NO_NAV_PREFIX.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (hidden) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [p, f] = await Promise.all([
        supabase.from("profiles")
          .select("id,username,elo,avatar_url,avatar_static_url,accent_color,avatar_border_style,owned_cosmetics,is_pro")
          .eq("id", user.id).single(),
        supabase.from("friendships")
          .select("id", { count: "exact", head: true })
          .eq("addressee_id", user.id).eq("status", "pending"),
      ]);
      setProfile(p.data);
      setPending((f as any).count ?? 0);
    })();
  }, [hidden]);

  if (hidden || !profile) return null;

  const tier = getTier(profile.elo);
  const accentColor = profile.accent_color ?? tier.color;
  const borderCls = profile.owned_cosmetics?.includes("pack1")
    ? getBorderClass(profile.avatar_border_style)
    : "";
  const avatarSrc = resolveAvatar(
    profile.avatar_url,
    profile.avatar_static_url,
    profile.is_pro,
  );

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-52 z-40 select-none"
      style={{ background: "#0c0a09", borderRight: "1px solid rgba(207,69,32,0.12)" }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="px-5 py-5 flex items-center gap-2.5 group border-b shrink-0"
        style={{ borderColor: "rgba(207,69,32,0.1)" }}
      >
        <span
          className="font-jp text-2xl transition-opacity group-hover:opacity-75"
          style={{ color: "#E86440" }}
        >漢</span>
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase group-hover:text-white/60 transition-colors">
          KanjiDual
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(item => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? "text-white"
                  : "text-white/45 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
              style={active ? { background: "rgba(207,69,32,0.14)" } : {}}
            >
              {active && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: "#CF4520" }}
                />
              )}
              <span className="w-5 text-center shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.href === "/friends" && pending > 0 && (
                <span
                  className="text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1.5 py-0.5"
                  style={{ background: "#EF9F27", color: "#000", minWidth: 18 }}
                >
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="px-3 py-4 border-t shrink-0" style={{ borderColor: "rgba(207,69,32,0.1)" }}>
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
        >
          <div className={borderCls || ""}>
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: accentColor + "33",
                color: accentColor,
                border: borderCls ? "none" : `1.5px solid ${accentColor}44`,
              }}
            >
              {avatarSrc
                ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                : profile.username.slice(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/80 truncate group-hover:text-white transition-colors">
              {profile.username}
            </p>
            <p className="text-[10px] font-mono" style={{ color: tier.color }}>
              {profile.elo} ELO · {tier.name}
            </p>
          </div>
        </Link>
        <button
          onClick={async () => {
            const s = createClient();
            await s.auth.signOut();
            window.location.href = "/landing";
          }}
          className="mt-1 text-[11px] text-white/20 hover:text-white/40 transition-colors w-full text-left px-2 py-1"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
