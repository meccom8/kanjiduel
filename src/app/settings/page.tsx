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
  "Beginner", "Student", "Scholar", "Sensei", "Master",
  "Kanji Hunter", "Word Ninja", "Vocab Warrior", "Grammar God",
  "N5 Grinder", "N4 Rising", "N3 Challenger", "N2 Expert", "N1 Legend",
  "Daily Player", "Streak Lord", "Grand Champion",
];

interface Profile {
  id: string;
  username: string;
  elo: number;
  avatar_url: string | null;
  bio: string | null;
  title: string | null;
  accent_color: string | null;
}

function Toggle({ enabled, onToggle, color }: { enabled: boolean; onToggle: () => void; color: string }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200"
      style={{ background: enabled ? color : "rgba(255,255,255,0.1)" }}
      aria-checked={enabled}
      role="switch">
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
        style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
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

  // Gameplay prefs (localStorage)
  const [hiraganaMode, setHiraganaMode] = useState(false);
  const [showRomaji, setShowRomaji] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Load gameplay prefs from localStorage
    try {
      setHiraganaMode(localStorage.getItem("pref_hiragana_mode") === "true");
      setShowRomaji(localStorage.getItem("pref_show_romaji") !== "false");
      setSoundEnabled(localStorage.getItem("pref_sound") !== "false");
    } catch {}

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("id, username, elo, avatar_url, bio, title, accent_color")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setBio(data.bio ?? "");
        setTitle(data.title ?? "");
        setAccentColor(data.accent_color ?? "#534AB7");
        setAvatarUrl(data.avatar_url ?? "");
      }
      setLoading(false);
    })();
  }, []);

  function saveGameplayPrefs() {
    try {
      localStorage.setItem("pref_hiragana_mode", String(hiraganaMode));
      localStorage.setItem("pref_show_romaji", String(showRomaji));
      localStorage.setItem("pref_sound", String(soundEnabled));
    } catch {}
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image too large — max 2MB"); return; }
    if (!file.type.startsWith("image/")) { alert("Please upload an image file"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${profile.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(publicUrl);
    setUploading(false);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    saveGameplayPrefs();
    await supabase.from("profiles").update({
      bio: bio.slice(0, 160),
      title: title || null,
      accent_color: accentColor,
      avatar_url: avatarUrl || null,
    }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
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

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-white/30 hover:text-white/60 mb-6 inline-block transition-colors">
        ← Back
      </Link>

      <h1 className="text-2xl font-semibold mb-1">Settings</h1>
      <p className="text-white/40 text-sm mb-8">Profile & gameplay preferences</p>

      {/* Preview */}
      <div className="card-solid p-5 mb-6" style={{ border: `1px solid ${color}33` }}>
        <p className="text-xs text-white/30 uppercase tracking-widest mb-4">Preview</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xl font-bold"
            style={{ background: avatarUrl ? "transparent" : color + "33", border: `2px solid ${color}55`, color }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : profile.username.slice(0, 2).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-white">{profile.username}</p>
              {title && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: color + "22", color, border: `1px solid ${color}33` }}>
                  {title}
                </span>
              )}
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: tier.bg + "22", color: tier.color }}>
              ⬡ {tier.name} · {profile.elo} ELO
            </span>
            {bio && <p className="text-white/50 text-xs mt-2 line-clamp-2">{bio}</p>}
          </div>
        </div>
      </div>

      {/* ── Gameplay preferences ── */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Gameplay</p>
        <p className="text-xs text-white/30 mb-4">How you play duels and practice</p>

        {/* Hiragana IME */}
        <div className="flex items-start justify-between gap-4 py-3 border-b border-white/5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm text-white/80">Convert to hiragana</p>
              <span className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: color + "22", color, fontSize: 10 }}>
                WaniKani-style
              </span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed">
              Type romaji and it auto-converts to hiragana in real time.
              <span className="ml-1 font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                ka → か · tsu → つ · shi → し
              </span>
            </p>
            {hiraganaMode && (
              <div className="mt-2 px-3 py-2 rounded-lg text-xs font-mono"
                style={{ background: color + "11", border: `1px solid ${color}22`, color: "rgba(255,255,255,0.5)" }}>
                Try it: nihongo → にほんご · kanji → かんじ
              </div>
            )}
          </div>
          <Toggle enabled={hiraganaMode} onToggle={() => setHiraganaMode(v => !v)} color={color} />
        </div>

        {/* Show romaji hint */}
        <div className="flex items-start justify-between gap-4 py-3 border-b border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 mb-0.5">Show romaji hint</p>
            <p className="text-xs text-white/30">
              Display the romaji reading under wrong answers
            </p>
          </div>
          <Toggle enabled={showRomaji} onToggle={() => setShowRomaji(v => !v)} color={color} />
        </div>

        {/* Sound */}
        <div className="flex items-start justify-between gap-4 pt-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 mb-0.5">Sound effects</p>
            <p className="text-xs text-white/30">
              Audio feedback for correct/wrong answers
            </p>
          </div>
          <Toggle enabled={soundEnabled} onToggle={() => setSoundEnabled(v => !v)} color={color} />
        </div>
      </div>

      {/* Avatar upload */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Profile picture</p>
        <p className="text-xs text-white/30 mb-4">JPG, PNG or GIF · max 2MB</p>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ background: avatarUrl ? "transparent" : color + "33", border: `2px solid ${color}44`, color }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : profile.username.slice(0, 2).toUpperCase()
            }
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: color + "22", color, border: `1px solid ${color}44` }}>
              {uploading ? "Uploading..." : "Upload image"}
            </button>
            {avatarUrl && (
              <button onClick={() => setAvatarUrl("")} className="text-xs text-white/30 hover:text-red-400 transition-colors">
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
      </div>

      {/* Title */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Title</p>
        <p className="text-xs text-white/30 mb-4">Displayed next to your username</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTitle("")}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: title === "" ? color + "22" : "rgba(255,255,255,0.04)",
              border: title === "" ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
              color: title === "" ? color : "rgba(255,255,255,0.4)",
            }}>
            None
          </button>
          {TITLES.map(t => (
            <button key={t} onClick={() => setTitle(t)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: title === t ? color + "22" : "rgba(255,255,255,0.04)",
                border: title === t ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                color: title === t ? color : "rgba(255,255,255,0.4)",
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Bio</p>
        <p className="text-xs text-white/30 mb-3">Max 160 characters</p>
        <textarea
          className="input-field resize-none text-sm"
          rows={3}
          maxLength={160}
          placeholder="Tell other players about yourself..."
          value={bio}
          onChange={e => setBio(e.target.value)}
        />
        <p className="text-xs text-white/20 mt-1 text-right">{bio.length}/160</p>
      </div>

      {/* Accent color */}
      <div className="card-solid p-5 mb-6">
        <p className="text-sm font-medium mb-1">Accent color</p>
        <p className="text-xs text-white/30 mb-4">Your profile highlight color</p>
        <div className="flex gap-3 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button key={c.value} onClick={() => setAccentColor(c.value)}
              className="flex flex-col items-center gap-1.5 transition-all">
              <div className="w-8 h-8 rounded-full transition-all"
                style={{
                  background: c.value,
                  border: accentColor === c.value ? "3px solid white" : "3px solid transparent",
                  boxShadow: accentColor === c.value ? `0 0 12px ${c.value}` : "none",
                }} />
              <span className="text-xs text-white/30">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Premium teaser */}
      <div className="card-solid p-5 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✨</span>
            <p className="text-sm font-semibold text-white">Premium — coming soon</p>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#FFD70022", color: "#FFD700", border: "1px solid #FFD70033" }}>
              Soon
            </span>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            Animated GIF banner · Custom avatar frame · Gradient title · Exclusive badges · Unlimited color customization
          </p>
        </div>
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving}
        className="btn-primary"
        style={saved ? { background: "#1D9E75" } : {}}>
        {saving ? "Saving..." : saved ? "✓ Saved!" : "Save changes"}
      </button>
    </main>
  );
}
