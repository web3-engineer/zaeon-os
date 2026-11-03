# 🌌 Zaeon OS (载恩 / 제온)
### The Academic Metaverse, made of AI Agents that think, plan and produce.

![Zaeon Banner](public/zaeon-logo.png)

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)](https://threejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-47a248?logo=mongodb)](https://mongodb.com)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2d3748?logo=prisma)](https://prisma.io)
[![Google AI](https://img.shields.io/badge/Gemini-2.0-4285F4?logo=google)](https://ai.google.dev)

</div>

---

## 🌍 Overview

**Zaeon** is an **Academic Metaverse meda between the collaboration of humans and machines** — built to empower human skills regarded to science, work and business — through agentic mentors that have built-in knowledge gained from professionals of several areas.

Please note that we keep our fully structured multiplayer structure outside this repo,
alongside with many other technologies that we don't want to share.


**Three core pillars:**
1. **Situational Awareness(OPEN)** — Agents know who you are and what you need to do to achieve your goals. they are not passive observers, but active professionals with their hole to play in your life as you keep progressing on tasks. They want the better version of yourself, always.
2. **Academic Workspace(OPEN)** — Agents have a pre-built set of tools, skills and knowledge for students, teachers, and researchers, but are also free to generate new tools and knowledge on demand.
3. **gamified economy (BETA)** — The best projects and ideas are set to lo generate wealth inside or outside zaeon's platform. 
---

## 📁 Repository Structure


| About the Cosmic Lounge [ METAVERSE ] 

The Cite of Angels lore is in progress. you can check here https;//zaeon.com.br/about-us/lore

Build for stress test purposes, there are bots you can add at your own will.
The add options are modular and can be tied to an admin account.
 
---

## 🚀 Developer Setup

### Prerequisites
- Node.js 20+, npm (o projeto usa `package-lock.json`; não há yarn.lock)
- MongoDB Atlas connection string
- Google Cloud project with Vertex AI enabled
- Google OAuth credentials (for NextAuth)
- **Python 3.10+ and LibreOffice** — required only for the `abnt-service` backend (ABNT document export). Install LibreOffice with `brew install libreoffice` (macOS) or `sudo apt install libreoffice` (Linux).

### Environment Variables (`.env.local`)

```bash
# Database
DATABASE_URL="mongodb+srv://..."

# Authentication
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Google AI / Vertex AI
GOOGLE_CREDENTIALS='{"project_id":"...","client_email":"...","private_key":"..."}'
GOOGLE_PROJECT_ID="your-gcp-project"
GOOGLE_LOCATION="us-central1"

# Real-time (Pusher)
NEXT_PUBLIC_PUSHER_KEY="..."
PUSHER_APP_ID="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="..."

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# ABNT backend (Python microservice — see "Run Locally")
# Where the Next app reaches the abnt-service. Defaults to http://localhost:8001 if unset.
ABNT_SERVICE_URL="http://localhost:8001"

# Omega Scholar research agent (academic full-text)
UNPAYWALL_EMAIL="you@example.com"   # any email you control — Unpaywall's politeness/contact field
CORE_API_KEY=""                     # optional; free key from core.ac.uk. CORE is skipped if unset
```

### Run Locally

The app runs as **two processes**: the Next.js frontend/API, and the `abnt-service` Python backend it calls for ABNT document export. Run each in its own terminal.

**Terminal 1 — Next.js app** (frontend + API routes + Socket.IO, port 3000):

```bash
npm install
npx prisma generate
npm run dev             # → http://localhost:3000  (runs server.js, not `next dev`)
```

`npm run dev` is the only entry point for the web app — it executes the custom `server.js`, which boots Next.js **and** the Socket.IO server together. (`npm run build` then `npm start` is the production equivalent.)

**Terminal 2 — `abnt-service` backend** (FastAPI, port 8001):

```bash
cd abnt-service
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload   # → http://localhost:8001
```

The Next app reaches it via `ABNT_SERVICE_URL` (default `http://localhost:8001`). It's only needed for ABNT export — the rest of the app runs without it, but ABNT export will show "Serviço ABNT offline" until it's up. Quick check: `curl http://localhost:8001/health`. See `abnt-service/README.md` for details.

> **Tests:** `npm test` (Vitest) runs the `lib/scholar/*` unit suite; `npm run test:watch` for watch mode.

---

---

Built with hardcore love ❤️ — 
