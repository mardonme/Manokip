# Deployment — Backend (Render) + Frontend (Vercel)

This project has two deployables:

- `server/` — Express + Prisma API → **Render** (Web Service + Postgres)
- `site/`   — Vite + React SPA   → **Vercel**

---

## 0. Before you start

1. Push the repo to GitHub (Render and Vercel both pull from it).
2. Make sure `server/.env` is **not** committed (it's gitignored).
3. The Prisma schema is now PostgreSQL. The old SQLite dev DB
   (`server/prisma/dev.db`) is unused in production — you can leave it locally.

---

## 1. Backend on Render

### 1a. Create the database

1. Render dashboard → **New +** → **PostgreSQL**.
2. Name: `manokip-db`. Free plan is fine to start.
3. Once created, copy the **Internal Database URL** (starts with `postgresql://`).
   - Use *Internal* URL if the web service is in the same region.
   - Use *External* URL only for local connections from your machine.

### 1b. Create the web service

1. Render dashboard → **New +** → **Web Service** → connect the GitHub repo.
2. Settings:
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
     (`build` runs `prisma generate && prisma db push` — this creates the
     tables on the Postgres database the first time it runs.)
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or Starter for always-on)
3. **Environment variables** (Settings → Environment):

   | Key              | Value                                                    |
   |------------------|----------------------------------------------------------|
   | `DATABASE_URL`   | *Internal Database URL from step 1a*                     |
   | `JWT_SECRET`     | long random string — run `openssl rand -hex 64`          |
   | `JWT_EXPIRES_IN` | `7d`                                                     |
   | `CORS_ORIGIN`    | your Vercel URL, e.g. `https://manokip.vercel.app`       |
   | `ADMIN_EMAIL`    | `admin@yourdomain.com`                                   |
   | `ADMIN_PASSWORD` | a strong password                                        |
   | `NODE_ENV`       | `production`                                             |

   Do **not** set `PORT` — Render injects it.

4. **Deploy**. Wait for the first build to finish. Check the logs for
   `[manokip-server] listening on http://localhost:PORT`.

5. Verify: open `https://<your-service>.onrender.com/api/health` →
   should return `{"ok":true,"time":"..."}`.

### 1c. Seed the database (one-time)

The build creates empty tables. To populate categories/products + admin user:

- Render dashboard → your service → **Shell** → run:
  ```
  npm run seed
  ```

Or run it locally once, pointed at the *External* DATABASE_URL:
```
cd server
DATABASE_URL="postgresql://..." npm run seed
```

---

## 2. Frontend on Vercel

### 2a. Import the project

1. Vercel dashboard → **Add New** → **Project** → import the GitHub repo.
2. Settings:
   - **Root Directory**: `site`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
3. **Environment variables** (Settings → Environment Variables):

   | Key            | Value                                          |
   |----------------|------------------------------------------------|
   | `VITE_API_URL` | `https://<your-render-service>.onrender.com`   |

   No trailing slash. This must be set **before** the first build —
   Vite bakes env vars into the bundle at build time.

4. **Deploy**.

5. Once deployed, **copy your Vercel URL** and go back to Render →
   update the server's `CORS_ORIGIN` to match (e.g.
   `https://manokip.vercel.app`). Redeploy the server (or just save the env var —
   Render restarts automatically).

### 2b. SPA routing

`site/vercel.json` already rewrites all paths to `/` so React Router
handles them. No action needed.

### 2c. Custom domain (optional)

- Vercel: Project → **Settings** → **Domains** → add your domain. Vercel
  prints the DNS records to add at your registrar.
- After the custom domain is live, **add it to `CORS_ORIGIN`** on Render
  as a comma-separated list:
  `CORS_ORIGIN=https://manokip.vercel.app,https://www.your-domain.com`

---

## 3. Local development (still works)

```
# Terminal 1 — server
cd server
cp .env.example .env       # then edit DATABASE_URL etc.
npm install
npm run seed               # one-time
npm run dev                # http://localhost:4000

# Terminal 2 — site
cd site
npm install
npm run dev                # http://localhost:5173 (proxies /api → 4000)
```

For local dev, leave `VITE_API_URL` empty — the Vite dev server proxies
`/api` to `http://localhost:4000`.

For local development against Postgres instead of SQLite, the easiest
options are Docker (`docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres
postgres:16`) or a free hosted DB (Neon, Supabase).

---

## 4. Frontend env vars summary

Only one:

```
VITE_API_URL=https://<your-render-service>.onrender.com
```

That's it. Everything else (auth token, language, cart cookie) is handled
in-browser.

---

## 5. Troubleshooting

- **CORS errors in the browser console**: `CORS_ORIGIN` on Render does
  not exactly match the frontend origin. Must include scheme, no trailing
  slash, and every domain the site is served from.
- **Cookies not being set / cart resets every request**: this happens
  when the browser blocks the cross-site cookie. Make sure the API
  service is HTTPS (Render gives you HTTPS by default) and `NODE_ENV` is
  `production` on Render — that flips the cookie to `SameSite=None; Secure`.
- **`prisma db push` fails on Render**: most often `DATABASE_URL` is
  wrong. Open the Render Shell and run `node -e "console.log(process.env.DATABASE_URL)"`
  to confirm the value, then `npx prisma db push` manually to see the
  exact error.
- **Render free tier sleeps after 15 min of no traffic**: first request
  takes ~30s to wake. Upgrade to Starter ($7/mo) to keep it warm.
- **Seed says "no products"**: the seed script reads
  `site/src/data/products.js` via a relative path — that path doesn't
  exist on Render. Run the seed from your **local machine** pointed at
  the production DB (see step 1c).
