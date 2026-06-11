// Offline evaluation of the For You recommender (run: npm run eval).
//
// Method: leave-one-out holdout. For every user with at least 2 likes, we
// hide one like at a time, rebuild their taste profile from the remaining
// likes, rank the whole catalog with the exact same scoring code the live
// feed uses (lib/recommend.ts), and check where the hidden video landed.
//
// Metrics:
//   Hit@K     — fraction of holdouts where the hidden like ranked in top K
//   MRR       — mean reciprocal rank (1.0 = always ranked first)
//   Coverage  — share of the catalog that ever appears in a top-10 list
//               (low coverage = the recommender always pushes the same videos)
//   Diversity — average number of distinct categories in a top-10 list
//               (1.0 category = filter bubble, higher = more varied feeds)
//
// Exploration slots are intentionally NOT applied here: we evaluate the
// ranker itself, not the randomness sprinkled on top.

import { PrismaClient } from "@prisma/client";
import {
  buildTasteProfile,
  scoreCandidates,
  type ProfileSource,
  type ScorableVideo,
} from "../lib/recommend";
import { bufferToEmbedding } from "../lib/embeddings";

const prisma = new PrismaClient();
const K_VALUES = [5, 10];

type VideoWithMeta = {
  id: string;
  userId: string;
  createdAt: Date;
  embedding: Uint8Array | null;
  tags: { tag: { name: string } }[];
  categories: { category: { name: string } }[];
  _count: { likes: number; comments: number };
};

function toScorable(video: VideoWithMeta): ScorableVideo {
  return {
    id: video.id,
    createdAt: video.createdAt,
    tags: video.tags.map((t) => t.tag.name),
    categories: video.categories.map((c) => c.category.name),
    embedding: video.embedding ? bufferToEmbedding(Buffer.from(video.embedding)) : null,
    likes: video._count.likes,
    comments: video._count.comments,
  };
}

function toProfileSource(video: VideoWithMeta): ProfileSource {
  return {
    videoId: video.id,
    tags: video.tags.map((t) => t.tag.name),
    categories: video.categories.map((c) => c.category.name),
    embedding: video.embedding ? bufferToEmbedding(Buffer.from(video.embedding)) : null,
    weight: 1.0,
  };
}

async function main() {
  // The full catalog, as the live ranker would see it.
  const allVideos: VideoWithMeta[] = await prisma.video.findMany({
    where: { flagged: false, status: "ready" },
    include: {
      tags: { include: { tag: true } },
      categories: { include: { category: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  const videoById = new Map(allVideos.map((v) => [v.id, v]));

  // Users with enough signal to evaluate (need 1 like for the profile + 1
  // held out).
  const users = await prisma.user.findMany({
    include: { likes: { orderBy: { createdAt: "desc" } } },
  });
  const evalUsers = users.filter((u) => u.likes.length >= 2);

  if (evalUsers.length === 0) {
    console.log(
      "Not enough data to evaluate: need at least one user with 2+ likes."
    );
    return;
  }

  const hits = new Map<number, number>(K_VALUES.map((k) => [k, 0]));
  let mrrSum = 0;
  let trials = 0;
  const recommendedIds = new Set<string>(); // for coverage
  let diversitySum = 0;

  for (const user of evalUsers) {
    for (const heldOut of user.likes) {
      const heldOutVideo = videoById.get(heldOut.videoId);
      if (!heldOutVideo) continue; // liked video was flagged/removed

      // Profile from every like EXCEPT the held-out one.
      const trainingLikes = user.likes.filter(
        (l) => l.videoId !== heldOut.videoId
      );
      const sources = trainingLikes
        .map((l) => videoById.get(l.videoId))
        .filter((v): v is VideoWithMeta => Boolean(v))
        .map(toProfileSource);
      if (sources.length === 0) continue;

      const profile = buildTasteProfile(sources);

      // Candidates: the catalog minus the training likes — the held-out
      // video stays in, since the question is "would we have surfaced it?"
      const trainingIds = new Set(trainingLikes.map((l) => l.videoId));
      const candidates = allVideos
        .filter((v) => !trainingIds.has(v.id))
        .map(toScorable);

      const ranked = scoreCandidates(profile, candidates);
      const rank =
        ranked.findIndex((r) => r.video.id === heldOut.videoId) + 1;
      if (rank === 0) continue;

      trials++;
      mrrSum += 1 / rank;
      for (const k of K_VALUES) {
        if (rank <= k) hits.set(k, hits.get(k)! + 1);
      }

      // Coverage + diversity from this trial's top 10.
      const top10 = ranked.slice(0, 10);
      const categoriesInTop = new Set<string>();
      for (const item of top10) {
        recommendedIds.add(item.video.id);
        item.video.categories.forEach((c) => categoriesInTop.add(c));
      }
      diversitySum += categoriesInTop.size;
    }
  }

  console.log("=== Offline recommendation evaluation ===");
  console.log(`Users evaluated:   ${evalUsers.length}`);
  console.log(`Holdout trials:    ${trials}`);
  console.log(`Catalog size:      ${allVideos.length}`);
  console.log("");
  for (const k of K_VALUES) {
    const rate = trials ? (hits.get(k)! / trials) * 100 : 0;
    console.log(`Hit@${k}:            ${rate.toFixed(1)}%  (${hits.get(k)}/${trials} holdouts ranked in top ${k})`);
  }
  console.log(`MRR:               ${(trials ? mrrSum / trials : 0).toFixed(3)}  (1.0 = hidden like always ranked #1)`);
  console.log(`Coverage@10:       ${((recommendedIds.size / Math.max(1, allVideos.length)) * 100).toFixed(1)}%  (${recommendedIds.size}/${allVideos.length} videos ever recommended)`);
  console.log(`Avg categories in top 10: ${(trials ? diversitySum / trials : 0).toFixed(1)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
