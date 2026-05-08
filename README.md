# KanjiDuel 漢

Real-time kanji duels with a ranked ELO system. Built with Next.js 14 + Supabase.

---

## How it works

Two players are matched in real-time. Both see the same kanji simultaneously. The first to type the correct meaning or reading wins the round. Win the majority of rounds to gain ELO and climb the ladder from Bronze to Grand Champion.

---

## Setup (step by step)

### Step 1 — Create your Supabase project (free)

1. Go to https://supabase.com and create an account
2. Click "New project" → give it a name (e.g. "kanjiduel") → pick a region close to you → create
3. Wait ~1 minute for the project to spin up

### Step 2 — Set up the database

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Copy the entire contents of `supabase-schema.sql`
3. Paste it in the editor and click **Run**
4. You should see "Success" — this creates all tables and policies

### Step 3 — Enable Realtime

1. Go to **Database** → **Replication** in the sidebar
2. Make sure the `rooms` table has realtime enabled
3. (The SQL schema already does this, but double-check)

### Step 4 — Get your API keys

1. Go to **Settings** → **API** in your Supabase project
2. Copy your **Project URL** and **anon public** key

### Step 5 — Configure the app

```bash
# In the project folder
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
```

### Step 6 — Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — create two accounts in two different browser windows to test the duel.

### Step 7 — Deploy to Vercel (free)

1. Push your code to a GitHub repo
2. Go to https://vercel.com → "New Project" → import your repo
3. Add your two environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
4. Click Deploy

Your site will be live at `https://kanjiduel.vercel.app` (or your own domain).

---

## Project structure

```
src/
  app/
    page.tsx              ← Homepage / lobby
    login/page.tsx        ← Sign in
    register/page.tsx     ← Create account
    matchmaking/page.tsx  ← Find opponent
    duel/[id]/page.tsx    ← The actual duel (real-time)
    leaderboard/page.tsx  ← Rankings
  lib/
    supabase.ts           ← Supabase client
    kanji.ts              ← Kanji database (80+ kanji, 6 categories)
    elo.ts                ← ELO calculation + rank tiers
  app/globals.css         ← Dark theme styles
supabase-schema.sql       ← Database setup (run once)
```

---

## Rank system

| Tier | ELO |
|------|-----|
| Bronze I | 0 |
| Bronze II | 200 |
| Silver I | 400 |
| Silver II | 600 |
| Gold I | 800 |
| Gold II | 1000 |
| Platinum I | 1200 |
| Platinum II | 1400 |
| Diamond | 1600 |
| Champion | 1800 |
| Grand Champion | 2000+ |

All new players start at 500 ELO (Silver I).

---

## What's next (roadmap ideas)

- [ ] Friend system + private room invites
- [ ] Spectator mode
- [ ] JLPT N4/N3/N2 kanji packs (premium feature)
- [ ] Daily challenge (everyone gets the same kanji)
- [ ] Season resets (like Rocket League)
- [ ] Stripe integration for premium tiers
- [ ] Mobile app (React Native)
