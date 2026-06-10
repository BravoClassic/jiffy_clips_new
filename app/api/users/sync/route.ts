import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureUser } from "@/lib/ensure-user";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();

  await ensureUser({
    id: userId,
    username: user?.username ?? user?.firstName ?? null,
    imageUrl: user?.imageUrl ?? null,
  });

  return NextResponse.json({ ok: true });
}
