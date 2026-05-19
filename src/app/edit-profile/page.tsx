"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { getTier } from "@/lib/elo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CropModal, { type CropResult, gifCropStyle } from "@/components/CropModal";
import {
  BORDER_STYLES, PACK_ACCENT_COLORS, RANK_BADGE_DEFS, SPECIAL_BADGE_DEFS,
  getBorderClass, RARITY_COLORS, type Rarity,
} from "@/lib/cosmetics";

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
const EXCLUSIVE_TITLES = [
  "✨ Sakura Swordsman","✨ Ink Master","✨ Shadow Kanji",
  "✨ Celestial Scribe","✨ Phantom Sensei",
];

interface AvatarCrop { tx: number; ty: number; zoom: number; }

interface Profile {
  id: string; username: string; elo: number;
  wins: number; losses: number; draws: number;
  streak: number; best_streak: number;
  avatar_url: string | null; bio: string | null;
  title: string | null; accent_color: string | null;
  owned_cosmetics: string[] | null;
  is_pro: boolean;
  avatar_border: boolean | null;
  avatar_border_style: string | null;
  banner_url: string | null;
  avatar_crop: AvatarCrop | null;
  banner_crop: AvatarCrop | null;
  avatar_static_url: string | null;
  featured_badges: string[] | null;
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
  const [avatarStaticUrl, setAvatarStaticUrl] = useState("");
  const [avatarCrop, setAvatarCrop] = useState<AvatarCrop>({ tx: 0, ty: 0, zoom: 1 });
  const [uploading, setUploading] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerCrop, setBannerCrop] = useState<AvatarCrop>({ tx: 0, ty: 0, zoom: 1 });
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [avatarBorderStyle, setAvatarBorderStyle] = useState<string | null>("rainbow");
  const [featuredBadges, setFeaturedBadges] = useState<string[]>([]);

  // Crop modal state
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<"avatar" | "banner" | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setBio(data.bio ?? "");
        setTitle(data.title ?? "");
        setAccentColor(data.accent_color ?? "#534AB7");
        setAvatarUrl(data.avatar_url ?? "");
        setAvatarStaticUrl(data.avatar_static_url ?? "");
        setAvatarCrop(data.avatar_crop ?? { tx: 0, ty: 0, zoom: 1 });
        setBannerUrl(data.banner_url ?? "");
        setBannerCrop(data.banner_crop ?? { tx: 0, ty: 0, zoom: 1 });
        // avatar_border_style: use new column if set, else derive from old boolean
        setAvatarBorderStyle(
          data.avatar_border_style !== undefined
            ? data.avatar_border_style
            : data.avatar_border !== false ? "rainbow" : null
        );
        setFeaturedBadges(data.featured_badges ?? []);
      }
      setLoading(false);
    })();
  }, []);

  /* ── Avatar: pick file → show crop modal ── */
  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith("image/")) { alert("Please upload an image file"); return; }
    if (!profile.is_pro && file.type === "image/gif") { alert("Animated GIF avatars require KanjiDual Pro ✦"); return; }
    if (file.type === "image/gif" && file.size > 1000 * 1024) { alert("GIF too large — max 1000 KB"); return; }
    const maxSize = profile.is_pro ? 8 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxSize) { alert(`Image too large — max ${profile.is_pro ? "8MB" : "2MB"}`); return; }
    // Open crop modal
    setCropFile(file);
    setCropTarget("avatar");
    e.target.value = ""; // reset input
  }

  /* ── Banner: pick file → show crop modal ── */
  async function handleBannerPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!profile.is_pro) { alert("Profile banners require KanjiDual Pro ✦"); return; }
    if (!file.type.startsWith("image/")) { alert("Please upload an image file"); return; }
    if (file.type === "image/gif" && file.size > 1000 * 1024) { alert("GIF too large — max 1000 KB"); return; }
    if (file.size > 8 * 1024 * 1024) { alert("Banner too large — max 8MB"); return; }
    setCropFile(file);
    setCropTarget("banner");
    e.target.value = "";
  }

  /* ── Upload blob to Supabase storage ── */
  async function uploadBlob(blob: Blob, path: string): Promise<string | null> {
    const ext = blob.type === "image/gif" ? "gif" : blob.type === "image/png" ? "png" : "jpg";
    const fullPath = `${path}.${ext}`;
    const uploadFile = new File([blob], `upload.${ext}`, { type: blob.type });
    const { error } = await supabase.storage.from("avatars").upload(fullPath, uploadFile, {
      upsert: true,
      contentType: blob.type,
    });
    if (error) {
      console.error("Storage upload error:", error);
      alert(`Upload failed: ${error.message}`);
      return null;
    }
    return supabase.storage.from("avatars").getPublicUrl(fullPath).data.publicUrl;
  }

  /* ── Crop modal confirm ── */
  async function handleCropConfirm(result: CropResult) {
    setCropFile(null);
    if (!profile) return;

    if (cropTarget === "avatar") {
      setUploading(true);
      // Upload the (possibly canvas-cropped) avatar
      const url = await uploadBlob(result.blob, `avatars/${profile.id}`);
      if (url) setAvatarUrl(url);

      // GIF: store crop values + upload static first frame
      if (result.isGif && result.crop) {
        setAvatarCrop(result.crop);
        if (result.staticBlob) {
          const staticUrl = await uploadBlob(result.staticBlob, `avatars/${profile.id}_static`);
          if (staticUrl) setAvatarStaticUrl(staticUrl);
        }
      } else {
        // Non-GIF: reset crop (already baked into canvas export)
        setAvatarCrop({ tx: 0, ty: 0, zoom: 1 });
        setAvatarStaticUrl("");
      }
      setUploading(false);

    } else if (cropTarget === "banner") {
      setUploadingBanner(true);
      const url = await uploadBlob(result.blob, `banners/${profile.id}`);
      if (url) setBannerUrl(url);
      if (result.isGif && result.crop) {
        setBannerCrop(result.crop);
      } else {
        setBannerCrop({ tx: 0, ty: 0, zoom: 1 });
      }
      setUploadingBanner(false);
    }
    setCropTarget(null);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);

    // Base fields that always exist in DB
    const baseFields = {
      bio: bio.slice(0, 160),
      title: title || null,
      accent_color: accentColor,
      avatar_url: avatarUrl || null,
    };

    // Try saving with all new columns (requires DB migrations to have been run)
    const { error } = await supabase.from("profiles").update({
      ...baseFields,
      avatar_static_url: avatarStaticUrl || null,
      avatar_crop: avatarCrop,
      avatar_border: !!avatarBorderStyle,
      avatar_border_style: avatarBorderStyle,
      banner_url: bannerUrl || null,
      banner_crop: bannerCrop,
      featured_badges: featuredBadges,
    }).eq("id", profile.id);

    if (error) {
      // Columns might not exist yet — fall back to base fields only
      const { error: fallbackError } = await supabase.from("profiles")
        .update(baseFields).eq("id", profile.id);
      setSaving(false);
      if (!fallbackError) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
      else { setSaveError(true); setTimeout(() => setSaveError(false), 3000); }
      return;
    }

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
  const muted = "rgba(255,255,255,0.3)";
  const hasPack = profile.owned_cosmetics?.includes("pack1");
  const optBtn = (active: boolean) => ({
    background: active ? color + "22" : "rgba(255,255,255,0.04)",
    border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
    color: active ? color : muted,
  });

  // Border class for preview
  const borderClass = hasPack ? getBorderClass(avatarBorderStyle) : "";

  // Badges available for selection in edit-profile (rank + special, computed from profile)
  const availableBadges = [
    ...RANK_BADGE_DEFS.map(b => ({
      ...b,
      unlocked: profile.elo >= b.minElo,
    })),
    ...SPECIAL_BADGE_DEFS.map(b => ({
      ...b,
      unlocked:
        b.id === "cosmetics_pack" ? !!hasPack :
        b.id === "KanjiDual_pro"  ? !!profile.is_pro :
        false,
    })),
    // Win count badges (from profile.wins)
    { id: "first_win", icon: "⚔️", name: "First blood", desc: "Win your first duel",   rarity: "common"  as Rarity, unlocked: (profile.wins ?? 0) >= 1   },
    { id: "wins_10",   icon: "🏅", name: "Warrior",      desc: "Win 10 duels",          rarity: "common"  as Rarity, unlocked: (profile.wins ?? 0) >= 10  },
    { id: "wins_50",   icon: "🥇", name: "Veteran",      desc: "Win 50 duels",          rarity: "rare"    as Rarity, unlocked: (profile.wins ?? 0) >= 50  },
    { id: "wins_100",  icon: "👑", name: "Legend",        desc: "Win 100 duels",         rarity: "epic"    as Rarity, unlocked: (profile.wins ?? 0) >= 100 },
    { id: "streak_3",  icon: "🔥", name: "On fire",       desc: "3-game win streak",     rarity: "common"  as Rarity, unlocked: (profile.best_streak ?? 0) >= 3  },
    { id: "streak_7",  icon: "🌋", name: "Unstoppable",   desc: "7-game win streak",     rarity: "rare"    as Rarity, unlocked: (profile.best_streak ?? 0) >= 7  },
    { id: "streak_15", icon: "☄️", name: "Godlike",       desc: "15-game win streak",    rarity: "legendary" as Rarity, unlocked: (profile.best_streak ?? 0) >= 15 },
  ];

  const toggleFeaturedBadge = (id: string) => {
    setFeaturedBadges(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  };

  const avatarIsGif = avatarUrl.toLowerCase().includes(".gif");
  const bannerIsGif = bannerUrl.toLowerCase().includes(".gif");

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      {/* Crop modal */}
      {cropFile && cropTarget && (
        <CropModal
          file={cropFile}
          shape={cropTarget === "avatar" ? "circle" : "banner"}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropFile(null); setCropTarget(null); }}
        />
      )}

      <Link href="/profile" className="text-sm hover:opacity-60 mb-6 inline-block transition-opacity"
        style={{ color: muted }}>← Back</Link>
      <h1 className="text-2xl font-semibold mb-1">Edit profile</h1>
      <p className="text-sm mb-8" style={{ color: muted }}>Avatar, title, bio &amp; accent color</p>

      {/* ── Preview ── */}
      <div className="card-solid overflow-hidden mb-4 relative" style={{ border: `1px solid ${color}33` }}>
        {bannerUrl ? (
          <div className="w-full overflow-hidden relative" style={{ height: 105 }}>
            <img src={bannerUrl} alt="" className="w-full h-full"
              style={{
                objectFit: "cover",
                ...(bannerIsGif ? gifCropStyle(bannerCrop, 500, 105) : {}),
              }} />
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(13,13,26,0.55))" }} />
          </div>
        ) : (
          <div className="w-full flex items-center justify-center text-white/10 text-xs"
            style={{ height: 105, background: "rgba(255,255,255,0.02)" }}>
            No banner
          </div>
        )}
        {/* Avatar overlapping banner */}
        <div className="absolute left-5" style={{ top: 73, zIndex: 10 }}>
          <div className={borderClass || "relative"}>
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold"
              style={{
                background: avatarUrl ? "transparent" : color + "33",
                border: borderClass ? "none" : `2px solid ${color}55`,
                boxShadow: borderClass ? "none" : "0 0 0 3px #0d0d1a",
                color,
              }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full"
                    style={{ objectFit: "cover", ...(avatarIsGif ? gifCropStyle(avatarCrop, 56, 56) : {}) }} />
                : profile.username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
        <div className="px-5 pb-4 pt-2" style={{ paddingLeft: 80 + 20 }}>
          <div className="pl-2">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">{profile.username}</p>
              {profile.is_pro && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "#EF9F2722", color: "#EF9F27", border: "1px solid #EF9F2744" }}>✦ Pro</span>
              )}
              {title && <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: color + "22", color, border: `1px solid ${color}33` }}>{title}</span>}
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: tier.bg + "22", color: tier.color }}>
              ⬡ {tier.name}
            </span>
          </div>
        </div>
        <div className="px-5 pb-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: muted }}>Preview</p>
        </div>
      </div>

      {/* ── Avatar ── */}
      <div className="card-solid p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">Profile picture</p>
          {profile.is_pro && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#EF9F2718", color: "#EF9F27", border: "1px solid #EF9F2733" }}>✦ Pro</span>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: muted }}>
          {profile.is_pro ? "JPG · PNG · max 8MB — GIF animé · max 1000 KB" : "JPG · PNG · max 2MB"}
        </p>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ background: avatarUrl ? "transparent" : color + "33", border: `2px solid ${color}44`, color }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full"
                  style={{ objectFit: "cover", ...(avatarIsGif ? gifCropStyle(avatarCrop, 56, 56) : {}) }} />
              : profile.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: color + "22", color, border: `1px solid ${color}44` }}>
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            {avatarUrl && <button onClick={() => { setAvatarUrl(""); setAvatarStaticUrl(""); setAvatarCrop({ tx: 0, ty: 0, zoom: 1 }); }}
              className="text-xs hover:text-red-400 transition-colors" style={{ color: muted }}>Remove</button>}
          </div>
          <input ref={fileRef} type="file"
            accept={profile.is_pro ? "image/*" : "image/png,image/jpeg,image/webp"}
            className="hidden" onChange={handleAvatarPick} />
        </div>
        {!profile.is_pro && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold" style={{ color: "#EF9F27" }}>✦</span>
                <p className="text-xs font-medium text-white/60">Animated GIF avatar</p>
              </div>
              <p className="text-xs" style={{ color: muted }}>Like Discord Nitro — exclusive to Pro</p>
            </div>
            <Link href="/shop" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: "linear-gradient(135deg,#534AB7,#7F77DD)", color: "#fff" }}>
              Upgrade
            </Link>
          </div>
        )}
      </div>

      {/* ── Profile banner ── */}
      <div className="card-solid p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">Profile banner</p>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#EF9F2718", color: "#EF9F27", border: "1px solid #EF9F2733" }}>✦ Pro</span>
        </div>
        <p className="text-xs mb-4" style={{ color: muted }}>
          {profile.is_pro ? "Image · max 8MB — GIF animé · max 1000 KB" : "Unlock with KanjiDual Pro"}
        </p>
        {profile.is_pro ? (
          <>
            {bannerUrl && (
              <div className="w-full rounded-xl overflow-hidden mb-3 relative" style={{ height: 105 }}>
                <img src={bannerUrl} alt="" className="w-full h-full"
                  style={{ objectFit: "cover", ...(bannerIsGif ? gifCropStyle(bannerCrop, 500, 105) : {}) }} />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => bannerFileRef.current?.click()} disabled={uploadingBanner}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: "#EF9F2718", color: "#EF9F27", border: "1px solid #EF9F2733" }}>
                {uploadingBanner ? "Uploading…" : bannerUrl ? "Change banner" : "Upload banner"}
              </button>
              {bannerUrl && (
                <button onClick={() => { setBannerUrl(""); setBannerCrop({ tx: 0, ty: 0, zoom: 1 }); }}
                  className="px-3 py-2 rounded-lg text-xs hover:text-red-400 transition-colors"
                  style={{ color: muted }}>Remove</button>
              )}
            </div>
            <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerPick} />
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 rounded-xl overflow-hidden flex items-center justify-center text-white/15 text-xs"
              style={{ height: 56, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}>
              GIF · Image
            </div>
            <Link href="/shop" className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg"
              style={{ background: "linear-gradient(135deg,#534AB7,#7F77DD)", color: "#fff" }}>
              Upgrade
            </Link>
          </div>
        )}
      </div>

      {/* ── Avatar border ── */}
      <div className="card-solid p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">Animated avatar border</p>
          {!hasPack && (
            <Link href="/shop" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "#EF9F2712", color: "#EF9F27", border: "1px solid #EF9F2733" }}>
              🔒 Get Pack
            </Link>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: muted }}>
          {hasPack ? "Choose a spinning border style · Cosmetics Pack" : "6 animated border styles · unlock with Cosmetics Pack"}
        </p>
        {hasPack ? (
          <>
            {/* Style grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* "None" option */}
              <button
                onClick={() => setAvatarBorderStyle(null)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all"
                style={{
                  background: !avatarBorderStyle ? color + "22" : "rgba(255,255,255,0.04)",
                  border: !avatarBorderStyle ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white/20"
                  style={{ border: "2px dashed rgba(255,255,255,0.15)" }}>
                  ✕
                </div>
                <span className="text-xs" style={{ color: !avatarBorderStyle ? color : muted }}>None</span>
              </button>
              {BORDER_STYLES.map(s => (
                <button key={s.id}
                  onClick={() => setAvatarBorderStyle(s.id)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all"
                  style={{
                    background: avatarBorderStyle === s.id ? color + "22" : "rgba(255,255,255,0.04)",
                    border: avatarBorderStyle === s.id ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                  }}>
                  <div className="w-8 h-8 rounded-full" style={{ background: s.gradient }} />
                  <span className="text-xs" style={{ color: avatarBorderStyle === s.id ? color : muted }}>{s.label}</span>
                </button>
              ))}
            </div>
            {/* Live preview */}
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 ${borderClass || "relative"}`}>
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                  style={{ background: avatarUrl ? "transparent" : color + "33", color, border: borderClass ? "none" : `2px solid ${color}55` }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="w-full h-full" style={{ objectFit: "cover" }} />
                    : profile.username.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <p className="text-xs" style={{ color: muted }}>
                {avatarBorderStyle ? `${BORDER_STYLES.find(s => s.id === avatarBorderStyle)?.label ?? avatarBorderStyle} border active` : "No border"}
              </p>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            {BORDER_STYLES.map(s => (
              <div key={s.id} className="w-8 h-8 rounded-full opacity-30" style={{ background: s.gradient }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Accent color ── */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Accent color</p>
        <p className="text-xs mb-4" style={{ color: muted }}>Your profile highlight color</p>
        <div className="flex gap-3 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button key={c.value} onClick={() => setAccentColor(c.value)} className="flex flex-col items-center gap-1.5 transition-all">
              <div className="w-8 h-8 rounded-full transition-all" style={{
                background: c.value,
                border: accentColor === c.value ? "3px solid white" : "3px solid transparent",
                boxShadow: accentColor === c.value ? `0 0 12px ${c.value}` : "none",
              }} />
              <span className="text-xs" style={{ color: muted }}>{c.name}</span>
            </button>
          ))}
        </div>
        {/* ✨ Cosmetics Pack exclusive colors */}
        {hasPack ? (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs mb-2.5" style={{ color: "#FF6B9D" }}>✨ Exclusive colors</p>
            <div className="flex gap-3 flex-wrap">
              {PACK_ACCENT_COLORS.map(c => (
                <button key={c.value} onClick={() => setAccentColor(c.value)} className="flex flex-col items-center gap-1.5 transition-all">
                  <div className="w-8 h-8 rounded-full transition-all" style={{
                    background: c.value,
                    border: accentColor === c.value ? "3px solid white" : "3px solid rgba(255,107,157,0.3)",
                    boxShadow: accentColor === c.value ? `0 0 12px ${c.value}` : "none",
                  }} />
                  <span className="text-xs" style={{ color: accentColor === c.value ? c.value : "rgba(255,107,157,0.6)" }}>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
            <p className="text-xs text-white/20">🔒 5 exclusive colors — unlock with Cosmetics Pack</p>
            <Link href="/shop" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "#EF9F2712", color: "#EF9F27", border: "1px solid #EF9F2733" }}>
              Get Pack
            </Link>
          </div>
        )}
      </div>

      {/* ── Featured badges ── */}
      <div className="card-solid p-5 mb-4">
        <p className="text-sm font-medium mb-1">Featured badges</p>
        <p className="text-xs mb-4" style={{ color: muted }}>
          Pick up to 3 badges to display in duels · {featuredBadges.length}/3 selected
        </p>
        {/* Unlocked badges */}
        {availableBadges.some(b => b.unlocked) && (
          <>
            <p className="text-xs mb-2" style={{ color: muted }}>Unlocked</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {availableBadges.filter(b => b.unlocked).map(b => {
                const isSelected = featuredBadges.includes(b.id);
                const rc = RARITY_COLORS[b.rarity];
                const canSelect = isSelected || featuredBadges.length < 3;
                return (
                  <button key={b.id}
                    onClick={() => canSelect && toggleFeaturedBadge(b.id)}
                    className="rounded-xl p-2.5 text-center transition-all"
                    style={{
                      background: isSelected ? rc + "22" : "rgba(255,255,255,0.04)",
                      border: isSelected ? `2px solid ${rc}` : "1px solid rgba(255,255,255,0.08)",
                      opacity: !canSelect ? 0.4 : 1,
                      cursor: canSelect ? "pointer" : "not-allowed",
                    }}
                    title={b.name + " — " + b.desc}>
                    <div className="text-xl mb-0.5">{b.icon}</div>
                    <p className="text-xs leading-tight truncate" style={{ color: isSelected ? rc : "rgba(255,255,255,0.4)", fontSize: 9 }}>{b.name}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {/* Locked badges (greyed out) */}
        {availableBadges.some(b => !b.unlocked) && (
          <>
            <p className="text-xs mb-2 text-white/20">Locked</p>
            <div className="grid grid-cols-4 gap-2">
              {availableBadges.filter(b => !b.unlocked).map(b => (
                <div key={b.id} className="rounded-xl p-2.5 text-center opacity-25"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  title={b.desc}>
                  <div className="text-xl mb-0.5" style={{ filter: "grayscale(1)" }}>{b.icon}</div>
                  <p className="text-xs text-white/20 leading-tight truncate" style={{ fontSize: 9 }}>{b.name}</p>
                </div>
              ))}
            </div>
          </>
        )}
        {featuredBadges.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
            <p className="text-xs text-white/40">In duel:</p>
            {featuredBadges.map(id => {
              const b = availableBadges.find(x => x.id === id);
              return <span key={id} className="text-lg" title={b?.name}>{b?.icon ?? "🏅"}</span>;
            })}
          </div>
        )}
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
        {hasPack ? (
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

      {!profile.is_pro && (
        <div className="card-solid p-5 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ background: "linear-gradient(135deg,#EF9F27,#534AB7)" }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base font-bold" style={{ color: "#EF9F27" }}>✦</span>
              <p className="text-sm font-semibold">KanjiDual Pro</p>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#EF9F2720", color: "#EF9F27", border: "1px solid #EF9F2733" }}>€2.99/mo</span>
            </div>
            <ul className="flex flex-col gap-1.5 mb-4">
              {["Animated GIF avatar","Profile banner (image or GIF)","ELO history chart","Unlimited match history","Pro badge on your profile"].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs" style={{ color: muted }}>
                  <span style={{ color: "#7F77DD" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/shop" className="block w-full py-2.5 rounded-xl text-sm font-semibold text-center"
              style={{ background: "linear-gradient(135deg,#534AB7,#7F77DD)", color: "#fff" }}>
              Upgrade to Pro
            </Link>
          </div>
        </div>
      )}

      <button onClick={save} disabled={saving} className="btn-primary w-full"
        style={saved ? { background: "#1D9E75" } : saveError ? { background: "#E24B4A" } : {}}>
        {saving ? "Saving…" : saved ? "✓ Saved!" : saveError ? "✗ Error — try again" : "Save profile"}
      </button>
    </main>
  );
}
