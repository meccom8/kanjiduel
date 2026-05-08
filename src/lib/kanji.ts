export interface Kanji {
  k: string;
  m: string;   // meaning (English)
  r: string;   // reading (romaji)
  level: number; // 1=easiest
}

export const KANJI_DB: Record<string, Kanji[]> = {
  numbers: [
    { k: "一", m: "one", r: "ichi", level: 1 },
    { k: "二", m: "two", r: "ni", level: 1 },
    { k: "三", m: "three", r: "san", level: 1 },
    { k: "四", m: "four", r: "shi", level: 1 },
    { k: "五", m: "five", r: "go", level: 1 },
    { k: "六", m: "six", r: "roku", level: 1 },
    { k: "七", m: "seven", r: "nana", level: 1 },
    { k: "八", m: "eight", r: "hachi", level: 1 },
    { k: "九", m: "nine", r: "ku", level: 1 },
    { k: "十", m: "ten", r: "juu", level: 1 },
    { k: "百", m: "hundred", r: "hyaku", level: 2 },
    { k: "千", m: "thousand", r: "sen", level: 2 },
    { k: "万", m: "ten thousand", r: "man", level: 2 },
    { k: "円", m: "yen", r: "en", level: 2 },
  ],
  nature: [
    { k: "山", m: "mountain", r: "yama", level: 1 },
    { k: "川", m: "river", r: "kawa", level: 1 },
    { k: "木", m: "tree", r: "ki", level: 1 },
    { k: "火", m: "fire", r: "hi", level: 1 },
    { k: "水", m: "water", r: "mizu", level: 1 },
    { k: "土", m: "earth", r: "tsuchi", level: 1 },
    { k: "空", m: "sky", r: "sora", level: 2 },
    { k: "花", m: "flower", r: "hana", level: 2 },
    { k: "海", m: "sea", r: "umi", level: 2 },
    { k: "石", m: "stone", r: "ishi", level: 2 },
    { k: "田", m: "rice field", r: "ta", level: 2 },
    { k: "林", m: "forest", r: "hayashi", level: 2 },
    { k: "森", m: "woods", r: "mori", level: 2 },
    { k: "雨", m: "rain", r: "ame", level: 2 },
    { k: "雪", m: "snow", r: "yuki", level: 3 },
    { k: "風", m: "wind", r: "kaze", level: 3 },
    { k: "月", m: "moon", r: "tsuki", level: 1 },
    { k: "日", m: "sun", r: "hi", level: 1 },
    { k: "星", m: "star", r: "hoshi", level: 3 },
  ],
  body: [
    { k: "目", m: "eye", r: "me", level: 1 },
    { k: "口", m: "mouth", r: "kuchi", level: 1 },
    { k: "耳", m: "ear", r: "mimi", level: 1 },
    { k: "手", m: "hand", r: "te", level: 1 },
    { k: "足", m: "foot", r: "ashi", level: 1 },
    { k: "頭", m: "head", r: "atama", level: 2 },
    { k: "心", m: "heart", r: "kokoro", level: 2 },
    { k: "体", m: "body", r: "karada", level: 2 },
    { k: "顔", m: "face", r: "kao", level: 2 },
    { k: "歯", m: "tooth", r: "ha", level: 3 },
    { k: "鼻", m: "nose", r: "hana", level: 2 },
    { k: "首", m: "neck", r: "kubi", level: 3 },
  ],
  time: [
    { k: "日", m: "day", r: "hi", level: 1 },
    { k: "月", m: "month", r: "tsuki", level: 1 },
    { k: "年", m: "year", r: "nen", level: 1 },
    { k: "時", m: "time", r: "toki", level: 2 },
    { k: "今", m: "now", r: "ima", level: 1 },
    { k: "朝", m: "morning", r: "asa", level: 2 },
    { k: "夜", m: "night", r: "yoru", level: 2 },
    { k: "週", m: "week", r: "shuu", level: 2 },
    { k: "前", m: "before", r: "mae", level: 2 },
    { k: "後", m: "after", r: "ato", level: 2 },
    { k: "昨", m: "yesterday", r: "saku", level: 3 },
    { k: "明", m: "bright", r: "mei", level: 3 },
    { k: "午", m: "noon", r: "go", level: 2 },
  ],
  people: [
    { k: "人", m: "person", r: "hito", level: 1 },
    { k: "子", m: "child", r: "ko", level: 1 },
    { k: "男", m: "man", r: "otoko", level: 1 },
    { k: "女", m: "woman", r: "onna", level: 1 },
    { k: "父", m: "father", r: "chichi", level: 2 },
    { k: "母", m: "mother", r: "haha", level: 2 },
    { k: "友", m: "friend", r: "tomo", level: 2 },
    { k: "先", m: "ahead", r: "saki", level: 2 },
    { k: "生", m: "life", r: "sei", level: 2 },
    { k: "学", m: "study", r: "mana", level: 2 },
    { k: "王", m: "king", r: "ou", level: 3 },
    { k: "民", m: "people", r: "tami", level: 3 },
  ],
  verbs: [
    { k: "見", m: "see", r: "mi", level: 2 },
    { k: "聞", m: "hear", r: "ki", level: 2 },
    { k: "言", m: "say", r: "i", level: 2 },
    { k: "食", m: "eat", r: "ta", level: 2 },
    { k: "飲", m: "drink", r: "no", level: 2 },
    { k: "行", m: "go", r: "i", level: 2 },
    { k: "来", m: "come", r: "ki", level: 2 },
    { k: "出", m: "exit", r: "de", level: 2 },
    { k: "入", m: "enter", r: "i", level: 2 },
    { k: "書", m: "write", r: "ka", level: 3 },
    { k: "読", m: "read", r: "yo", level: 3 },
    { k: "買", m: "buy", r: "ka", level: 3 },
  ],
};

export function getPool(category: string): Kanji[] {
  if (category === "all") return Object.values(KANJI_DB).flat();
  return KANJI_DB[category] ?? Object.values(KANJI_DB).flat();
}

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function pickQuestion(pool: Kanji[]): {
  kanji: Kanji;
  type: "meaning" | "reading";
  answers: string[];
} {
  const kanji = pool[Math.floor(Math.random() * pool.length)];
  const type = Math.random() > 0.5 ? "meaning" : "reading";
  const answers =
    type === "meaning"
      ? kanji.m.split("/").map((s) => s.trim().toLowerCase())
      : [kanji.r.toLowerCase()];
  return { kanji, type, answers };
}

export function checkAnswer(input: string, answers: string[]): boolean {
  return answers.includes(input.trim().toLowerCase());
}
