"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { getTier } from "@/lib/elo";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ACCENT_COLORS = [
  { name: "Violet", value: "#534AB7" },
  { name: "Teal",   value: "#1D9E75" },
  { name: "Gold",   value: "#B8860B" },
  { name: "Coral",  value: "#D85A30" },
  { name: "Rose",   value: "#C2185B" },
  { name: "Sky",    value: "#0288D1" },
];

const TITLES = [
  "Beginner","Student","Scholar","Sensei","Master",
  "Kanji Hunter","Word Ninja","Vocab Warrior","Grammar God",
  "N5 Grinder","N4 Rising","N3 Challenger","N2 Expert","N1 Legend",
  "Daily Player","Streak Lord","Grand Champion",
];

const THEMES = [
  { id:"navy",   label:"Dark Navy",   preview:"#0d0d1a" },
  { id:"black",  label:"Pure Black",  preview:"#000000" },
  { id:"purple", label:"Dark Purple", preview:"#100a20" },
  { id:"light",  label:"Light",       preview:"#f5f5f7" },
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
  avatar_url: string | null; bio: string | null;
  title: string | null; accent_color: string | null;
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bio, setBio] = useState("");
  const [title, setTitle] = useState("");
  const [accentColor, setAccentColor] = useState("#534AB7");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);

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

  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

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

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles")
        .select("id,username,elo,avatar_url,bio,title,accent_color")
        .eq("id", user.id).single();
      if (data) {
        setProfile(data); setBio(data.bio ?? ""); setTitle(data.title ?? "");
        setAccentColor(data.accent_color ?? "#534AB7"); setAvatarUrl(data.avatar_url ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const handleTheme = (v: string) => { setTheme(v); applyTheme(v, gridIntensity, kanjiSize, highContrast); };
  const handleGrid  = (v: string) => { setGridIntensity(v); applyTheme(theme, v, kanjiSize, highContrast); };
  const handleKanji = (v: string) => { setKanjiSize(v); applyTheme(theme, gridIntensity, v, highContrast); };
  const handleHC    = (v: boolean) => { setHighContrast(v); applyTheme(theme, gridIntensity, kanjiSize, v); };

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image too large — max 2MB"); return; }
    if (!file.type.startsWith("image/")) { alert("Please upload an image file"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${profile.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
    }
    setUploading(false);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
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
    await supabase.from("profiles").update({
      bio: bio.slice(0, 160), title: title || null,
      accent_color: accentColor, avatar_url: avatarUrl || null,
    }).eq("id", profile.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
    </div>
  );
  if (!profile) return null;

  const tier = getTier(profile.elo);
  const color = accentColor;
  const isLight = theme === "light";
  const muted = isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)";

  const optBtn = (active: boolean) => ({
    background: active ? color + "22" : "rgba(255,255,255,0.04)",
    border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
    color: active ? color : muted,
  });

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <Link href="/" className="text-sm hover:opacity-60 mb-6 inline-block transition-opacity"
        style={{ color: muted }}>← Back</Link>
      <h1 className="text-2xl font-semibold mb-1">Settings</h1>
      <p className="text-sm mb-8" style={{ color: muted }}>Profile, appearance & gameplay</p>

      {/* Preview */}
      <div className="card-solid p-5 mb-4" style={{ border: `1px solid ${color}33` }}>
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: muted }}>Preview</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xl font-bold"
            style={{ background: avatarUrl ? "transparent" : color + "33", border: `2px solid ${color}55`, color }}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : profile.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold">{profile.username}</p>
              {title && <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: color + "22", color, border: `1px solid ${color}33` }}>{title}</span>}
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: tier.bg + "22", color: tier.color }}>
              ⬡ {tier.name} · {profile.elo} ELO
            </span>
            {bio && <p className="text-xs mt-2 line-clamp-2" style={{ color: muted }}>{bio}</p>}
          </div>
        </div>
      </div>

      {/* ── Appearance ── */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Appearance</p>
        <p className="text-xs mb-5" style={{ color: muted }}>Customize how the app looks</p>

        {/* Theme */}
        <div className="mb-5">
          <p className="text-xs font-medium mb-3" style={{ color: muted }}>Background theme</p>
          <div className="grid grid-cols-4 gap-2">
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

      {/* ── Avatar ── */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Profile picture</p>
        <p className="text-xs mb-4" style={{ color: muted }}>JPG, PNG or GIF · max 2MB</p>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ background: avatarUrl ? "transparent" : color + "33", border: `2px solid ${color}44`, color }}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : profile.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: color + "22", color, border: `1px solid ${color}44` }}>
              {uploading ? "Uploading..." : "Upload image"}
            </button>
            {avatarUrl && <button onClick={() => setAvatarUrl("")}
              className="text-xs hover:text-red-400 transition-colors"
              style={{ color: muted }}>Remove</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
      </div>

      {/* ── Title ── */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Title</p>
        <p className="text-xs mb-4" style={{ color: muted }}>Displayed next to your username</p>
        <div className="flex flex-wrap gap-2">
          {["", ...TITLES].map(t => (
            <button key={t || "none"} onClick={() => setTitle(t)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={optBtn(title === t)}>{t || "None"}</button>
          ))}
        </div>
      </div>

      {/* ── Bio ── */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Bio</p>
        <p className="text-xs mb-3" style={{ color: muted }}>Max 160 characters</p>
        <textarea className="input-field resize-none text-sm" rows={3} maxLength={160}
          placeholder="Tell other players about yourself..."
          value={bio} onChange={e => setBio(e.target.value)} />
        <p className="text-xs mt-1 text-right" style={{ color: muted }}>{bio.length}/160</p>
      </div>

      {/* ── Accent color ── */}
      <div className="card-solid p-5 mb-6">
        <p className="text-sm font-medium mb-1">Accent color</p>
        <p className="text-xs mb-4" style={{ color: muted }}>Your profile highlight color</p>
        <div className="flex gap-3 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button key={c.value} onClick={() => setAccentColor(c.value)}
              className="flex flex-col items-center gap-1.5 transition-all">
              <div className="w-8 h-8 rounded-full transition-all" style={{
                background: c.value,
                border: accentColor === c.value ? "3px solid white" : "3px solid transparent",
                boxShadow: accentColor === c.value ? `0 0 12px ${c.value}` : "none",
              }} />
              <span className="text-xs" style={{ color: muted }}>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Premium ── */}
      <div className="card-solid p-5 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ background: "linear-gradient(135deg,#FFD700,#FF6B35)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✨</span>
            <p className="text-sm font-semibold">Premium — coming soon</p>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#FFD70022", color: "#FFD700", border: "1px solid #FFD70033" }}>Soon</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: muted }}>
            Animated GIF banner · Custom avatar frame · Gradient title · Exclusive badges · Unlimited colors
          </p>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary"
        style={saved ? { background: "#1D9E75" } : {}}>
        {saving ? "Saving..." : saved ? "✓ Saved!" : "Save changes"}
      </button>
    </main>
  );
}
