"use client";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Profile {
  id: string; username: string; is_pro: boolean;
  owned_cosmetics: string[] | null;
}

const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "";
const COSMETICS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_COSMETICS_PRICE_ID ?? "";

const PRO_FEATURES = [
  "✦ Pro gold badge on your profile",
  "Animated GIF avatar & profile banner",
  "ELO history chart on your profile",
  "Detailed stats by JLPT category",
  "Full match history",
  "Early access to new features",
];

const COSMETICS_FEATURES = [
  "Animated border on your avatar",
  "4 exclusive duel reactions 💀 🤯 ✨ 🫡",
  "Exclusive profile titles",
  "Pack badge on your profile",
];

export default function ShopPage() {
  return <Suspense><ShopInner /></Suspense>;
}

function ShopInner() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const supabase = createClient();
  const params = useSearchParams();
  const success = params.get("success") === "1";
  const cancelled = params.get("cancelled") === "1";

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("profiles")
        .select("id,username,is_pro,owned_cosmetics").eq("id", user.id).single();
      setProfile(data);
      setLoading(false);
    })();
  }, []);

  async function buy(priceId: string, type: "subscription" | "cosmetics") {
    setBuying(type);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ priceId, type }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        console.error("Checkout error:", json);
        alert("Error: " + (json.error ?? "Unknown error. Check console."));
        setBuying(null);
      }
    } catch (e: any) {
      console.error("Buy failed:", e);
      alert("Request failed: " + e.message);
      setBuying(null);
    }
  }

  const hasCosmetics = profile?.owned_cosmetics?.includes("pack1");

  return (
    <main className="min-h-screen px-4 py-12 relative z-10 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-white/30 hover:text-white/60 mb-6 inline-block transition-colors">← Home</Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Shop</h1>
        <p className="text-white/40 text-sm mt-1">Support the project &amp; customize your profile</p>
      </div>

      {/* Success / cancelled banners */}
      {success && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: "#5DCAA522", color: "#5DCAA5", border: "1px solid #5DCAA544" }}>
          ✅ Payment successful — welcome to the club!
        </div>
      )}
      {cancelled && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
          Payment cancelled.
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-white/30">Loading…</div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Pro Card */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(83,74,183,0.25), rgba(127,119,221,0.1))", border: "1px solid rgba(127,119,221,0.4)" }}>
            <div className="p-5 border-b" style={{ borderColor: "rgba(127,119,221,0.2)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold" style={{ color: "#EF9F27" }}>✦</span>
                    <h2 className="text-lg font-bold">KanjiDual Pro</h2>
                  </div>
                  <p className="text-white/40 text-sm">Monthly subscription</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold" style={{ color: "#7F77DD" }}>€2.99</p>
                  <p className="text-white/30 text-xs">/month</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <ul className="flex flex-col gap-2 mb-5">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <span style={{ color: "#7F77DD" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              {profile?.is_pro ? (
                <div className="w-full py-3 rounded-xl text-center text-sm font-semibold"
                  style={{ background: "#5DCAA522", color: "#5DCAA5", border: "1px solid #5DCAA544" }}>
                  ✦ Active
                </div>
              ) : (
                <button
                  onClick={() => buy(PRO_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!, "subscription")}
                  disabled={buying === "subscription"}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #534AB7, #7F77DD)", color: "#fff" }}>
                  {buying === "subscription" ? "Redirecting…" : "Subscribe — €2.99/month"}
                </button>
              )}
            </div>
          </div>

          {/* Cosmetics Card */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(239,159,39,0.08)", border: "1px solid rgba(239,159,39,0.3)" }}>
            <div className="p-5 border-b" style={{ borderColor: "rgba(239,159,39,0.15)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">✨</span>
                    <h2 className="text-lg font-bold">Cosmetics Pack</h2>
                  </div>
                  <p className="text-white/40 text-sm">One-time purchase</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold" style={{ color: "#EF9F27" }}>€4.99</p>
                  <p className="text-white/30 text-xs">one time</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <ul className="flex flex-col gap-2 mb-5">
                {COSMETICS_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <span style={{ color: "#EF9F27" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              {hasCosmetics ? (
                <div className="w-full py-3 rounded-xl text-center text-sm font-semibold"
                  style={{ background: "#5DCAA522", color: "#5DCAA5", border: "1px solid #5DCAA544" }}>
                  ✨ Already unlocked
                </div>
              ) : (
                <button
                  onClick={() => buy(COSMETICS_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_COSMETICS_PRICE_ID!, "cosmetics")}
                  disabled={buying === "cosmetics"}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #B8860B, #EF9F27)", color: "#fff" }}>
                  {buying === "cosmetics" ? "Redirecting…" : "Buy — €4.99"}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-white/20 mt-2">
            Secure payment via Stripe · Cancel anytime
          </p>
        </div>
      )}
    </main>
  );
}
