"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

const PresenceContext = createContext<Set<string>>(new Set());

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;

      const channel = supabase.channel("presence:global", {
        config: { presence: { key: user?.id ?? "anon" } },
      });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          if (!mounted) return;
          const state = channel.presenceState();
          setOnlineIds(new Set(Object.keys(state)));
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED" && user) {
            await channel.track({ userId: user.id, at: Date.now() });
          }
        });
    })();

    return () => {
      mounted = false;
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
      }
    };
  }, []);

  return (
    <PresenceContext.Provider value={onlineIds}>
      {children}
    </PresenceContext.Provider>
  );
}

export function useOnlineIds() {
  return useContext(PresenceContext);
}

/** Petit point coloré réutilisable */
export function OnlineDot({ userId, size = 10 }: { userId: string; size?: number }) {
  const ids = useOnlineIds();
  const online = ids.has(userId);
  return (
    <span
      title={online ? "Online" : "Offline"}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: online ? "#22c55e" : "rgba(255,255,255,0.2)",
        border: "1.5px solid rgba(0,0,0,0.35)",
        flexShrink: 0,
        transition: "background 0.4s",
        boxShadow: online ? "0 0 6px #22c55e88" : "none",
      }}
    />
  );
}
