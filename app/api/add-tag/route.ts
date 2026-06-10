import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoId, tag } = body;

    if (!videoId || !tag) {
      return NextResponse.json(
        { error: "Missing videoId or tag in the request body" },
        { status: 400 }
      );
    }

    const tagRecord = await prisma.tag.upsert({
      where: { name: tag },
      update: {},
      create: { name: tag },
    });

    await prisma.videoTag.upsert({
      where: { videoId_tagId: { videoId, tagId: tagRecord.id } },
      update: {},
      create: { videoId, tagId: tagRecord.id },
    });

    return NextResponse.json({
      message: "Tag added successfully",
      tagId: tagRecord.id,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
