import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoId, category } = body;

    if (!videoId || !category) {
      return NextResponse.json(
        { error: "Missing videoId or category in the request body" },
        { status: 400 }
      );
    }

    const categoryRecord = await prisma.category.upsert({
      where: { name: category },
      update: {},
      create: { name: category },
    });

    await prisma.videoCategory.upsert({
      where: {
        videoId_categoryId: { videoId, categoryId: categoryRecord.id },
      },
      update: {},
      create: { videoId, categoryId: categoryRecord.id },
    });

    return NextResponse.json({
      message: "Category added successfully",
      categoryId: categoryRecord.id,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
