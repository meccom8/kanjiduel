import { createClient } from "@/lib/supabase";

// Vocabulary item from Supabase
export interface VocabWord {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  jlpt: "N5" | "N4" | "N3" | "N2" | "N1";
  level: number;
}

// ── Hiragana ↔ Romaji ──────────────────────────────────
const HIRA_ROMA: Record<string, string> = {
  "あ":"a","い":"i","う":"u","え":"e","お":"o",
  "か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
  "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
  "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
  "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
  "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
  "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
  "や":"ya","ゆ":"yu","よ":"yo",
  "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro",
  "わ":"wa","を":"wo","ん":"n",
  "が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go",
  "ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
  "だ":"da","ぢ":"di","づ":"du","で":"de","ど":"do",
  "ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
  "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po",
  "きゃ":"kya","きゅ":"kyu","きょ":"kyo",
  "しゃ":"sha","しゅ":"shu","しょ":"sho",
  "ちゃ":"cha","ちゅ":"chu","ちょ":"cho",
  "にゃ":"nya","にゅ":"nyu","にょ":"nyo",
  "ひゃ":"hya","ひゅ":"hyu","ひょ":"hyo",
  "みゃ":"mya","みゅ":"myu","みょ":"myo",
  "りゃ":"rya","りゅ":"ryu","りょ":"ryo",
  "ぎゃ":"gya","ぎゅ":"gyu","ぎょ":"gyo",
  "じゃ":"ja","じゅ":"ju","じょ":"jo",
  "びゃ":"bya","びゅ":"byu","びょ":"byo",
  "ぴゃ":"pya","ぴゅ":"pyu","ぴょ":"pyo",
  "っ":"tt","ー":"-",
};

const KATA_START = 0x30A1;
const HIRA_START = 0x3041;

export function hiraToRoma(str: string): string {
  let result = "";
  let i = 0;
  while (i < str.length) {
    const two = str.slice(i, i + 2);
    if (HIRA_ROMA[two]) { result += HIRA_ROMA[two]; i += 2; continue; }
    result += HIRA_ROMA[str[i]] ?? str[i];
    i++;
  }
  return result;
}

function kataToHira(str: string): string {
  return str.split("").map(c => {
    const code = c.charCodeAt(0);
    if (code >= KATA_START && code <= KATA_START + 96)
      return String.fromCharCode(code - KATA_START + HIRA_START);
    return c;
  }).join("");
}

function normalizeLongVowels(str: string): string {
  return str
    .replace(/ū/g, "uu").replace(/Ū/g, "uu")
    .replace(/ō/g, "ou").replace(/Ō/g, "ou")
    .replace(/ā/g, "aa").replace(/Ā/g, "aa")
    .replace(/ī/g, "ii").replace(/Ī/g, "ii")
    .replace(/ê/g, "e").replace(/â/g, "a")
    .toLowerCase();
}

function stripVerbSuffix(str: string): string {
  return str
    .replace(/[・･]?(する|suru|-suru)$/i, "")
    .replace(/[・･]?(する|suru|-suru)/gi, "")
    .trim();
}

function splitReadings(str: string): string[] {
  return str.split(/[/、,，・]/).map(s => stripVerbSuffix(s.trim())).filter(Boolean);
}

export function checkVocabAnswer(input: string, word: VocabWord): boolean {
  const clean = input.trim().toLowerCase();
  if (!clean) return false;
  const cleanNorm = normalizeLongVowels(clean);
  const inputAsHira = kataToHira(clean).toLowerCase();
  const inputRoma = normalizeLongVowels(hiraToRoma(clean));

  const hiraReadings = splitReadings(word.reading.toLowerCase());
  const romaReadings = splitReadings(
    normalizeLongVowels(word.romaji || hiraToRoma(word.reading))
  );
  const hiraToRomaReadings = hiraReadings.map(h => normalizeLongVowels(hiraToRoma(h)));
  const allRoma = [...new Set([...romaReadings, ...hiraToRomaReadings])];

  return (
    hiraReadings.some(h => clean === h || inputAsHira === h) ||
    allRoma.some(r => clean === r || cleanNorm === r || inputRoma === r)
  );
}

export function getEloMaxLevel(elo: number): number {
  if (elo >= 1600) return 5;
  if (elo >= 1200) return 4;
  if (elo >= 800) return 3;
  if (elo >= 400) return 2;
  return 1;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deterministic daily word selection
export function getDailyWords(allWords: VocabWord[], date: string, count = 10): VocabWord[] {
  const seed = parseInt(date.replace(/-/g, "")) % 999983;
  let hash = seed;
  const shuffled = [...allWords];
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) % 2147483648;
    const j = hash % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// ─── Approximate word counts per JLPT level ───────────────────────────────────
const JLPT_COUNTS: Record<string, number> = {
  all: 7238,
  N5: 800,
  N4: 1500,
  N3: 1500,
  N2: 1700,
  N1: 1738,
};

/**
 * Fetch truly random words from the full 7238-word vocabulary table.
 *
 * Instead of .limit(500) which always returns the same first 500 rows,
 * this picks 3 random offsets spread across the table and merges results.
 * This ensures all 7238 words can appear over time.
 *
 * @param supabase  - Supabase browser client
 * @param count     - how many words you need (e.g. 20 for practice, 1 for duel)
 * @param jlpt      - optional JLPT level filter
 */
export async function fetchRandomWords(
  supabase: ReturnType<typeof createClient>,
  count: number = 20,
  jlpt?: string
): Promise<VocabWord[]> {
  const total = jlpt ? (JLPT_COUNTS[jlpt] ?? 1000) : JLPT_COUNTS.all;
  const batchSize = Math.max(count, 10);

  // Pick 3 non-overlapping random offsets
  const offsets: number[] = [];
  while (offsets.length < 3) {
    const o = Math.floor(Math.random() * Math.max(1, total - batchSize));
    if (!offsets.some(x => Math.abs(x - o) < batchSize)) offsets.push(o);
    // Safety: if table is small, just add anyway
    if (offsets.length < 3 && total < batchSize * 3) { offsets.push(o); break; }
  }

  const results = await Promise.all(
    offsets.map(offset => {
      let q = supabase
        .from("vocabulary")
        .select("id, word, reading, romaji, meaning, jlpt, level")
        .range(offset, offset + batchSize - 1);
      if (jlpt) q = (q as any).eq("jlpt", jlpt);
      return q;
    })
  );

  // Merge, deduplicate, shuffle, return requested count
  const seen = new Set<string>();
  const unique: VocabWord[] = [];
  for (const r of results) {
    for (const w of (r.data ?? []) as VocabWord[]) {
      if (!seen.has(w.id)) { seen.add(w.id); unique.push(w); }
    }
  }

  return shuffle(unique).slice(0, count);
}
