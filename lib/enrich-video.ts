import path from "path";
import { prisma } from "./prisma";
import { extractFrames } from "./video-frames";
import { askGroqAboutFrames, parseJsonResponse } from "./groq";
import { buildVideoText, embedText, embeddingToBuffer } from "./embeddings";

// One Groq vision call returns everything we need about the video.
const ANALYSIS_PROMPT = `
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

type Analysis = {
  description: string;
  tags: string[];
  categories: string[];
};

function cleanNames(values: unknown, max: number): string[] {
  if (!Array.isArray(values)) return [];
  const names = values
    .filter((name): name is string => typeof name === "string")
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name.length <= 50);
  return Array.from(new Set(names)).slice(0, max);
}

// Background AI enrichment for a freshly uploaded video. Runs server-side
// after the upload response has already been sent, so the user is back in
// the feed while this works. The pipeline is best-effort: any step may fail
// (Groq rate limit, unreadable file) and the video still goes live — it just
// won't have AI metadata until the backfill script retries it.
//
// Steps:
//   1. extract 5 frames from the file on disk (ffmpeg)
//   2. one Groq vision call -> description + tags + categories
//   3. link tags/categories (connectOrCreate dedupes shared names)
//   4. embed caption + AI text -> vector for For You ranking
//   5. flip status "processing" -> "ready" so feeds start serving it
export async function enrichVideo(videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return;

  try {
    // The public URL maps 1:1 onto a file inside public/.
    const filePath = path.join(process.cwd(), "public", video.videoUrl);

    const frames = await extractFrames(filePath);
    const responseText = await askGroqAboutFrames(frames, ANALYSIS_PROMPT);
    const analysis = parseJsonResponse<Analysis>(responseText);

    const aiDescription =
      typeof analysis.description === "string"
        ? analysis.description.trim()
        : "";
    const tags = cleanNames(analysis.tags, 10);
    const categories = cleanNames(analysis.categories, 3);

    // The user's own caption wins; the AI description fills the gap when
    // they left it empty.
    const description = video.description || aiDescription || null;

    // Make re-runs idempotent (the reprocess script retries failed
    // enrichments): clear old links before recreating them.
    await prisma.videoTag.deleteMany({ where: { videoId } });
    await prisma.videoCategory.deleteMany({ where: { videoId } });

    await prisma.video.update({
      where: { id: videoId },
      data: {
        description,
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
    });

    // Embed caption + AI description + tags + categories together so the
    // vector captures everything we know about the video.
    const text = buildVideoText({
      description: [video.description, aiDescription]
        .filter(Boolean)
        .join("\n"),
      tags,
      categories,
    });
    if (text) {
      const embedding = await embedText(text);
      await prisma.video.update({
        where: { id: videoId },
        data: { embedding: embeddingToBuffer(embedding) },
      });
    }
  } catch (error) {
    // Log and fall through: the video is still publishable without AI
    // metadata, and scripts/backfill-embeddings.mjs can retry later.
    console.error(`Enrichment failed for video ${videoId}:`, error);
  } finally {
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "ready" },
    });
  }
}
