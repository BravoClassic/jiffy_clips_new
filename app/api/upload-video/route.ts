import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { serializeVideos } from "@/lib/serialize-video";

function parseNameList(value: FormDataEntryValue | null, max: number): string[] {
  if (typeof value !== "string" || !value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    const names = parsed
      .filter((name): name is string => typeof name === "string")
      .map((name) => name.trim())
      .filter((name) => name.length > 0 && name.length <= 50);

    return Array.from(new Set(names)).slice(0, max);
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string | null;
    const tags = parseNameList(formData.get("tags"), 10);
    const categories = parseNameList(formData.get("categories"), 3);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "videos");
    fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `${nanoid()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(path.join(uploadsDir, fileName), buffer);

    const videoUrl = `/uploads/videos/${fileName}`;

    const user = await currentUser();
    await ensureUser({
      id: userId,
      username: user?.username ?? user?.firstName ?? null,
      imageUrl: user?.imageUrl ?? null,
    });

    const video = await prisma.video.create({
      data: {
        userId,
        videoUrl,
        description: description || null,
        tags: {
          create: tags.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        },
        categories: {
          create: categories.map((name) => ({
            category: {
              connectOrCreate: { where: { name }, create: { name } },
            },
          })),
        },
      },
      include: {
        user: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    const [serialized] = await serializeVideos([video], userId);

    return NextResponse.json({
      message: "Video uploaded successfully",
      videoId: video.id,
      videoUrl,
      video: serialized,
    });
  } catch (error) {
    console.error("Error handling video upload:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
