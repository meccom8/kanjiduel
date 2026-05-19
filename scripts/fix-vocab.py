#!/usr/bin/env python3
"""
KanjiDuel — Vocabulary Enhancement Script
==========================================
1. Removes hiragana-only words (no kanji in the word field)
2. Adds alternative readings from JMdict-simplified
3. Adds common words beyond JLPT (tagged as jlpt="X" in the DB)

Requirements:
    pip install requests

Usage:
    python scripts/fix-vocab.py

It reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
(uses service role key to bypass RLS for bulk updates).
"""

import os, re, sys, json, gzip, io, time, urllib.request
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
ROOT_DIR   = SCRIPT_DIR.parent
ENV_FILE   = ROOT_DIR / ".env.local"
CACHE_DIR  = SCRIPT_DIR / ".vocab-cache"
JMDICT_URL = "https://github.com/scriptin/jmdict-simplified/releases/download/3.5.0+20240501131000/jmdict-eng-3.5.0+20240501131000.json.tgz"
JMDICT_API  = "https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest"
JMDICT_CACHE = CACHE_DIR / "jmdict-eng.json"

# Beyond-JLPT words: require at least one of these common-word markers
COMMON_MARKERS = {"ichi1", "news1", "spec1", "gai1"}
# Min number of kanji elements to consider (0 = include kana-only common words, 1 = kanji required)
BEYOND_REQUIRE_KANJI = True
BEYOND_MAX_WORDS = 5000

# ── Helpers ────────────────────────────────────────────────────────────────────

def read_env():
    env = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env

def supabase_request(url_base, key, method, path, body=None, params=None):
    """Minimal Supabase REST client (no external package needed)."""
    import urllib.request, urllib.parse
    url = url_base.rstrip("/") + "/rest/v1/" + path.lstrip("/")
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:300]}")
        return []

def fetch_all_vocab(url_base, key):
    """Fetch all vocabulary rows from Supabase (handles 1000-row pagination)."""
    all_rows = []
    offset = 0
    PAGE = 1000
    while True:
        rows = supabase_request(url_base, key, "GET", "vocabulary",
                                params={"select": "id,word,reading,jlpt",
                                        "offset": offset, "limit": PAGE})
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < PAGE:
            break
        offset += PAGE
    return all_rows

def is_kanji(ch):
    cp = ord(ch)
    return (0x4E00 <= cp <= 0x9FFF or   # CJK Unified Ideographs
            0x3400 <= cp <= 0x4DBF or   # CJK Extension A
            0x20000 <= cp <= 0x2A6DF or # CJK Extension B
            0xF900 <= cp <= 0xFAFF)     # CJK Compatibility Ideographs

def has_kanji(s):
    return any(is_kanji(c) for c in s)

def is_hiragana_only(s):
    """True if string contains no kanji and no katakana (pure kana/punct)."""
    return not has_kanji(s)

# ── JMdict download & parse ────────────────────────────────────────────────────

def get_jmdict_url():
    """Fetch the latest jmdict-eng .json.tgz asset URL from GitHub API."""
    try:
        req = urllib.request.Request(JMDICT_API, headers={"User-Agent": "KanjiDuel/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
        for asset in data.get("assets", []):
            name = asset.get("name", "")
            if name.startswith("jmdict-eng") and name.endswith(".json.tgz"):
                url = asset["browser_download_url"]
                print(f"  Latest release: {name}")
                return url
    except Exception as e:
        print(f"  GitHub API failed ({e}), using bundled URL.")
    return JMDICT_URL

def stream_download(url):
    """Download url into a BytesIO buffer, following redirects, with progress."""
    import http.client, urllib.parse
    parsed = urllib.parse.urlparse(url)
    for _ in range(10):  # follow up to 10 redirects
        conn_cls = http.client.HTTPSConnection if parsed.scheme == "https" else http.client.HTTPConnection
        conn = conn_cls(parsed.netloc, timeout=60)
        path = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        conn.request("GET", path, headers={"User-Agent": "KanjiDuel/1.0"})
        resp = conn.getresponse()
        if resp.status in (301, 302, 303, 307, 308):
            location = resp.getheader("Location")
            conn.close()
            parsed = urllib.parse.urlparse(location)
            continue
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status} {resp.reason} for {url}")
        total = int(resp.getheader("Content-Length") or 0)
        buf = io.BytesIO()
        downloaded = 0
        while True:
            chunk = resp.read(65536)
            if not chunk:
                break
            buf.write(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded * 100 // total
                print(f"\r  {pct}% ({downloaded // 1024 // 1024} MB)", end="", flush=True)
        print()
        conn.close()
        buf.seek(0)
        return buf
    raise RuntimeError("Too many redirects")

def download_jmdict():
    if JMDICT_CACHE.exists():
        print(f"JMdict cache found: {JMDICT_CACHE}")
        return
    CACHE_DIR.mkdir(exist_ok=True)

    import tarfile

    print("Looking up latest JMdict-simplified release...")
    url = get_jmdict_url()
    print(f"Downloading (~60 MB)...")
    print(f"  {url}")

    buf = stream_download(url)

    print("Extracting...")
    with tarfile.open(fileobj=buf, mode="r:gz") as tf:
        for member in tf.getmembers():
            if member.name.endswith(".json"):
                f = tf.extractfile(member)
                JMDICT_CACHE.write_bytes(f.read())
                print(f"  Extracted: {member.name} → {JMDICT_CACHE}")
                return
    print("ERROR: no JSON file found in archive.")
    sys.exit(1)

def load_jmdict():
    download_jmdict()
    print(f"Loading JMdict ({JMDICT_CACHE.stat().st_size // 1024 // 1024} MB)...")
    with open(JMDICT_CACHE, encoding="utf-8") as f:
        return json.load(f)

def build_lookup(jmdict_data):
    """
    Returns two dicts:
      kanji_to_readings: { "私": ["わたし", "わたくし"], ... }
      common_words: list of { word, reading, meaning } for beyond-JLPT
    """
    kanji_to_readings = {}
    common_words = []
    existing_kanji = set()  # filled later

    words = jmdict_data.get("words", [])
    print(f"  {len(words):,} JMdict entries")

    for entry in words:
        kanji_forms = [k["text"] for k in entry.get("kanji", []) if k.get("text")]
        kana_forms  = [k["text"] for k in entry.get("kana",  []) if k.get("text")]

        if not kana_forms:
            continue

        # Build kanji → readings map
        for kf in kanji_forms:
            if has_kanji(kf):
                if kf not in kanji_to_readings:
                    kanji_to_readings[kf] = []
                for kr in kana_forms:
                    if kr not in kanji_to_readings[kf]:
                        kanji_to_readings[kf].append(kr)

        # Check for common-word markers (beyond-JLPT candidates)
        # Format 3.6+: "common": true/false on each kanji/kana element
        # Format 3.5-: "priority": ["ichi1", "news1", ...] on each element
        is_common = False
        for k in entry.get("kanji", []):
            if k.get("common") is True:
                is_common = True
                break
            if COMMON_MARKERS & set(k.get("priority", [])):
                is_common = True
                break
        if not is_common:
            for k in entry.get("kana", []):
                if k.get("common") is True:
                    is_common = True
                    break
                if COMMON_MARKERS & set(k.get("priority", [])):
                    is_common = True
                    break

        if is_common and kanji_forms and BEYOND_REQUIRE_KANJI:
            # Get best English meaning
            meanings = []
            for s in entry.get("sense", []):
                for gl in s.get("gloss", []):
                    if isinstance(gl, dict):
                        meanings.append(gl.get("text", ""))
                    elif isinstance(gl, str):
                        meanings.append(gl)
            meaning = "; ".join(meanings[:3]) if meanings else ""
            if meaning:
                common_words.append({
                    "word": kanji_forms[0],
                    "reading": "/".join(kana_forms[:4]),  # up to 4 readings
                    "meaning": meaning,
                })

    return kanji_to_readings, common_words

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("KanjiDuel — Vocabulary Enhancement")
    print("=" * 60)

    # Read env
    if not ENV_FILE.exists():
        print(f"ERROR: {ENV_FILE} not found.")
        sys.exit(1)
    env = read_env()
    url_base = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url_base or not key:
        print("ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local")
        sys.exit(1)
    print(f"Supabase: {url_base}")

    # ── Step 1: Fetch vocabulary ────────────────────────────────────────────────
    print("\n[1/4] Fetching vocabulary from Supabase...")
    vocab = fetch_all_vocab(url_base, key)
    print(f"  {len(vocab):,} words fetched")

    # ── Step 2: Remove hiragana-only words ──────────────────────────────────────
    print("\n[2/4] Finding hiragana-only words...")
    to_delete = [w for w in vocab if is_hiragana_only(w["word"])]
    print(f"  {len(to_delete)} hiragana-only words found")
    if to_delete:
        print("  Examples:", [w["word"] for w in to_delete[:10]])
        confirm = input(f"\n  Delete {len(to_delete)} hiragana-only words? (y/N): ").strip().lower()
        if confirm == "y":
            ids = [w["id"] for w in to_delete]
            BATCH = 100
            deleted = 0
            for i in range(0, len(ids), BATCH):
                batch_ids = ids[i:i+BATCH]
                id_filter = "(" + ",".join(f'"{x}"' for x in batch_ids) + ")"
                supabase_request(url_base, key, "DELETE", "vocabulary",
                                 params={"id": f"in.{id_filter}"})
                deleted += len(batch_ids)
                print(f"\r  Deleted {deleted}/{len(ids)}...", end="", flush=True)
            print(f"\n  ✓ Deleted {deleted} hiragana-only words")
            vocab = [w for w in vocab if not is_hiragana_only(w["word"])]
        else:
            print("  Skipped.")

    # ── Step 3: Load JMdict and fix readings ────────────────────────────────────
    print("\n[3/4] Loading JMdict for alternative readings...")
    jmdict = load_jmdict()
    kanji_to_readings, common_words = build_lookup(jmdict)
    print(f"  {len(kanji_to_readings):,} kanji entries in JMdict")
    print(f"  {len(common_words):,} common beyond-JLPT candidates")

    # Cross-reference existing vocab with JMdict readings
    existing_words = {w["word"] for w in vocab}
    updates = []
    no_match = 0
    already_multi = 0
    for w in vocab:
        jmd_readings = kanji_to_readings.get(w["word"], [])
        if not jmd_readings:
            no_match += 1
            continue
        # Build new reading string: merge existing + JMdict readings (deduplicated)
        existing_readings = [r.strip() for r in w["reading"].split("/") if r.strip()]
        merged = list(existing_readings)
        for r in jmd_readings:
            if r not in merged:
                merged.append(r)
        new_reading = "/".join(merged)
        if new_reading != w["reading"] and len(merged) > len(existing_readings):
            updates.append({"id": w["id"], "reading": new_reading})
        elif len(existing_readings) > 1:
            already_multi += 1

    print(f"  Words with updated readings: {len(updates)}")
    print(f"  Already had multiple readings: {already_multi}")
    print(f"  No JMdict match: {no_match}")

    if updates:
        confirm = input(f"\n  Update {len(updates)} words with alternative readings? (y/N): ").strip().lower()
        if confirm == "y":
            BATCH = 50
            done = 0
            for i in range(0, len(updates), BATCH):
                batch = updates[i:i+BATCH]
                for item in batch:
                    supabase_request(url_base, key, "PATCH", "vocabulary",
                                     body={"reading": item["reading"]},
                                     params={"id": f"eq.{item['id']}"})
                done += len(batch)
                print(f"\r  Updated {done}/{len(updates)}...", end="", flush=True)
                time.sleep(0.05)  # gentle rate limit
            print(f"\n  ✓ Updated {done} words")
        else:
            print("  Skipped.")

    # ── Step 4: Add beyond-JLPT words ──────────────────────────────────────────
    print("\n[4/4] Adding beyond-JLPT common words...")
    # Filter: must have kanji, not already in vocab, not hiragana-only
    new_words = [
        w for w in common_words
        if w["word"] not in existing_words and has_kanji(w["word"])
    ]
    # Deduplicate by word
    seen = set()
    new_unique = []
    for w in new_words:
        if w["word"] not in seen:
            seen.add(w["word"])
            new_unique.append(w)

    new_unique = new_unique[:BEYOND_MAX_WORDS]
    print(f"  {len(new_unique):,} new words to add (jlpt='X', level=0)")

    if new_unique:
        print("  Sample:", [w["word"] for w in new_unique[:15]])
        confirm = input(f"\n  Insert {len(new_unique)} beyond-JLPT words? (y/N): ").strip().lower()
        if confirm == "y":
            rows = [
                {
                    "word": w["word"],
                    "reading": w["reading"],
                    "romaji": "",   # can be generated later
                    "meaning": w["meaning"],
                    "jlpt": "X",
                    "level": 0,
                }
                for w in new_unique
            ]
            BATCH = 200
            inserted = 0
            for i in range(0, len(rows), BATCH):
                batch = rows[i:i+BATCH]
                result = supabase_request(url_base, key, "POST", "vocabulary",
                                          body=batch,
                                          params={"on_conflict": "word"})
                inserted += len(batch)
                print(f"\r  Inserted {inserted}/{len(rows)}...", end="", flush=True)
                time.sleep(0.1)
            print(f"\n  ✓ Inserted {inserted} beyond-JLPT words")
        else:
            print("  Skipped.")

    print("\n" + "=" * 60)
    print("Done! Run the app and test the vocab.")
    print("=" * 60)

if __name__ == "__main__":
    main()
