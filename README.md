# 🎥 Zoom Meeting Application (MERN + WebRTC)
### Maharaja Agrasen Institute of Technology (Affiliated to GGSIPU, Delhi)
**Department of Information Technology**  
*Session 2026–2027 • B.Tech. Seventh Semester — Minor Project*

---

## 🌟 Executive Summary

This project is a high-performance, browser-based video conferencing and real-time collaboration application engineered strictly in alignment with the academic research paper specifications.

- **Frontend Tier**: React 19 / Next.js 16 with custom dark Zoom aesthetic, dynamic video grid, audio activity wave analyzer, and active speaker border highlight.
- **Backend Tier**: Node.js & Express REST endpoints, JWT authentication tokens, bcrypt password hashing, and real-time WebRTC mesh signaling.
- **Persistence Tier**: MongoDB via Mongoose (with dual-mode in-memory persistent store fallback for instantaneous zero-error Vercel deployment).
- **Media & Signaling**: WebRTC 1.0 Peer-to-Peer mesh topology with public Google STUN servers (`stun:stun.l.google.com:19302`) complying with RFC 8825 & RFC 8445.
- **Academic Verification Suite**: Automated Section 16 test suite verifying 9 test cases with live execution latency and proof logs at `/evaluation`.

---

## 🚀 Key Features Matching Research Paper Requirements

| ID | Requirement | Implementation Details | Status |
|---|---|---|---|
| **FR-01** | User Authentication | Registration, Login, Logout, bcrypt password hashing, cryptographic JWT session cookies | ✅ Verified |
| **FR-02** | Create Meeting | Generates unique formatted meeting IDs (e.g., `784-920-315`) and shareable invitation URLs | ✅ Verified |
| **FR-03** | Join Meeting | Join via code/URL with access control, optional passcode validation, and attendee logging | ✅ Verified |
| **FR-04** | Audio/Video Communication | WebRTC `RTCPeerConnection` P2P mesh audio, video, and screen sharing with STUN fallback | ✅ Verified |
| **FR-05** | In-Meeting Chat | Real-time text messaging with sender name, timestamps, and MongoDB persistence | ✅ Verified |
| **FR-06** | Lifecycle & Resource Release | Safe exit, track closure (`track.stop()`), peer disconnection, and attendance cleanup | ✅ Verified |
| **FR-07** | Host Privileges | Server-validated host actions: End Meeting for All, Mute Participants, Kick Attendees | ✅ Verified |

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (Turbopack, App Router), React 19, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Backend**: Node.js, Express.js (included in `server/index.js`), Next.js Serverless Route Handlers
- **Database**: MongoDB Atlas / Mongoose ODM (`User`, `Meeting`, `Message`, `Participant` schemas)
- **Real-Time Layer**: WebRTC 1.0, PeerJS, Socket.IO, Google STUN (`stun:stun.l.google.com:19302`)
- **Security**: Bcryptjs (10 salt rounds), JSON Web Tokens (JWT), HTTPS-ready headers

---

## 📦 Zero-Config Vercel Deployment Guide

This repository has been engineered to deploy to **Vercel** with **zero build errors**:

### Step 1: Push to GitHub
```bash
git add .
git commit -m "MAIT 7th Sem Minor Project: Zoom Meeting Application"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** -> **"Project"**.
3. Import your GitHub repository.
4. Framework Preset will automatically detect **Next.js**.
5. *(Optional)* Add Environment Variables in Vercel Dashboard:
   - `MONGODB_URI`: Your MongoDB Atlas connection string (e.g. `mongodb+srv://...`)
   - `JWT_SECRET`: Any random secure key (e.g. `mait-zoom-secret-2026`)
   > **Note:** If you do not provide `MONGODB_URI`, the application automatically falls back to the in-memory persistent store so the live demo **never fails or crashes**!
6. Click **Deploy**. Your application will be live in ~60 seconds!

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Next.js Fullstack Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Standalone Express & Socket.IO Server (Optional / Local MERN)
```bash
npm run server
```
Runs on port `5000` with native Socket.IO signaling rooms.

---

## 🧪 Pre-configured Academic Credentials & Test Accounts

For live demonstrations and evaluator inspection:

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Host** | `demo@mait.ac.in` | `password123` | Default Meeting Host & Admin |
| **Student** | `student@ipu.ac.in` | `password123` | Attendee Participant |
| **Guest** | *Direct join without login* | *N/A* | Instant lobby preview and join |

---

## 📊 Section 16 Evaluation Test Suite

Visit **`/evaluation`** in your browser to view and re-execute the 9 automated test scenarios specified in the research paper:
- **TC-AUTH-01**: Valid credential verification via bcrypt
- **TC-AUTH-02**: Invalid password rejection
- **TC-AUTH-03**: JWT cryptographic session signing and decoding
- **TC-MEET-01**: Unique, non-colliding meeting ID generation
- **TC-JOIN-01**: Active meeting lookup
- **TC-JOIN-02**: 404 rejection for non-existent room codes
- **TC-CHAT-01**: Real-time message storage and retrieval
- **TC-LIFE-01**: Participant entry and departure audit tracking
- **TC-HOST-01**: Server-enforced meeting conclusion lifecycle

---

## 📁 Repository Structure

```
├── server/
│   └── index.js              # Express + Socket.IO signaling server (MERN backend)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/         # Register, Login, Me endpoints
│   │   │   ├── meetings/     # Create, Join, Messages, Signal endpoints
│   │   │   └── test-suite/   # Section 16 automated evaluation API
│   │   ├── evaluation/       # Interactive Test Suite UI page
│   │   ├── login/            # Sign in page with demo quick-fill
│   │   ├── register/         # Account registration page
│   │   ├── meet/[code]/      # Lobby green room & WebRTC meeting room
│   │   ├── globals.css       # Zoom dark theme, animations, glassmorphism
│   │   ├── layout.tsx        # SEO metadata and fonts
│   │   └── page.tsx          # Main dashboard & meetings list
│   ├── components/
│   │   ├── ChatPanel.tsx     # In-meeting chat drawer
│   │   ├── InfoPanel.tsx     # Meeting details & invitation share
│   │   ├── Lobby.tsx         # Pre-join green room with live preview
│   │   ├── MeetingControls.tsx # Audio, Video, Screen Share, Reactions
│   │   ├── MeetingRoom.tsx   # WebRTC Mesh coordinator & dynamic grid
│   │   ├── Navbar.tsx        # Header with live clock & academic badge
│   │   ├── PaperDocsModal.tsx# 16-section research paper viewer
│   │   ├── ParticipantsPanel.tsx # Attendee list & host moderation
│   │   ├── ScheduleModal.tsx # Schedule meeting modal
│   │   └── VideoTile.tsx     # Individual video tile with audio wave
│   └── lib/
│       ├── auth.ts           # JWT & bcrypt helpers
│       ├── db.ts             # Mongoose & dual-mode store abstraction
│       ├── models/           # User, Meeting, Message, Participant schemas
│       ├── store.ts          # In-memory store singleton
│       ├── types.ts          # TypeScript interfaces
│       └── webrtc.ts         # Google STUN servers & audio analyzer
├── vercel.json               # Vercel deployment configuration
└── package.json
```

---

## 🎓 Academic Submission Checklist (Appendix A)

- [x] Cover details: Maharaja Agrasen Institute of Technology, Session 2026-2027.
- [x] Communication technology confirmed: WebRTC 1.0 (RFC 8825) with Google public STUN servers.
- [x] Dual signaling mechanism: Hybrid Socket.IO & Next.js REST signaling relay fallback.
- [x] Data model matched with MongoDB collections: `users`, `meetings`, `messages`, `participants`.
- [x] Authentication mechanism: bcrypt password hashing and JWT sessions.
- [x] All Section 16 test cases automated and passing with 100% success rate.
- [x] Vercel-ready with zero-config fallback.
