
# Complete Deployment Guide for helloMind on Render

This guide provides a complete, step-by-step walkthrough for deploying the **helloMind** student support chatbot system on Render.com. We will deploy a Python FastAPI backend as a Web Service and a React frontend as a Static Site.

---

### **Table of Contents**

1.  [Prerequisites](#1-prerequisites)
2.  [Project Structure](#2-project-structure)
3.  [Backend Setup (FastAPI)](#3-backend-setup-fastapi)
4.  [Frontend Setup (React)](#4-frontend-setup-react)
5.  [Pushing Your Code to GitHub](#5-pushing-your-code-to-github)
6.  [Deploying the Backend on Render](#6-deploying-the-backend-on-render)
7.  [Deploying the Frontend on Render](#7-deploying-the-frontend-on-render)
8.  [Testing and Verification](#8-testing-and-verification)
9.  [Troubleshooting Common Issues](#9-troubleshooting-common-issues)

---

## 1. Prerequisites

Before you begin, ensure you have the following:

*   **GitHub Account**: Your code must be hosted in a GitHub repository.
*   **Render Account**: Sign up for a free account at [render.com](https://render.com/).
*   **Gemini API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
*   **Git**: Installed on your local machine.
*   **Python 3.8+**: Installed on your local machine for backend setup.

---

## 2. Project Structure

For a successful deployment, your project repository must be organized as follows. Create a main project folder (e.g., `helloMind-app`) and structure it like this:

```
helloMind-app/
├── backend/
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── index.tsx
│   ├── App.tsx
│   ├── metadata.json
│   ├── types.ts
│   ├── constants.ts
│   ├── context/
│   ├── components/
│   ├── hooks/
│   └── services/
│
└── guide.md
```

-   The `frontend/` directory contains all the existing React files.
-   The `backend/` directory will contain the FastAPI application files we create below.

---

## 3. Backend Setup (FastAPI)

Here, we will create a secure FastAPI backend that handles user authentication, session management (JWT), and chat history persistence.

### Step 3.1: Create `backend/requirements.txt`

This file lists all the Python dependencies needed for our backend.

```txt
# backend/requirements.txt
fastapi
uvicorn
python-jose[cryptography]
passlib[bcrypt]
python-multipart
```

### Step 3.2: Create `backend/main.py`

This is the core of our backend application. It contains all the API logic for user management and chat history. **Copy the entire code block below into this file.**

```python
# backend/main.py
import os
import json
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from jose import JWTError, jwt
from passlib.context import CryptContext

# --- Configuration ---
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "a_very_secret_default_key_for_dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours
DATABASE_PATH = os.environ.get("DATABASE_PATH", "./db.json")

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Database Helper Functions ---
def load_db():
    if not os.path.exists(DATABASE_PATH):
        return {"users": [], "chats": {}}
    try:
        with open(DATABASE_PATH, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {"users": [], "chats": {}}

def save_db(data):
    with open(DATABASE_PATH, "w") as f:
        json.dump(data, f, indent=2)

# --- Pydantic Models (Data Schemas) ---
class UserInDB(BaseModel):
    id: str
    username: str
    hashed_password: str

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict

class TokenData(BaseModel):
    username: Optional[str] = None

class ChatSession(BaseModel):
    id: str
    title: str
    messages: List[Dict]
    createdAt: float

# --- FastAPI App Initialization ---
app = FastAPI(title="helloMind Backend")

# Note: In production, restrict origins to your frontend's URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For simplicity, allow all. Restrict this in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# --- Security and Authentication ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    db = load_db()
    user = next((u for u in db["users"] if u["username"] == token_data.username), None)

    if user is None:
        raise credentials_exception
    return UserInDB(**user)


# --- API Endpoints ---

@app.get("/api")
def read_root():
    return {"message": "helloMind Backend is running."}

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate):
    db = load_db()
    if any(u["username"] == user_in.username for u in db["users"]):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user_in.password)
    new_user = UserInDB(
        id=f"user_{os.urandom(8).hex()}",
        username=user_in.username,
        hashed_password=hashed_password,
    )
    
    db["users"].append(new_user.model_dump())
    save_db(db)
    
    return {"message": "User created successfully"}

@app.post("/api/auth/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    db = load_db()
    user_data = next((u for u in db["users"] if u["username"] == form_data.username), None)
    
    if not user_data or not verify_password(form_data.password, user_data["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data["username"]}, expires_delta=access_token_expires
    )

    user_info = {"id": user_data["id"], "username": user_data["username"]}
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_info}

@app.get("/api/chats", response_model=List[ChatSession])
def get_user_chats(current_user: UserInDB = Depends(get_current_user)):
    db = load_db()
    user_chats = db.get("chats", {}).get(current_user.id, [])
    return sorted(user_chats, key=lambda x: x['createdAt'], reverse=True)

@app.post("/api/chats/sync", status_code=status.HTTP_200_OK)
def sync_user_chats(chats: List[ChatSession], current_user: UserInDB = Depends(get_current_user)):
    db = load_db()
    if "chats" not in db:
        db["chats"] = {}
    
    db["chats"][current_user.id] = [chat.model_dump() for chat in chats]
    save_db(db)
    return {"message": "Chats synced successfully"}
```

---

## 4. Frontend Setup (React)

Place all your existing React application files inside the `frontend/` directory. No code changes are needed in the frontend files themselves, as they are already set up to communicate with a backend via `/api/` endpoints.

---

## 5. Pushing Your Code to GitHub

1.  **Initialize Git**: In your main project folder (`helloMind-app`), run:
    ```bash
    git init
    git branch -m main
    ```
2.  **Create a GitHub Repository**: Go to GitHub and create a new, empty repository (e.g., `helloMind-render-deploy`). Do not add a `README` or `.gitignore` yet.
3.  **Add, Commit, and Push**:
    ```bash
    git add .
    git commit -m "Initial project setup for Render deployment"
    git remote add origin https://github.com/YourUsername/YourRepoName.git
    git push -u origin main
    ```

---

## 6. Deploying the Backend on Render

The backend will be deployed as a **Web Service** with a persistent disk to store the `db.json` file.

### Step 6.1: Create the Web Service

1.  On the Render Dashboard, click **New +** and select **Web Service**.
2.  Connect your GitHub account and select your repository.
3.  Fill in the service details:
    -   **Name**: `hellobot-backend` (you'll need this exact name later).
    -   **Root Directory**: `backend` (This is crucial!).
    -   **Environment**: `Python 3`.
    -   **Region**: Choose a region close to you.
    -   **Branch**: `main`.
    -   **Build Command**: `pip install -r requirements.txt`.
    -   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
    -   **Instance Type**: `Free` is sufficient.

### Step 6.2: Add Environment Variables

1.  Scroll down to the **Environment** section.
2.  Click **Add Environment Variable** and add the following:
    -   `API_KEY`: Paste your **Google Gemini API Key** here.
    -   `JWT_SECRET_KEY`: Generate a strong, random secret key. You can use a command like `openssl rand -hex 32` in your terminal to create one. **Do not use a simple password.**
    -   `DATABASE_PATH`: Set this to `/var/data/db.json`. This path points to the persistent disk we will create next.

### Step 6.3: Add a Persistent Disk

1.  Before deploying, go to the **Advanced** settings section.
2.  Find **Disks** and click **Add Disk**.
3.  Configure the disk:
    -   **Name**: `data` (or any name you prefer).
    -   **Mount Path**: `/var/data` (This must match the directory in `DATABASE_PATH`).
    -   **Size (GB)**: `1` is the minimum and is sufficient.
4.  Click **Create Web Service**. Render will now build and deploy your backend. It may take a few minutes. Once it's live, you can find its URL on the service's dashboard (e.g., `https://hellobot-backend.onrender.com`).

---

## 7. Deploying the Frontend on Render

The frontend will be deployed as a **Static Site** and connected to the backend using a URL rewrite rule.

### Step 7.1: Create the Static Site

1.  On the Render Dashboard, click **New +** and select **Static Site**.
2.  Select the same GitHub repository.
3.  Fill in the site details:
    -   **Name**: `hellobot-frontend`.
    -   **Root Directory**: `frontend` (Crucial!).
    -   **Branch**: `main`.
    -   **Build Command**: Leave this **blank**. Our project uses CDN imports and doesn't require a build step.
    -   **Publish Directory**: `.` (a single dot, meaning the root directory of our specified `Root Directory`, which is `frontend`).

### Step 7.2: Connect Frontend to Backend

This is the most important step. We will use a rewrite rule to proxy all API requests from the frontend to the backend. This avoids CORS issues and keeps your API endpoints clean.

1.  After the site is created, go to its **Settings** tab.
2.  Scroll down to **Redirects and Rewrites**.
3.  Click **Add Rule**.
4.  Configure the rule:
    -   **Type**: `Rewrite`.
    -   **Source**: `/api/*`.
    -   **Destination**: `https://hellobot-backend.onrender.com/api/*`. (Replace `hellobot-backend.onrender.com` with your actual backend URL from Step 6).
5.  Click **Save Changes**. The rule will be applied on the next deploy (or you can trigger a manual deploy).

Your application is now live! Visit your frontend URL (e.g., `https://hellobot-frontend.onrender.com`) to use it.

---

## 8. Testing and Verification

1.  **Visit your frontend URL.**
2.  **Test Signup**: Create a new user account. The request should go to your backend and create a user in `db.json` on the persistent disk.
3.  **Test Logout & Login**: Log out, then log back in with the credentials you just created. The backend should validate your password hash and issue a JWT.
4.  **Test Chat**: Start a new chat. Your messages and the bot's responses should appear correctly.
5.  **Test Persistence**: Refresh the page or close the browser tab. When you return to the site, you should still be logged in (if your session hasn't expired), and your chat history should be reloaded from the backend.
6.  **Test Isolation**: Sign up with a second account. Verify that this new user has a fresh, empty chat history and cannot see the first user's chats.

---

## 9. Troubleshooting Common Issues

*   **"Application Error" on Backend**:
    -   Check the **Logs** tab for your backend Web Service on Render. Look for Python stack traces. This is often caused by a missing dependency in `requirements.txt` or a programming error in `main.py`.
*   **"404 Not Found" for API Calls**:
    -   Double-check your **Rewrite Rule** in the frontend Static Site settings. Ensure the source is `/api/*` and the destination URL for your backend is correct.
*   **Data Not Saving**:
    -   Verify that you created the **Persistent Disk** for your backend service.
    -   Ensure the **Mount Path** (`/var/data`) and the `DATABASE_PATH` environment variable (`/var/data/db.json`) match exactly.
*   **"401 Unauthorized" Errors**:
    -   This means authentication is failing. It could be an incorrect password, or your JWT secret might be misconfigured. Ensure the `JWT_SECRET_KEY` is set correctly in your backend's environment variables.
*   **CORS Errors in Browser Console**:
    -   If you see CORS errors, it means your rewrite rule is not working correctly. Review Step 7.2 carefully. You should not need to configure CORS extensively if the rewrite is set up properly.
