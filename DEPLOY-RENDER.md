# Deploy to Render

This repo ships with a Render blueprint to deploy both the backend (Express) and frontend (Vite) securely.

## Prereqs
- Node 20+
- A Google API key for Gemini (server-side only)
- Optional: MongoDB Atlas connection string

## One‑click via Blueprint
1. Commit and push latest changes.
2. In Render, create from blueprint: select this repo and choose `render.yaml`.
3. Fill env vars when prompted:
   - Backend service (sih-backend):
     - GEMINI_API_KEY = your_key
     - CORS_ORIGIN = https://<your-frontend>.onrender.com
     - Optional: MONGODB_URI = your_mongodb_atlas_uri
   - Frontend static site (sih-frontend):
     - VITE_USE_REMOTE_API = true
     - VITE_API_BASE_URL = https://<your-backend>.onrender.com
4. Deploy. The backend will pass a health check at `/health`.

Notes:
- If CORS testing from anywhere is needed temporarily, set `CORS_ORIGIN=*` (already supported).
- For Mongo Atlas, allow Render egress IPs. For quick tests, allow 0.0.0.0/0, then restrict.

## Manual setup (without blueprint)

### Backend (Web Service)
- Root directory: `server`
- Build command: `npm install`
- Start command: `node index.js`
- Runtime: Node 20+
- Health check path: `/health`
- Env vars:
  - GEMINI_API_KEY=your_key
  - CORS_ORIGIN=https://<your-frontend>.onrender.com
  - Optional: MONGODB_URI=your_mongodb_atlas_uri

### Frontend (Static Site)
- Root directory: `SIH-Chat-Bot`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Env vars:
  - VITE_USE_REMOTE_API=true
  - VITE_API_BASE_URL=https://<your-backend>.onrender.com
- Do NOT set GEMINI_API_KEY here.

SPA routing: `_redirects` is included so client routes resolve to `index.html`.

## Local development

With backend:
- server/.env
  - GEMINI_API_KEY=...
  - CORS_ORIGIN=http://localhost:5173
  - PORT=8787
  - Optional: MONGODB_URI=...
- Start backend: from `server/`, `npm run dev`
- SIH-Chat-Bot/.env.local
  - VITE_USE_REMOTE_API=true
  - VITE_API_BASE_URL=http://localhost:8787
- Start frontend: from `SIH-Chat-Bot/`, `npm run dev`

Without backend:
- SIH-Chat-Bot/.env.local
  - VITE_USE_REMOTE_API=false
  - Optional: GEMINI_API_KEY=... (dev fallback only)
- Start frontend: from `SIH-Chat-Bot/`, `npm run dev`

## Verification checklist
- Backend `/health` returns `{ ok: true }`
- Frontend loads from Render Static Site URL
- Chat sends and streams responses
- CORS works (no blocked requests in browser console)
- Optional: Chats/messages persisted when MONGODB_URI set
