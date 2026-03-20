# YouTube Shorts API (Express + Nodemon + dotenv)

## Setup

```bash
npm install
cp .env.example .env
```

Add your two API keys in `.env`:

```env
YOUTUBE_API_KEY=...
YOUTUBE_TWO_API_KEY=...
REFRESH_ON_START=true
```

## Run (dev)

```bash
npm run dev
```

Server will start at `http://localhost:3000`.

On startup, the server fetches top 30 trending shorts for:

- GLOBAL
- IN
- KR
- BR
- AE

and writes them to `cache/<COUNTRY>.json`.

It also fetches **10 categories × 10 shorts** each and writes:

- `cache/categories/gaming.json`
- `cache/categories/comedy.json`
- `cache/categories/music.json`
- `cache/categories/food.json`
- `cache/categories/fitness.json`
- `cache/categories/tech.json`
- `cache/categories/beauty.json`
- `cache/categories/travel.json`
- `cache/categories/education.json`
- `cache/categories/sports.json`

Each cached video is stored in a readable shape:

- `videoUrl` — `https://www.youtube.com/watch?v=...`
- `thumbnail` — single image URL (best available: high → medium → default)
- `videoId`, `title`, `channelTitle`, `description`, `publishedAt`

**Refresh** a country after this change so JSON files pick up the new fields:  
`POST /youtube/trending/:country/refresh`

## Routes

```bash
curl http://localhost:3000/youtube
curl http://localhost:3000/youtube/trending
curl http://localhost:3000/youtube/trending/IN
curl -X POST http://localhost:3000/youtube/trending/IN/refresh

# Categories (10 shorts per category)
curl http://localhost:3000/youtube/categories
curl http://localhost:3000/youtube/categories/gaming
curl -X POST http://localhost:3000/youtube/categories/gaming/refresh
```

## Jenkins VM Deployment (SCM)

This repo includes a `Jenkinsfile` for deploying to a VM after SCM webhook/poll triggers.

Required Jenkins credentials:

- `VM_SSH_KEY` (SSH Username with private key)
- `VM_HOST` (Secret text, e.g. `10.0.0.25`)
- `VM_USER` (Secret text, e.g. `ubuntu`)
- `YOUTUBE_SHORTS_ENV_FILE` (Secret file containing production `.env`)

Pipeline behavior:

- Checkout via `checkout scm`
- `npm ci` validation on Jenkins agent
- Package app as `release.tar.gz`
- Upload package + `.env` to VM over SSH/SCP
- Extract to `/var/www/youtube-shorts-api`
- Install prod dependencies (`npm ci --omit=dev`)
- Restart app via PM2 (`youtube-shorts-api`)

