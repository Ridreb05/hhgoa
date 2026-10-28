# GhostShield: Production & Cloud Deployment Guide

## 1. Local Deployment (Zero-Credential Default)

GhostShield is architected to run immediately after cloning with zero external accounts or credentials required:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ghostshield.git
cd ghostshield

# 2. Install dependencies
npm ci

# 3. Start local development server
npm run dev

# 4. Open in browser
open http://localhost:3000
```

By default, GhostShield operates in **Demo Mode**, utilizing the in-memory deterministic graph engine.

---

## 2. Deploying to Vercel

GhostShield is optimized for serverless edge and Node.js deployment on **Vercel**.

### Step 1: Push Repository to GitHub
Ensure the repository has been committed and pushed to GitHub:
```bash
git add .
git commit -m "feat: complete GhostShield TigerGraph security platform"
git push origin main
```

### Step 2: Import Project in Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Select your GitHub repository (`ghostshield`).
4. Keep the default build settings:
   * **Framework Preset:** Next.js
   * **Build Command:** `npm run build`
   * **Output Directory:** `.next`
   * **Install Command:** `npm ci`

### Step 3: Configure Environment Variables in Vercel
Under **Environment Variables**, configure the desired mode:

#### For Standalone Demo Mode (Default):
No environment variables are required! GhostShield runs seamlessly out-of-the-box.

#### For Live TigerGraph Cloud Mode:
Add the following variables:
* `GHOSTSHIELD_ENGINE_MODE`: `tigergraph`
* `TIGERGRAPH_HOST`: `https://your-cluster.i.tgcloud.io`
* `TIGERGRAPH_GRAPH_NAME`: `GhostShieldGraph`
* `TIGERGRAPH_USERNAME`: `tigergraph`
* `TIGERGRAPH_PASSWORD`: `<your-password>`
* `TIGERGRAPH_TIMEOUT_MS`: `8000`

#### For Optional AI Grants India (AIGI) Narrative Synthesis:
* `AIGI_API_KEY`: `<your-api-key>`
* `AIGI_API_ENDPOINT`: `https://api.openai.com/v1/chat/completions` (or AIGI proxy)
* `AIGI_MODEL`: `gpt-4o-mini`

#### For Optional viaSocket Incident Webhooks:
* `VIASOCKET_WEBHOOK_URL`: `https://flow.viasocket.com/your-webhook-endpoint`

### Step 4: Deploy
Click **Deploy**. Vercel will build the production bundle and assign a public domain (e.g. `https://ghostshield.vercel.app`).

---

## 3. Production Health Check

Verify your deployed deployment:
```bash
curl -s https://your-deployment.vercel.app/api/health
```

Expected output:
```json
{
  "engine_mode": "demo",
  "services": {
    "graph_provider": {
      "status": "ONLINE",
      "latency_ms": 1
    }
  }
}
```
