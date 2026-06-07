# 🃏 CardStrike — Multiplayer Trick-Taking Card Game

Real-time browser multiplayer card game inspired by Call Break and Judgement.  
**React + FastAPI + WebSockets · Mobile-first · Production-ready**

---

## 🎮 Game Rules

- 2–4 players (empty seats auto-filled with bots)
- **Bid phase 1** (5 cards): minimum bid is 5, each player bids or skips
- **Bid phase 2** (13 cards): can override with a strictly higher bid
- Highest bidder sets the **trump suit**
- Play 13 tricks: must follow lead suit, must play higher if you can
- Illegal move = penalty (lose your bid value), round ends
- **Scoring**: +1 per trick; bidder gets +bid if successful, −bid if failed

---

## ⚡ Local Development

### Prerequisites
- Node.js 18+
- Python 3.10+

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start server (auto-reload)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload --ws-ping-interval 20
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App: http://localhost:5173  
*(Vite proxies /api and /ws to localhost:8000 automatically)*

### Play

1. Open two browser tabs at http://localhost:5173
2. Tab 1 → **Create Room** → enter name, pick rounds → copy the 4-digit PIN
3. Tab 2 → **Join Room** → enter name + PIN
4. Host clicks **Start Game** — bots fill empty seats automatically

---

## 🚀 Production Deployment

### Architecture

```
Browser (game.vercittycreations.xyz)
    │
    ├── HTTPS/WSS ──→ Render (FastAPI backend)
    └── Static      ← Vercel (React frontend)
```

---

### 1 · Backend → Render (free tier)

**Step 1:** Push `backend/` folder to a GitHub repository

**Step 2:** On [render.com](https://render.com):
- New → **Web Service** → Connect GitHub repo
- **Root Directory:** `backend`
- **Runtime:** Python 3
- **Build Command:**
  ```
  pip install -r requirements.txt
  ```
- **Start Command:**
  ```
  uvicorn main:app --host 0.0.0.0 --port $PORT --ws-ping-interval 20 --ws-ping-timeout 30
  ```

**Step 3:** Environment Variables on Render:
```
ENV=production
FRONTEND_URL=https://game.vercittycreations.xyz
DATABASE_URL=sqlite+aiosqlite:///./cardstrike.db
```

**Step 4:** Note your Render URL, e.g.:
```
https://cardstrike-api.onrender.com
```

---

### 2 · Frontend → Vercel

**Step 1:** Push `frontend/` folder to GitHub

**Step 2:** On [vercel.com](https://vercel.com):
- New Project → Import GitHub repo
- **Root Directory:** `frontend`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

**Step 3:** Environment Variables on Vercel:
```
VITE_API_URL=https://cardstrike-api.onrender.com
```

*(The store auto-converts `https→wss` for WebSocket connections)*

**Step 4:** Deploy → note your Vercel URL

---

### 3 · Custom Domain: game.vercittycreations.xyz

**On Vercel:**
1. Project → Settings → Domains → Add `game.vercittycreations.xyz`
2. Vercel shows you a CNAME record to add

**On your DNS provider (Cloudflare recommended):**

| Type  | Name               | Value                        | Proxy |
|-------|--------------------|------------------------------|-------|
| CNAME | game               | `cname.vercel-dns.com`       | DNS only (grey cloud) |

> ⚠️ **Important:** Set Cloudflare proxy to **DNS only** (grey cloud) for the Vercel CNAME. If you orange-cloud it, WebSocket connections will break.

**SSL:** Vercel auto-provisions Let's Encrypt SSL. Wait ~2 minutes after DNS propagates.

**Update Render CORS** after domain is live:
```
FRONTEND_URL=https://game.vercittycreations.xyz
```

---

### 4 · WebSocket Production Config

The frontend store auto-handles this:
```ts
// In gameStore.ts — already configured:
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace('https', 'wss').replace('http', 'ws');
// Result: wss://cardstrike-api.onrender.com/ws/{pin}/{player_id}
```

WSS (secure WebSocket) works automatically over HTTPS with Render.

---

### 5 · Keep-Alive System (Prevent Render Sleep)

Render free tier **sleeps after 15 minutes** of no traffic. Use one of these:

#### Option A: UptimeRobot (recommended, free)

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. **Add New Monitor:**
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `CardStrike API`
   - URL: `https://cardstrike-api.onrender.com/api/ping`
   - Monitoring Interval: **5 minutes**
3. Save → your backend stays awake 24/7

#### Option B: cron-job.org (free alternative)

1. Sign up at [cron-job.org](https://cron-job.org)
2. New Cronjob:
   - URL: `https://cardstrike-api.onrender.com/api/ping`
   - Schedule: Every **5 minutes**
3. Save

The `/api/ping` endpoint returns `"pong"` in <5ms — zero overhead.

---

### 6 · Environment Variables Reference

**Backend (Render):**
```env
ENV=production
FRONTEND_URL=https://game.vercittycreations.xyz
DATABASE_URL=sqlite+aiosqlite:///./cardstrike.db
PORT=10000   # Render sets this automatically
```

**Frontend (Vercel):**
```env
VITE_API_URL=https://cardstrike-api.onrender.com
```

---

## 🏗 Architecture

```
frontend/
├── src/
│   ├── components/game/   # PlayingCard, PlayerHand, TrickArea, BiddingPanel…
│   ├── pages/             # MainMenu, Lobby, GameTable, Settings
│   ├── store/gameStore.ts # Zustand + WebSocket + localStorage session
│   ├── types/game.ts      # TypeScript types
│   └── utils/             # gameUtils, cardAssets
└── public/cards/          # SVG card images (AS.svg, KH.svg…)

backend/
├── app/
│   ├── game/
│   │   ├── engine.py      # Core game logic (strict rules, state machine)
│   │   └── room_manager.py# Room lifecycle, bot scheduling, WS broadcast
│   ├── bots/bot_player.py # AI - 4 difficulty levels, never freezes
│   ├── models/            # Pydantic + SQLAlchemy models
│   ├── routes/            # REST endpoints + /ping keepalive
│   └── websocket/         # WS handler
└── main.py
```

---

## 🃏 SVG Card Assets

The game uses `<img src="/cards/AS.svg">` for HD crisp cards.

**File naming:** `{RANK}{SUIT}.svg`
- Ranks: `A K Q J T 9 8 7 6 5 4 3 2`
- Suits: `S H D C` (Spades Hearts Diamonds Clubs)
- Back: `BACK.svg`

**Examples:** `AS.svg` `KH.svg` `TD.svg` `2C.svg` `BACK.svg`

**Free SVG card decks:**
- https://github.com/htdebeer/SVG-cards (CC0 license, commercial-safe)
- https://www.me.uk/cards/ (free for personal use)

Place your `.svg` files in `frontend/public/cards/`. The app falls back to an inline SVG renderer if images aren't present.

---

## 🔌 WebSocket API

Connect: `wss://your-backend.onrender.com/ws/{pin}/{player_id}`

**Client → Server:**
```json
{ "type": "ping" }
{ "type": "start_game" }
{ "type": "bid", "payload": { "tricks": 7, "suit": "hearts" } }
{ "type": "bid", "payload": { "tricks": 0, "suit": "spades" } }  // skip
{ "type": "play_card", "payload": { "card_idx": 3 } }
{ "type": "new_round" }
{ "type": "kick_player", "payload": { "target_id": "p_abc" } }
{ "type": "request_state" }
```

**Server → Client:**
```json
{ "type": "game_state", "payload": { ...full state... } }
{ "type": "action_result", "payload": { "success": true, "action": "bid", "penalty": false } }
{ "type": "player_connected" | "player_disconnected" | "player_kicked" }
{ "type": "pong" }
```

---

## 🤖 Bot AI

| Difficulty | Behavior |
|---|---|
| 🟢 Easy | Random play, overbids |
| 🟡 Medium | Basic high-card strategy |
| 🔴 Hard | Trump preservation, smart following |
| 💀 Insane | Optimal probability-based |

Bots: auto-delay 0.7–1.5s, fallback on error, cancel-safe scheduling, never deadlock.

---

## 🔧 Troubleshooting

**WebSocket fails in production?**
- Ensure Render URL is `https://` not `http://` in `VITE_API_URL`
- Check Cloudflare is **DNS only** (not proxied) for the CNAME
- Render free tier may be sleeping — add UptimeRobot

**Player list doesn't update in lobby?**
- On connect, server broadcasts full state to all players automatically
- Check browser console for WebSocket errors

**Cards not showing?**
- Add SVG files to `frontend/public/cards/`
- App falls back to inline SVG renderer automatically

**Game freezes with bots?**
- Each room has one bot task (cancel-safe)
- Bot has fallback: skip bid / play first valid card on error
- Check Render logs: `https://dashboard.render.com`

**Refresh disconnects player?**
- Session is saved to `localStorage` automatically
- On page load, store reconnects to `WS` and calls `request_state`
- Works as long as server hasn't restarted (Render free = restarts on sleep)

---

## 📱 Mobile

- Landscape Android Chrome is the primary target
- Cards scale with viewport width (xs/sm/md sizes)
- Touch tap-to-select, tap-again-to-play
- No horizontal scroll overflow
- 60fps target with GPU-accelerated Framer Motion transforms
