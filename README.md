# Jiffy Clips

Jiffy Clips is an AI-powered short-video platform inspired by TikTok. It supports authenticated video upload, vertical short-video playback, paginated feed delivery, AI-generated video descriptions, automated tag/category generation, and social features including likes, comments, follows, and a following feed.

The project was built to explore short-video content understanding and recommendation foundations, including how multimodal AI can transform uploaded video content into structured metadata for retrieval, ranking, and discovery.

Everything runs locally: videos are stored on disk, metadata lives in a SQLite database, and AI analysis uses Groq's free tier — no paid services or cloud infrastructure required.

## Key Features

- **Short-video upload and playback**: Users can upload videos and view them in a vertical, TikTok-style feed with autoplay/pause based on the active video.
- **AI video analysis**: Frames are extracted from uploaded videos with ffmpeg and analyzed by Groq's Llama 4 Scout vision model to generate concise descriptions.
- **Automated tagging and categorization**: The same vision pipeline generates structured tags and broader content categories.
- **Following feed**: A dedicated `/following` feed shows videos only from creators the user follows.
- **Likes and comments**: Users can like/unlike videos and read or post comments through a comments drawer.
- **Follow/unfollow**: One-tap follow toggling between users.
- **Report-to-hide moderation**: Reporting a video flags it and removes it from all feeds.
- **Local-first storage**: Video files are saved to local disk and metadata is stored in SQLite via Prisma.
- **Paginated feed retrieval**: Feeds are fetched through API routes using limit/offset pagination.
- **Authentication**: Clerk is used for user authentication and protected workflows; users are synced into the local database.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Backend/API**: Next.js API Routes
- **Database**: SQLite via Prisma ORM (`prisma/dev.db`)
- **Video Storage**: Local filesystem (`public/uploads/videos`)
- **AI / Multimodal Analysis**: Groq free tier with `meta-llama/llama-4-scout-17b-16e-instruct` (vision)
- **Frame Extraction**: `ffmpeg-static` (bundled ffmpeg binary, no system install needed)
- **Recommendation Approach**: Content-based filtering using AI-generated descriptions, tags, and categories

## System Overview

```text
User uploads video
        ↓
Next.js upload flow saves file to public/uploads/videos
        ↓
ffmpeg-static extracts 5 evenly spaced frames (lib/video-frames.ts)
        ↓
Groq Llama 4 Scout analyzes the frames (lib/groq.ts)
        ↓
Generated description, tags, and categories
        ↓
Metadata stored in SQLite via Prisma
        ↓
Tags/categories linked through join tables
        ↓
Paginated For You + Following feeds with likes, comments, and moderation
```

## Core Workflows

### 1. Video Upload

Users upload video files through the application. The upload flow sends the video to a backend API route, which stores the file under `public/uploads/videos` with a generated file name and creates a video record in SQLite linked to the authenticated user.

### 2. Multimodal Video Understanding

Groq's vision models accept images rather than raw video, so the pipeline first extracts up to 5 frames spread evenly across the video using the bundled ffmpeg binary (`lib/video-frames.ts`). The frames are sent to the `meta-llama/llama-4-scout-17b-16e-instruct` model (`lib/groq.ts`), which generates:

- A concise video description
- Specific tags describing the content
- Broader content categories such as Entertainment, Education, Fitness, Food, Travel, Lifestyle, Nature, Technology, Sports, or Events

### 3. Metadata Storage

The generated tags and categories are stored in SQLite through Prisma. Tags and categories are upserted to avoid duplicates, then linked to each uploaded video through the `VideoTag` and `VideoCategory` join tables (see `prisma/schema.prisma`).

### 4. Feed Delivery

The home feed retrieves unflagged videos using paginated API routes (`limit`/`offset`). The `/following` feed applies the same pagination but filters to creators the current user follows. The frontend uses a vertical feed interface with active-video detection and autoplay/pause behavior.

### 5. Social Interaction

Users can like videos (toggled, with live like counts), post and read comments, and follow or unfollow creators. Reporting a video records a report and immediately flags the video, hiding it from all feeds.

### 6. Recommendation Foundation

Jiffy Clips uses AI-generated video metadata as the basis for content-based recommendation. Tags and categories can be used to retrieve similar videos, support cold-start discovery, and improve short-video ranking logic. Engagement signals (likes, comments, follows) provide the groundwork for future collaborative filtering.

## Main API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/upload-video` | POST | Saves the video file to local disk and creates a video record |
| `/api/analyze-video` | POST | Extracts frames and generates a concise description via Groq |
| `/api/generate-tags` | POST | Generates structured tags and categories via Groq |
| `/api/add-tag` | POST | Upserts tags and links them to videos |
| `/api/add-category` | POST | Upserts categories and links them to videos |
| `/api/get-videos` | GET | Retrieves the paginated For You feed (excludes flagged videos) |
| `/api/videos/following` | GET | Retrieves the paginated feed of followed creators |
| `/api/videos/[videoId]/like` | POST | Toggles a like and returns the updated like count |
| `/api/videos/[videoId]/comments` | GET / POST | Lists or adds comments on a video |
| `/api/videos/[videoId]/report` | POST | Reports a video and flags it as hidden |
| `/api/follow` | POST | Toggles following a user |
| `/api/users/sync` | POST | Syncs the authenticated Clerk user into the local database |

## Data Model

The Prisma schema (`prisma/schema.prisma`) defines:

- **User** — mirrors the Clerk user, with relations to videos, likes, comments, reports, and follows
- **Video** — file URL, description, and a `flagged` field used for report-to-hide moderation
- **Like / Comment / Report** — per-user interactions on videos
- **Follow** — follower/following pairs powering the following feed
- **Tag / Category** — upserted by name and linked to videos through `VideoTag` and `VideoCategory` join tables

## Why This Project Matters

Jiffy Clips demonstrates a practical foundation for short-video content understanding and recommendation systems. The project connects user-facing product workflows with multimodal AI analysis, structured metadata generation, backend storage, social engagement signals, and recommendation-oriented retrieval.

This project is especially relevant to machine learning and recommendation roles focused on:

- Short-video content understanding
- Multimodal AI applications
- AI labeling and auto-tagging
- Content-based recommendation systems
- Cold-start content discovery
- User-facing ML product development

## Future Improvements

- Add vector embeddings for generated descriptions, tags, and categories
- Add vector embeddings for user profiles based on their interactions and followed creators
- Implement semantic retrieval over the generated metadata
- Track richer user-video events such as views, skips, and watch duration
- Build a hybrid ranking model using tag overlap, category match, embedding similarity, and engagement signals (likes, comments, follows)
- Add offline recommendation evaluation using Precision@K, coverage, and diversity metrics
- Add transcript/audio understanding for richer multimodal metadata

## Getting Started

### Prerequisites

- Node.js
- npm
- Clerk project (free at [clerk.com](https://clerk.com))
- Groq API key (free at [console.groq.com](https://console.groq.com))

No database server or ffmpeg installation is required — SQLite and the ffmpeg binary are handled by the project's dependencies.

### Environment Variables

Create a `.env.local` file (see `.env.example`) and configure the required keys:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
GROQ_API_KEY=
```

### Install Dependencies

```bash
npm install
```

This also runs `prisma generate` automatically via the `postinstall` script.

### Create the Database

```bash
npx prisma db push
```

This creates the local SQLite database at `prisma/dev.db` from the Prisma schema.

### Run Locally

```bash
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

Uploaded videos are written to `public/uploads/videos` and served as static files.

## Project Status

Jiffy Clips is an early-stage prototype focused on demonstrating AI-powered short-video content understanding and recommendation foundations. The current implementation supports video upload, AI-generated metadata via Groq, local SQLite storage, paginated For You and Following feeds, likes, comments, follows, and report-to-hide moderation. Future work will focus on embeddings, hybrid recommendation ranking, and interaction-based personalization.
