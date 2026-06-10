import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeVideos } from "@/lib/serialize-video";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const viewerId = url.searchParams.get("viewerId");

    if (!viewerId) {
      return NextResponse.json(
        { error: "viewerId is required" },
        { status: 400 }
      );
    }

    const follows = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const followingIds = follows.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    const videos = await prisma.video.findMany({
      where: { flagged: false, userId: { in: followingIds } },
      orderBy: { createdAt: "desc" },
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
