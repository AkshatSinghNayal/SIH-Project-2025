# Deploying helloMind to Render 🚀

This repository contains full Render Infrastructure-as-Code (`render.yaml`) blueprints to deploy both the Express backend and React Vite frontend securely.

---

## 📋 Prerequisites

Before deploying to Render, ensure you have:
1. A **GitHub** or **GitLab** account containing this repository.
2. A free **[Render](https://render.com/)** account.
3. A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).
4. A **MongoDB Atlas** cluster connection string (e.g. `mongodb+srv://<user>:<password>@cluster.mongodb.net/hellomind?retryWrites=true&w=majority`).

---

## ⚡ Method 1: Automatic Blueprint Deployment (Recommended)

Render Blueprints allow you to deploy the entire stack (Backend + Frontend) in one click with environment variables configured automatically.

1. Push your latest code to your GitHub/GitLab repository.
2. Go to the **[Render Dashboard](https://dashboard.render.com/)**.
3. Click **New +** in the top right and select **Blueprint**.
4. Connect your Git repository containing `render.yaml`.
5. Render will detect `render.yaml` and create two services:
   - `sih-backend` (Node.js Web Service)
   - `sih-frontend` (Static Site)
6. Fill in the required environment variable prompts:
   - **`GEMINI_API_KEY`**: Your Gemini API key.
   - **`MONGODB_URI`**: Your MongoDB Atlas URI.
   - Render will automatically generate secure values for `JWT_SECRET` and `COMMUNITY_SESSION_SECRET`.
7. Click **Apply**. Render will build and deploy both services automatically!

---

## 🛠️ Method 2: Manual Deployment Setup

If you prefer to configure services manually in the Render dashboard:

### Step 1: Create Backend Web Service (`sih-backend`)

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `sih-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Under **Environment Variables**, add:

| Key | Value / Notes |
|---|---|
| `NODE_ENV` | `production` |
| `GEMINI_API_KEY` | `<your_gemini_api_key>` |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/hellomind` |
| `JWT_SECRET` | Generate a 32+ character random string |
| `COMMUNITY_SESSION_SECRET` | Generate a 32+ character random string |
| `CORS_ORIGIN` | `https://sih-frontend.onrender.com` *(Replace with your frontend URL)* |
| `COOKIE_SAME_SITE` | `none` |
| `COOKIE_SECURE` | `true` |

5. Click **Create Web Service**. Note down the deployed service URL (e.g. `https://sih-backend.onrender.com`).

---

### Step 2: Create Frontend Static Site (`sih-frontend`)

1. In Render Dashboard, click **New +** -> **Static Site**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `sih-frontend`
   - **Root Directory**: `SIH-Chat-Bot`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Environment Variables**, add:

| Key | Value |
|---|---|
| `VITE_USE_REMOTE_API` | `true` |
| `VITE_API_BASE_URL` | `https://sih-backend.onrender.com` *(Your backend URL)* |

5. Click **Create Static Site**.

---

## 🔒 Production Security & Cookie Configuration

- **`COOKIE_SECURE=true`**: Ensures cookies are only sent over HTTPS connections.
- **`COOKIE_SAME_SITE=none`**: Required when frontend static site (`.onrender.com`) and backend web service (`.onrender.com`) are on separate subdomains.
- **`__Host-token` Cookie**: In production HTTPS mode, the cookie name automatically uses the `__Host-` prefix for enhanced browser security against subdomain overwrite attacks.
- **CSRF Token Header**: Frontend attached `X-CSRF-Token` headers to all state-changing API calls.

---

## 🔍 Post-Deployment Verification Checklist

After deployment finishes, verify that everything is working:

1. **Health Check**: Open `https://<your-backend>.onrender.com/health`. It should return `{"ok":true}`.
2. **Registration & Login**:
   - Open your frontend Static Site URL.
   - Click **"Sign up"** and create a new account (e.g. `student1`, `Pass@1234`).
   - Confirm successful login and session restoration on browser refresh (`GET /api/auth/me`).
3. **AI Streaming**: Send a message to the AI companion and check streaming responses.
4. **Peer Chat**: Open two separate browser tabs to test real-time WebSocket peer chat.
5. **CORS & Headers**: Open browser developer console (Network tab) and ensure no CORS errors occur.
