import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  try {
    const comments = await prisma.comment.findMany({
      where: { videoId },
      orderBy: { createdAt: "asc" },
      include: { user: true },
    });

    return NextResponse.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        text: comment.text,
        created_at: comment.createdAt,
        user_id: comment.userId,
        username: comment.user.username || comment.userId,
        user_image: comment.user.imageUrl,
      })),
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { videoId } = await params;

  try {
    const body = await req.json();
    const text = (body.text || "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    const user = await currentUser();
    await ensureUser({
      id: userId,
      username: user?.username ?? user?.firstName ?? null,
      imageUrl: user?.imageUrl ?? null,
    });

    const comment = await prisma.comment.create({
      data: { videoId, userId, text },
      include: { user: true },
    });

    const commentsCount = await prisma.comment.count({ where: { videoId } });

    return NextResponse.json({
      comment: {
        id: comment.id,
        text: comment.text,
        created_at: comment.createdAt,
        user_id: comment.userId,
        username: comment.user.username || comment.userId,
        user_image: comment.user.imageUrl,
      },
      commentsCount,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
