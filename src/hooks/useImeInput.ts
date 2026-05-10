"use client";
import { useState, useCallback, useRef } from "react";
import { toHiragana } from "@/lib/romaji";

/**
 * WaniKani-style romaji→hiragana IME hook.
 *
 * Keeps a raw romaji buffer internally and derives the displayed
 * hiragana from it on every render. This avoids the "n→ん before vowel"
 * bug that occurs when you store the converted value and re-convert it.
 *
 * Usage:
 *   const ime = useImeInput(hiraganaMode);
 *
 *   <input value={ime.displayed} onChange={ime.onChange} />
 *
 *   // In submitAnswer, use ime.value (the string to check against the answer)
 *   // In loadRound / reset, call ime.reset()
 */
export function useImeInput(hiraganaMode: boolean) {
  // rawRef holds the romaji buffer. We use a ref so reads in callbacks
  // are always fresh, and a state mirror to trigger re-renders.
  const rawRef = useRef("");
  const [, forceRender] = useState(0);

  const displayed = hiraganaMode ? toHiragana(rawRef.current) : rawRef.current;
  // value = what we pass to checkVocabAnswer (always the converted form if IME on)
  const value = displayed;

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;

    if (!hiraganaMode) {
      rawRef.current = newVal;
      forceRender(n => n + 1);
      return;
    }

    // Compute what the input currently shows
    const prevDisplayed = toHiragana(rawRef.current);

    if (newVal.length > prevDisplayed.length) {
      // Characters added — they're appended after the previous displayed value
      const added = newVal.slice(prevDisplayed.length);
      if (/^[a-zA-Z']+$/.test(added)) {
        // Pure romaji — append to raw buffer
        rawRef.current = rawRef.current + added;
      } else {
        // User typed/pasted kana directly — store as-is
        rawRef.current = newVal;
      }
    } else if (newVal.length < prevDisplayed.length) {
      // Characters deleted — trim raw buffer until displayed fits
      let trimmed = rawRef.current;
      while (trimmed.length > 0 && toHiragana(trimmed).length > newVal.length) {
        trimmed = trimmed.slice(0, -1);
      }
      rawRef.current = trimmed;
    }

    forceRender(n => n + 1);
  }, [hiraganaMode]);

  const reset = useCallback(() => {
    rawRef.current = "";
    forceRender(n => n + 1);
  }, []);

  return { displayed, value, onChange, reset };
}
