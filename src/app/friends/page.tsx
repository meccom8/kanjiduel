"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { getTier } from "@/lib/elo";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Profile {
  id: string; username: string; elo: number;
  avatar_url: string | null; accent_color: string | null; title: string | null;
}
interface Friendship {
  id: string;
  requester_id: string; addressee_id: string;
  status: string; created_at: string;
  other: Profile;
}

export default function FriendsPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [sent, setSent] = useState<Friendship[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [challenging, setChallenging] = useState<string | null>(null);
  // Map friendId → { roomId, invite_code } for waiting private rooms
  const [privateRooms, setPrivateRooms] = useState<Record<string, { roomId: string; code: string }>>({});
  const [joinCode, setJoinCode] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const pollRoomsRef = useRef<NodeJS.Timeout | null>(null);
  const meRef = useRef<Profile | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("id, username, elo, avatar_url, accent_color, title")
        .eq("id", user.id).single();
      setMe(profile);
      meRef.current = profile;

      await loadFriendships(user.id);
      setLoading(false);
    })();
    return () => { if (pollRoomsRef.current) clearInterval(pollRoomsRef.current); };
  }, []);

  // Poll every 3s for waiting private rooms from friends
  useEffect(() => {
    if (!friends.length || !me) return;
    const poll = async () => {
      const friendIds = friends.map(f => f.other.id);
      const { data } = await supabase
        .from("rooms")
        .select("id, player1_id, invite_code")
        .eq("status", "waiting")
        .eq("is_private", true)
        .is("player2_id", null)
        .in("player1_id", friendIds);

      const map: Record<string, { roomId: string; code: string }> = {};
      for (const r of data ?? []) {
        if (r.invite_code) map[r.player1_id] = { roomId: r.id, code: r.invite_code };
      }
      setPrivateRooms(map);
    };
    poll();
    pollRoomsRef.current = setInterval(poll, 3000);
    return () => { if (pollRoomsRef.current) clearInterval(pollRoomsRef.current); };
  }, [friends, me]);

  async function loadFriendships(uid: string) {
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status, created_at")
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);

    if (!data) return;

    const othersIds = data.map(f => f.requester_id === uid ? f.addressee_id : f.requester_id);
    const { data: profiles } = await supabase
      .from("profiles").select("id, username, elo, avatar_url, accent_color, title")
      .in("id", othersIds);

    const profileMap: Record<string, Profile> = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    const enriched: Friendship[] = data.map(f => ({
      ...f,
      other: profileMap[f.requester_id === uid ? f.addressee_id : f.requester_id],
    })).filter(f => f.other);

    setFriends(enriched.filter(f => f.status === "accepted"));
    setPending(enriched.filter(f => f.status === "pending" && f.addressee_id === uid));
    setSent(enriched.filter(f => f.status === "pending" && f.requester_id === uid));
  }

  // Live search
  useEffect(() => {
    if (!search.trim() || search.length < 2) { setSearchResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, elo, avatar_url, accent_color, title")
        .ilike("username", `%${search}%`)
        .neq("id", me?.id ?? "")
        .limit(8);
      setSearchResults(data ?? []);
      setSearching(false);
    }, 300);
  }, [search]);

  async function sendRequest(addresseeId: string) {
    if (!me) return;
    await supabase.from("friendships").insert({
      requester_id: me.id, addressee_id: addresseeId, status: "pending",
    });
    await loadFriendships(me.id);
    setSearch(""); setSearchResults([]);
  }

  async function acceptRequest(friendshipId: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    if (me) await loadFriendships(me.id);
  }

  async function declineRequest(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    if (me) await loadFriendships(me.id);
  }

  async function removeFriend(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    if (me) await loadFriendships(me.id);
  }

  async function challengeFriend(friend: Profile) {
    if (!me || challenging) return;
    setChallenging(friend.id);

    // Generate invite code
    const code = Array.from({ length: 6 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
    ).join("");

    // Create private room
    const { data: room } = await supabase.from("rooms").insert({
      player1_id: me.id,
      status: "waiting",
      category: "all",
      rounds: 11,
      is_private: true,
      invite_code: code,
    }).select().single();

    if (room) {
      // Copy invite link to clipboard
      const link = `${window.location.origin}/play/${code}`;
      try { await navigator.clipboard.writeText(link); } catch {}
      router.push(`/duel/${room.id}`);
    }
    setChallenging(null);
  }

  async function joinRoom(code: string) {
    router.push(`/play/${code.toUpperCase()}`);
  }

  function getFriendshipStatus(profileId: string): "friend" | "pending_sent" | "pending_received" | "none" {
    if (friends.some(f => f.other.id === profileId)) return "friend";
    if (sent.some(f => f.other.id === profileId)) return "pending_sent";
    if (pending.some(f => f.other.id === profileId)) return "pending_received";
    return "none";
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-jp text-4xl text-accent2 animate-pulse">漢</div>
    </div>
  );

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-white/30 hover:text-white/60 mb-6 inline-block">← Back</Link>
      <h1 className="text-2xl font-semibold mb-1">Friends</h1>
      <p className="text-white/40 text-sm mb-4">Challenge friends to private duels</p>

      {/* Join with code */}
      <div className="mb-4">
        {!showJoinInput ? (
          <button
            onClick={() => setShowJoinInput(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            🔑 Join a private duel with a code
          </button>
        ) : (
          <div className="card-solid p-4 flex gap-2">
            <input
              className="input-field flex-1 text-center font-mono text-lg tracking-widest uppercase"
              placeholder="ABC123"
              maxLength={6}
              value={joinCode}
              autoFocus
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === "Enter" && joinCode.length === 6) joinRoom(joinCode); }}
            />
            <button
              onClick={() => joinRoom(joinCode)}
              disabled={joinCode.length !== 6}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: "#534AB7", color: "white", opacity: joinCode.length === 6 ? 1 : 0.4 }}>
              Join
            </button>
            <button onClick={() => { setShowJoinInput(false); setJoinCode(""); }}
              className="px-3 py-2 rounded-xl text-white/30 hover:text-white/60 transition-colors text-sm">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="card-solid p-4 mb-4">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Add a friend</p>
        <div className="relative">
          <input
            className="input-field w-full"
            placeholder="Search by username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">…</div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {searchResults.map(p => {
              const status = getFriendshipStatus(p.id);
              const tier = getTier(p.elo);
              const color = p.accent_color ?? tier.color;
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: color + "33", color, border: `1.5px solid ${color}44` }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.username}</p>
                    <p className="text-xs text-white/30">{tier.name} · {p.elo} ELO</p>
                  </div>
                  {status === "none" && (
                    <button onClick={() => sendRequest(p.id)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: "#7F77DD22", color: "#7F77DD", border: "1px solid #7F77DD44" }}>
                      Add
                    </button>
                  )}
                  {status === "pending_sent" && (
                    <span className="text-xs text-white/30">Sent</span>
                  )}
                  {status === "friend" && (
                    <span className="text-xs" style={{ color: "#5DCAA5" }}>✓ Friend</span>
                  )}
                  {status === "pending_received" && (
                    <button onClick={() => acceptRequest(pending.find(f => f.other.id === p.id)!.id)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "#1D9E7522", color: "#5DCAA5", border: "1px solid #1D9E7544" }}>
                      Accept
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="card-solid overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
            <p className="text-xs text-white/40 uppercase tracking-widest">Friend requests</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{ background: "#EF9F2722", color: "#EF9F27" }}>{pending.length}</span>
          </div>
          {pending.map(f => {
            const tier = getTier(f.other.elo);
            const color = f.other.accent_color ?? tier.color;
            return (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0">
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: color + "33", color, border: `1.5px solid ${color}44` }}>
                  {f.other.avatar_url ? <img src={f.other.avatar_url} alt="" className="w-full h-full object-cover" /> : f.other.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{f.other.username}</p>
                  <p className="text-xs text-white/30">{tier.name} · {f.other.elo} ELO</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest(f.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: "#1D9E7522", color: "#5DCAA5", border: "1px solid #1D9E7544" }}>
                    Accept
                  </button>
                  <button onClick={() => declineRequest(f.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all text-white/30 hover:text-red-400">
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Friends list */}
      <div className="card-solid overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-widest">
            Friends {friends.length > 0 ? `· ${friends.length}` : ""}
          </p>
        </div>
        {friends.length === 0 ? (
          <div className="p-8 text-center text-white/30 text-sm">
            No friends yet — search for players above
          </div>
        ) : (
          friends.map(f => {
            const tier = getTier(f.other.elo);
            const color = f.other.accent_color ?? tier.color;
            return (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0">
                <Link href={`/user/${f.other.username}`} className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold hover:opacity-80 transition-opacity"
                  style={{ background: color + "33", color, border: `2px solid ${color}44` }}>
                  {f.other.avatar_url ? <img src={f.other.avatar_url} alt="" className="w-full h-full object-cover" /> : f.other.username.slice(0, 2).toUpperCase()}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/user/${f.other.username}`} className="text-sm font-medium hover:opacity-70 transition-opacity">
                      {f.other.username}
                    </Link>
                    {f.other.title && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: color + "22", color, border: `1px solid ${color}33` }}>
                        {f.other.title}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-0.5"
                    style={{ color: tier.color + "99" }}>{tier.name} · {f.other.elo} ELO</p>
                </div>
                <div className="flex gap-2">
                  {privateRooms[f.other.id] ? (
                    <button
                      onClick={() => joinRoom(privateRooms[f.other.id].code)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium animate-pulse"
                      style={{ background: "#1D9E7522", color: "#5DCAA5", border: "1px solid #1D9E7544" }}>
                      ⚡ Join!
                    </button>
                  ) : (
                    <button
                      onClick={() => challengeFriend(f.other)}
                      disabled={challenging === f.other.id}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium"
                      style={{ background: "#534AB722", color: "#7F77DD", border: "1px solid #534AB744" }}>
                      {challenging === f.other.id ? "…" : "⚡ Challenge"}
                    </button>
                  )}
                  <button onClick={() => removeFriend(f.id)}
                    className="text-xs px-2 py-1.5 rounded-lg text-white/20 hover:text-red-400 transition-colors">
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sent requests */}
      {sent.length > 0 && (
        <div className="card-solid overflow-hidden mt-4">
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest">Requests sent</p>
          </div>
          {sent.map(f => {
            const tier = getTier(f.other.elo);
            return (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{f.other.username}</p>
                  <p className="text-xs text-white/30">{tier.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/25">Pending</span>
                  <button onClick={() => declineRequest(f.id)}
                    className="text-xs text-white/20 hover:text-red-400 transition-colors">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
