"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { getTier } from "@/lib/elo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CropModal, { type CropResult, gifCropStyle } from "@/components/CropModal";

const ACCENT_COLORS = [
  { name: "Violet", value: "#534AB7" },
  { name: "Teal",   value: "#1D9E75" },
  { name: "Gold",   value: "#B8860B" },
  { name: "Coral",  value: "#D85A30" },
  { name: "Rose",   value: "#C2185B" },
  { name: "Sky",    value: "#0288D1" },
];
const SAKURA_COLOR = { name: "✨ Sakura", value: "#FF6B9D" };

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
  avatar_url: string | null; bio: string | null;
  title: string | null; accent_color: string | null;
  owned_cosmetics: string[] | null;
  is_pro: boolean;
  avatar_border: boolean | null;
  banner_url: string | null;
  avatar_crop: AvatarCrop | null;
  banner_crop: AvatarCrop | null;
  avatar_static_url: string | null;
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
  const [avatarBorder, setAvatarBorder] = useState(true);

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
        setAvatarBorder(data.avatar_border !== false);
      }
      setLoading(false);
    })();
  }, []);

  /* ── Avatar: pick file → show crop modal ── */
  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const maxSize = profile.is_pro ? 8 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxSize) { alert(`Image too large — max ${profile.is_pro ? "8MB" : "2MB"}`); return; }
    if (!file.type.startsWith("image/")) { alert("Please upload an image file"); return; }
    if (!profile.is_pro && file.type === "image/gif") { alert("Animated GIF avatars require KanjiDuel Pro ✦"); return; }
    // Open crop modal
    setCropFile(file);
    setCropTarget("avatar");
    e.target.value = ""; // reset input
  }

  /* ── Banner: pick file → show crop modal ── */
  async function handleBannerPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!profile.is_pro) { alert("Profile banners require KanjiDuel Pro ✦"); return; }
    if (file.size > 8 * 1024 * 1024) { alert("Banner too large — max 8MB"); return; }
    if (!file.type.startsWith("image/")) { alert("Please upload an image file"); return; }
    setCropFile(file);
    setCropTarget("banner");
    e.target.value = "";
  }

  /* ── Upload blob to Supabase storage ── */
  async function uploadBlob(blob: Blob, path: string): Promise<string | null> {
    const ext = blob.type === "image/gif" ? "gif" : blob.type === "image/png" ? "png" : "jpg";
    const fullPath = `${path}.${ext}`;
    const file = new File([blob], fullPath, { type: blob.type });
    const { error } = await supabase.storage.from("avatars").upload(fullPath, file, { upsert: true });
    if (error) return null;
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
    const { error } = await supabase.from("profiles").update({
      bio: bio.slice(0, 160), title: title || null,
      accent_color: accentColor,
      avatar_url: avatarUrl || null,
      avatar_static_url: avatarStaticUrl || null,
      avatar_crop: avatarCrop,
      avatar_border: avatarBorder,
      banner_url: bannerUrl || null,
      banner_crop: bannerCrop,
    }).eq("id", profile.id);
    setSaving(false);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    else { setSaveError(true); setTimeout(() => setSaveError(false), 3000); }
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
          <div className={hasPack && avatarBorder ? "cosmetic-border" : "relative"}>
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold"
              style={{
                background: avatarUrl ? "transparent" : color + "33",
                border: hasPack && avatarBorder ? "none" : `2px solid ${color}55`,
                boxShadow: "0 0 0 3px #0d0d1a",
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
          {profile.is_pro ? "JPG · PNG · GIF · max 8MB — animated GIF supported" : "JPG · PNG · max 2MB"}
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
          {profile.is_pro ? "Image or animated GIF · max 8MB" : "Unlock with KanjiDuel Pro"}
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium mb-0.5">Animated avatar border</p>
            <p className="text-xs" style={{ color: muted }}>Rainbow spinning border · Cosmetics Pack</p>
          </div>
          {hasPack ? (
            <button onClick={() => setAvatarBorder(v => !v)}
              className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-200"
              style={{ background: avatarBorder ? "#534AB7" : "rgba(255,255,255,0.1)" }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: avatarBorder ? "calc(100% - 22px)" : "2px" }} />
            </button>
          ) : (
            <Link href="/shop" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "#EF9F2712", color: "#EF9F27", border: "1px solid #EF9F2733" }}>
              🔒 Get Pack
            </Link>
          )}
        </div>
        {hasPack && (
          <div className="mt-4 flex items-center gap-3">
            <div className={`flex-shrink-0 ${avatarBorder ? "cosmetic-border" : ""}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                style={{ background: avatarUrl ? "transparent" : color + "33", color, border: avatarBorder ? "none" : `2px solid ${color}55` }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="w-full h-full" style={{ objectFit: "cover" }} />
                  : profile.username.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <p className="text-xs" style={{ color: muted }}>
              {avatarBorder ? "Border visible on your profile" : "Border hidden"}
            </p>
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
          {hasPack ? (
            <button onClick={() => setAccentColor(SAKURA_COLOR.value)} className="flex flex-col items-center gap-1.5 transition-all">
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
              <p className="text-sm font-semibold">KanjiDuel Pro</p>
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
