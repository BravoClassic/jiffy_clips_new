// Retry AI enrichment for videos that need it (run: npm run reprocess).
//
// Picks up videos that are either stuck in "processing" (the server died
// mid-enrichment) or "ready" but missing an embedding (Groq failed or the
// video predates the pipeline), and runs the same enrichVideo used by the
// upload flow. enrichVideo is idempotent, so re-running is always safe.

import { PrismaClient } from "@prisma/client";
import { enrichVideo } from "../lib/enrich-video";

const prisma = new PrismaClient();

async function main() {
  const videos = await prisma.video.findMany({
    where: {
      OR: [{ status: "processing" }, { embedding: null }],
    },
    select: { id: true, status: true, videoUrl: true },
  });

  if (videos.length === 0) {
    console.log("All videos are fully enriched — nothing to do.");
    return;
  }

  console.log(`Reprocessing ${videos.length} video(s)...`);
  for (const video of videos) {
    console.log(`- ${video.id} (status: ${video.status})`);
    await enrichVideo(video.id);
  }
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
