// Romaji → Hiragana converter (WaniKani-style IME)
//
// IMPORTANT: always call toHiragana(rawBuffer) where rawBuffer is the
// original romaji typed by the user — never feed the converted hiragana
// back as input. The component must track raw input separately.
//
// n/ん rules:
//   nn          → ん
//   n'          → ん (apostrophe separator)
//   n + consonant (not n,y) → ん  e.g. nk nb nz
//   ni/na/nu/ne/no/nya...   → に/な... (NOT ん)
//   n at end of string      → kept as "n" (pending — user may type a vowel next)

const ROMAJI_MAP: [string, string][] = [
  // 4-char
  ["xtsu","っ"],["ltsu","っ"],
  // 3-char
  ["sha","しゃ"],["shi","し"],["shu","しゅ"],["she","しぇ"],["sho","しょ"],
  ["chi","ち"],["cha","ちゃ"],["chu","ちゅ"],["che","ちぇ"],["cho","ちょ"],
  ["tsu","つ"],
  ["thi","てぃ"],["tha","てゃ"],["thu","てゅ"],["tho","てょ"],
  ["dhi","でぃ"],["dha","でゃ"],["dhu","でゅ"],["dho","でょ"],
  ["kya","きゃ"],["kyi","きぃ"],["kyu","きゅ"],["kye","きぇ"],["kyo","きょ"],
  ["gya","ぎゃ"],["gyi","ぎぃ"],["gyu","ぎゅ"],["gye","ぎぇ"],["gyo","ぎょ"],
  ["nya","にゃ"],["nyi","にぃ"],["nyu","にゅ"],["nye","にぇ"],["nyo","にょ"],
  ["hya","ひゃ"],["hyi","ひぃ"],["hyu","ひゅ"],["hye","ひぇ"],["hyo","ひょ"],
  ["bya","びゃ"],["byi","びぃ"],["byu","びゅ"],["bye","びぇ"],["byo","びょ"],
  ["pya","ぴゃ"],["pyi","ぴぃ"],["pyu","ぴゅ"],["pye","ぴぇ"],["pyo","ぴょ"],
  ["mya","みゃ"],["myi","みぃ"],["myu","みゅ"],["mye","みぇ"],["myo","みょ"],
  ["rya","りゃ"],["ryi","りぃ"],["ryu","りゅ"],["rye","りぇ"],["ryo","りょ"],
  ["zya","じゃ"],["zyi","じぃ"],["zyu","じゅ"],["zye","じぇ"],["zyo","じょ"],
  ["jya","じゃ"],["jyi","じぃ"],["jyu","じゅ"],["jye","じぇ"],["jyo","じょ"],
  ["sya","しゃ"],["syi","しぃ"],["syu","しゅ"],["sye","しぇ"],["syo","しょ"],
  ["dya","ぢゃ"],["dyi","ぢぃ"],["dyu","ぢゅ"],["dye","ぢぇ"],["dyo","ぢょ"],
  ["tya","ちゃ"],["tyi","ちぃ"],["tyu","ちゅ"],["tye","ちぇ"],["tyo","ちょ"],
  ["wha","うぁ"],["whi","うぃ"],["whe","うぇ"],["who","うぉ"],
  ["vya","ゔゃ"],["vyu","ゔゅ"],["vyo","ゔょ"],
  ["xya","ゃ"],["xyu","ゅ"],["xyo","ょ"],
  ["xtu","っ"],["ltu","っ"],
  // 2-char
  ["ka","か"],["ki","き"],["ku","く"],["ke","け"],["ko","こ"],
  ["ga","が"],["gi","ぎ"],["gu","ぐ"],["ge","げ"],["go","ご"],
  ["sa","さ"],["si","し"],["su","す"],["se","せ"],["so","そ"],
  ["za","ざ"],["zi","じ"],["zu","ず"],["ze","ぜ"],["zo","ぞ"],
  ["ta","た"],["ti","ち"],["tu","つ"],["te","て"],["to","と"],
  ["da","だ"],["di","ぢ"],["du","づ"],["de","で"],["do","ど"],
  ["na","な"],["ni","に"],["nu","ぬ"],["ne","ね"],["no","の"],
  ["ha","は"],["hi","ひ"],["hu","ふ"],["he","へ"],["ho","ほ"],
  ["ba","ば"],["bi","び"],["bu","ぶ"],["be","べ"],["bo","ぼ"],
  ["pa","ぱ"],["pi","ぴ"],["pu","ぷ"],["pe","ぺ"],["po","ぽ"],
  ["ma","ま"],["mi","み"],["mu","む"],["me","め"],["mo","も"],
  ["ya","や"],["yu","ゆ"],["yo","よ"],
  ["ra","ら"],["ri","り"],["ru","る"],["re","れ"],["ro","ろ"],
  ["wa","わ"],["wi","ゐ"],["we","ゑ"],["wo","を"],
  ["fa","ふぁ"],["fi","ふぃ"],["fu","ふ"],["fe","ふぇ"],["fo","ふぉ"],
  ["ja","じゃ"],["ji","じ"],["ju","じゅ"],["je","じぇ"],["jo","じょ"],
  ["va","ゔぁ"],["vi","ゔぃ"],["vu","ゔ"],["ve","ゔぇ"],["vo","ゔぉ"],
  ["xa","ぁ"],["xi","ぃ"],["xu","ぅ"],["xe","ぇ"],["xo","ぉ"],
  ["a","あ"],["i","い"],["u","う"],["e","え"],["o","お"],
];

const MAP4 = new Map<string, string>();
const MAP3 = new Map<string, string>();
const MAP2 = new Map<string, string>();
const MAP1 = new Map<string, string>();

for (const [rom, hira] of ROMAJI_MAP) {
  if (rom.length === 4) MAP4.set(rom, hira);
  else if (rom.length === 3) MAP3.set(rom, hira);
  else if (rom.length === 2) MAP2.set(rom, hira);
  else if (rom.length === 1) MAP1.set(rom, hira);
}

const VOWELS = new Set(["a", "i", "u", "e", "o"]);

/**
 * Convert romaji string to hiragana.
 * Pass the raw romaji buffer — never pass previously converted hiragana.
 */
export function toHiragana(input: string): string {
  const s = input.toLowerCase();
  let result = "";
  let i = 0;

  while (i < s.length) {
    const c = s[i];

    // ── N handling ──────────────────────────────────────────────────────────
    if (c === "n") {
      const next = s[i + 1];

      // nn → ん
      if (next === "n") {
        result += "ん";
        i += 2;
        continue;
      }

      // n' → ん (explicit separator like WaniKani)
      if (next === "'") {
        result += "ん";
        i += 2;
        continue;
      }

      // n at end of string → keep as "n" (user hasn't finished typing)
      if (next === undefined) {
        result += "n";
        i += 1;
        continue;
      }

      // n + vowel or y → try na/ni/nu/ne/no/nya/nyu/nyo (NOT ん)
      if (VOWELS.has(next) || next === "y") {
        const h3 = MAP3.get(s.slice(i, i + 3));
        if (h3) { result += h3; i += 3; continue; }

        const h2 = MAP2.get(s.slice(i, i + 2));
        if (h2) { result += h2; i += 2; continue; }

        // partial e.g. "ny" not yet completable — keep as-is
        result += c;
        i += 1;
        continue;
      }

      // n + consonant (not n, not y) → ん
      result += "ん";
      i += 1;
      continue;
    }

    // ── Double consonant → っ ─────────────────────────────────────────────
    if (
      s[i + 1] === c &&
      !VOWELS.has(c) &&
      c !== "n" &&
      c !== "y"
    ) {
      result += "っ";
      i += 1;
      continue;
    }

    // ── Longest match first ────────────────────────────────────────────────
    const h4 = MAP4.get(s.slice(i, i + 4));
    if (h4) { result += h4; i += 4; continue; }

    const h3 = MAP3.get(s.slice(i, i + 3));
    if (h3) { result += h3; i += 3; continue; }

    const h2 = MAP2.get(s.slice(i, i + 2));
    if (h2) { result += h2; i += 2; continue; }

    const h1 = MAP1.get(s[i]);
    if (h1) { result += h1; i += 1; continue; }

    // Unconverted (partial consonant cluster, unknown char) — keep as-is
    result += c;
    i += 1;
  }

  return result;
}

// Returns true if string is already fully kana (no conversion needed)
export function isKana(s: string): boolean {
  return /^[\u3040-\u309f\u30a0-\u30ff\s・ー]+$/.test(s);
}
