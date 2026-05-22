"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { checkVocabAnswer, fetchRandomWords, type VocabWord } from "@/lib/vocab";
import { useImeInput } from "@/hooks/useImeInput";
import { useRouter, useParams } from "next/navigation";
import { getBorderClass, getBadgeIcon } from "@/lib/cosmetics";
import { resolveAvatar } from "@/lib/avatar";
import { updateStreak } from "@/lib/stats";

interface Room {
  id: string;
  player1_id: string; player2_id: string;
  status: string; category: string; rounds: number;
  current_round: number;
  p1_score: number; p2_score: number;
  current_kanji: VocabWord | null;
  question_type: string | null;
  round_started_at: string | null;
  next_round_at: string | null;
  winner_id?: string | null;
  invite_code?: string | null;
  is_private?: boolean;
}
interface Profile {
  id: string; username: string; elo: number;
  avatar_url?: string | null; accent_color?: string | null;
  avatar_static_url?: string | null;
  avatar_border_style?: string | null;
  owned_cosmetics?: string[] | null;
  featured_badges?: string[] | null;
  is_pro?: boolean | null;
}
type Phase = "loading"|"waiting"|"playing"|"result"|"finished";
interface RoundLog { winner: "me"|"opp"|"time"; word: VocabWord; answer: string; }


const WIN = 10;

function tone(t: "ok"|"ko"|"to") {
  try {
    const c = new (window.AudioContext||(window as any).webkitAudioContext)();
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    if (t==="ok") {
      o.frequency.setValueAtTime(523,c.currentTime);
      o.frequency.setValueAtTime(659,c.currentTime+.1);
      g.gain.setValueAtTime(.15,c.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.3);
      o.start(); o.stop(c.currentTime+.3);
    } else if (t==="ko") {
      o.frequency.setValueAtTime(200,c.currentTime); o.type="sawtooth";
      g.gain.setValueAtTime(.1,c.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.2);
      o.start(); o.stop(c.currentTime+.2);
    } else {
      o.frequency.setValueAtTime(330,c.currentTime);
      g.gain.setValueAtTime(.08,c.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.4);
      o.start(); o.stop(c.currentTime+.4);
    }
  } catch {}
}

export default function DuelPage() {
  const params = useParams();
  const roomId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  // UI state
  const [me, setMe] = useState<Profile|null>(null);
  const [opp, setOpp] = useState<Profile|null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [timeLeft, setTimeLeft] = useState(12);
  const [cd, setCd] = useState<number|null>(null); // countdown 3-2-1
  const [history, setHistory] = useState<("me"|"opp"|"time")[]>([]);
  const [log, setLog] = useState<RoundLog[]>([]);
  const [word, setWord] = useState<VocabWord|null>(null); // current displayed word
  const [result, setResult] = useState<{who:"me"|"opp"|"time"; word:VocabWord}|null>(null);
  const [myEloChange, setMyEloChange] = useState<number|null>(null);
  const [oppEloChange, setOppEloChange] = useState<number|null>(null);
  const [myEloStart, setMyEloStart] = useState<number|null>(null);
  const [oppEloStart, setOppEloStart] = useState<number|null>(null);
  const [conceded, setConceded] = useState(false);
  const [afkCountdown, setAfkCountdown] = useState<number|null>(null); // null=no warning, 5→0=warning
  const [room, setRoom] = useState<Room|null>(null);
  const [oppReaction, setOppReaction] = useState<string|null>(null);
  const [myReactionSent, setMyReactionSent] = useState<string|null>(null);

  const [hiraMode, setHiraMode] = useState(false);
  const [showRomaji, setShowRomaji] = useState(true);
  const [sfx, setSfx] = useState(true);

  const ime = useImeInput(hiraMode);

  // Refs — always fresh in async callbacks
  const roomR = useRef<Room|null>(null);
  const meR = useRef<Profile|null>(null);
  const oppR = useRef<Profile|null>(null);
  const isP1 = useRef(false);
  const myId = useRef("");
  const done = useRef(false);          // match finished
  const sfxR = useRef(true);
  const iAnswered = useRef(false);     // I answered this round (so ignore next_round_at from poll)
  const seenWordId = useRef<string|null>(null);    // id of last word we started
  const seenNextAt = useRef<string|null>(null);    // next_round_at we already reacted to
  const wordR = useRef<VocabWord|null>(null);      // always-fresh copy of current word (tick closure is stale)
  const tokenR = useRef<string>('');               // user access token for beacon auth
  const inactivityR = useRef<ReturnType<typeof setTimeout>|null>(null); // AFK forfeit timer
  const afkWarningR = useRef<ReturnType<typeof setInterval>|null>(null); // countdown interval
  const gameStartedR = useRef(false); // true after first round starts (prevents repeated resets)
  const phaseR = useRef<Phase>("loading");        // always-fresh phase for AFK closure
  const channelR = useRef<any>(null);              // realtime broadcast channel for reactions
  const reactCooldownR = useRef(false);            // prevent reaction spam
  const roundTimeR = useRef(12);                   // 12s normal / 5s blitz
  const delayR = useRef(3000);                     // 3s normal / 1500ms blitz

  const inputR = useRef<HTMLInputElement>(null);
  const timerR = useRef<ReturnType<typeof setInterval>|null>(null);
  const pollR  = useRef<ReturnType<typeof setInterval>|null>(null);
  const cdR    = useRef<ReturnType<typeof setInterval>|null>(null);

  // prefs
  useEffect(() => {
    try {
      setHiraMode(localStorage.getItem("pref_hiragana_mode")==="true");
      setShowRomaji(localStorage.getItem("pref_show_romaji")!=="false");
      const s = localStorage.getItem("pref_sound")!=="false";
      setSfx(s); sfxR.current=s;
    } catch {}
  },[]);
  useEffect(()=>{ sfxR.current=sfx; },[sfx]);
  useEffect(()=>{ phaseR.current=phase; },[phase]);
  useEffect(()=>{ meR.current=me; },[me]);
  useEffect(()=>{ oppR.current=opp; },[opp]);

  // ── init ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      // Snapshot reload detection early (before any async — navEntry only valid synchronously)
      const navEntry = (performance.getEntriesByType?.('navigation')??[])[0] as PerformanceNavigationTiming|undefined;
      const isReload = navEntry?.type === 'reload';
      const leftKey = sessionStorage.getItem('duel_left');
      sessionStorage.removeItem('duel_left');

      const {data:{user}} = await supabase.auth.getUser();
      if(!user){router.push("/login");return;}
      myId.current = user.id;
      const {data:{session}} = await supabase.auth.getSession();
      if(session?.access_token) tokenR.current = session.access_token;

      // Realtime broadcast channel for reactions (ephemeral, no DB write)
      const ch = supabase.channel(`duel-reactions:${roomId}`)
        .on('broadcast', {event:'reaction'}, ({payload}:any) => {
          setOppReaction(payload.emoji);
          setTimeout(()=>setOppReaction(null), 2500);
        })
        .subscribe();
      channelR.current = ch;

      // Cancel any pending forfeit — must run after auth so token is available (still within 8s grace)
      if(isReload && leftKey === roomId){
        const tok = tokenR.current;
        fetch(`/api/cancel-forfeit?roomId=${roomId}&token=${tok}`,{method:'POST'}).catch(()=>{});
      }

      const {data:rd} = await supabase.from("rooms").select("*").eq("id",roomId).single();
      if(!rd){router.push("/");return;}
      roomR.current=rd; isP1.current=rd.player1_id===user.id;
      setRoom(rd);
      // Blitz: category prefixed with "blitz:"
      const isBlitz = (rd.category??'').startsWith('blitz:');
      roundTimeR.current = isBlitz ? 5 : 12;
      delayR.current     = isBlitz ? 1500 : 3000;

      const oppId = isP1.current?rd.player2_id:rd.player1_id;
      const [mp,op] = await Promise.all([
        supabase.from("profiles").select("id,username,elo,avatar_url,accent_color,avatar_static_url,avatar_border_style,owned_cosmetics,featured_badges,is_pro").eq("id",user.id).single(),
        oppId ? supabase.from("profiles").select("id,username,elo,avatar_url,accent_color,avatar_static_url,avatar_border_style,owned_cosmetics,featured_badges,is_pro").eq("id",oppId).single()
              : Promise.resolve({data:null}),
      ]);
      setMe(mp.data); if(op.data) setOpp(op.data);
      setMyEloStart(mp.data?.elo ?? null);
      setOppEloStart(op.data?.elo ?? null);

      if(rd.status==="finished"){
        await loadElo(user.id,rd); setPhase("finished");
      } else if(rd.status==="active"){
        if(rd.current_kanji){
          seenWordId.current = rd.current_kanji.id;
          wordR.current = rd.current_kanji;
          setWord(rd.current_kanji);
          setPhase("playing");
          startRound(rd.round_started_at);
        } else if(isP1.current){
          setPhase("playing"); nextWord();
        } else {
          setPhase("playing");
        }
      } else {
        setPhase("waiting");
      }
    })();
    return ()=>{
      [timerR,pollR,cdR].forEach(r=>{ if(r.current) clearInterval(r.current); });
      if(inactivityR.current) clearTimeout(inactivityR.current);
      if(afkWarningR.current) clearInterval(afkWarningR.current);
      channelR.current?.unsubscribe();
    };
  },[]);

  // ── poll ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    pollR.current = setInterval(async()=>{
      if(done.current) return;
      const {data} = await supabase.from("rooms").select("*").eq("id",roomId).single();
      if(data) tick(data);
    },1500);
    return ()=>{ if(pollR.current) clearInterval(pollR.current); };
  },[]);

  // ── forfeit on close/navigate (not on reload) ────────────────────────────
  useEffect(()=>{
    const handleUnload=()=>{
      if(done.current) return;
      const uid=myId.current;
      const tok=tokenR.current;
      sessionStorage.setItem('duel_left',roomId);
      if(uid) navigator.sendBeacon(`/api/forfeit-duel?roomId=${roomId}&userId=${uid}&token=${tok}`);
    };
    const handlePopState=()=>{ if(!done.current) concede(); };
    window.addEventListener("beforeunload",handleUnload);
    window.addEventListener("popstate",handlePopState);
    window.history.pushState(null,"",window.location.href);
    return ()=>{
      window.removeEventListener("beforeunload",handleUnload);
      window.removeEventListener("popstate",handlePopState);
    };
  },[]);

  // ── tick — called every poll ──────────────────────────────────────────────
  function tick(r:Room){
    roomR.current=r; setRoom(r);

    // finished
    if(r.status==="finished" && !done.current){
      done.current=true;
      [timerR,pollR,cdR].forEach(x=>{ if(x.current) clearInterval(x.current); });
      if(inactivityR.current) clearTimeout(inactivityR.current);
      // Detect if opponent forfeited (forfeit pattern: winner has WIN, loser has 0)
      const myS = isP1.current?r.p1_score:r.p2_score;
      const opS = isP1.current?r.p2_score:r.p1_score;
      if(myS===WIN && opS===0) setConceded(true);
      // Delay to let the match record commit before querying it
      setTimeout(async()=>{
        await loadElo(myId.current,r);
        if(myId.current) updateStreak(myId.current);
        setPhase("finished");
      },500);
      return;
    }

    // opp just joined
    if(r.status==="active" && r.player2_id && !oppR.current){
      const oid = isP1.current?r.player2_id:r.player1_id;
      supabase.from("profiles").select("id,username,elo,avatar_url,accent_color,avatar_static_url,avatar_border_style,owned_cosmetics,featured_badges,is_pro").eq("id",oid).single()
        .then(({data})=>{ if(data){ setOpp(data); setOppEloStart(data.elo); } });
      if(isP1.current){ setPhase("playing"); nextWord(); }
      else setPhase("playing");
    }

    if(r.status!=="active") return;

    // ── new word → start round ───────────────────────────────────────────────
    if(r.current_kanji && r.current_kanji.id !== seenWordId.current){
      seenWordId.current = r.current_kanji.id;
      seenNextAt.current = null;
      iAnswered.current = false;
      if(cdR.current) clearInterval(cdR.current);
      wordR.current = r.current_kanji;
      setWord(r.current_kanji);
      setResult(null);
      setCd(null);
      setPhase("playing");
      ime.reset();
      startRound(r.round_started_at);
      setTimeout(()=>inputR.current?.focus(),50);
      return;
    }

    // ── next_round_at set AND I did NOT answer → opp answered first ──────────
    if(
      r.next_round_at &&
      r.next_round_at !== seenNextAt.current &&
      !iAnswered.current  // ← KEY: only react if I haven't answered
    ){
      seenNextAt.current = r.next_round_at;
      iAnswered.current = true; // mark so we don't react again
      if(timerR.current) clearInterval(timerR.current);
      setTimeLeft(0);
      if(sfxR.current) tone("ko");
      const w = wordR.current; // use ref — tick closure is stale, word state would be null
      if(w){
        setLog(l=>[...l,{winner:"opp",word:w,answer:w.reading}]);
        setResult({who:"opp",word:w});
      }
      setHistory(h=>[...h,"opp"]);
      setPhase("result");
      startCd(r.next_round_at);
      // P1 is responsible for sending the next word — must schedule it here too,
      // not only in submit/timeout. Without this, the game blocks when P2 answers first.
      if(isP1.current){
        const delay = Math.max(100, new Date(r.next_round_at).getTime() - Date.now());
        setTimeout(async()=>{ iAnswered.current=false; await nextWord(); }, delay);
      }
    }
  }

  // ── inactivity forfeit — fires 20s after last keypress (5s visible warning) ─
  // Only called from actual user input (onChange/onKeyDown) and game start.
  // NOT called on automatic round transitions — that was the bug.
  function resetInactivity(){
    if(inactivityR.current) clearTimeout(inactivityR.current);
    if(afkWarningR.current) clearInterval(afkWarningR.current);
    setAfkCountdown(null);
    if(done.current) return;
    const totalMs = roundTimeR.current <= 5 ? 10000 : 30000;
    const warnAfter = totalMs - 5000; // show warning 5s before forfeit
    inactivityR.current = setTimeout(()=>{
      if(done.current) return;
      // Don't forfeit between rounds — only during an active question
      if(phaseR.current !== "playing") return;
      let cd = 5;
      setAfkCountdown(cd);
      afkWarningR.current = setInterval(()=>{
        cd--;
        if(cd <= 0){
          clearInterval(afkWarningR.current!);
          setAfkCountdown(null);
          if(!done.current) concede();
        } else {
          setAfkCountdown(cd);
        }
      }, 1000);
    }, warnAfter);
  }

  // ── send a reaction (broadcast, no DB) ───────────────────────────────────
  function sendReaction(emoji:string){
    if(reactCooldownR.current) return;
    reactCooldownR.current=true;
    setMyReactionSent(emoji);
    channelR.current?.send({type:'broadcast',event:'reaction',payload:{emoji}});
    setTimeout(()=>{ reactCooldownR.current=false; setMyReactionSent(null); },3000);
  }

  // ── keyboard shortcuts for reactions (layout-independent via e.code) ────────
  useEffect(()=>{
    const BASE_REACTIONS = ["👍","😂","😤","🔥"];
    const PACK_REACTIONS = ["💀","🤯","✨","🫡"];
    // Digit1–Digit8 map by physical key position, works on QWERTY, AZERTY, etc.
    const CODE_MAP: Record<string,number> = {
      Digit1:0, Digit2:1, Digit3:2, Digit4:3,
      Digit5:4, Digit6:5, Digit7:6, Digit8:7,
    };
    function onKey(e:KeyboardEvent){
      if(document.activeElement?.tagName==="INPUT") return;
      const idx = CODE_MAP[e.code];
      if(idx === undefined) return;
      const hasPack = me?.owned_cosmetics?.includes("pack1");
      const allReactions = hasPack ? [...BASE_REACTIONS, ...PACK_REACTIONS] : BASE_REACTIONS;
      if(idx < allReactions.length) sendReaction(allReactions[idx]);
    }
    window.addEventListener("keydown", onKey);
    return ()=>{ window.removeEventListener("keydown", onKey); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[me]);

  // ── round timer ───────────────────────────────────────────────────────────
  function startRound(at:string|null){
    if(timerR.current) clearInterval(timerR.current);
    // Start inactivity timer only on the FIRST round (game just started).
    // Subsequent rounds advance automatically — resetting here was the bug
    // that prevented the timer from ever firing.
    if(!gameStartedR.current){ gameStartedR.current=true; resetInactivity(); }
    const t0 = at ? new Date(at).getTime() : Date.now();
    timerR.current = setInterval(()=>{
      const left = Math.max(0,roundTimeR.current-(Date.now()-t0)/1000);
      setTimeLeft(Math.ceil(left));
      if(left<=0){ clearInterval(timerR.current!); timeout(); }
    },200);
  }

  // ── synced countdown from DB timestamp ───────────────────────────────────
  function startCd(nextAt:string){
    if(cdR.current) clearInterval(cdR.current);
    cdR.current = setInterval(()=>{
      const ms = new Date(nextAt).getTime()-Date.now();
      const s = Math.max(0,Math.ceil(ms/1000));
      setCd(s>0?s:null);
      if(ms<=0) clearInterval(cdR.current!);
    },200);
  }

  // ── next word (P1 only) ───────────────────────────────────────────────────
  async function nextWord(){
    const rawCat = (roomR.current?.category??'all').replace(/^blitz:/,'');
    const jlpt = rawCat==='all' ? undefined : rawCat;
    const words = await fetchRandomWords(supabase,10,jlpt);
    if(!words.length) return;
    await supabase.from("rooms").update({
      current_kanji: words[0],
      question_type: "reading",
      round_started_at: new Date().toISOString(),
      next_round_at: null,
    }).eq("id",roomId);
  }

  // ── timeout ───────────────────────────────────────────────────────────────
  async function timeout(){
    if(iAnswered.current) return;
    iAnswered.current=true;
    if(sfxR.current) tone("to");
    const r=roomR.current!;
    const w=r.current_kanji as VocabWord|null;
    if(w){ setLog(l=>[...l,{winner:"time",word:w,answer:"(time up)"}]); setResult({who:"time",word:w}); }
    setHistory(h=>[...h,"time"]);
    setPhase("result"); setTimeLeft(0);

    if(isP1.current){
      const p1=r.p1_score, p2=r.p2_score, nr=r.current_round+1;
      if(p1>=WIN||p2>=WIN||nr>=50){ await finish(p1,p2); return; }
      const nxt = new Date(Date.now()+delayR.current).toISOString();
      seenNextAt.current=nxt;
      // Only write if current_kanji is still set — P2 may have answered concurrently
      const {data:written} = await supabase.from("rooms")
        .update({current_round:nr,current_kanji:null,next_round_at:nxt})
        .eq("id",roomId)
        .not("current_kanji","is",null)
        .select("id");
      if(!written?.length){
        // P2 already resolved this round — tick() will pick up next_round_at and call nextWord
        iAnswered.current=false;
        seenNextAt.current=null;
        return;
      }
      startCd(nxt);
      setTimeout(async()=>{ iAnswered.current=false; await nextWord(); },delayR.current);
    } else {
      // P2: estimate countdown locally (P1 will set next_round_at via their timeout or tick)
      const nxt = new Date(Date.now()+delayR.current).toISOString();
      startCd(nxt);
      // Don't reset iAnswered here — tick()'s new-word branch resets it when the word arrives.
      // A premature reset would let stale next_round_at signals retrigger "opp answered".
    }
  }

  // ── submit answer ─────────────────────────────────────────────────────────
  async function submit(val:string){
    if(iAnswered.current) return;
    const r=roomR.current;
    if(!r?.current_kanji) return;
    if(!checkVocabAnswer(val,r.current_kanji)) return;

    iAnswered.current=true;
    if(timerR.current) clearInterval(timerR.current);
    setTimeLeft(0);
    if(sfxR.current) tone("ok");

    const w=r.current_kanji as VocabWord;
    setLog(l=>[...l,{winner:"me",word:w,answer:val.trim()}]);
    setResult({who:"me",word:w});
    setHistory(h=>[...h,"me"]);
    setPhase("result");
    ime.reset();

    const p1 = isP1.current?r.p1_score+1:r.p1_score;
    const p2 = isP1.current?r.p2_score:r.p2_score+1;
    const nr = r.current_round+1;
    const nxt = new Date(Date.now()+delayR.current).toISOString();

    if(p1>=WIN||p2>=WIN||nr>=50){
      await supabase.from("rooms").update({p1_score:p1,p2_score:p2}).eq("id",roomId);
      await finish(p1,p2); return;
    }

    // Write next_round_at so the loser's poll triggers their result screen
    seenNextAt.current=nxt; // mark so MY poll doesn't re-trigger
    await supabase.from("rooms").update({
      p1_score:p1, p2_score:p2,
      current_round:nr, current_kanji:null,
      next_round_at:nxt,
    }).eq("id",roomId);

    startCd(nxt);
    if(isP1.current){
      setTimeout(async()=>{ iAnswered.current=false; await nextWord(); },delayR.current);
    }
    // P2: don't reset iAnswered here — tick()'s new-word branch resets it when P1 sends
    // the next word. A premature reset would let P1's timeout write (different next_round_at)
    // retrigger the "opp answered" branch on P2's side.
  }

  async function finish(p1:number,p2:number){
    if(inactivityR.current) clearTimeout(inactivityR.current);
    const r=roomR.current!;
    const wid = p1>p2?r.player1_id:p2>p1?r.player2_id:null;
    if(r.is_private){
      // Private match: no ELO change, just close the room
      await supabase.from("rooms").update({
        status:"finished", p1_score:p1, p2_score:p2, ...(wid?{winner_id:wid}:{})
      }).eq("id",roomId);
      return;
    }
    if(!wid){ await supabase.from("rooms").update({status:"finished",p1_score:p1,p2_score:p2}).eq("id",roomId); return; }
    await supabase.rpc("finish_match",{p_room_id:roomId,p_winner_id:wid,p_p1_score:p1,p_p2_score:p2});
  }

  async function loadElo(uid:string,r:Room){
    const {data}=await supabase.from("matches")
      .select("player1_id,p1_elo_change,p2_elo_change")
      .eq("player1_id",r.player1_id).eq("player2_id",r.player2_id)
      .order("played_at",{ascending:false}).limit(1).single();
    if(data){
      if(data.player1_id===uid){
        setMyEloChange(data.p1_elo_change);
        setOppEloChange(data.p2_elo_change);
      } else {
        setMyEloChange(data.p2_elo_change);
        setOppEloChange(data.p1_elo_change);
      }
    }
  }

  async function concede(){
    const m=meR.current; if(!m||done.current) return;
    const r=roomR.current; if(!r) return;
    done.current=true;
    [timerR,pollR,cdR].forEach(x=>{ if(x.current) clearInterval(x.current); });
    if(inactivityR.current) clearTimeout(inactivityR.current);
    if(afkWarningR.current) clearInterval(afkWarningR.current);
    setAfkCountdown(null);
    const wid=isP1.current?r.player2_id:r.player1_id;
    // Keep actual scores — ELO formula doesn't use them, only winner/loser ELOs
    const p1=r.p1_score??0, p2=r.p2_score??0;
    try {
      if(r.is_private){
        await supabase.from("rooms").update({
          status:"finished", winner_id:wid, p1_score:p1, p2_score:p2,
        }).eq("id",roomId);
      } else {
        await supabase.rpc("finish_match",{p_room_id:roomId,p_winner_id:wid,p_p1_score:p1,p_p2_score:p2,p_is_forfeit:true});
      }
      // Re-fetch room so result screen has correct winner_id and scores
      const {data:fresh} = await supabase.from("rooms").select("*").eq("id",roomId).single();
      if(fresh){ roomR.current=fresh; setRoom(fresh); }
      if(!r.is_private){
        // Small delay to let match record commit before querying ELO changes
        await new Promise(res=>setTimeout(res,400));
        await loadElo(m.id, fresh??r);
      }
    } catch {
      done.current=false;
      return;
    }
    if(myId.current) updateStreak(myId.current);
    setConceded(true); setPhase("finished");
  }

  // ── render ────────────────────────────────────────────────────────────────
  if(phase==="loading") return <Msg text="Loading duel…" pulse/>;

  if(phase==="waiting"){
    const priv=room?.is_private&&room?.invite_code;
    return(
      <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
        <div className="card-solid w-full max-w-sm p-8 text-center slide-up">
          <div className="font-jp text-5xl mb-5 animate-pulse text-accent2">漢</div>
          {priv?(
            <>
              <p className="text-lg font-medium mb-1">Waiting for opponent…</p>
              <p className="text-white/40 text-sm mb-5">Share this code</p>
              <div className="bg-white/4 rounded-2xl p-4 mb-4" style={{border:"1px solid rgba(232,100,64,0.2)"}}>
                <p className="font-mono text-3xl font-bold tracking-widest mb-3 text-accent2">{room?.invite_code}</p>
                <CopyBtn text={`${typeof window!=="undefined"?window.location.origin:""}/play/${room?.invite_code}`} label="Copy invite link"/>
              </div>
            </>
          ):(
            <><p className="text-lg font-medium mb-2">Waiting for opponent…</p><p className="text-white/40 text-sm mb-6">Finding a match</p></>
          )}
          <button onClick={async()=>{
            if(pollR.current) clearInterval(pollR.current);
            await supabase.from("rooms").delete().eq("id",roomId).eq("status","waiting");
            router.push("/");
          }} className="btn-ghost w-full">Cancel</button>
        </div>
      </main>
    );
  }

  if(phase==="finished"&&room) return <ResultScreen room={room} me={me} opp={opp} isP1={isP1.current} router={router} log={log} myEloChange={myEloChange} oppEloChange={oppEloChange} myEloStart={myEloStart} oppEloStart={oppEloStart} conceded={conceded} showRomaji={showRomaji}/>;

  const myScore = room?(isP1.current?room.p1_score:room.p2_score):0;
  const opScore = room?(isP1.current?room.p2_score:room.p1_score):0;
  const pct = (timeLeft/roundTimeR.current)*100;
  const isBlitzMode = (room?.category??'').startsWith('blitz:');
  const myC = me?.accent_color??"#CF4520";
  const opC = opp?.accent_color??"#D85A30";
  const border = phase==="result"
    ? result?.who==="me"?"1px solid #1D9E75"
    : result?.who==="opp"?"1px solid #E24B4A"
    : "1px solid rgba(255,255,255,0.1)"
    : "1px solid rgba(207,69,32,0.35)";

  return(
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md">

        {/* scores */}
        <div className="grid grid-cols-3 items-center mb-4">
          {(() => {
            const myBorderCls = me?.owned_cosmetics?.includes("pack1") ? getBorderClass(me?.avatar_border_style) : "";
            return (
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              {myReactionSent&&(
                <div key={myReactionSent+Date.now()} className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl pointer-events-none"
                  style={{animation:"reactionPop 2.5s ease-out forwards"}}>
                  {myReactionSent}
                </div>
              )}
              <div className={myBorderCls || "relative"}>
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                style={{background:myC+"33",color:myC,border:myBorderCls?"none":`1.5px solid ${myC}44`}}>
                {resolveAvatar(me?.avatar_url,me?.avatar_static_url,me?.is_pro)?<img src={resolveAvatar(me?.avatar_url,me?.avatar_static_url,me?.is_pro)!} alt="" className="w-full h-full object-cover"/>:(me?.username??"?").slice(0,2).toUpperCase()}
              </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/40 truncate max-w-20">{me?.username??"You"}</p>
              {me?.featured_badges && me.featured_badges.length > 0 && (
                <p className="text-sm leading-none mb-0.5">{me.featured_badges.map(id => getBadgeIcon(id)).join(" ")}</p>
              )}
              <p className="font-mono text-2xl font-bold" style={{color:myC}}>{myScore}</p>
              <p className="text-xs font-mono opacity-60" style={{color:myC}}>{me?.elo??"—"}</p>
            </div>
          </div>
            );
          })()}
          <div className="text-center">
            {isBlitzMode&&<p className="text-xs font-bold mb-0.5" style={{color:"#EF9F27"}}>⚡ BLITZ</p>}
            <p className="text-xs text-white/40 font-mono">round {(room?.current_round??0)+1}</p>
            <p className="text-white/20 text-xs">first to {WIN}</p>
            {cd!==null&&cd>0&&<p className="font-mono font-bold text-3xl mt-1" style={{color:"#EF9F27",textShadow:"0 0 20px #EF9F2799"}}>{cd}</p>}
            <p className="text-xs mt-1" style={{color:room?.is_private?"rgba(255,255,255,0.18)":"rgba(232,100,64,0.7)"}}>
              {room?.is_private?"🎮 Fun":"⚔️ Ranked"}
            </p>
          </div>
          {(() => {
            const oppBorderCls = opp?.owned_cosmetics?.includes("pack1") ? getBorderClass(opp?.avatar_border_style) : "";
            return (
          <div className="flex items-center gap-2 justify-end">
            <div className="text-right">
              <p className="text-xs text-white/40 truncate max-w-20">{opp?.username??"Opp"}</p>
              {opp?.featured_badges && opp.featured_badges.length > 0 && (
                <p className="text-sm leading-none mb-0.5">{opp.featured_badges.map(id => getBadgeIcon(id)).join(" ")}</p>
              )}
              <p className="font-mono text-2xl font-bold" style={{color:opC}}>{opScore}</p>
              <p className="text-xs font-mono opacity-60" style={{color:opC}}>{opp?.elo??"—"}</p>
            </div>
            <div className="relative flex-shrink-0">
              {oppReaction&&(
                <div key={oppReaction+Date.now()} className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl pointer-events-none"
                  style={{animation:"reactionPop 2.5s ease-out forwards"}}>
                  {oppReaction}
                </div>
              )}
              <div className={oppBorderCls || "relative"}>
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                style={{background:opC+"33",color:opC,border:oppBorderCls?"none":`1.5px solid ${opC}44`}}>
                {resolveAvatar(opp?.avatar_url,opp?.avatar_static_url,opp?.is_pro)?<img src={resolveAvatar(opp?.avatar_url,opp?.avatar_static_url,opp?.is_pro)!} alt="" className="w-full h-full object-cover"/>:(opp?.username??"?").slice(0,2).toUpperCase()}
              </div>
              </div>
            </div>
          </div>
            );
          })()}
        </div>

        {/* progress dots */}
        <div className="flex gap-1 mb-3">
          {Array.from({length:Math.min(Math.max(history.length+4,10),24)}).map((_,i)=>(
            <div key={i} className="flex-1 h-1 rounded-full" style={{
              background:i<history.length
                ?history[i]==="me"?myC:history[i]==="opp"?"#E24B4A":"rgba(255,255,255,0.15)"
                :"rgba(255,255,255,0.08)"
            }}/>
          ))}
        </div>

        {/* timer bar */}
        <div className="h-0.5 bg-white/8 rounded-full mb-5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-200" style={{
            width:`${phase==="result"?0:pct}%`,
            background:timeLeft<=3?"#E24B4A":timeLeft<=6?"#EF9F27":"#1D9E75",
          }}/>
        </div>

        {/* word card */}
        <div className="card-solid p-7 text-center mb-4" style={{border}}>
          {word?(
            <>
              <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
                style={{background:"#FAEEDA22",color:"#EF9F27"}}>Reading</span>
              <div className="font-jp text-6xl mb-2 text-white">{word.word}</div>
              <p className="text-white/35 text-sm italic mb-2">{word.meaning}</p>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full" style={{
                background:word.jlpt==="N5"?"#1D9E7522":word.jlpt==="N4"?"#4DB6AC22":word.jlpt==="N3"?"#B8860B22":word.jlpt==="N2"?"#D85A3022":word.jlpt==="X"?"#9C27B022":"#C6282822",
                color:word.jlpt==="N5"?"#1D9E75":word.jlpt==="N4"?"#4DB6AC":word.jlpt==="N3"?"#B8860B":word.jlpt==="N2"?"#D85A30":word.jlpt==="X"?"#CE93D8":"#C62828",
              }}>{word.jlpt === "X" ? "No JLPT" : word.jlpt}</span>
              {phase==="playing"&&<p className="text-white/20 text-xs mt-2">{hiraMode?"Type romaji — auto-converts to hiragana":"Type the reading in hiragana or romaji"}</p>}
            </>
          ):(
            <div className="font-jp text-4xl text-white/10 animate-pulse">漢</div>
          )}

          {phase==="result"&&result&&(
            <div className="mt-5">
              {result.who==="me"&&<>
                <p className="text-base font-semibold mb-1" style={{color:"#5DCAA5"}}>✓ You got it!</p>
                <p className="text-white/40 text-sm font-mono">{result.word.reading}{showRomaji&&<span className="text-white/25 ml-2">({result.word.romaji})</span>}</p>
              </>}
              {result.who==="opp"&&<>
                <p className="text-base font-semibold mb-1" style={{color:"#E24B4A"}}>✗ {opp?.username??"Opponent"} answered first!</p>
                <p className="text-white/40 text-sm font-mono">{result.word.reading}{showRomaji&&<span className="text-white/25 ml-2">({result.word.romaji})</span>}</p>
              </>}
              {result.who==="time"&&<>
                <p className="text-base font-semibold mb-1 text-white/50">⏱ Time up!</p>
                <p className="text-white/40 text-sm font-mono">{result.word.reading}{showRomaji&&<span className="text-white/25 ml-2">({result.word.romaji})</span>}</p>
              </>}
              {cd!==null&&cd>0&&<p className="text-xs text-white/25 mt-2">Next round in {cd}s</p>}
            </div>
          )}
        </div>

        {/* input */}
        <div className="relative mb-3">
          <input ref={inputR}
            className={`input-field text-center text-lg w-full transition-all ${phase==="result"&&result?.who==="me"?"input-correct":phase==="result"?"input-wrong":""}`}
            placeholder={hiraMode?"ka · shi · tsu → か · し · つ":"Type your answer…"}
            value={ime.displayed}
            disabled={phase==="result"}
            autoComplete="off" autoCorrect="off" spellCheck={false}
            onChange={e=>{ resetInactivity(); ime.onChange(e); submit(ime.value); }}
            onKeyDown={e=>{ resetInactivity(); if(e.key==="Enter") submit(ime.value); }}
          />
          {hiraMode&&<div className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:"rgba(255,255,255,0.2)",fontSize:11}}>あ</div>}
        </div>

        <p className="text-center text-xs mb-4 font-mono" style={{color:phase==="result"&&result?.who!=="me"?"#E24B4A":"rgba(255,255,255,0.2)"}}>
          {phase==="result"
            ?result?.who==="me"?"Next round soon…"
            :result?.who==="opp"?`${opp?.username??"Opponent"} answered first!`
            :"Time up!"
            :`${timeLeft}s · first correct answer wins the round`}
        </p>

        {/* Quick reactions */}
        {(()=>{
          const BASE_REACTIONS = ["👍","😂","😤","🔥"];
          const PACK_REACTIONS = ["💀","🤯","✨","🫡"];
          const hasPack = me?.owned_cosmetics?.includes("pack1");
          const ReactionBtn = ({e, keyHint}:{e:string; keyHint:number})=>(
            <button key={e} onClick={()=>sendReaction(e)}
              className="relative text-lg w-11 h-11 rounded-xl transition-all hover:scale-110 active:scale-95"
              style={{
                background: myReactionSent===e ? "rgba(232,100,64,0.25)" : "rgba(255,255,255,0.05)",
                border: myReactionSent===e ? "1px solid rgba(232,100,64,0.4)" : "1px solid rgba(255,255,255,0.08)",
                opacity: reactCooldownR.current&&myReactionSent!==e ? 0.4 : 1,
              }}>
              {e}
              <span className="absolute bottom-0.5 right-1 text-white/20" style={{fontSize:8}}>{keyHint}</span>
            </button>
          );
          return (
            <div className="flex flex-col items-center gap-1 mb-3">
              <div className="flex justify-center gap-2">
                {BASE_REACTIONS.map((e,i)=><ReactionBtn key={e} e={e} keyHint={i+1}/>)}
              </div>
              {hasPack&&(
                <div className="flex justify-center gap-2">
                  {PACK_REACTIONS.map((e,i)=><ReactionBtn key={e} e={e} keyHint={i+5}/>)}
                </div>
              )}
            </div>
          );
        })()}

        {afkCountdown !== null && (
          <div className="mb-2 px-3 py-2 rounded-xl text-center text-xs font-medium"
            style={{ background: "rgba(226,75,74,0.12)", border: "1px solid rgba(226,75,74,0.3)", color: "#E24B4A" }}>
            ⚠️ Still there? Forfeit in {afkCountdown}s
          </div>
        )}

        <button onClick={concede}
          className="w-full text-xs text-white/15 hover:text-red-400/60 transition-colors py-2 border border-white/5 rounded-xl hover:border-red-400/20">
          🏳 Concede — forfeit the match
        </button>
      </div>
    </main>
  );
}

function CopyBtn({text,label}:{text:string;label:string}){
  const [copied,setCopied]=useState(false);
  return(
    <button onClick={async()=>{
      try{await navigator.clipboard.writeText(text);}catch{}
      setCopied(true);setTimeout(()=>setCopied(false),2000);
    }} className="w-full text-sm py-2 rounded-xl transition-all"
      style={{background:"rgba(232,100,64,0.2)",color:"#E86440",border:"1px solid rgba(232,100,64,0.3)"}}>
      {copied?"✓ Copied!":label}
    </button>
  );
}

function ResultScreen({room,me,opp,isP1,router,log,myEloChange,oppEloChange,myEloStart,oppEloStart,conceded,showRomaji}:{
  room:Room;me:Profile|null;opp:Profile|null;
  isP1:boolean;router:ReturnType<typeof useRouter>;
  log:RoundLog[];myEloChange:number|null;oppEloChange:number|null;
  myEloStart:number|null;oppEloStart:number|null;
  conceded:boolean;showRomaji:boolean;
}){
  const supabase = createClient();
  const myS=isP1?room.p1_score:room.p2_score;
  const opS=isP1?room.p2_score:room.p1_score;
  const myId2=isP1?room.player1_id:room.player2_id;
  const oppId=isP1?room.player2_id:room.player1_id;
  const iWon=room.winner_id?room.winner_id===myId2:myS>opS;
  const isDraw=!room.winner_id&&myS===opS;

  const [rematchRoomId,setRematchRoomId] = useState<string|null>(null);
  const rematchRoomIdRef = useRef<string|null>(null);
  const [oppRematchId,setOppRematchId] = useState<string|null>(null);
  const [startingRematch,setStartingRematch] = useState(false);
  const [joiningRematch,setJoiningRematch] = useState(false);
  const rematchDoneRef = useRef(false);
  const channelRef = useRef<any>(null);

  // keep ref in sync so async callbacks always see latest value
  useEffect(()=>{ rematchRoomIdRef.current = rematchRoomId; },[rematchRoomId]);

  // Realtime broadcast channel — instant rematch signaling (no polling delay)
  useEffect(()=>{
    if(!myId2) return;
    const ch = supabase.channel(`rematch:${room.id}`)
      .on('broadcast',{event:'rematch_offered'},({payload}:any)=>{
        if(payload.fromId!==myId2) setOppRematchId(payload.roomId);
      })
      .on('broadcast',{event:'rematch_cancelled'},({payload}:any)=>{
        if(payload.fromId!==myId2) setOppRematchId(null);
      })
      .subscribe();
    channelRef.current = ch;
    return ()=>{
      // On unmount: cancel any pending rematch room we created
      const rid = rematchRoomIdRef.current;
      if(rid && !rematchDoneRef.current){
        ch.send({type:'broadcast',event:'rematch_cancelled',payload:{fromId:myId2}});
        supabase.from("rooms").delete().eq("id",rid).eq("status","waiting").then(()=>{});
      }
      ch.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Poll every 2s as fallback (handles "opponent left" cleanup + simultaneous-click tiebreaker)
  useEffect(()=>{
    if(!oppId||!myId2) return;
    const t=setInterval(async()=>{
      if(rematchDoneRef.current) return;
      const {data}=await supabase.from("rooms").select("id")
        .eq("player1_id",oppId).eq("status","waiting").eq("is_private",true)
        .is("player2_id",null).maybeSingle();
      const oppRid = data?.id ?? null;
      setOppRematchId(oppRid);

      // Both have rooms → tiebreaker: lower UUID is the joiner
      if(oppRid && rematchRoomIdRef.current && myId2 < oppId){
        // I have lower UUID → delete my room, join theirs
        rematchDoneRef.current = true;
        clearInterval(t);
        await supabase.from("rooms").delete()
          .eq("id",rematchRoomIdRef.current).eq("status","waiting");
        rematchRoomIdRef.current = null;
        setRematchRoomId(null);
        const {error}=await supabase.from("rooms")
          .update({player2_id:myId2,status:"active"})
          .eq("id",oppRid).eq("status","waiting");
        if(!error) router.push(`/duel/${oppRid}`);
        else rematchDoneRef.current = false; // retry if race failed
      }
    },2000);
    return ()=>clearInterval(t);
  },[oppId,myId2]);

  // When we created a rematch room, poll until opponent joins → auto-navigate
  useEffect(()=>{
    if(!rematchRoomId) return;
    const t=setInterval(async()=>{
      if(rematchDoneRef.current) return;
      const {data}=await supabase.from("rooms").select("player2_id")
        .eq("id",rematchRoomId).single();
      if(data?.player2_id){
        rematchDoneRef.current = true;
        clearInterval(t);
        router.push(`/duel/${rematchRoomId}`);
      }
    },2000);
    return ()=>clearInterval(t);
  },[rematchRoomId]);

  async function startRematch(){
    if(startingRematch||!myId2) return;
    setStartingRematch(true);
    const code=Array.from({length:6},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random()*32)]).join("");
    const {data}=await supabase.from("rooms").insert({
      player1_id:myId2, status:"waiting", category:room.category??"all",
      rounds:11, is_private:true, invite_code:code,
    }).select().single();
    if(data){
      rematchRoomIdRef.current=data.id; setRematchRoomId(data.id);
      // Broadcast immediately so opponent sees the button without waiting for their poll
      channelRef.current?.send({type:'broadcast',event:'rematch_offered',payload:{fromId:myId2,roomId:data.id}});
    }
    setStartingRematch(false);
  }

  async function cancelRematch(){
    if(!rematchRoomId) return;
    // Broadcast immediately so opponent's button disappears without waiting for their poll
    channelRef.current?.send({type:'broadcast',event:'rematch_cancelled',payload:{fromId:myId2}});
    await supabase.from("rooms").delete().eq("id",rematchRoomId).eq("status","waiting");
    rematchRoomIdRef.current=null;
    setRematchRoomId(null);
  }

  async function joinRematch(){
    if(!oppRematchId||!myId2||joiningRematch) return;
    setJoiningRematch(true);
    const {error}=await supabase.from("rooms")
      .update({player2_id:myId2,status:"active"})
      .eq("id",oppRematchId).eq("status","waiting");
    if(!error){ rematchDoneRef.current=true; router.push(`/duel/${oppRematchId}`); }
    else setJoiningRematch(false);
  }
  return(
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-lg mx-auto">
      <div className="card-solid p-6 text-center mb-4 slide-up">
        <div className="font-jp text-5xl mb-3">{iWon?"勝":isDraw?"引":"敗"}</div>
        <h1 className="text-2xl font-semibold mb-1">{iWon?"Victory!":isDraw?"Draw":"Defeat"}</h1>
        {conceded&&!iWon&&<p className="text-white/30 text-xs mb-1">You conceded</p>}
        {conceded&&iWon&&<p className="text-white/30 text-xs mb-1">{opp?.username} conceded</p>}
        <div className="flex items-center justify-center gap-4 my-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold"
              style={{background:(me?.accent_color??"#CF4520")+"33",color:me?.accent_color??"#E86440",border:`2px solid ${me?.accent_color??"#CF4520"}44`}}>
              {resolveAvatar(me?.avatar_url,me?.avatar_static_url,me?.is_pro)?<img src={resolveAvatar(me?.avatar_url,me?.avatar_static_url,me?.is_pro)!} alt="" className="w-full h-full object-cover"/>:(me?.username??"?").slice(0,2).toUpperCase()}
            </div>
            <p className="text-xs text-white/50">{me?.username??"You"}</p>
          </div>
          <span className="text-white/20 text-sm">vs</span>
          <a href={`/user/${opp?.username}`} className="flex flex-col items-center gap-1 hover:opacity-80">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold"
              style={{background:(opp?.accent_color??"#D85A30")+"33",color:opp?.accent_color??"#D85A30",border:`2px solid ${opp?.accent_color??"#D85A30"}44`}}>
              {resolveAvatar(opp?.avatar_url,opp?.avatar_static_url,opp?.is_pro)?<img src={resolveAvatar(opp?.avatar_url,opp?.avatar_static_url,opp?.is_pro)!} alt="" className="w-full h-full object-cover"/>:(opp?.username??"?").slice(0,2).toUpperCase()}
            </div>
            <p className="text-xs text-white/50">{opp?.username??"?"}</p>
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            {label:me?.username??"You",score:myS,color:me?.accent_color??"#CF4520",eloStart:myEloStart,eloChange:myEloChange},
            {label:opp?.username??"Opp",score:opS,color:opp?.accent_color??"#D85A30",eloStart:oppEloStart,eloChange:oppEloChange},
          ].map(s=>(
            <div key={s.label} className="bg-white/4 rounded-xl p-3">
              <p className="text-xs text-white/40 truncate mb-1">{s.label}</p>
              <p className="font-mono text-2xl font-bold" style={{color:s.color}}>{s.score}</p>
              {!room.is_private&&s.eloStart!==null&&(
                <p className="text-xs text-white/35 mt-1 font-mono">
                  {s.eloStart}
                  {s.eloChange!==null&&(
                    <span style={{color:s.eloChange>=0?"#5DCAA5":"#E24B4A"}}> {s.eloChange>=0?"+":""}{s.eloChange}</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
        {room.is_private?(
          <p className="text-xs text-white/25 mb-4">🎮 Fun match · ELO not counted</p>
        ):(
          <div className="flex flex-col items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{background:"rgba(207,69,32,0.15)",border:"1px solid rgba(232,100,64,0.25)",color:"#E86440"}}>
              ⚔️ Ranked · ELO at stake
            </span>
            {myEloChange!==null&&(
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{background:myEloChange>=0?"rgba(29,158,117,0.15)":"rgba(226,75,74,0.15)",border:myEloChange>=0?"1px solid #1D9E7544":"1px solid #E24B4A44"}}>
                <span className="font-mono text-lg font-bold" style={{color:myEloChange>=0?"#5DCAA5":"#E24B4A"}}>{myEloChange>=0?"+":""}{myEloChange}</span>
                <span className="text-xs text-white/40">ELO</span>
              </div>
            )}
          </div>
        )}
        {/* Rematch */}
        {oppRematchId&&!rematchRoomId&&(
          <button onClick={joinRematch} disabled={joiningRematch}
            className="btn-primary flex items-center justify-center gap-2 mb-2"
            style={{background:"linear-gradient(135deg,#1D9E75,#4DB6AC)"}}>
            {joiningRematch?"Joining…":`🔁 ${opp?.username} wants a rematch — Join!`}
          </button>
        )}
        {rematchRoomId?(
          <button onClick={cancelRematch}
            className="btn-ghost mb-2 flex items-center justify-center gap-2 opacity-70 hover:opacity-100">
            ⏳ Waiting for {opp?.username}… Cancel
          </button>
        ):(
          !oppRematchId&&(
            <button onClick={startRematch} disabled={startingRematch}
              className="btn-ghost mb-1 flex items-center justify-center gap-2">
              {startingRematch?"…":"🔁 Rematch"}
            </button>
          )
        )}
        <div className="flex flex-col gap-2">
          <button className="btn-primary" onClick={()=>router.push("/matchmaking")}>⚡ Play again</button>
          <button className="btn-ghost" onClick={()=>router.push("/")}>Home</button>
        </div>
      </div>
      {log.length>0&&(
        <div className="card-solid overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5"><p className="text-xs text-white/40 uppercase tracking-widest">Round recap</p></div>
          {log.map((r,i)=>(
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
              <span className="font-mono text-xs text-white/20 w-5 flex-shrink-0">{i+1}</span>
              <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{background:r.winner==="me"?(me?.accent_color??"#CF4520"):r.winner==="opp"?"#E24B4A":"rgba(255,255,255,0.15)"}}/>
              <div className="font-jp text-xl w-12 text-center flex-shrink-0">{r.word.word}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/30 truncate">{r.word.meaning}</p>
                <p className="text-sm font-mono text-white/60">{r.word.reading}</p>
                {showRomaji&&<p className="text-xs font-mono text-white/25">{r.word.romaji}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-medium" style={{color:r.winner==="me"?"#5DCAA5":r.winner==="opp"?"#E24B4A":"#9090a8"}}>
                  {r.winner==="me"?"✓ You":r.winner==="opp"?`✓ ${opp?.username??"Opp"}`:"⏱ Time"}
                </p>
                <p className="text-xs text-white/20 font-mono">{r.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Msg({text,pulse}:{text:string;pulse?:boolean}){
  return(
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className={`font-jp text-5xl text-accent2 ${pulse?"animate-pulse":""}`}>漢</div>
      <p className="text-white/50">{text}</p>
    </div>
  );
}
