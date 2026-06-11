import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { serializeVideos } from "@/lib/serialize-video";

// Polled by the upload progress card while a video is being enriched.
// Returns the current status, and once the video is "ready", the full
// feed-shaped object so the client can drop it straight into the feed.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { videoId } = await params;

  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        user: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.status !== "ready") {
      return NextResponse.json({ status: video.status });
    }

    const [serialized] = await serializeVideos([video], userId);
    return NextResponse.json({ status: "ready", video: serialized });
  } catch (error) {
    console.error("Error fetching video status:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
