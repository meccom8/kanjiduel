import { createClient } from "./supabase";

// ── Streak ──────────────────────────────────────────────
export async function updateStreak(userId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: profile } = await supabase
    .from("profiles")
    .select("streak, best_streak, last_played_at")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const last = profile.last_played_at;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = profile.streak;

  if (last === today) {
    // Already played today — no change
    return;
  } else if (last === yesterdayStr) {
    // Played yesterday — continue streak
    newStreak = profile.streak + 1;
  } else {
    // Missed a day — reset
    newStreak = 1;
  }

  const newBest = Math.max(newStreak, profile.best_streak ?? 0);

  await supabase
    .from("profiles")
    .update({
      streak: newStreak,
      best_streak: newBest,
      last_played_at: today,
    })
    .eq("id", userId);
}

// ── Kanji Stats ──────────────────────────────────────────
export async function recordKanjiResult(
  userId: string,
  kanji: string,
  jlpt: string,
  correct: boolean
) {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("kanji_stats")
    .select("id, correct, wrong")
    .eq("user_id", userId)
    .eq("kanji", kanji)
    .single();

  if (existing) {
    await supabase
      .from("kanji_stats")
      .update({
        correct: existing.correct + (correct ? 1 : 0),
        wrong: existing.wrong + (correct ? 0 : 1),
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("kanji_stats").insert({
      user_id: userId,
      kanji,
      jlpt,
      correct: correct ? 1 : 0,
      wrong: correct ? 0 : 1,
    });
  }
}

// ── Daily Challenge ──────────────────────────────────────
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getDailyKanji(allKanji: string[], date: string): string[] {
  // Deterministic shuffle based on date — same for everyone
  const seed = date.replace(/-/g, "");
  let hash = parseInt(seed) % 999983;
  const shuffled = [...allKanji];
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) % 2147483648;
    const j = hash % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 10);
}
