import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";

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
    const body = await req.json().catch(() => ({}));
    const reason = (body.reason || "").trim() || null;

    const user = await currentUser();
    await ensureUser({
      id: userId,
      username: user?.username ?? user?.firstName ?? null,
      imageUrl: user?.imageUrl ?? null,
    });

    await prisma.report.create({
      data: { videoId, userId, reason },
    });

    await prisma.video.update({
      where: { id: videoId },
      data: { flagged: true },
    });

    return NextResponse.json({ message: "Video reported and hidden" });
  } catch (error) {
    console.error("Error reporting video:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
