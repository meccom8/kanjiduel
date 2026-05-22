"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { resolveAvatar } from "@/lib/avatar";

export interface Notif {
  id: string;
  type: "friend_request" | "challenge";
  username: string;
  avatarSrc?: string | null;
  friendshipId?: string;
  requesterId?: string;
  roomCode?: string;
  roomId?: string;
}

interface NotifCtx {
  notifs: Notif[];
  dismiss: (id: string) => void;
}
const Ctx = createContext<NotifCtx>({ notifs: [], dismiss: () => {} });
export function useNotifications() { return useContext(Ctx); }

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const supabase = createClient();
  const userIdRef = useRef<string>("");
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const friendChRef = useRef<any>(null);
  const notifChRef = useRef<any>(null);

  const dismiss = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
  }, []);

  const add = useCallback((n: Omit<Notif, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setNotifs(prev => [{ id, ...n }, ...prev].slice(0, 4));
    const t = setTimeout(() => {
      setNotifs(prev => prev.filter(x => x.id !== id));
      timersRef.current.delete(id);
    }, 10000);
    timersRef.current.set(id, t);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      userIdRef.current = user.id;

      // ── Friend requests (DB realtime) ────────────────────────────────────
      friendChRef.current = supabase
        .channel(`friend-requests:${user.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "friendships",
          filter: `addressee_id=eq.${user.id}`,
        }, async (payload: any) => {
          if (!mounted) return;
          const rid = payload.new?.requester_id;
          if (!rid) return;
          const { data: p } = await supabase.from("profiles")
            .select("username,avatar_url,avatar_static_url,is_pro")
            .eq("id", rid).single();
          if (!p || !mounted) return;
          add({
            type: "friend_request",
            username: p.username,
            avatarSrc: resolveAvatar(p.avatar_url, p.avatar_static_url, p.is_pro),
            friendshipId: payload.new?.id,
            requesterId: rid,
          });
        })
        .subscribe();

      // ── Challenge broadcasts ──────────────────────────────────────────────
      notifChRef.current = supabase
        .channel(`user-notifs:${user.id}`)
        .on("broadcast", { event: "challenge" }, ({ payload }: any) => {
          if (!mounted) return;
          add({
            type: "challenge",
            username: payload.username ?? "Someone",
            avatarSrc: payload.avatarSrc ?? null,
            roomCode: payload.roomCode,
            roomId: payload.roomId,
          });
        })
        .subscribe();
    })();
    return () => {
      mounted = false;
      try { if (friendChRef.current) supabase.removeChannel(friendChRef.current); } catch {}
      try { if (notifChRef.current) supabase.removeChannel(notifChRef.current); } catch {}
      timersRef.current.forEach(t => clearTimeout(t));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider value={{ notifs, dismiss }}>
      {children}
      <NotifToasts notifs={notifs} dismiss={dismiss} supabase={supabase} userIdRef={userIdRef} />
    </Ctx.Provider>
  );
}

// ── Toast UI ─────────────────────────────────────────────────────────────────
function NotifToasts({ notifs, dismiss, supabase, userIdRef }: {
  notifs: Notif[];
  dismiss: (id: string) => void;
  supabase: ReturnType<typeof createClient>;
  userIdRef: React.MutableRefObject<string>;
}) {
  if (!notifs.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {notifs.map(n => (
        <NotifCard key={n.id} notif={n} dismiss={dismiss} supabase={supabase} userIdRef={userIdRef} />
      ))}
    </div>
  );
}

function NotifCard({ notif, dismiss, supabase, userIdRef }: {
  notif: Notif;
  dismiss: (id: string) => void;
  supabase: ReturnType<typeof createClient>;
  userIdRef: React.MutableRefObject<string>;
}) {
  const [acting, setActing] = useState(false);

  async function accept() {
    if (!notif.friendshipId || acting) return;
    setActing(true);
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", notif.friendshipId);
    dismiss(notif.id);
  }
  async function decline() {
    if (!notif.friendshipId || acting) return;
    setActing(true);
    await supabase.from("friendships").delete().eq("id", notif.friendshipId);
    dismiss(notif.id);
  }
  async function joinChallenge() {
    if (!notif.roomId || !userIdRef.current || acting) return;
    setActing(true);
    const { error } = await supabase.from("rooms")
      .update({ player2_id: userIdRef.current, status: "active" })
      .eq("id", notif.roomId).eq("status", "waiting");
    if (!error) {
      dismiss(notif.id);
      window.location.href = `/duel/${notif.roomId}`;
    } else {
      // Room gone (expired or already joined)
      dismiss(notif.id);
    }
  }

  const isFriend = notif.type === "friend_request";

  return (
    <div
      className="pointer-events-auto rounded-2xl px-4 py-3 flex flex-col gap-2.5 slide-up"
      style={{
        background: "rgba(13,13,26,0.97)",
        border: isFriend ? "1px solid rgba(232,100,64,0.4)" : "1px solid rgba(239,159,39,0.4)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold"
          style={{ background: isFriend ? "rgba(232,100,64,0.2)" : "rgba(239,159,39,0.15)", color: isFriend ? "#E86440" : "#EF9F27" }}>
          {notif.avatarSrc
            ? <img src={notif.avatarSrc} alt="" className="w-full h-full object-cover" />
            : notif.username.slice(0, 2).toUpperCase()}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{notif.username}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            {isFriend ? "sent you a friend request" : "is challenging you to a duel ⚡"}
          </p>
        </div>

        {/* Dismiss */}
        <button onClick={() => dismiss(notif.id)}
          className="text-white/25 hover:text-white/60 transition-colors text-base leading-none flex-shrink-0 ml-1">
          ✕
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isFriend ? (
          <>
            <button onClick={accept} disabled={acting}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: "rgba(29,158,117,0.2)", color: "#5DCAA5", border: "1px solid rgba(29,158,117,0.35)" }}>
              ✓ Accept
            </button>
            <button onClick={decline} disabled={acting}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              Decline
            </button>
          </>
        ) : (
          <button onClick={joinChallenge} disabled={acting}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: "rgba(239,159,39,0.2)", color: "#EF9F27", border: "1px solid rgba(239,159,39,0.35)" }}>
            {acting ? "Joining…" : "⚡ Join duel"}
          </button>
        )}
      </div>

      {/* Progress bar (10s auto-dismiss) */}
      <ProgressBar duration={10000} />
    </div>
  );
}

function ProgressBar({ duration }: { duration: number }) {
  const [width, setWidth] = useState(100);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const iv = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setWidth(pct);
      if (pct <= 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [duration]);
  return (
    <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="h-full rounded-full transition-none"
        style={{ width: `${width}%`, background: "rgba(255,255,255,0.2)" }} />
    </div>
  );
}

