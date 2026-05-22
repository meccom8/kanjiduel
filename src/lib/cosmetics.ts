export type Rarity = "common" | "rare" | "epic" | "legendary";

// ─── Avatar border styles ────────────────────────────────────────────────────
export interface BorderStyle {
  id: string;
  label: string;
  /** CSS gradient string used for the preview swatch */
  gradient: string;
}

export const BORDER_STYLES: BorderStyle[] = [
  { id: "rainbow", label: "Rainbow", gradient: "conic-gradient(#FF6B9D, #C44FDC, #7B5EA7, #4DB6AC, #FFD700, #FF6B9D)" },
  { id: "sakura",  label: "Sakura",  gradient: "linear-gradient(135deg, #FF6B9D, #C44FDC, #FF85A2)" },
  { id: "gold",    label: "Gold",    gradient: "linear-gradient(135deg, #FFD700, #EF9F27, #B8860B)" },
  { id: "ice",     label: "Ice",     gradient: "linear-gradient(135deg, #00BCD4, #B2EBF2, #4DB6AC)" },
  { id: "fire",    label: "Fire",    gradient: "linear-gradient(135deg, #FF5722, #FF9800, #FFD700)" },
  { id: "neon",    label: "Neon",    gradient: "linear-gradient(135deg, #39FF14, #00FF88, #7FFF00)" },
];

/**
 * Returns CSS classes for the avatar border wrapper div.
 * E.g. "cb cb-rainbow". Empty string = no border.
 */
export function getBorderClass(style?: string | null): string {
  if (!style) return "";
  return `cb cb-${style}`;
}

// ─── Cosmetics Pack accent colors ────────────────────────────────────────────
/** Accent colors unlocked exclusively with the Cosmetics Pack */
export const PACK_ACCENT_COLORS = [
  { name: "✨ Sakura", value: "#FF6B9D" },
  { name: "🍒 Cherry", value: "#E91E63" },
  { name: "⚡ Neon",   value: "#39FF14" },
  { name: "❄️ Ice",    value: "#00BCD4" },
  { name: "🔥 Fire",   value: "#FF5722" },
  { name: "🪸 Coral",  value: "#D85A30" },
  { name: "🌸 Rose",   value: "#C2185B" },
  { name: "🌊 Sky",    value: "#0288D1" },
];

/** Exclusive titles unlocked with the Cosmetics Pack (match the 5 accent colors) */
export const PACK_EXCLUSIVE_TITLES = [
  "✨ Sakura Warrior",
  "🍒 Cherry Ronin",
  "⚡ Neon Samurai",
  "❄️ Ice Scholar",
  "🔥 Fire Sensei",
];

// ─── Badge definitions ───────────────────────────────────────────────────────
export interface BadgeDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  rarity: Rarity;
}

/** One badge per rank — unlocked by reaching minElo */
export const RANK_BADGE_DEFS: (BadgeDef & { minElo: number })[] = [
  { id: "rank_bronze1",  icon: "🥉", name: "Bronze I",       desc: "Reach Bronze I rank",       minElo: 0,    rarity: "common"    },
  { id: "rank_bronze2",  icon: "🥉", name: "Bronze II",      desc: "Reach Bronze II rank",      minElo: 200,  rarity: "common"    },
  { id: "rank_silver1",  icon: "🥈", name: "Silver I",       desc: "Reach Silver I rank",       minElo: 400,  rarity: "common"    },
  { id: "rank_silver2",  icon: "🥈", name: "Silver II",      desc: "Reach Silver II rank",      minElo: 600,  rarity: "common"    },
  { id: "rank_gold1",    icon: "🥇", name: "Gold I",         desc: "Reach Gold I rank",         minElo: 800,  rarity: "rare"      },
  { id: "rank_gold2",    icon: "🥇", name: "Gold II",        desc: "Reach Gold II rank",        minElo: 1000, rarity: "rare"      },
  { id: "rank_plat1",    icon: "💠", name: "Platinum I",     desc: "Reach Platinum I rank",     minElo: 1200, rarity: "epic"      },
  { id: "rank_plat2",    icon: "💠", name: "Platinum II",    desc: "Reach Platinum II rank",    minElo: 1400, rarity: "epic"      },
  { id: "rank_diamond",  icon: "💎", name: "Diamond",        desc: "Reach Diamond rank",        minElo: 1600, rarity: "epic"      },
  { id: "rank_champion", icon: "👑", name: "Champion",       desc: "Reach Champion rank",       minElo: 1800, rarity: "legendary" },
  { id: "rank_gc",       icon: "🏆", name: "Grand Champion", desc: "Reach Grand Champion rank", minElo: 2000, rarity: "legendary" },
];

/** Special badges — unlocked by owning items */
export const SPECIAL_BADGE_DEFS: BadgeDef[] = [
  { id: "cosmetics_pack", icon: "✨", name: "Cosmetics Pack", desc: "Own the Cosmetics Pack",   rarity: "epic"      },
  { id: "kanjidual_pro",  icon: "✦",  name: "KanjiDual Pro",  desc: "KanjiDual Pro subscriber", rarity: "legendary" },
];

/** Return the icon emoji for any badge ID (used in duel/match display) */
export function getBadgeIcon(id: string): string {
  const map: Record<string, string> = {
    // Rank
    rank_bronze1: "🥉", rank_bronze2: "🥉",
    rank_silver1: "🥈", rank_silver2: "🥈",
    rank_gold1: "🥇",   rank_gold2: "🥇",
    rank_plat1: "💠",   rank_plat2: "💠",
    rank_diamond: "💎", rank_champion: "👑", rank_gc: "🏆",
    // Special
    cosmetics_pack: "✨", "kanjidual_pro": "✦",
    // Core achievements
    first_win: "⚔️",  wins_10: "🏅",   wins_50: "🥇",  wins_100: "👑",
    streak_3: "🔥",   streak_7: "🌋",  streak_15: "☄️",
    elo_1000: "🥈",   elo_1600: "💎",  elo_2000: "🏆",
    kanji_100: "📖",  kanji_500: "📚", kanji_1000: "🎓",
    accuracy_80: "🎯", n1_master: "🗾", winrate_60: "📈",
    games_50: "🎮",   games_200: "🕹️",
  };
  return map[id] ?? "🏅";
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common:    "rgba(255,255,255,0.15)",
  rare:      "#4DB6AC",
  epic:      "#E86440",
  legendary: "#EF9F27",
};
