# AdaptiveEduApp

AdaptiveEduApp is a MERN-stack learning platform built for personalised instruction and instructor-led course management.  
It combines adaptive content recommendations, rich material viewing, and a full gamification engine (XP, badges, streaks, and daily goals) to keep students engaged while giving teachers the tools they need to manage courses and resources.

## At a Glance

- **Tech stack:** React 18, React Router 7, Express 4, MongoDB (Mongoose 7), Node.js, Passport (Google & GitHub), Axios.
- **Adaptive learning:** Manual learning style entry, ML prediction endpoint, personalised "For You" feed, learning-style-aware material filters.
- **Engagement features:** In-app note taking, PDF/media viewer with expand mode, interaction tracking, points + badges + streaks, daily goal tracking.
- **Collaboration tools:** Course likes, discussion threads, completion tracking, teacher-controlled material activation.

---

## Table of Contents
1. [Project Structure](#project-structure)
2. [Key Features](#key-features)
3. [Prerequisites](#prerequisites)
4. [Environment Variables](#environment-variables)
5. [Installation](#installation)
6. [Running the App](#running-the-app)
7. [Core Workflows](#core-workflows)
8. [API Highlights](#api-highlights)
9. [Development Tips](#development-tips)
10. [License](#license)

---

## Project Structure
```
AdaptiveEduApp/
├─ backend/                 # Express REST API, MongoDB access, gamification engine
│  ├─ auth.js               # Authentication, profile, learning style routes
│  ├─ courses.js            # Course CRUD, materials, likes/comments, tracking
│  ├─ gamification.js       # XP, badges, streaks, daily goals logic
│  ├─ models.js             # Mongoose schemas for students, teachers, courses, content
│  ├─ index.js              # Server bootstrap
│  └─ uploaded_files/       # Material uploads stored by the API
├─ frontend/                # React single-page application
│  ├─ src/
│  │  ├─ App.css            # Global styles (light/dark themes, layout)
│  │  ├─ App.js             # Top-level routing
│  │  ├─ context/           # Auth provider with XP/badge/streak state
│  │  ├─ Home.js            # Dashboard, gamification stats, personalised feed
│  │  ├─ Courses.js         # Course catalogue + enrollment views
│  │  ├─ CoursesDetail.js   # Course material view with filters & modal viewer
│  │  ├─ MaterialViewer.js  # Rich material viewer, note pad, XP tracking
│  │  ├─ Profile.js         # Profile editor, learning style form, badge gallery
│  │  ├─ UploadMaterial.js  # Teacher material upload workflow
│  │  └─ UserHeader.js      # Header & sidebar with student metrics
│  ├─ public/               # Static assets & HTML template
│  └─ package.json          # React app configuration
├─ uploaded_files/          # Shared public file store (mirrors backend uploads)
└─ README.md                # You are here
```

---

## Key Features

### Student Experience
- **Adaptive learning styles**: Fetch ML predictions or manually set Felder–Silverman preferences; the Home feed and filters respect these flags.
- **Personalised feed**: `/api/courses/student/for-you` recommends materials drawn from enrolled courses and matched to the student’s style.
- **Material viewer**: Unified player for video, audio, PDF, flashcards, and quizzes with:
  - Expandable PDF mode
  - In-app notes saved per user/session
  - Timer-based tracking that posts to `/interaction` for XP and progress
- **Gamification**: XP gain (login, view, complete, quiz), badge unlocks, login/lesson streaks, and daily goal tracking with toast notifications.
- **Course engagement**: Like courses, view discussion threads, and monitor completion progress.

### Teacher Experience
- **Course parity**: Teacher “My Courses” mirrors the student layout while exposing authoring controls.
- **Material management**: Upload multimedia content, mark active/inactive, define annotations that power the adaptive engine.
- **Bulk visibility**: Course detail page lists all uploads in order with quick preview (including PDFs) and expand options.

### Admin & Shared Utilities
- **Role-based access**: Students, Teachers, Admin each have tailored dashboards/permissions.
- **Auth providers**: Email/password, Google OAuth, and GitHub OAuth with shared profile storage.
- **Analytics-ready models**: Interaction documents record time-on-task, annotations, and completion state for downstream use.

---

## Prerequisites
- **Node.js** ≥ 18.x (LTS recommended)
- **npm** ≥ 9.x
- **MongoDB** ≥ 6.x running locally or accessible via connection string
- (Optional) **Python ML service** reachable at `ML_API_URL` if prediction route is used
- Google & GitHub OAuth app credentials for social login (development creds acceptable)

---

## Environment Variables
Create `.env` files in both `backend/` and `frontend/` based on the samples below.

### `backend/.env`
```
MONGO_URI=mongodb://localhost:27017/apex101
PORT=5000
JWT_SECRET=change_me
GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
ML_API_URL=http://localhost:5001/predict   # optional, only if ML service is available
```

### `frontend/.env`
```
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_FILE_BASE_URL=http://localhost:5000        # optional override for asset URLs
REACT_APP_API_BASE_URL=http://localhost:5000/api     # optional override for API base
```

> **Note:** Never commit secrets. The values in the repository `.env` files are development placeholders only.

---

## Installation
Clone the repository and install dependencies for both server and client.

```bash
git clone <repo-url>
cd AdaptiveEduApp

# Backend setup
cd backend
npm install

# Frontend setup
cd ../frontend
npm install
```

---

## Running the App
Launch backend and frontend in separate terminals.

```bash
# Terminal 1 – backend
cd backend
npm run dev   # or `npm start` for production mode

# Terminal 2 – frontend
cd frontend
npm start
```

- Backend runs on [http://localhost:5000](http://localhost:5000)
- Frontend runs on [http://localhost:3000](http://localhost:3000) and proxies API calls to the backend
- MongoDB must be running before starting the backend
- The gamification engine seeds badge definitions automatically on first access

For production deployments, build the React app with `npm run build` and serve static assets from your preferred hosting provider. Remember to configure environment variables and HTTPS OAuth callbacks appropriately.

---

## Core Workflows

### Authentication & Profiles
1. Register or log in as Student/Teacher/Admin.
2. For Students:
   - Visit the Profile page to view XP, badges, streaks, and daily goals.
   - Use the plus button to enter manual learning styles or jump to the ILS questionnaire.
3. For Teachers/Admin:
   - Update profile basics (name, avatar, password) and manage courses/materials.

### Exploring Courses
- **Courses page**: Browse “All / Featured / Enrolled” tabs with consistent card layouts.
- **My Courses (Student)**: Track enrolled courses with completion bars and quick access to materials.
- **My Courses (Teacher)**: Identical grid, with additional links for editing and managing uploads.

### Viewing Materials
1. Select a course to see its grouped materials filtered by format (All, Visual, Verbal, Audio).
2. Click “Open Course” or a specific material card to launch the MaterialViewer.
3. Use the top-left back button, expand PDFs/videos, and capture notes via the floating button.
4. On exit, interaction data is posted for XP, streaks, daily goals, and badge evaluation.

### Teacher Upload Flow
1. Navigate to **Upload Material**.
2. Provide metadata (title, description, order), upload media, and set annotations (format/type/category).
3. Mark content active/inactive; default status is active for new uploads.
4. Students see activated materials immediately in course feeds and personalised recommendations.

---

## API Highlights
While the Express API is extensive, the endpoints below underpin the adaptive and gamified experience:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/login`, `/auth/google`, `/auth/github` | Multi-provider authentication |
| `GET`  | `/api/profile` | Fetch profile, XP, badges, streaks, daily goals |
| `POST` | `/api/set-style` | Manually set learning style flags |
| `POST` | `/api/predict-style/:playlistId` | Trigger ML prediction (requires external ML service) |
| `GET`  | `/api/courses` | Course catalogue |
| `GET`  | `/api/courses/student/for-you` | Personalised material recommendations |
| `POST` | `/api/courses/:courseId/materials/:materialId/interaction` | Track time spent, completion, award XP/badges |
| `POST` | `/api/courses/:courseId/materials` | Teacher material uploads (multipart) |
| `POST` | `/api/courses/:courseId/like` / `/comment` | Course engagement features |
| `GET`  | `/api/gamification/summary` | Returns XP, badges, streaks, daily goal status, badge catalog |

Refer to `backend/auth.js` and `backend/courses.js` for full route definitions and middleware requirements.

---

## Development Tips
- Run `npm run dev` in the backend for hot reloading via Nodemon.
- Uploaded files in development are written to `backend/uploaded_files/`; ensure this path exists in production and configure static serving as needed.
- Material annotations (`format`, `type`, `category`) fuel the adaptive recommendations—pick accurate values during upload.
- The MaterialViewer local notepad persists per user in `localStorage` under `materialViewerNotes:<userId>` and clears on logout.
- Badge seeding occurs lazily; hitting any `/gamification` route after server start ensures definitions are up-to-date.
- If the optional Python ML service is offline, `/predict-style` will return a 500. Manual style entry continues to work independently.

---

## License
Distributed under the MIT License. See the backend `package.json` for confirmation and update license files if the distribution terms change.

---

**Need help?**  
- Verify the backend console for API errors (especially on 500s).  
- Double-check environment variables when OAuth or MongoDB connections fail.  
- The toast notifications in the frontend surface most gamification events—use them to confirm tracking logic during manual testing.

Happy building! 🚀
