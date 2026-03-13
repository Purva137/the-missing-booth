# SnapTogether — Deployment Guide

## Overview

| Component | Service | Cost |
|-----------|---------|------|
| Frontend  | GitHub Pages (free) | $0 |
| Backend   | Render.com Web Service | $7–$25/mo |
| Redis     | Render.com Redis | $7/mo |
| File Storage | AWS S3 + CloudFront | ~$1–5/mo |
| GPU Inference | RunPod Serverless | Pay-per-run ~$0.20–$0.80/image |

---

## Step 1: Set Up AWS S3 (File Storage)

1. Create S3 bucket: `snaptogether-uploads`
2. Set bucket to public (or use CloudFront)
3. Create IAM user with S3 permissions
4. Save Access Key ID + Secret Access Key
5. (Optional) Create a CloudFront distribution pointing to the bucket

---

## Step 2: Deploy Redis on Render

1. Go to https://render.com → New → Redis
2. Choose region closest to your backend
3. Free tier is fine for development; use Starter ($7/mo) for prod
4. Save the **Internal Redis URL** (e.g., `redis://red-xxxx:6379`)

---

## Step 3: Deploy RunPod GPU Worker

### 3a. Build and push Docker image

```bash
cd backend

# Build the GPU worker image
docker build -f Dockerfile -t yourdockerhub/snaptogether-worker:latest .
docker push yourdockerhub/snaptogether-worker:latest
```

### 3b. Create RunPod Serverless Endpoint

1. Go to https://runpod.io → Serverless → New Endpoint
2. **Container Image**: `yourdockerhub/snaptogether-worker:latest`
3. **GPU**: RTX 4090 or A100 (recommended for SDXL)
4. **Container Disk**: 40GB+ (for model weights)
5. **Min Workers**: 0 (scale to zero)
6. **Max Workers**: 3
7. **Idle Timeout**: 60 seconds

### 3c. Get your Endpoint ID

After creating, copy the Endpoint ID from the dashboard.
It looks like: `abc123def456`

Your RunPod endpoint URL will be:
`https://api.runpod.io/v2/{ENDPOINT_ID}/run`

---

## Step 4: Deploy FastAPI Backend on Render

### 4a. Create Render Web Service

1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. **Root Directory**: `backend`
4. **Dockerfile**: `Dockerfile.backend`
5. **Instance Type**: Starter ($7/mo) or Standard ($25/mo)

### 4b. Set Environment Variables on Render

```
APP_ENV=production
SECRET_KEY=<generate a random 64-char string>

FRONTEND_URL=https://yourusername.github.io
ALLOWED_ORIGINS=https://yourusername.github.io

STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=<your aws key>
AWS_SECRET_ACCESS_KEY=<your aws secret>
AWS_BUCKET_NAME=snaptogether-uploads
AWS_REGION=us-east-1
AWS_CLOUDFRONT_URL=https://your-cf-domain.cloudfront.net

REDIS_URL=<internal redis url from Step 2>

RUNPOD_API_KEY=<your runpod api key>
RUNPOD_ENDPOINT_ID=<endpoint id from Step 3>
```

### 4c. Note your Render backend URL

It will be: `https://snaptogether-api.onrender.com`

---

## Step 5: Deploy Frontend to GitHub Pages

### 5a. Set up Next.js for static export

In `frontend/.env.production`:
```env
NEXT_PUBLIC_API_URL=https://snaptogether-api.onrender.com
NEXT_PUBLIC_WS_URL=https://snaptogether-api.onrender.com
NEXT_PUBLIC_BASE_PATH=/snaptogether
NEXT_OUTPUT=export
```

### 5b. Create GitHub Actions workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install deps
        run: cd frontend && npm ci

      - name: Build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
          NEXT_PUBLIC_WS_URL: ${{ secrets.API_URL }}
          NEXT_PUBLIC_BASE_PATH: /snaptogether
          NEXT_OUTPUT: export
        run: cd frontend && npm run build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: frontend/out
```

### 5c. Configure GitHub

1. Go to repo Settings → Secrets → Actions
2. Add `API_URL` = `https://snaptogether-api.onrender.com`
3. Go to Settings → Pages → Source: `gh-pages` branch

Your app will be at: `https://yourusername.github.io/snaptogether`

---

## Step 6: Test End-to-End

```bash
# 1. Check backend health
curl https://snaptogether-api.onrender.com/health

# 2. Create a test room
curl -X POST https://snaptogether-api.onrender.com/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"host_name": "Alex", "scene": "beach", "birthday_mode": false}'

# 3. Open frontend and test full flow
open https://yourusername.github.io/snaptogether
```

---

## Local Development

### Run everything locally

```bash
# Terminal 1: Redis
docker run -p 6379:6379 redis:alpine

# Terminal 2: Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your RunPod keys
uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend
npm install
cp .env.example .env.local  # Edit if needed
npm run dev
```

Open http://localhost:3000

---

## Cost Estimates

### Per generation (group photo):
- RunPod A100: ~$0.0011/sec × 60s = **~$0.07**
- RunPod RTX 4090: ~$0.00069/sec × 90s = **~$0.06**
- S3 storage: ~$0.002/GB = negligible

### Monthly fixed:
- Render Web Service: $7–25
- Render Redis: $7
- S3 + CloudFront: $1–10

**Total at low usage: ~$15-45/month**

---

## Troubleshooting

**WebSocket not connecting**
- Check CORS settings in backend `.env`
- Render free tier may not support WebSockets — use Starter+

**RunPod timeout**
- Increase `max_wait` in `runpod.py` (default 300s)
- Check RunPod logs in dashboard
- Try A100 GPU for faster inference

**Images not loading after generation**
- Check S3 bucket permissions (public read)
- Verify CloudFront distribution is active
- Check CORS on S3 bucket for your frontend domain

**Redis connection refused**
- Use the Internal URL on Render (not external)
- For local dev, run `docker run -p 6379:6379 redis`
