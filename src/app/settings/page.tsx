"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

const THEMES = [
  { id:"navy",   label:"Dark Navy",   preview:"#0d0d1a" },
  { id:"black",  label:"Pure Black",  preview:"#000000" },
  { id:"purple", label:"Dark Purple", preview:"#100a20" },
];

const GRID_OPTIONS = [
  { id:"none",   label:"None" },
  { id:"subtle", label:"Subtle" },
  { id:"normal", label:"Normal" },
];

const KANJI_SIZES = [
  { id:"normal", label:"Normal" },
  { id:"large",  label:"Large" },
  { id:"xl",     label:"XL" },
];

interface Profile {
  id: string; username: string; elo: number;
  avatar_url: string | null; accent_color: string | null;
  is_pro: boolean | null;
}

function Toggle({ enabled, onToggle, color }: { enabled: boolean; onToggle: () => void; color: string }) {
  return (
    <button onClick={onToggle} role="switch" aria-checked={enabled}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200"
      style={{ background: enabled ? color : "rgba(255,255,255,0.1)" }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
        style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  );
}

function applyTheme(theme: string, grid: string, kanjiSize: string, hc: boolean) {
  const html = document.documentElement;
  // Snapshot first — mutating classList while iterating it skips entries
  Array.from(html.classList).forEach(c => {
    if (c.startsWith("theme-") || c.startsWith("grid-") || c.startsWith("kanji-") || c === "high-contrast")
      html.classList.remove(c);
  });
  html.classList.add(`theme-${theme}`);
  html.classList.add(`grid-${grid}`);
  if (kanjiSize !== "normal") html.classList.add(`kanji-${kanjiSize}`);
  if (hc) html.classList.add("high-contrast");
}

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [accentColor, setAccentColor] = useState("#534AB7");

  // Gameplay
  const [hiraganaMode, setHiraganaMode] = useState(false);
  const [showRomaji, setShowRomaji] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [timerStyle, setTimerStyle] = useState<"bar"|"number">("bar");

  // Appearance
  const [theme, setTheme] = useState("navy");
  const [gridIntensity, setGridIntensity] = useState("normal");
  const [kanjiSize, setKanjiSize] = useState("normal");
  const [highContrast, setHighContrast] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Auto-save all prefs to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem("pref_hiragana_mode", String(hiraganaMode));
      localStorage.setItem("pref_show_romaji", String(showRomaji));
      localStorage.setItem("pref_sound", String(soundEnabled));
      localStorage.setItem("pref_show_meaning", String(showMeaning));
      localStorage.setItem("pref_timer_style", timerStyle);
      localStorage.setItem("pref_theme", theme);
      localStorage.setItem("pref_grid", gridIntensity);
      localStorage.setItem("pref_kanji_size", kanjiSize);
      localStorage.setItem("pref_high_contrast", String(highContrast));
    } catch {}
  }, [prefsLoaded, hiraganaMode, showRomaji, soundEnabled, showMeaning, timerStyle, theme, gridIntensity, kanjiSize, highContrast]);

  useEffect(() => {
    try {
      setHiraganaMode(localStorage.getItem("pref_hiragana_mode") === "true");
      setShowRomaji(localStorage.getItem("pref_show_romaji") !== "false");
      setSoundEnabled(localStorage.getItem("pref_sound") !== "false");
      setShowMeaning(localStorage.getItem("pref_show_meaning") !== "false");
      setTimerStyle((localStorage.getItem("pref_timer_style") as "bar"|"number") || "bar");
      setTheme(localStorage.getItem("pref_theme") || "navy");
      setGridIntensity(localStorage.getItem("pref_grid") || "normal");
      setKanjiSize(localStorage.getItem("pref_kanji_size") || "normal");
      setHighContrast(localStorage.getItem("pref_high_contrast") === "true");
    } catch {}
    setPrefsLoaded(true);

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles")
        .select("id,username,elo,avatar_url,accent_color,is_pro")
        .eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setAccentColor(data.accent_color ?? "#534AB7");
      }
      setLoading(false);
    })();
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Could not open billing portal. Please contact support.");
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  const handleTheme = (v: string) => { setTheme(v); applyTheme(v, gridIntensity, kanjiSize, highContrast); };
  const handleGrid  = (v: string) => { setGridIntensity(v); applyTheme(theme, v, kanjiSize, highContrast); };
  const handleKanji = (v: string) => { setKanjiSize(v); applyTheme(theme, gridIntensity, v, highContrast); };
  const handleHC    = (v: boolean) => { setHighContrast(v); applyTheme(theme, gridIntensity, kanjiSize, v); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
    </div>
  );
  if (!profile) return null;

  const color = accentColor;
  const muted = "rgba(255,255,255,0.3)";

  const optBtn = (active: boolean) => ({
    background: active ? color + "22" : "rgba(255,255,255,0.04)",
    border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
    color: active ? color : muted,
  });

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-sm hover:opacity-60 transition-opacity" style={{ color: muted }}>← Back</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-1">Settings</h1>
      <p className="text-sm mb-8" style={{ color: muted }}>Appearance &amp; gameplay</p>

      {/* ── Appearance ── */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Appearance</p>
        <p className="text-xs mb-5" style={{ color: muted }}>Customize how the app looks</p>

        {/* Theme */}
        <div className="mb-5">
          <p className="text-xs font-medium mb-3" style={{ color: muted }}>Background theme</p>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => handleTheme(t.id)}
                className="flex flex-col items-center gap-2 p-2 rounded-xl transition-all"
                style={{ border: theme === t.id ? `2px solid ${color}` : "2px solid transparent", background: theme === t.id ? color + "11" : "transparent" }}>
                <div className="w-10 h-10 rounded-lg" style={{ background: t.preview, border: "1px solid rgba(255,255,255,0.15)" }} />
                <span className="text-xs" style={{ color: theme === t.id ? color : muted }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="mb-5">
          <p className="text-xs font-medium mb-3" style={{ color: muted }}>Background grid</p>
          <div className="flex gap-2">
            {GRID_OPTIONS.map(g => (
              <button key={g.id} onClick={() => handleGrid(g.id)}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={optBtn(gridIntensity === g.id)}>{g.label}</button>
            ))}
          </div>
        </div>

        {/* Kanji size */}
        <div className="mb-5">
          <p className="text-xs font-medium mb-3" style={{ color: muted }}>Kanji size</p>
          <div className="flex gap-2 mb-3">
            {KANJI_SIZES.map(k => (
              <button key={k.id} onClick={() => handleKanji(k.id)}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={optBtn(kanjiSize === k.id)}>{k.label}</button>
            ))}
          </div>
          <div className="text-center py-2">
            <span className="font-jp" style={{
              fontSize: kanjiSize === "xl" ? "3.5rem" : kanjiSize === "large" ? "2.8rem" : "2.2rem",
              color,
            }}>漢</span>
          </div>
        </div>

        {/* High contrast */}
        <div className="flex items-start justify-between gap-4 pt-3 border-t border-white/5">
          <div className="flex-1">
            <p className="text-sm mb-0.5">High contrast</p>
            <p className="text-xs" style={{ color: muted }}>Stronger borders, brighter text</p>
          </div>
          <Toggle enabled={highContrast} onToggle={() => handleHC(!highContrast)} color={color} />
        </div>
      </div>

      {/* ── Gameplay ── */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Gameplay</p>
        <p className="text-xs mb-4" style={{ color: muted }}>How you play duels and practice</p>

        {[
          { label: "Convert to hiragana", desc: "Type romaji → auto-converts. ka→か tsu→つ", val: hiraganaMode, set: setHiraganaMode, tag: "WaniKani-style" },
          { label: "Show romaji hint", desc: "Romaji under wrong answers", val: showRomaji, set: setShowRomaji },
          { label: "Show meaning during duel", desc: "Display the translation under the kanji", val: showMeaning, set: setShowMeaning },
          { label: "Sound effects", desc: "Audio feedback for correct/wrong answers", val: soundEnabled, set: setSoundEnabled },
        ].map((item, i, arr) => (
          <div key={item.label} className={`flex items-start justify-between gap-4 py-3 ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm">{item.label}</p>
                {item.tag && <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: color + "22", color, fontSize: 10 }}>{item.tag}</span>}
              </div>
              <p className="text-xs" style={{ color: muted }}>{item.desc}</p>
            </div>
            <Toggle enabled={item.val} onToggle={() => item.set((v: boolean) => !v)} color={color} />
          </div>
        ))}

        <div className="pt-3 mt-1 border-t border-white/5">
          <p className="text-sm mb-2">Timer style</p>
          <div className="flex gap-2">
            {[{id:"bar",label:"Bar"},{id:"number",label:"Number only"}].map(t => (
              <button key={t.id} onClick={() => setTimerStyle(t.id as "bar"|"number")}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={optBtn(timerStyle === t.id)}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Subscription ── */}
      {profile.is_pro && (
        <div className="card-solid p-5 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium">KanjiDual Pro</p>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "#EF9F2722", color: "#EF9F27", border: "1px solid #EF9F2744" }}>✦ Active</span>
          </div>
          <p className="text-xs mb-4" style={{ color: muted }}>Manage your subscription, update payment, or cancel</p>
          <button onClick={openPortal} disabled={portalLoading}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: portalLoading ? muted : "white", opacity: portalLoading ? 0.6 : 1 }}>
            {portalLoading ? "Opening portal…" : "Manage subscription →"}
          </button>
        </div>
      )}

      <p className="text-center text-xs mt-2" style={{ color: muted }}>
        All settings are saved automatically
      </p>
    </main>
  );
}
