"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function PlayPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<"loading" | "found" | "joining" | "error" | "already_started">("loading");
  const [hostName, setHostName] = useState("");
  const [manualCode, setManualCode] = useState(code ?? "");

  useEffect(() => {
    if (code) lookupRoom(code);
    else setStatus("found"); // show manual input
  }, []);

  async function lookupRoom(c: string) {
    setStatus("loading");
    const { data: room } = await supabase
      .from("rooms")
      .select("id, player1_id, player2_id, status")
      .eq("invite_code", c.toUpperCase())
      .single();

    if (!room) { setStatus("error"); return; }
    if (room.status === "active" || room.status === "finished") { setStatus("already_started"); return; }
    if (room.status === "cancelled") { setStatus("error"); return; }

    const { data: host } = await supabase
      .from("profiles").select("username").eq("id", room.player1_id).single();
    setHostName(host?.username ?? "?");
    setStatus("found");
  }

  async function joinRoom() {
    const c = manualCode.toUpperCase();
    setStatus("joining");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: room } = await supabase
      .from("rooms")
      .select("id, player1_id, player2_id, status")
      .eq("invite_code", c)
      .single();

    if (!room) { setStatus("error"); return; }
    if (room.status !== "waiting") { setStatus("already_started"); return; }
    if (room.player1_id === user.id) {
      // It's our own room — just go to duel
      router.push(`/duel/${room.id}`);
      return;
    }

    const { error } = await supabase.from("rooms")
      .update({ player2_id: user.id, status: "active" })
      .eq("id", room.id)
      .eq("status", "waiting");

    if (error) { setStatus("error"); return; }
    router.push(`/duel/${room.id}`);
  }

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
    </div>
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <Link href="/" className="font-jp text-3xl mb-8 text-accent2 hover:opacity-70">漢</Link>

      <div className="card-solid w-full max-w-sm p-7 slide-up text-center">
        {status === "error" && (
          <>
            <div className="text-4xl mb-4">🔍</div>
            <h1 className="text-xl font-semibold mb-2">Code not found</h1>
            <p className="text-white/40 text-sm mb-6">This invite link may have expired or been cancelled.</p>
            <Link href="/"><button className="btn-ghost w-full">Go home</button></Link>
          </>
        )}

        {status === "already_started" && (
          <>
            <div className="text-4xl mb-4">⚔️</div>
            <h1 className="text-xl font-semibold mb-2">Duel already started</h1>
            <p className="text-white/40 text-sm mb-6">This game is already in progress or finished.</p>
            <Link href="/"><button className="btn-ghost w-full">Go home</button></Link>
          </>
        )}

        {(status === "found" || status === "joining") && (
          <>
            <div className="font-jp text-5xl mb-5 text-accent2">漢</div>

            {hostName ? (
              <>
                <h1 className="text-xl font-semibold mb-1">Private duel</h1>
                <p className="text-white/50 text-sm mb-6">
                  <span className="text-white font-medium">{hostName}</span> is challenging you
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold mb-2">Join a private duel</h1>
                <p className="text-white/40 text-sm mb-5">Enter the 6-character invite code</p>
              </>
            )}

            {/* Code input */}
            <input
              className="input-field text-center text-2xl font-mono tracking-widest mb-4 uppercase"
              placeholder="ABC123"
              maxLength={6}
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === "Enter" && manualCode.length === 6) joinRoom(); }}
            />

            <button
              className="btn-primary w-full mb-3"
              disabled={manualCode.length !== 6 || status === "joining"}
              onClick={joinRoom}>
              {status === "joining" ? "Joining…" : "⚡ Join duel"}
            </button>
            <Link href="/"><button className="btn-ghost w-full">Cancel</button></Link>
          </>
        )}
      </div>
    </main>
  );
}
