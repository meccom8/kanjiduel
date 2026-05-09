// Romaji → Hiragana converter (WaniKani-style IME)
// Handles: basic kana, double consonants (っ), n disambiguation

const MULTI: [string, string][] = [
  // 3-char combos first
  ["sha","しゃ"],["shi","し"],["shu","しゅ"],["she","しぇ"],["sho","しょ"],
  ["chi","ち"],["cha","ちゃ"],["chu","ちゅ"],["che","ちぇ"],["cho","ちょ"],
  ["tsu","つ"],["thi","てぃ"],["tha","てゃ"],["thu","てゅ"],["tho","てょ"],
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
  // 2-char combos
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
  ["xya","ゃ"],["xyu","ゅ"],["xyo","ょ"],
  ["xtu","っ"],["xtsu","っ"],["ltu","っ"],["ltsu","っ"],
  // 1-char
  ["a","あ"],["i","い"],["u","う"],["e","え"],["o","お"],
  ["n","ん"],
];

// Build lookup maps
const MAP3 = new Map<string, string>();
const MAP2 = new Map<string, string>();
const MAP1 = new Map<string, string>();

for (const [rom, hira] of MULTI) {
  if (rom.length >= 3) MAP3.set(rom.slice(0, 3), hira);
  else if (rom.length === 2) MAP2.set(rom, hira);
  else MAP1.set(rom, hira);
}

// Override with full multi-char entries
for (const [rom, hira] of MULTI) {
  if (rom.length === 3) MAP3.set(rom, hira);
  if (rom.length === 2) MAP2.set(rom, hira);
  if (rom.length === 1) MAP1.set(rom, hira);
}

export function toHiragana(input: string): string {
  let result = "";
  let i = 0;
  const s = input.toLowerCase();

  while (i < s.length) {
    // Handle nn → ん
    if (s[i] === "n" && s[i + 1] === "n") {
      result += "ん";
      i += 2;
      continue;
    }

    // Handle n before non-vowel, non-n, non-y → ん
    if (
      s[i] === "n" &&
      i + 1 < s.length &&
      !"aiueoyn".includes(s[i + 1])
    ) {
      result += "ん";
      i += 1;
      continue;
    }

    // Double consonant → っ (e.g. "kk" → っ + k)
    if (
      s[i] === s[i + 1] &&
      !"aiueony".includes(s[i]) &&
      s[i] !== "n"
    ) {
      result += "っ";
      i += 1;
      continue;
    }

    // Try 4-char match (e.g. "xtsu", "ltsu")
    const chunk4 = s.slice(i, i + 4);
    const hit4 = MULTI.find(([r]) => r === chunk4);
    if (hit4) { result += hit4[1]; i += 4; continue; }

    // Try 3-char match
    const chunk3 = s.slice(i, i + 3);
    const hit3 = MAP3.get(chunk3);
    if (hit3) { result += hit3; i += 3; continue; }

    // Try 2-char match
    const chunk2 = s.slice(i, i + 2);
    const hit2 = MAP2.get(chunk2);
    if (hit2) { result += hit2; i += 2; continue; }

    // Try 1-char match (only vowels + n)
    const chunk1 = s[i];
    const hit1 = MAP1.get(chunk1);
    if (hit1 && "aiueon".includes(chunk1)) {
      result += hit1; i += 1; continue;
    }

    // Unconverted — keep as-is (mid-word consonant, partial input)
    result += s[i];
    i += 1;
  }

  return result;
}

// Returns true if the string is already fully hiragana/katakana
export function isKana(s: string): boolean {
  return /^[\u3040-\u309f\u30a0-\u30ff\s]+$/.test(s);
}
