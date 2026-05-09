"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTier, TIERS, winRate } from "@/lib/elo";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Profile {
  id: string; username: string; elo: number;
  wins: number; losses: number; draws: number;
  streak: number; best_streak: number;
  last_played_at: string | null; created_at: string;
  avatar_url: string | null;
  bio: string | null;
  title: string | null;
  accent_color: string | null;
}
interface Match {
  id: string; player1_id: string; player2_id: string;
  winner_id: string | null; p1_score: number; p2_score: number;
  p1_elo_change: number; p2_elo_change: number;
  rounds: number; category: string; played_at: string;
  opponent_username?: string;
}
interface KanjiStat { kanji: string; jlpt: string; correct: number; wrong: number; }
const JLPT_COLORS: Record<string,string> = { N5:"#1D9E75",N4:"#4DB6AC",N3:"#B8860B",N2:"#D85A30",N1:"#C62828" };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [kanjiStats, setKanjiStats] = useState<KanjiStat[]>([]);
  const [jlptStats, setJlptStats] = useState<Record<string,{correct:number;wrong:number}>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"matches"|"kanji"|"jlpt">("matches");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const [{ data: p }, { data: m }, { data: k }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("matches").select("*").or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`).order("played_at",{ascending:false}).limit(20),
        supabase.from("kanji_stats").select("kanji,jlpt,correct,wrong").eq("user_id",user.id).order("wrong",{ascending:false}),
      ]);
      setProfile(p);
      setKanjiStats(k ?? []);
      const jlpt: Record<string,{correct:number;wrong:number}> = {};
      for (const s of k ?? []) {
        if (!jlpt[s.jlpt]) jlpt[s.jlpt] = {correct:0,wrong:0};
        jlpt[s.jlpt].correct += s.correct;
        jlpt[s.jlpt].wrong += s.wrong;
      }
      setJlptStats(jlpt);
      if (m && p) {
        const ids = [...new Set(m.map((x:Match) => x.player1_id === user.id ? x.player2_id : x.player1_id))];
        const { data: opps } = await supabase.from("profiles").select("id,username").in("id", ids);
        const map: Record<string,string> = {};
        opps?.forEach((o:any) => { map[o.id] = o.username; });
        setMatches(m.map((x:Match) => ({ ...x, opponent_username: map[x.player1_id === user.id ? x.player2_id : x.player1_id] ?? "?" })));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="font-jp text-4xl text-accent2 animate-pulse">漢</div></div>;
  if (!profile) return null;

  const tier = getTier(profile.elo);
  const wr = winRate(profile.wins, profile.losses);
  const totalGames = profile.wins + profile.losses + profile.draws;
  const tidx = TIERS.findIndex(t => t.name === tier.name);
  const nextTier = TIERS[tidx + 1];
  const pct = nextTier ? Math.round(((profile.elo - tier.min) / (nextTier.min - tier.min)) * 100) : 100;
  const worstKanji = [...kanjiStats].filter(s => s.wrong > 0).sort((a,b) => (b.wrong/(b.correct+b.wrong)) - (a.wrong/(a.correct+a.wrong))).slice(0,15);
  const totalSeen = kanjiStats.reduce((a,s) => a+s.correct+s.wrong, 0);
  const totalCorrect = kanjiStats.reduce((a,s) => a+s.correct, 0);

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-white/30 hover:text-white/60 mb-6 inline-block">← Back</Link>

      <div className="card-solid p-6 mb-4 slide-up">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-lg font-semibold"
            style={{background: profile.avatar_url ? "transparent" : (profile.accent_color ?? tier.bg)+"33", color: profile.accent_color ?? tier.color, border: `2px solid ${profile.accent_color ?? tier.color}44`}}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : profile.username.slice(0,2).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">{profile.username}</h1>
              {profile.title && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{background:(profile.accent_color??tier.color)+"22", color:profile.accent_color??tier.color, border:`1px solid ${profile.accent_color??tier.color}33`}}>
                  {profile.title}
                </span>
              )}
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full mt-1 inline-block font-medium" style={{background:tier.bg+"33",color:tier.color}}>⬡ {tier.name}</span>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-mono text-2xl font-bold" style={{color:tier.color}}>{profile.elo}</p>
            <p className="text-xs text-white/30">ELO</p>
          </div>
        </div>
        {profile.bio && (
          <p className="text-white/50 text-sm mb-4 leading-relaxed">{profile.bio}</p>
        )}

        {nextTier && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-white/30 mb-1.5"><span>{tier.name}</span><span>{nextTier.name}</span></div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{width:`${pct}%`,background:tier.color}} />
            </div>
            <p className="text-xs text-white/30 mt-1 text-right">{profile.elo} / {nextTier.min} ELO</p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          {[{label:"Wins",val:profile.wins,color:"#5DCAA5"},{label:"Losses",val:profile.losses,color:"#E24B4A"},{label:"Games",val:totalGames,color:"rgba(255,255,255,0.7)"},{label:"Win rate",val:`${wr}%`,color:"#7F77DD"}].map(s => (
            <div key={s.label} className="bg-white/4 rounded-xl p-3">
              <p className="font-mono text-lg font-bold" style={{color:s.color}}>{s.val}</p>
              <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[{icon:"🔥",val:profile.streak??0,label:"Streak"},{icon:"⚡",val:profile.best_streak??0,label:"Best streak"},{icon:"📖",val:kanjiStats.length,label:"Kanji seen"}].map(s => (
            <div key={s.label} className="bg-white/4 rounded-xl p-3 text-center">
              <p className="text-xl mb-0.5">{s.icon}</p>
              <p className="font-mono text-xl font-bold text-white">{s.val}</p>
              <p className="text-xs text-white/30">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <Link href="/matchmaking"><button className="btn-primary" style={{fontSize:13}}>⚡ Match</button></Link>
        <Link href="/daily"><button className="btn-ghost" style={{fontSize:13}}>🗓 Daily</button></Link>
        <Link href="/settings"><button className="btn-ghost" style={{fontSize:13}}>✏️ Edit</button></Link>
      </div>

      <div className="flex gap-1 mb-4 bg-white/4 rounded-xl p-1">
        {(["matches","kanji","jlpt"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
            style={{background:tab===t?"rgba(83,74,183,0.3)":"transparent",color:tab===t?"#7F77DD":"rgba(255,255,255,0.3)"}}>
            {t==="jlpt"?"By JLPT":t==="kanji"?"Weakest kanji":"Matches"}
          </button>
        ))}
      </div>

      {tab === "matches" && (
        <div className="card-solid overflow-hidden">
          {matches.length === 0 ? <div className="p-8 text-center text-white/30 text-sm">No matches yet</div> :
          matches.map(m => {
            const isP1 = m.player1_id === profile.id;
            const my = isP1 ? m.p1_score : m.p2_score;
            const opp = isP1 ? m.p2_score : m.p1_score;
            const elo = isP1 ? m.p1_elo_change : m.p2_elo_change;
            const won = m.winner_id === profile.id ? true : m.winner_id === null ? null : false;
            return (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0">
                <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{background:won===true?"#1D9E75":won===false?"#E24B4A":"rgba(255,255,255,0.15)"}} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">vs {m.opponent_username}</p>
                  <p className="text-xs text-white/30 mt-0.5">{m.rounds} rounds</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-sm font-bold"><span style={{color:"#7F77DD"}}>{my}</span><span className="text-white/20 mx-1">-</span><span style={{color:"#D85A30"}}>{opp}</span></p>
                  <p className="text-xs font-mono mt-0.5" style={{color:elo>=0?"#5DCAA5":"#E24B4A"}}>{elo>=0?"+":""}{elo} ELO</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "kanji" && (
        <div className="card-solid overflow-hidden">
          {worstKanji.length === 0 ? <div className="p-8 text-center text-white/30 text-sm">Play practice mode to track kanji stats</div> : (
            <>
              <div className="px-5 py-3 border-b border-white/5">
                <p className="text-xs text-white/40">{totalSeen>0?`${Math.round(totalCorrect/totalSeen*100)}% accuracy · ${totalSeen} total answers`:""}</p>
              </div>
              {worstKanji.map(s => {
                const total = s.correct + s.wrong;
                const acc = Math.round(s.correct/total*100);
                return (
                  <div key={s.kanji} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
                    <div className="font-jp text-2xl w-8 text-center">{s.kanji}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{background:JLPT_COLORS[s.jlpt]+"22",color:JLPT_COLORS[s.jlpt]}}>{s.jlpt}</span>
                        <span className="text-xs text-white/30">{total} tries</span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${acc}%`,background:acc>=70?"#1D9E75":acc>=40?"#EF9F27":"#E24B4A"}} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold" style={{color:acc>=70?"#5DCAA5":acc>=40?"#EF9F27":"#E24B4A"}}>{acc}%</p>
                      <p className="text-xs text-white/30">{s.wrong} wrong</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === "jlpt" && (
        <div className="card-solid overflow-hidden">
          {Object.keys(jlptStats).length === 0 ? <div className="p-8 text-center text-white/30 text-sm">Play practice mode to track JLPT stats</div> :
          ["N5","N4","N3","N2","N1"].filter(l => jlptStats[l]).map(level => {
            const s = jlptStats[level];
            const total = s.correct + s.wrong;
            const acc = Math.round(s.correct/total*100);
            const color = JLPT_COLORS[level];
            return (
              <div key={level} className="px-5 py-4 border-b border-white/5 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium px-2 py-0.5 rounded" style={{background:color+"22",color}}>{level}</span>
                    <span className="text-xs text-white/30">{total} answers</span>
                  </div>
                  <span className="font-mono text-lg font-bold" style={{color:acc>=70?"#5DCAA5":acc>=40?"#EF9F27":"#E24B4A"}}>{acc}%</span>
                </div>
                <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${acc}%`,background:acc>=70?"#1D9E75":acc>=40?"#EF9F27":"#E24B4A"}} />
                </div>
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span style={{color:"#5DCAA5"}}>✓ {s.correct}</span>
                  <span style={{color:"#E24B4A"}}>✗ {s.wrong}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
