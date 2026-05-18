"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Matchmaking() {
  const [dots, setDots] = useState(".");
  const [userId, setUserId] = useState<string | null>(null);
  const [myElo, setMyElo] = useState<number | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<NodeJS.Timeout | null>(null);
  const matchFoundRef = useRef(false);
  const roomIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const tokenRef = useRef<string>("");

  const router = useRouter();
  const supabase = createClient();

  // ── Cleanup: delete our waiting room ──────────────────────────────────────
  async function cleanupRoom() {
    if (matchFoundRef.current) return;
    const uid = userId;
    const rid = roomIdRef.current;
    if (channelRef.current) {
      try { channelRef.current.unsubscribe(); } catch {}
      channelRef.current = null;
    }
    if (!uid && !rid) return;
    try {
      await fetch("/api/cleanup-room?" + new URLSearchParams({
        roomId: rid ?? "", userId: uid ?? "",
      }), { method: "POST" });
    } catch {}
  }

  // ── Unmount cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (searchRef.current) clearTimeout(searchRef.current);
      cleanupRoom();
    };
  }, []);

  // ── Visibility change ─────────────────────────────────────────────────────
  useEffect(() => {
    function handle() {
      if (document.visibilityState === "hidden" && !matchFoundRef.current) {
        cleanupRoom();
      }
    }
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, []);

  // ── beforeunload ──────────────────────────────────────────────────────────
  useEffect(() => {
    function handle() {
      if (matchFoundRef.current) return;
      const rid = roomIdRef.current;
      const uid = userId;
      if (rid || uid) {
        const url = `/api/cleanup-room?roomId=${rid ?? ""}&userId=${uid ?? ""}`;
        try { navigator.sendBeacon(url); } catch {}
      }
    }
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [userId]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: { session } } = await supabase.auth.getSession();
      tokenRef.current = session?.access_token ?? "";

      // Delete any stale own rooms from previous sessions
      await supabase.from("rooms")
        .delete().eq("player1_id", user.id).eq("status", "waiting");

      const { data: profile } = await supabase
        .from("profiles").select("elo").eq("id", user.id).single();

      setUserId(user.id);
      setMyElo(profile?.elo ?? 500);
    })();
  }, []);

  // ── Start search once userId + myElo ready ────────────────────────────────
  useEffect(() => {
    if (userId && myElo !== null) {
      startSearch(userId, myElo, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, myElo]);

  // ── Dots animation ────────────────────────────────────────────────────────
  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(i);
  }, []);

  // ── Search timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setSearchTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Poll for room activation (backup, in case realtime misses) ─────────────
  useEffect(() => {
    if (!roomId) return;
    pollRef.current = setInterval(async () => {
      if (matchFoundRef.current) return;
      const { data } = await supabase
        .from("rooms").select("status").eq("id", roomId).single();
      if (data?.status === "active") {
        matchFoundRef.current = true;
        clearInterval(pollRef.current!);
        router.push(`/duel/${roomId}`);
      }
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId]);

  // ── Subscribe to realtime updates on our waiting room ────────────────────
  function setupRealtime(rid: string) {
    if (channelRef.current) return; // already subscribed
    const ch = supabase
      .channel(`room-wait-${rid}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "rooms",
        filter: `id=eq.${rid}`,
      }, (payload) => {
        if (payload.new.status === "active") {
          matchFoundRef.current = true;
          ch.unsubscribe();
          if (pollRef.current) clearInterval(pollRef.current);
          router.push(`/duel/${rid}`);
        }
      }).subscribe();
    channelRef.current = ch;
  }

  // ── Core search — delegates all DB writes to the server-side API ──────────
  async function startSearch(uid: string, elo: number, elapsed: number) {
    if (matchFoundRef.current) return;

    try {
      const res = await fetch("/api/matchmake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ userId: uid, elo, elapsed }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.action === "joined") {
          // We joined someone else's room — navigate immediately
          matchFoundRef.current = true;
          if (searchRef.current) clearTimeout(searchRef.current);
          router.push(`/duel/${data.roomId}`);
          return;
        }

        if (data.action === "waiting" && data.roomId) {
          if (!roomIdRef.current) {
            // First time we have a room — set up realtime + poll
            roomIdRef.current = data.roomId;
            setRoomId(data.roomId);
            setupRealtime(data.roomId);
          }
          // (else: heartbeat was done server-side, nothing to do)
        }
      }
    } catch {
      // Network error — retry normally
    }

    // Retry in 3s
    searchRef.current = setTimeout(() => {
      startSearch(uid, elo, elapsed + 3);
    }, 3000);
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────
  async function cancelSearch() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (searchRef.current) clearTimeout(searchRef.current);
    await cleanupRoom();
    router.push("/");
  }

  const currentRange = Math.min(
    MAX_ELO_RANGE,
    ELO_RANGE_START + Math.floor(searchTime / 10) * ELO_RANGE_EXPAND,
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <div className="card-solid w-full max-w-sm p-8 slide-up text-center">
        <div className="font-jp text-5xl mb-6 animate-pulse text-accent2">漢</div>
        <p className="text-lg font-medium mb-2">Finding a match{dots}</p>
        <p className="text-white/40 text-sm mb-1">Searching near {myElo ?? "..."} ELO</p>
        <p className="text-white/20 text-xs mb-6">
          ±{currentRange} ELO range{searchTime >= 15 ? " (expanding...)" : ""}
        </p>
        <div className="flex gap-1 justify-center mb-8">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent2"
              style={{ animation: `pdot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <button className="btn-ghost" onClick={cancelSearch}>Cancel</button>
      </div>
      <style>{`@keyframes pdot{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </main>
  );
}

const ELO_RANGE_START = 200;
const ELO_RANGE_EXPAND = 100;
const MAX_ELO_RANGE = 1000;
