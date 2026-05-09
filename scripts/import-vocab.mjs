/**
 * KanjiDuel — JLPT Vocabulary Import Script
 * Usage: node scripts/import-vocab.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
const getEnv = (key) => env.match(new RegExp(`${key}=(.+)`))?.[1]?.trim();

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// level number → JLPT string
const LEVEL_MAP = { 5: "N5", 4: "N4", 3: "N3", 2: "N2", 1: "N1" };

async function importVocab() {
  console.log("KanjiDuel — JLPT Vocabulary Import\n");

  // API returns all 8385 words in one call, each with a level field
  console.log("Fetching all words...");
  const res = await fetch("https://jlpt-vocab-api.vercel.app/api/words/all?level=n5");
  const allWords = await res.json();
  console.log(`Got ${allWords.length} words total\n`);

  // Group by level
  const byLevel = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const w of allWords) {
    if (byLevel[w.level]) byLevel[w.level].push(w);
  }

  let total = 0;

  for (const [lvl, words] of Object.entries(byLevel)) {
    const jlpt = LEVEL_MAP[lvl];
    console.log(`Processing ${jlpt}: ${words.length} words...`);

    const rows = words
      .filter(w => w.word && w.furigana && w.meaning)
      .map(w => ({
        word: w.word,
        reading: w.furigana,
        romaji: w.romaji ?? "",
        meaning: w.meaning,
        jlpt,
        level: parseInt(lvl),
        pos: null,
      }));

    // Insert in batches of 500
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from("vocabulary")
        .upsert(batch, { ignoreDuplicates: true });
      if (error) {
        console.warn(`  Batch error: ${error.message}`);
      } else {
        inserted += batch.length;
        process.stdout.write(`\r  ${inserted}/${rows.length} inserted...`);
      }
    }
    console.log(`\n  ${jlpt}: ${inserted} words done`);
    total += inserted;
  }

  console.log(`\nDone! Total: ${total} words in Supabase.`);
}

importVocab().catch(console.error);
