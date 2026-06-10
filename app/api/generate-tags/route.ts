import { NextResponse } from "next/server";
import { extractFrames } from "@/lib/video-frames";
import { askGroqAboutFrames } from "@/lib/groq";

function parseJsonResponse(text: string): { tags: string[]; categories: string[] } {
  const fenced = text.match(/```(?:json)?([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const braced = candidate.match(/\{[\s\S]*\}/);

  if (!braced) {
    throw new Error("Failed to extract JSON from model response.");
  }

  const parsed = JSON.parse(braced[0]);
  if (!Array.isArray(parsed.tags) || !Array.isArray(parsed.categories)) {
    throw new Error("Model response is missing tags or categories arrays.");
  }

  return parsed;
}

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

    const prompt = `
These images are evenly spaced frames from one short video. Analyze the video content and generate the following structured output:
1. A list of **tags** that describe specific elements of the video. Each tag should be unique and concise.
2. A list of **categories** that broadly classify the video. Each category should belong to one of the following: [Entertainment, Education, Fitness, Food, Travel, Lifestyle, Nature, Technology, Sports, Events].

Return ONLY the output in the following JSON format, with no other text:
{
  "tags": ["tag1", "tag2", "tag3"],
  "categories": ["category1", "category2"]
}
`;

    const responseText = await askGroqAboutFrames(frames, prompt);
    const { tags, categories } = parseJsonResponse(responseText);

    return NextResponse.json({
      tags,
      categories
    });
  } catch (error) {
    console.error("Error generating tags and categories:", error);
    return NextResponse.json(
      {
        error: "Failed to generate tags and categories",
        details: (error instanceof Error) ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
