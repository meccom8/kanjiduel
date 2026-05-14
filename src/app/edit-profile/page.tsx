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

// Sakura color — exclusive to Cosmetics Pack
const SAKURA_COLOR = { name: "✨ Sakura", value: "#FF6B9D" };

const TITLES = [
  "Beginner","Student","Scholar","Sensei","Master",
  "Kanji Hunter","Word Ninja","Vocab Warrior","Grammar God",
  "N5 Grinder","N4 Rising","N3 Challenger","N2 Expert","N1 Legend",
  "Daily Player","Streak Lord","Grand Champion",
];

// Exclusive titles — Cosmetics Pack only
const EXCLUSIVE_TITLES = [
  "✨ Sakura Swordsman",
  "✨ Ink Master",
  "✨ Shadow Kanji",
  "✨ Celestial Scribe",
  "✨ Phantom Sensei",
];

interface Profile {
  id: string; username: string; elo: number;
  avatar_url: string | null; bio: string | null;
  title: string | null; accent_color: string | null;
  owned_cosmetics: string[] | null;
}

export default function EditProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [bio, setBio] = useState("");
  const [title, setTitle] = useState("");
  const [accentColor, setAccentColor] = useState("#534AB7");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles")
        .select("id,username,elo,avatar_url,bio,title,accent_color,owned_cosmetics")
        .eq("id", user.id).single();
      if (data) {
        setProfile(data); setBio(data.bio ?? ""); setTitle(data.title ?? "");
        setAccentColor(data.accent_color ?? "#534AB7"); setAvatarUrl(data.avatar_url ?? "");
      }
      setLoading(false);
    })();
  }, []);

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
    const { error } = await supabase.from("profiles").update({
      bio: bio.slice(0, 160), title: title || null,
      accent_color: accentColor, avatar_url: avatarUrl || null,
    }).eq("id", profile.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
    </div>
  );
  if (!profile) return null;

  const tier = getTier(profile.elo);
  const color = accentColor;
  const muted = "rgba(255,255,255,0.3)";

  const optBtn = (active: boolean) => ({
    background: active ? color + "22" : "rgba(255,255,255,0.04)",
    border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
    color: active ? color : muted,
  });

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <Link href="/profile" className="text-sm hover:opacity-60 mb-6 inline-block transition-opacity"
        style={{ color: muted }}>← Back</Link>
      <h1 className="text-2xl font-semibold mb-1">Edit profile</h1>
      <p className="text-sm mb-8" style={{ color: muted }}>Avatar, title, bio &amp; accent color</p>

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

      {/* ── Accent color ── */}
      <div className="card-solid p-5 mb-4">
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
          {/* Sakura — Cosmetics Pack exclusive */}
          {profile.owned_cosmetics?.includes("pack1") ? (
            <button onClick={() => setAccentColor(SAKURA_COLOR.value)}
              className="flex flex-col items-center gap-1.5 transition-all">
              <div className="w-8 h-8 rounded-full transition-all" style={{
                background: "linear-gradient(135deg,#FF6B9D,#C44FDC)",
                border: accentColor === SAKURA_COLOR.value ? "3px solid white" : "3px solid transparent",
                boxShadow: accentColor === SAKURA_COLOR.value ? "0 0 12px #FF6B9D" : "none",
              }} />
              <span className="text-xs" style={{ color: "#FF6B9D" }}>✨ Sakura</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-1.5 opacity-40 cursor-not-allowed">
              <div className="w-8 h-8 rounded-full" style={{ background: "linear-gradient(135deg,#FF6B9D,#C44FDC)", border: "3px solid transparent" }} />
              <span className="text-xs" style={{ color: muted }}>🔒 Sakura</span>
            </div>
          )}
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
        {/* Exclusive titles — Cosmetics Pack */}
        {profile.owned_cosmetics?.includes("pack1") ? (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs mb-2" style={{ color: "#FF6B9D" }}>✨ Exclusive titles</p>
            <div className="flex flex-wrap gap-2">
              {EXCLUSIVE_TITLES.map(t => (
                <button key={t} onClick={() => setTitle(t)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    background: title === t ? "#FF6B9D22" : "rgba(255,107,157,0.06)",
                    border: title === t ? "1px solid #FF6B9D" : "1px solid rgba(255,107,157,0.2)",
                    color: title === t ? "#FF6B9D" : "rgba(255,107,157,0.6)",
                  }}>{t}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-white/20">🔒 5 exclusive titles — unlock with Cosmetics Pack</p>
          </div>
        )}
      </div>

      {/* ── Bio ── */}
      <div className="card-solid p-5 mb-6">
        <p className="text-sm font-medium mb-1">Bio</p>
        <p className="text-xs mb-3" style={{ color: muted }}>Max 160 characters</p>
        <textarea className="input-field resize-none text-sm" rows={3} maxLength={160}
          placeholder="Tell other players about yourself..."
          value={bio} onChange={e => setBio(e.target.value)} />
        <p className="text-xs mt-1 text-right" style={{ color: muted }}>{bio.length}/160</p>
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

      <button onClick={save} disabled={saving} className="btn-primary w-full"
        style={saved ? { background: "#1D9E75" } : saveError ? { background: "#E24B4A" } : {}}>
        {saving ? "Saving..." : saved ? "✓ Saved!" : saveError ? "✗ Error — try again" : "Save profile"}
      </button>
    </main>
  );
}
