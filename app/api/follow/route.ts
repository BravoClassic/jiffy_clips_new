import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { followingId } = body;

    if (!followingId) {
      return NextResponse.json(
        { error: "followingId is required" },
        { status: 400 }
      );
    }

    if (followingId === userId) {
      return NextResponse.json(
        { error: "You cannot follow yourself" },
        { status: 400 }
      );
    }

    const user = await currentUser();
    await ensureUser({
      id: userId,
      username: user?.username ?? user?.firstName ?? null,
      imageUrl: user?.imageUrl ?? null,
    });
    await ensureUser({ id: followingId });

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: userId, followingId },
      },
    });

    let following: boolean;
    if (existingFollow) {
      await prisma.follow.delete({ where: { id: existingFollow.id } });
      following = false;
    } else {
      await prisma.follow.create({
        data: { followerId: userId, followingId },
      });
      following = true;
    }

    return NextResponse.json({ following });
  } catch (error) {
    console.error("Error toggling follow:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
