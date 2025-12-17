# [Cravemate](https://cravemate-swart.vercel.app/)

Cravemate is a group‑dining chat app that turns “where should we eat?” into a fast, fun decision with **Yelp AI**, **leaderboards**, and **smart invites**.

<div align="center">
<br />
<div>
<a href="https://www.youtube.com/watch?v=gqZvanihfes">
    <img src="https://img.youtube.com/vi/gqZvanihfes/maxresdefault.jpg" alt=" Cravemate - Software Demo" width="480px">
</a>    
</div>
</div>

## What you can do

- **Onboard once**: set location, dietary preferences, favorite cuisines + foods, then play a short “Where would you?” vibe game powered by Yelp content.
- **Get a vibe report**: a one‑liner generated with Gemini that captures your dining personality.
- **Group chat with @yelp**: tag `@yelp` in chat to fetch restaurants, compare options, and answer “which is closer?” follow‑ups using Yelp AI chat sessions.
- **Leaderboards**: create rankings per dish + location, run Elo‑style battles, and share winners to a group chat.
- **Smart invites**: pin a plan to the group with a date+time picker and track who’s in (each member can accept once, and only one invite total).
- **Group profile**: view members, dietary prefs, favorites, and vibe reports in one modal.
- **Location autocomplete**: Mapbox Search Box API across the app (“City, State” format).

## Architecture (high level)

- **Next.js App Router** (`src/app`)
  - UI pages: `/` (landing), `/onboarding`, `/home` (chat), `/leaderboard`
  - API routes: `src/app/api/**` (auth, groups, messages, leaderboards, onboarding, mapbox)
- **Database**: Postgres via **Prisma** (`prisma/schema.prisma`, client at `src/lib/prisma.js`)
- **Auth**: **NextAuth** (Google OAuth + email/password credentials)
- **Realtime**: Socket.IO on a separate always‑on server (`realtime-server/`) + client hook (`src/hooks/useSocket.js`)
- **Integrations**
  - **Yelp AI**: group chat `@yelp` + onboarding review snippets
  - **Gemini** (`@google/genai`): vibe report + aggregator orchestration for @yelp responses
  - **Mapbox Search Box**: location suggest endpoint via `src/app/api/mapbox/suggest/route.js`

## Data flow (end‑to‑end)

### Onboarding → DB
1. User enters preferences step‑by‑step; each “Next” persists step state into the session.
2. Vibe Game:
   - App calls `/api/onboarding/yelp-search` (fetch businesses by cuisine + location).
   - App calls `/api/onboarding/yelp-review` (fetch review snippets for those businesses).
3. Vibe report:
   - App calls `/api/onboarding/vibe-report` (Gemini) using: location, dietary prefs, favorites, and all game options/choices.
4. “Jump into Cravemate”:
   - App calls `/api/user/finish-onboarding` to persist profile fields to `User`.

### Chat + @yelp (realtime + persistence)
1. User sends a message → saved to `Message` in Postgres.
2. Server emits a realtime event to the Socket.IO room for that group.
3. If the message tags `@yelp`:
   - Server calls Yelp AI chat (`/api/groups/[groupId]/yelp`) and stores Yelp’s `chat_id` on `Group.yelpChatId` (first use).
   - Follow‑ups reuse `chat_id` so Yelp keeps conversation memory per group.
   - Gemini “aggregator” can post‑process / orchestrate the response for better group context.

### Leaderboards
1. Leaderboards are keyed by `dishSlug + locationSlug` and loaded by default from the DB.
2. Users create battles; matches write to `LeaderboardMatch`, rankings write to `LeaderboardEntry`.
3. Sharing a business to a group creates a `Message.sharedEntryId` and routes the user to that group chat.

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS**
- **Prisma** + **PostgreSQL**
- **NextAuth** (Google OAuth + Credentials)
- **Socket.IO** (external realtime server for true websockets)
- **Yelp AI & Places API's** (chat + onboarding content + leaderboards)
- **Google Gemini** via `@google/genai`
- **Mapbox Search Box API** (location autocomplete)
- **shadcn/ui** components (e.g., date/time picker)

## Repo layout

- `src/app` — pages + API routes
- `src/components` — UI components
- `src/hooks/useSocket.js` — Socket.IO client connection + group room join
- `src/lib` — Prisma, Gemini aggregator, helpers
- `prisma/schema.prisma` — database schema
- `realtime-server/` — standalone Socket.IO server (deployed to render.com)

## Local setup

### 1) Install dependencies
```bash
pnpm install

# OR

npm install
```

### 2) Configure environment variables
Create `.env.local` (or `.env`) in the repo root:
```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="a-long-random-secret"

# Auth providers
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Yelp (use one of these depending on what you have)
YELP_API_KEY="..."
# YELP_CLIENT_SECRET="..."

# Gemini
GEMINI_API_KEY="..."

# Mapbox
MAPBOX_TOKEN="..."

# Realtime (Render/local Socket.IO server)
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
REALTIME_SOCKET_SECRET="a-long-random-secret"
```

For the realtime server (`realtime-server/`) you’ll also typically set:
```bash
CORS_ORIGIN="http://localhost:3000"
REALTIME_SOCKET_SECRET="the-same-secret-as-above"
```

### 3) Set up the database
```bash
npx prisma generate
```

### 4) Run the app
Terminal A (Next.js):
```bash
pnpm run dev

# OR

npm run dev
```

Terminal B (Socket.IO realtime server):
```bash
cd realtime-server
npm install
npm start
```

Open `http://localhost:3000`.
