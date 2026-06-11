import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";

// The player reports implicit engagement here: "view" when a video becomes
// active, "watch" (with watchMs/durationMs) when it stops being active, and
// "share" when the share button is used. These events power both the share
// counter and the For You ranking's watch/skip signals.
const VALID_TYPES = new Set(["view", "watch", "share"]);

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
    const type = body.type as string;

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // Clamp client-supplied durations to sane bounds: non-negative, and no
    // longer than 30 minutes so a backgrounded tab can't poison the signal.
    const clamp = (value: unknown) =>
      typeof value === "number" && isFinite(value)
        ? Math.min(Math.max(0, Math.round(value)), 30 * 60 * 1000)
        : null;

    const user = await currentUser();
    await ensureUser({
      id: userId,
      username: user?.username ?? user?.firstName ?? null,
      imageUrl: user?.imageUrl ?? null,
    });

    await prisma.videoEvent.create({
      data: {
        videoId,
        userId,
        type,
        watchMs: clamp(body.watchMs),
        durationMs: clamp(body.durationMs),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error recording video event:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
