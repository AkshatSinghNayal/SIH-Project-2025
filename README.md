# helloMind 🧠 — Student Mental Wellness Platform

A **production-hardened student mental wellness companion** built for the Smart India Hackathon.
helloMind provides students a calm, private space to check in on their emotional state, talk with a compassionate AI, connect anonymously with peers, and build gentle daily habits — secured with **JWT HttpOnly cookie authentication**, **CSRF protection**, and **MongoDB chat persistence**.

---

## ⚡ Quick Demo Access (For Recruiters & Evaluators)

You can explore the live application instantly with pre-populated demo data (mood streaks, AI chat history, assessment scores, and completed habit logs):

- **One-Click Demo Access**: Click **`⚡ One-Click Demo Login`** on the sign-in screen.
- **Manual Credentials**:
  - **Username**: `recruiter_demo`
  - **Password**: `Recruiter@2025`

---

## 🌟 Key Features

- **Secure JWT Authentication** — Production-grade authentication using HttpOnly cookies (`__Host-token` in production), timing-safe CSRF headers (`X-CSRF-Token`), password policies, bcrypt hashing, and automatic index synchronization (`User.syncIndexes()`).
- **Resource Ownership & IDOR Protection** — User-scoped MongoDB chat and message persistence. Users can only access, view, or delete their own data.
- **AI Companion Chat & Multi-Model Waterfall** — Real-time streaming responses over Server-Sent Events (SSE) using `@google/genai` with automatic model fallback (`gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-2.5-flash` → `gemini-1.5-pro`), breathing-circle thinking indicator, and detailed error diagnostics.
- **Persistent Conversations & Permanent Delete** — Conversations and messages are saved to MongoDB automatically. Users can switch between previous sessions or permanently delete unwanted chats with one click.
- **Live Anonymous Peer Chat** — Real-time WebSockets (`/ws/peer`) pairing students anonymously with "Next person" controls, live presence counts, private typing indicators, auto-cleanup, and reporting.
- **Mood Check-in & Assessments** — Daily mood logging on a 5-point face scale, structured check-in questionnaires with visual progress, and a 30-statement personality assessment with trait insights and practical wellness experiments.
- **Global Community Garden** — Anonymous supportive community feed with stable session identities, support counts, post moderation/filtering, and owner deletion.
- **Daily Tools & Grounding** — Guided 4-7-8 breathing exercises, 5-4-3-2-1 grounding flows, focus sprints, task planners, and micro-courses.
- **Emergency Resources** — Quick one-tap access to national helplines (Tele-MANAS `14416`, KIRAN `1800-599-0019`).

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 3 |
| **Backend** | Node.js 20+, Express.js, WebSockets (`ws`) |
| **Database** | MongoDB & Mongoose 8 |
| **Authentication** | JWT, HttpOnly Cookies, CSRF Tokens, Bcryptjs |
| **AI Integration** | Google Gemini 2.0 / 2.5 (`@google/genai`) |
| **Security** | Helmet, Express Rate Limit, Cookie Parser, CORS |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js**: v20+
- **MongoDB**: Local MongoDB or MongoDB Atlas URI
- **Gemini API Key**: [Get a key from Google AI Studio](https://aistudio.google.com/)

### 1. Setup Backend Server
```bash
cd server
cp .env.example .env
npm install
```

Configure `server/.env`:
```env
PORT=8787
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hellomind
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
JWT_SECRET=replace_with_a_long_random_jwt_secret
CORS_ORIGIN=http://localhost:5173
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false
COMMUNITY_SESSION_SECRET=replace_with_a_long_random_community_secret
```

Start the backend server:
```bash
npm run dev
```

### 2. Setup Frontend Application
In a new terminal:
```bash
cd SIH-Chat-Bot
npm install
```

Create `SIH-Chat-Bot/.env.local`:
```env
VITE_USE_REMOTE_API=true
VITE_API_BASE_URL=http://localhost:8787
```

Start the frontend application:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Testing

Run the comprehensive test suite (automated unit & integration tests):

```bash
# Run backend test suite (JWT Auth, CSRF, IDOR, Rate Limiting, Community)
cd server
npm test

# Run frontend test suite (authService, Memory CSRF Token Management)
cd SIH-Chat-Bot
npm test
```

---

## ☁️ Deployment Guide (Render)

Deploy both backend Web Service and frontend Static Site using Render Blueprints.

### Step 1: Blueprint Deployment (Recommended)
1. Push your code to GitHub / GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
3. Connect your repository and select `render.yaml`.
4. Render will automatically configure the services and prompt for secrets. Fill in:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `GEMINI_MODEL`: `gemini-2.0-flash`
   - `MONGODB_URI`: MongoDB Atlas connection string (`mongodb+srv://...`)
   - Render automatically generates `JWT_SECRET` and `COMMUNITY_SESSION_SECRET`.
5. Click **Apply**.

### Step 2: Manual Render Setup

#### A. Backend Web Service (`sih-backend`)
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `GEMINI_API_KEY`: `<your_gemini_api_key>`
  - `GEMINI_MODEL`: `gemini-2.0-flash`
  - `MONGODB_URI`: `<mongodb_atlas_connection_string>`
  - `JWT_SECRET`: `<min_32_character_random_string>`
  - `COMMUNITY_SESSION_SECRET`: `<min_32_character_random_string>`
  - `CORS_ORIGIN`: `https://sih-frontend.onrender.com`
  - `COOKIE_SAME_SITE`: `none`
  - `COOKIE_SECURE`: `true`

#### B. Frontend Static Site (`sih-frontend`)
- **Root Directory**: `SIH-Chat-Bot`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_USE_REMOTE_API`: `true`
  - `VITE_API_BASE_URL`: `https://sih-backend.onrender.com`

Detailed instructions are available in [DEPLOY-RENDER.md](DEPLOY-RENDER.md).

---

## 🔒 Security Architecture

- **Tokens in HttpOnly Cookies**: Auth tokens are delivered via `Set-Cookie` with `HttpOnly`, `Secure`, and `SameSite` flags (`__Host-token` in production). JavaScript cannot read tokens via `document.cookie`.
- **CSRF Defense**: Double-submit cookie pattern with cryptographically signed in-memory tokens passed via `X-CSRF-Token` headers.
- **IDOR Protection**: Database queries strictly enforce user ownership matching `req.user.id` from the JWT claims.
- **Account Data Isolation**: Password hashes are stripped from API outputs.
- **Brute Force Protection**: Rate limiting on `/api/auth/register` and `/api/auth/login`.

---

## 📜 License & Team

Built for **Smart India Hackathon** by Team helloMind.
