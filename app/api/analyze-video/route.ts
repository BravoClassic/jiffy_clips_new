import { NextResponse } from "next/server";
import { extractFrames } from "@/lib/video-frames";
import { askGroqAboutFrames } from "@/lib/groq";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get("video") as File;

    if (!videoFile) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    const frames = await extractFrames(videoFile);

    const description = await askGroqAboutFrames(
      frames,
      "These images are evenly spaced frames from one short video. Write a concise, engaging one-paragraph description of the video that highlights its main content and purpose. Respond with the description only — no preamble, labels, or quotes."
    );

    return NextResponse.json(
      { description: description.trim() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during video description generation:", error);
    return NextResponse.json(
      {
        error: "Failed to generate description",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
