# ANY Video TO (Animora AI)

<div align="center">

<img src="https://hits.sh/github.com/PavanWadile77/ANY-Video-TO.svg?style=for-the-badge&label=REPOSITORY%20VIEWS&color=2563eb" alt="Repository views" />

</div>


> **Animora AI** is a full-stack, enterprise-grade AI animation and video generation platform featuring **Firebase Authentication**, **Supabase Private Media Storage**, and multi-provider AI video synthesis pipelines.
> Live Hosting: [https://any-video-to.web.app](https://any-video-to.web.app)

---

## 🚀 Key Features

1. **Three Core Generation Categories**:
   - **Realistic / Cinematic**: Anamorphic 35mm visuals, dynamic camera movement, cinematic lighting, and photorealistic physics.
   - **Cartoon / 3D / Anime**: Stylized character storytelling, cel-shaded anime dynamics, and 3D Pixar/DreamWorks aesthetic rendering.
   - **Object / Product Animation**: Commercial studio turntable sweeps, 360° product rotations, cosmetic fluid dynamics, and packaging highlights.
2. **Identity & Authentication**:
   - **Firebase Authentication**: Email/Password, Google One-Tap Popup, and Phone SMS OTP with Recaptcha verification.
   - Protected routes and session management with synchronized starter generation credits (150 complimentary credits).
3. **Private Cloud Media Storage (Supabase Storage)**:
   - Dedicated private buckets: `ai-videos` (generated assets up to 250MB) and `video-thumbnails` (up to 10MB).
   - Strict server-gateway authorization: end-users authenticate via Firebase ID tokens; backend generates short-lived, cryptographically signed playback URLs (24h default).
   - Zero exposure of `SUPABASE_SERVICE_ROLE_KEY` to the browser or git.
4. **AI Video Provider Architecture**:
   - Multi-provider adapter design: **Fal.ai** (Minimax Hailuo Video-01, Kling 1.5 Pro, AnimateDiff V2, LTX Video) and **Replicate** (Wan 2.1, Luma Ray 2).
   - Built-in sandbox engine for testing, development, and continuous integration.
   - Atomic credit reservation, automated settlements on success, and guaranteed refunds on failures or cancellations.
5. **Resilient Orchestration & Polling**:
   - Bounded polling with backoff and 10-minute timeout protection.
   - Real-time progress percentage normalization preventing 15% freeze.
   - In-flight cancellation and safe job retry.

---

## 🏗️ Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Vite + React 19 Client                          │
│          (TailwindCSS, TanStack Query, Firebase Web SDK, Lucide)       │
└───────────────────▲───────────────────────────────▲────────────────────┘
                    │                               │
       Direct Signed URL Media Playback             │ Bearer Token / HTTPS Callable
                    │                               │
┌───────────────────▼─────────────┐   ┌─────────────▼────────────────────┐
│        Supabase Storage         │   │   Backend Services / Functions   │
│  - ai-videos (Private)          │   │  - Express Gateway (Node.js 22)  │
│  - video-thumbnails (Private)   │   │  - Firebase Cloud Functions (v2) │
└───────────────────▲─────────────┘   └─────────────┬────────────────────┘
                    │                               │
                    │ Service-Role Gateway          │ API / Queue Polling
                    │ (Signed URLs & Uploads)       │
                    └───────────────────────────────┼────────────────────┐
                                                    ▼                    ▼
                                            ┌──────────────┐    ┌─────────────────┐
                                            │ Firebase DB  │    │  AI Providers   │
                                            │  Firestore   │    │  Fal.ai / Queue │
                                            │ Auth Ledger  │    │  Replicate API  │
                                            └──────────────┘    └─────────────────┘
```

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, TanStack Query, Lucide Icons.
- **Backend**: Express API server + Firebase Cloud Functions (v2) on Node.js 22 runtime.
- **Database**: Cloud Firestore (Projects, Jobs, User Profiles, Credit Accounts, Audit Ledger).
- **Storage**: Supabase Storage (`ai-videos`, `video-thumbnails`) with Row Level Security and service-role signed URLs.
- **Authentication**: Firebase Authentication (Email/Password, Google Sign-in, Phone SMS OTP).
- **AI Synthesis**: Fal.ai Queue API, Replicate API, and Animora Sandbox Engine.

---

## 📁 Project Folder Structure

```
ANY Video TO/
├── .env.example                 # Safe environment variable templates
├── .firebaserc                  # Linked Firebase project ("any-video-to")
├── .gitignore                   # Excludes secrets, credentials, node_modules, build outputs
├── firebase.json                # Hosting, Functions, Firestore & Storage deployment spec
├── firestore.indexes.json       # Composite Firestore queries & indexes
├── firestore.rules              # Cloud Firestore security rules
├── package.json                 # Workspace scripts
├── storage.rules                # Cloud Storage validation rules
├── supabase/
│   └── migrations/
│       └── 20261011_storage_buckets.sql   # Private bucket creation & service-role RLS
│
├── client/                      # Vite React 19 Frontend
│   ├── src/
│   │   ├── components/         # Navbar, Sidebar, Modals (VideoPlayer, Auth)
│   │   ├── context/            # AuthContext (Firebase Auth integration)
│   │   ├── lib/                # API client, Firestore fallback, Supabase client
│   │   └── pages/              # Studio, Dashboard, Projects, Templates, Admin
│   ├── package.json
│   └── vite.config.ts
│
├── functions/                   # Firebase 2nd-Gen Cloud Functions
│   ├── src/
│   │   ├── providers/          # Fal.ai, Mock adapters
│   │   ├── services/           # Credit Service, Supabase Storage integration
│   │   └── index.ts            # Callable endpoints (createVideoGeneration, etc.)
│   └── package.json
│
└── server/                      # Express Backend API & Orchestration Engine
    ├── src/
    │   ├── db/                 # Store, user models & credit ledger
    │   ├── middleware/         # Firebase Auth token verification
    │   ├── providers/          # Provider adapters (Fal, Replicate, Mock)
    │   ├── services/           # Job Orchestration & Supabase Storage Service
    │   └── index.ts            # REST API endpoints (/api/jobs, /api/storage/*)
    ├── tests/                  # Automated test suites (35 tests)
    │   ├── server.test.ts
    │   ├── storage.test.ts
    │   └── generation_regression.test.ts
    └── package.json
```

---

## ⚙️ Local Installation & Setup

### Prerequisites
- Node.js 22.x or later
- npm 10.x or later
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/PavanWadile77/ANY-Video-TO.git
cd ANY-Video-TO

# Install all workspace dependencies
npm run install:all
```

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root (and in `client/` or `server/` as needed):
```bash
cp .env.example .env
```

Populate the required keys in `.env`:
```ini
# Frontend (Public)
VITE_FIREBASE_PROJECT_ID=any-video-to
VITE_FIREBASE_APP_ID=1:1016314223204:web:1bfeb551f24af9a6d81d71
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_SUPABASE_URL=https://tboopdrzolsjfdanmqww.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Backend (Private Secrets - NEVER commit)
PORT=5000
SUPABASE_URL=https://tboopdrzolsjfdanmqww.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
AI_VIDEO_PROVIDER=fal
AI_VIDEO_PROVIDER_API_KEY=your_fal_ai_key
```

### 3. Run Locally
To run the full stack concurrently (Backend API on `localhost:5000` + Frontend on `localhost:5173`):
```bash
npm run dev
```

---

## 🔒 Storage Security Architecture

Because Animora AI uses **Firebase Authentication** for identity rather than Supabase Auth, client requests do not carry Supabase JWT sessions. The architecture enforces security through a **Backend Service-Role Gateway**:

1. **Private Buckets**: Buckets `ai-videos` and `video-thumbnails` are created with `public = false`. Direct anonymous reads and writes are explicitly denied (`USING (false)`).
2. **User Path Isolation**: Media files are strictly organized under the authenticated user's ID directory:
   - Source media: `${userId}/source/...`
   - Thumbnails: `${userId}/thumbnails/...`
   - Output videos: `${userId}/videos/${jobId}.mp4`
3. **Boundary Verification**: The backend validates that `request.user.id` matches the storage directory prefix. Cross-user access attempts are immediately rejected with HTTP `403 Forbidden`.
4. **Time-Limited Signed URLs**: Authorized media streaming is accomplished via cryptographically signed URLs (24-hour expiration for video outputs, 1-hour for temporary assets).

---

## 🧪 Testing & Quality Assurance

The project includes 35 comprehensive automated tests covering authentication, storage security, credit ledgering, and regression scenarios:

```bash
# Run server & storage test suite
npm test

# Run client linter
npm --prefix client run lint

# Run all production builds
npm run build
```

Test coverage includes:
- Verification of Firebase ID tokens on private storage operations.
- Rejection of unauthenticated callers (HTTP 401) and invalid path access (HTTP 403).
- Credit reservation idempotency and auto-refund on failed jobs.
- Progress percentage normalization and timeout watchdog tests.
- Supabase Storage upload, signed URL creation, and generated video persistence.

---

## 🚀 Deployment Instructions

### 1. Build Production Assets
```bash
npm run build
```

### 2. Configure Cloud Functions Secrets
Set the AI Provider secret securely in Google Secret Manager / Firebase Functions:
```bash
firebase functions:secrets:set AI_VIDEO_PROVIDER_API_KEY
```

### 3. Deploy Firestore, Storage & Functions
```bash
# Deploy Firestore security rules and composite indexes
firebase deploy --only firestore

# Deploy Cloud Storage fallback rules
firebase deploy --only storage

# Deploy 2nd-Gen Cloud Functions
firebase deploy --only functions
```

### 4. Deploy Hosting (SPA)
```bash
firebase deploy --only hosting
```

*(Or deploy all components simultaneously with `firebase deploy`)*

---

## 🔍 Troubleshooting & Known Issues

### Video Generation Stuck at 15% (Resolved)
**Symptoms**:
- The UI displays: `Button: "Synthesizing Video..."`, `Live Generation Status: 15%`, `Status: PROCESSING`.

**Root Cause**:
1. **Unauthenticated Job Abandonment**: In earlier releases, clicking generate before signing in created an unpersisted local stub (`job_<timestamp>_...`) with an initial `progressPercent: 15`. Subsequent polling threw `Generation job not found` which was swallowed, leaving the UI permanently polling at 15%.
2. **Progress Normalization Float Clamping**: Provider adapters returning float progress between `0.0` and `1.0` (e.g. `0.15`, `0.30`) were clamped by an unnormalized `Math.max(15, ...)` filter, locking the display at 15% until 100%.
3. **Missing Provider API Key**: When `AI_VIDEO_PROVIDER_API_KEY` was missing from the server environment, jobs failed silently or fell back unexpectedly.

**Resolution Applied**:
- Enforced strict authentication before launching video synthesis in `Studio.tsx`.
- Implemented **bounded polling** (10-minute timeout with automatic credit refund, max 5 consecutive error backoff).
- Normalized float progress (`status.progress <= 1.0 ? progress * 100 : progress`).
- Added active **Retry** and **Cancel** buttons directly on the active generation card.
- Implemented watchdog timeout on both the backend service and Cloud Functions to automatically mark stalled jobs as `failed` and issue full credit refunds.

**Action Required If Still Seeing Missing API Key Warning**:
- Set `AI_VIDEO_PROVIDER_API_KEY` in your `.env` for local execution or via `firebase functions:secrets:set AI_VIDEO_PROVIDER_API_KEY` for production.

---

## 📄 License
Private & Proprietary — All Rights Reserved © 2026 Animora AI.
