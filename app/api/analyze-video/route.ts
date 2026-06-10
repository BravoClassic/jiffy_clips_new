import { NextResponse } from "next/server";
import { extractFrames } from "@/lib/video-frames";
import { askGroqAboutFrames, parseJsonResponse } from "@/lib/groq";

type Analysis = {
  description: string;
  tags: string[];
  categories: string[];
};

const PROMPT = `
These images are evenly spaced frames from one short video. Analyze the video content and generate the following structured output:
1. A concise, engaging one-paragraph **description** of the video that highlights its main content and purpose.
2. A list of **tags** that describe specific elements of the video. Each tag should be unique and concise.
3. A list of **categories** that broadly classify the video. Each category should belong to one of the following: [Entertainment, Education, Fitness, Food, Travel, Lifestyle, Nature, Technology, Sports, Events].

Return ONLY the output in the following JSON format, with no other text:
{
  "description": "...",
  "tags": ["tag1", "tag2", "tag3"],
  "categories": ["category1", "category2"]
}
`;

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
    const responseText = await askGroqAboutFrames(frames, PROMPT);
    const analysis = parseJsonResponse<Analysis>(responseText);

    if (typeof analysis.description !== "string") {
      throw new Error("Model response is missing a description.");
    }

    return NextResponse.json({
      description: analysis.description.trim(),
      tags: Array.isArray(analysis.tags) ? analysis.tags : [],
      categories: Array.isArray(analysis.categories) ? analysis.categories : [],
    });
  } catch (error) {
    console.error("Error during video analysis:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze video",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
