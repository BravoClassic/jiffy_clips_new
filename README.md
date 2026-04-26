# Jiffy Clips

Jiffy Clips is an AI-powered short-video platform inspired by TikTok. It supports authenticated video upload, vertical short-video playback, paginated feed delivery, AI-generated video descriptions, automated tag/category generation, and Supabase-backed video metadata storage.

The project was built to explore short-video content understanding and recommendation foundations, including how multimodal AI can transform uploaded video content into structured metadata for retrieval, ranking, and discovery.

## Key Features

- **Short-video upload and playback**: Users can upload videos and view them in a vertical, TikTok-style feed.
- **AI video analysis**: Uploaded videos are analyzed with Gemini 1.5 Flash to generate concise descriptions.
- **Automated tagging and categorization**: Gemini generates structured tags and categories from video content.
- **Supabase-backed storage**: Videos are uploaded to Supabase Storage, while metadata is stored in Supabase tables.
- **Metadata pipeline**: Generated tags and categories are upserted and linked to videos through `video_tags` and `video_categories` join tables.
- **Paginated feed retrieval**: Videos are fetched through API routes using limit/offset pagination.
- **Recommendation foundation**: AI-generated tags and categories support content-based video discovery, similarity matching, and cold-start ranking for newly uploaded clips.
- **Authentication**: Clerk is used for user authentication and protected upload workflows.

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Backend/API**: Next.js API Routes
- **Database and Storage**: Supabase, Supabase Storage
- **AI / Multimodal Analysis**: Gemini 1.5 Flash, Google Generative AI
- **Recommendation Approach**: Content-based filtering using AI-generated descriptions, tags, and categories

## System Overview

```text
User uploads video
        ↓
Next.js upload flow
        ↓
Gemini 1.5 Flash analyzes video
        ↓
Generated description, tags, and categories
        ↓
Video stored in Supabase Storage
        ↓
Metadata stored in Supabase tables
        ↓
Tags/categories linked through join tables
        ↓
Paginated feed + recommendation foundation
```

## Core Workflows

### 1. Video Upload

Users upload video files through the application. The upload flow sends the video to backend API routes, validates the request, and stores the video in Supabase Storage with a generated file name.

### 2. Multimodal Video Understanding

Uploaded videos are passed to Gemini 1.5 Flash using Google Generative AI. The model analyzes the video and generates:

- A concise video description
- Specific tags describing the content
- Broader content categories such as Entertainment, Education, Fitness, Food, Travel, Lifestyle, Nature, Technology, Sports, or Events

### 3. Metadata Storage

The generated tags and categories are stored in Supabase. Tags and categories are upserted to avoid duplicates, then linked to each uploaded video through relational join tables.

### 4. Feed Delivery

The home feed retrieves videos from Supabase using paginated API routes. The frontend uses a vertical feed interface with active-video detection and autoplay/pause behavior.

### 5. Recommendation Foundation

Jiffy Clips uses AI-generated video metadata as the basis for content-based recommendation. Tags and categories can be used to retrieve similar videos, support cold-start discovery, and improve short-video ranking logic.

## Main API Routes

| Route | Purpose |
|---|---|
| `/api/analyze-video` | Uses Gemini to generate a concise video description |
| `/api/generate-tags` | Uses Gemini to generate structured tags and categories |
| `/api/upload-video` | Uploads video files to Supabase Storage and stores video metadata |
| `/api/add-tag` | Upserts tags and links them to videos |
| `/api/add-category` | Upserts categories and links them to videos |
| `/api/get-videos` | Retrieves videos from Supabase with pagination |

## Why This Project Matters

Jiffy Clips demonstrates a practical foundation for short-video content understanding and recommendation systems. The project connects user-facing product workflows with multimodal AI analysis, structured metadata generation, backend storage, and recommendation-oriented retrieval.

This project is especially relevant to machine learning and recommendation roles focused on:

- Short-video content understanding
- Multimodal AI applications
- AI labeling and auto-tagging
- Content-based recommendation systems
- Cold-start content discovery
- User-facing ML product development

## Future Improvements

- Add vector embeddings for generated descriptions, tags, and categories
- Implement semantic retrieval with Supabase `pgvector`
- Track user-video events such as views, likes, skips, and watch duration
- Build a hybrid ranking model using tag overlap, category match, embedding similarity, and engagement signals
- Add offline recommendation evaluation using Precision@K, coverage, and diversity metrics
- Add transcript/audio understanding for richer multimodal metadata

## Getting Started

### Prerequisites

- Node.js
- npm
- Supabase project
- Clerk project
- Google Generative AI API key

### Environment Variables

Create a `.env.local` file and configure the required keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_KEY=
NEXT_PUBLIC_GOOGLE_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

### Install Dependencies

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

## Project Status

Jiffy Clips is an early-stage prototype focused on demonstrating AI-powered short-video content understanding and recommendation foundations. The current implementation supports video upload, AI-generated metadata, Supabase storage, and a paginated vertical feed. Future work will focus on embeddings, hybrid recommendation ranking, and interaction-based personalization.
