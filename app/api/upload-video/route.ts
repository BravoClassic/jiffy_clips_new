import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { enrichVideo } from "@/lib/enrich-video";

// Upload is intentionally minimal: persist the file, create a "processing"
// video row, and respond immediately. All AI work (description, tags,
// categories, embedding) happens in the background via enrichVideo — the
// client polls /api/videos/[id]/status until the video flips to "ready".
// This means the video file crosses the wire exactly once.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const description = (formData.get("description") as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Persist the video to local disk under public/ so Next serves it
    // statically at /uploads/videos/<name>.
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "videos");
    fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `${nanoid()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(path.join(uploadsDir, fileName), Buffer.from(arrayBuffer));

    const videoUrl = `/uploads/videos/${fileName}`;

    // Make sure the uploader exists in the local DB before linking the video.
    const user = await currentUser();
    await ensureUser({
      id: userId,
      username: user?.username ?? user?.firstName ?? null,
      imageUrl: user?.imageUrl ?? null,
    });

    // status "processing" keeps the video out of all feeds until enrichment
    // finishes; the user's own caption (if any) is stored right away.
    const video = await prisma.video.create({
      data: {
        userId,
        videoUrl,
        description: description || null,
        status: "processing",
      },
    });

    // Fire-and-forget: the local Node server keeps running this promise
    // after the response is sent. Failures inside are logged and the video
    // still goes live (see enrichVideo).
    enrichVideo(video.id).catch((error) =>
      console.error(`Background enrichment crashed for ${video.id}:`, error)
    );

    return NextResponse.json({
      message: "Video uploaded; AI processing started",
      videoId: video.id,
      videoUrl,
      status: "processing",
    });
  } catch (error) {
    console.error("Error handling video upload:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
