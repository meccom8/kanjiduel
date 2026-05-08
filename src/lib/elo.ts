export interface Tier {
  name: string;
  color: string;
  bg: string;
  min: number;
}

export const TIERS: Tier[] = [
  { name: "Bronze I",      min: 0,    color: "#8D6E63", bg: "#EFEBE9" },
  { name: "Bronze II",     min: 200,  color: "#8D6E63", bg: "#EFEBE9" },
  { name: "Silver I",      min: 400,  color: "#757575", bg: "#F5F5F5" },
  { name: "Silver II",     min: 600,  color: "#757575", bg: "#F5F5F5" },
  { name: "Gold I",        min: 800,  color: "#B8860B", bg: "#FFFDE7" },
  { name: "Gold II",       min: 1000, color: "#B8860B", bg: "#FFFDE7" },
  { name: "Platinum I",    min: 1200, color: "#4DB6AC", bg: "#E0F2F1" },
  { name: "Platinum II",   min: 1400, color: "#4DB6AC", bg: "#E0F2F1" },
  { name: "Diamond",       min: 1600, color: "#5C6BC0", bg: "#E8EAF6" },
  { name: "Champion",      min: 1800, color: "#7B1FA2", bg: "#F3E5F5" },
  { name: "Grand Champion",min: 2000, color: "#C62828", bg: "#FFEBEE" },
];

export function getTier(elo: number): Tier {
  return [...TIERS].reverse().find((t) => elo >= t.min) ?? TIERS[0];
}

export function calcELO(
  winnerElo: number,
  loserElo: number,
  K = 40
): { winnerDelta: number; loserDelta: number } {
  const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const winnerDelta = Math.round(K * (1 - expected));
  const loserDelta = Math.round(K * (0 - expected));
  return { winnerDelta, loserDelta };
}

export function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}
