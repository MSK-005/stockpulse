# StockPulse — US Stock Market Analytics

A full-stack stock market analytics system built with **React + Vite** (frontend) and **Node.js + Express** (backend), powered by **Supabase PostgreSQL** and the **Twelve Data API**.

**Team:** Abdullah Khan, M. Abdullah, Moazzam Shahzad  
**University:** FAST-NU, Lahore — Spring 2026

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL via Supabase |
| Auth | JWT via HttpOnly cookies |
| Data | Twelve Data API |
| Hosting | Vercel (frontend) + Railway (backend) |

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free)
- A [Twelve Data](https://twelvedata.com) account (free)
- A [Railway](https://railway.app) account (free tier)
- A [Vercel](https://vercel.com) account (free)

---

## 1. Database Setup (Supabase)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name, strong password, and region closest to you
3. Once created, go to **SQL Editor** → paste the contents of `backend/queries/schema.sql` → Run
4. Go to **Settings → Database** → Copy the **Connection String (URI)**
   - Replace `[YOUR-PASSWORD]` with your DB password
   - It looks like: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

---

## 2. Twelve Data API Key

1. Sign up at [twelvedata.com](https://twelvedata.com)
2. Go to your dashboard → API Keys → copy your key
3. Free tier: **800 calls/day**, **8 calls/minute**

---

## 3. Local Development Setup

### Clone and install
```bash
git clone https://github.com/yourteam/stockpulse.git
cd stockpulse
npm install         # installs all workspaces
```

### Backend environment
```bash
cd backend
cp .env.example .env
# Fill in:
#   DATABASE_URL=postgresql://...
#   JWT_SECRET=generate a 64+ char random string
#   TWELVE_DATA_API_KEY=your key
#   CLIENT_URL=http://localhost:5173
#   SMTP_* vars (use Mailtrap for dev)
```

### Frontend environment
```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000
```

### Seed the database (insert sectors + stocks)
```bash
cd backend
npm run seed
# Completes in seconds. Inserts 11 sectors + ~150 S&P 500 stocks.
```

### Ingest historical data
```bash
npm run ingest
# ⚠️ This takes HOURS. Run it overnight.
# It is resumable — safe to Ctrl+C and restart.
# Fetches 10 years of OHLCV + technicals + fundamentals for every stock.
# Free tier: ~7 API calls per stock. With rate limiting, expect 6-8 hours for full run.
```

### Run locally
```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev

# Open http://localhost:5173
```

---

## 4. Deployment

### Backend → Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the **backend** folder as root directory
4. Add all environment variables from `.env.example` in Railway's Variables tab:
   - `DATABASE_URL` → your Supabase connection string
   - `JWT_SECRET` → same secret as local
   - `TWELVE_DATA_API_KEY` → your key
   - `CLIENT_URL` → your Vercel frontend URL (set after deploying frontend)
   - `NODE_ENV=production`
   - All SMTP vars
5. Railway auto-detects Node.js and uses `Procfile`
6. Copy your Railway URL (e.g. `https://stockpulse-backend.up.railway.app`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - `VITE_API_URL` → your Railway backend URL
4. Deploy
5. Copy your Vercel URL → go back to Railway and update `CLIENT_URL` with it

### Post-deployment
- Run seed + ingest pointed at your production Supabase DB (it uses the same `DATABASE_URL`)
- The daily cron job runs automatically in production at 23:00 UTC (Mon-Fri)

---

## 5. How It Works

### Authentication
- JWT issued as **HttpOnly cookie** — safe from XSS
- Cookie is `secure: true`, `sameSite: 'none'` in production (cross-origin Vercel → Railway)
- Auth middleware reads cookie server-side on every protected route

### Data Pipeline
1. **Seed**: inserts sectors and stocks (no prices)
2. **Ingest**: for each stock, fetches from Twelve Data:
   - 10 years of daily OHLCV (via `/time_series`)
   - Latest price snapshot (via `/quote`)
   - Technical indicators: RSI, MACD, Stoch, Bollinger, ADX, SMAs
   - Fundamentals: PE, EPS, margins, ROE, debt ratios
3. **Daily cron**: updates the latest price bar and snapshot for every stock each evening

### Similar Stocks Algorithm
- Computes **Pearson correlation** on normalized daily returns (last 252 trading days)
- Requires minimum 30 overlapping days
- Adds **+0.1 sector bonus** if the stocks share the same GICS sector
- Final score capped at 1.0
- Returns top 6 most similar by score

### Rate Limiting
- Global: 100 req / 15 min per IP
- Auth routes: 10 req / 15 min per IP
- Twelve Data: 8 sec delay between calls in ingestion scripts

---

## 6. Project Structure

```
stockpulse/
├── backend/
│   ├── app.js                  # Express app entry
│   ├── config/db.js            # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js             # JWT cookie verification
│   │   └── validate.js         # Zod request validation
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── stockController.js
│   │   └── watchlistController.js
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── stockRoutes.js
│   │   └── watchlistRoutes.js
│   ├── services/
│   │   ├── twelveData.js       # Twelve Data API client
│   │   └── scheduler.js        # Daily cron job
│   ├── scripts/
│   │   ├── seed.js             # Insert sectors + stocks
│   │   └── ingest.js           # Historical data ingestion
│   └── queries/schema.sql      # Full PostgreSQL schema + views
│
└── frontend/
    ├── src/
    │   ├── main.jsx            # App entry, routes
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── ThemeContext.jsx
    │   ├── hooks/useData.js    # All data-fetching hooks
    │   ├── lib/
    │   │   ├── api.js          # Axios instance
    │   │   └── format.js       # Number formatters
    │   ├── components/layout/
    │   │   ├── Navbar.jsx
    │   │   └── ProtectedRoute.jsx
    │   └── pages/
    │       ├── DashboardPage.jsx
    │       ├── StockDetailPage.jsx
    │       ├── StocksListPage.jsx
    │       ├── WatchlistPage.jsx
    │       ├── ProfilePage.jsx
    │       ├── LoginPage.jsx
    │       ├── RegisterPage.jsx
    │       └── PasswordPages.jsx
    └── vercel.json
```

---

## 7. API Endpoints

### Auth (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Create account |
| POST | `/api/users/login` | Login (sets cookie) |
| POST | `/api/users/logout` | Logout (clears cookie) |
| POST | `/api/users/forgot-password` | Send reset email |
| POST | `/api/users/reset-password` | Reset with token |

### Users (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get own profile |
| PUT | `/api/users/:id` | Update profile |
| DELETE | `/api/users/:id` | Delete account |

### Stocks (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stocks` | List all stocks |
| GET | `/api/stocks/search?q=` | Search stocks |
| GET | `/api/stocks/market/movers` | Gainers / losers / volume |
| GET | `/api/stocks/market/sectors` | Sector performance |
| GET | `/api/stocks/:symbol` | Stock detail + snapshot |
| GET | `/api/stocks/:symbol/history` | OHLCV history |
| GET | `/api/stocks/:symbol/fundamentals` | PE, EPS, margins |
| GET | `/api/stocks/:symbol/technicals` | RSI, MACD, SMAs |
| GET | `/api/stocks/:symbol/similar` | Similar stocks |

### Watchlist (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watchlist` | Get user's watchlist |
| POST | `/api/watchlist` | Add stock |
| PUT | `/api/watchlist/:id` | Update notes/alert |
| DELETE | `/api/watchlist/:id` | Remove stock |

---

## 8. Common Issues

**"Cannot connect to database"**  
→ Check your `DATABASE_URL` in `.env`. Supabase requires `?sslmode=require` or set `ssl: { rejectUnauthorized: false }` in pg config (already done).

**Ingestion stops midway**  
→ Safe to restart. The script skips stocks with recent data. Just re-run `npm run ingest`.

**CORS errors in browser**  
→ Ensure `CLIENT_URL` in Railway matches your exact Vercel URL (including `https://`).

**Cookie not sent in production**  
→ Both `secure: true` and `sameSite: 'none'` must be set for cross-origin cookies. Verify `NODE_ENV=production` is set on Railway.

**Twelve Data rate limit hit**  
→ The scripts have 8-second delays built in. If you see 429 errors, increase `RATE_LIMIT_DELAY_MS` in `services/twelveData.js`.
