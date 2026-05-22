"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

interface Word {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  jlpt: string;
  level: number;
}

const JLPT_COLORS: Record<string, string> = {
  N5: "#1D9E75", N4: "#4DB6AC", N3: "#B8860B", N2: "#D85A30", N1: "#C62828", X: "#9C27B0",
};

const LEVELS = ["all", "N5", "N4", "N3", "N2", "N1", "X"] as const;
type Level = typeof LEVELS[number];

const PAGE_SIZE = 50;

export default function Dictionary() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Level>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      let query = supabase
        .from("vocabulary")
        .select("id, word, reading, romaji, meaning, jlpt, level", { count: "exact" })
        .order("level", { ascending: true })
        .order("word", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (filter !== "all") query = query.eq("jlpt", filter);

      if (search.trim()) {
        // Search in word, reading, romaji, meaning
        query = query.or(
          `word.ilike.%${search}%,reading.ilike.%${search}%,romaji.ilike.%${search}%,meaning.ilike.%${search}%`
        );
      }

      const { data, count } = await query;
      setWords(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    })();
  }, [search, filter, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main className="min-h-screen px-4 py-10 relative z-10 max-w-5xl mx-auto">
      {/* Header */}
      <Link href="/" className="text-sm text-white/30 hover:text-white/60 mb-6 inline-block transition-colors">← Home</Link>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Dictionary</h1>
          <p className="text-white/40 text-sm">{total.toLocaleString()} words · N5 → N1 + No JLPT</p>
        </div>
        <Link href="/practice">
          <button className="btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: 14 }}>
            📖 Practice
          </button>
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          className="input-field flex-1"
          placeholder="Search by kanji, reading, romaji or meaning..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          {LEVELS.map(l => (
            <button key={l} onClick={() => setFilter(l)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filter === l
                  ? l === "all" ? "#CF452033" : JLPT_COLORS[l] + "33"
                  : "#1a1410",
                border: filter === l
                  ? `1px solid ${l === "all" ? "#CF4520" : JLPT_COLORS[l]}`
                  : "1px solid rgba(255,255,255,0.1)",
                color: filter === l
                  ? l === "all" ? "#E86440" : JLPT_COLORS[l]
                  : "rgba(255,255,255,0.4)",
              }}>
              {l === "all" ? "All" : l === "X" ? "No JLPT" : l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-solid overflow-hidden mb-4">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-white/5 text-xs text-white/30 uppercase tracking-widest">
          <div className="col-span-2">Word</div>
          <div className="col-span-2">Reading</div>
          <div className="col-span-2">Romaji</div>
          <div className="col-span-4">Meaning</div>
          <div className="col-span-1">JLPT</div>
          <div className="col-span-1 text-right">Links</div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-white/30">
            <div className="font-jp text-3xl text-accent2 animate-pulse mb-2">漢</div>
            Loading...
          </div>
        ) : words.length === 0 ? (
          <div className="py-16 text-center text-white/30">No words found</div>
        ) : (
          words.map((w, i) => (
            <div key={w.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors items-center">
              {/* Word */}
              <div className="col-span-2">
                <span className="font-jp text-xl text-white">{w.word}</span>
              </div>

              {/* Reading */}
              <div className="col-span-2">
                <span className="font-jp text-sm text-white/70">{w.reading}</span>
              </div>

              {/* Romaji */}
              <div className="col-span-2">
                <span className="font-mono text-sm text-white/50">{w.romaji}</span>
              </div>

              {/* Meaning */}
              <div className="col-span-4">
                <span className="text-sm text-white/70 line-clamp-2">{w.meaning}</span>
              </div>

              {/* JLPT */}
              <div className="col-span-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: JLPT_COLORS[w.jlpt] + "22", color: JLPT_COLORS[w.jlpt] }}>
                  {w.jlpt === "X" ? "No JLPT" : w.jlpt}
                </span>
              </div>

              {/* Links */}
              <div className="col-span-1 flex justify-end gap-2">
                <a href={`https://jisho.org/search/${encodeURIComponent(w.word)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-white/20 hover:text-accent2 transition-colors"
                  title="Jisho.org">辞</a>
                <a href={`https://www.wanikani.com/search?query=${encodeURIComponent(w.word)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-white/20 hover:text-yellow-400 transition-colors"
                  title="WaniKani">WK</a>
                <a href={`https://bunpro.jp/fr/search?query=${encodeURIComponent(w.word)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-white/20 hover:text-purple-400 transition-colors"
                  title="Bunpro">BP</a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/30">
            Page {page} of {totalPages} · {total.toLocaleString()} words
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: "#1a1410",
                border: "1px solid rgba(255,255,255,0.1)",
                color: page === 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
                cursor: page === 1 ? "not-allowed" : "pointer",
              }}>
              ← Prev
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    background: page === p ? "#CF4520" : "#1a1410",
                    border: page === p ? "1px solid #CF4520" : "1px solid rgba(255,255,255,0.1)",
                    color: page === p ? "#fff" : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                  }}>
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: "#1a1410",
                border: "1px solid rgba(255,255,255,0.1)",
                color: page === totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
                cursor: page === totalPages ? "not-allowed" : "pointer",
              }}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Source note */}
      <p className="text-center text-xs text-white/15 mt-8">
        Data source:{" "}
        <a href="https://jlpt-vocab-api.vercel.app" target="_blank" rel="noopener noreferrer"
          className="hover:text-white/40 transition-colors underline">
          jlpt-vocab-api
        </a>
        {" · "}
        <a href="https://jisho.org" target="_blank" rel="noopener noreferrer"
          className="hover:text-white/40 transition-colors underline">
          Jisho.org
        </a>
        {" · "}
        <a href="https://www.wanikani.com" target="_blank" rel="noopener noreferrer"
          className="hover:text-white/40 transition-colors underline">
          WaniKani
        </a>
        {" · "}
        <a href="https://bunpro.jp" target="_blank" rel="noopener noreferrer"
          className="hover:text-white/40 transition-colors underline">
          Bunpro
        </a>
      </p>
    </main>
  );
}
