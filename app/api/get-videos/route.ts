import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeVideos } from "@/lib/serialize-video";
import { getForYouVideos } from "@/lib/recommend";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const viewerId = url.searchParams.get("viewerId");
    const sort = url.searchParams.get("sort");

    if (sort === "foryou" && viewerId) {
      // Personalized ranking; returns null when the viewer has no likes
      // yet, in which case we fall through to the recency feed below.
      const recommended = await getForYouVideos({ viewerId, limit, offset });
      if (recommended) {
        return NextResponse.json({ videos: recommended });
      }
    }

    // Only fully processed videos are served; "processing" ones are still
    // being enriched in the background.
    const videos = await prisma.video.findMany({
      where: { flagged: false, status: "ready" },
      orderBy:
        sort === "top"
          ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
          : { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        user: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    return NextResponse.json({
      videos: await serializeVideos(videos, viewerId),
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
