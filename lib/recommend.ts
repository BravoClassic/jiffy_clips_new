import { prisma } from "./prisma";
import { serializeVideos } from "./serialize-video";
import { bufferToEmbedding, cosineSimilarity } from "./embeddings";

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

const PROFILE_LIKES_LIMIT = 50; // how many recent likes shape the profile
const PROFILE_WATCH_EVENTS_LIMIT = 200; // how many recent watch events we scan
const EXPLORATION_SLOT = 5; // every 5th feed position is a random pick

const FRESHNESS_HALF_LIFE_DAYS = 7; // recency score halves every 7 days
const COMPLETED_RATIO = 0.7; // watched ≥70% counts as a "completion"
const COMPLETED_FALLBACK_MS = 10_000; // ...or ≥10s when duration is unknown
const SKIP_MS = 2_000; // watched <2s counts as a skip
const SEEN_WINDOW_HOURS = 24; // demote videos seen in the last day
const SKIP_WINDOW_DAYS = 3; // demote skipped videos for 3 days

// A like is a deliberate signal; a completed watch is a softer one.
const LIKE_WEIGHT = 1.0;
const COMPLETED_WATCH_WEIGHT = 0.5;

// Penalties multiply the final score, pushing repeats and skips down the
// feed without hiding them entirely (a skipped video may deserve a second
// chance later).
const SEEN_PENALTY = 0.6;
const SKIP_PENALTY = 0.4;

// Relative importance of each scoring component (sums to 1).
const WEIGHTS = {
  embedding: 0.5,
  tags: 0.2,
  categories: 0.1,
  freshness: 0.1,
  popularity: 0.1,
};

// ---------------------------------------------------------------------------
// Pure data shapes — no Prisma types so the offline eval script can reuse
// the exact same profile/scoring code with held-out data.
// ---------------------------------------------------------------------------

export type ProfileSource = {
  videoId: string;
  tags: string[];
  categories: string[];
  embedding: Float32Array | null;
  weight: number; // LIKE_WEIGHT or COMPLETED_WATCH_WEIGHT
};

export type TasteProfile = {
  tagWeights: Map<string, number>;
  categoryWeights: Map<string, number>;
  profileVector: Float32Array | null;
};

export type ScorableVideo = {
  id: string;
  createdAt: Date;
  tags: string[];
  categories: string[];
  embedding: Float32Array | null;
  likes: number;
  comments: number;
};

// ---------------------------------------------------------------------------
// Profile building (pure)
// ---------------------------------------------------------------------------

export function buildTasteProfile(sources: ProfileSource[]): TasteProfile {
  const tagWeights = new Map<string, number>();
  const categoryWeights = new Map<string, number>();

  // Weighted tally: a tag on a liked video adds 1.0, on a completed-watch
  // video adds 0.5. Tags the user engages with repeatedly dominate.
  for (const source of sources) {
    for (const tag of source.tags) {
      tagWeights.set(tag, (tagWeights.get(tag) ?? 0) + source.weight);
    }
    for (const category of source.categories) {
      categoryWeights.set(
        category,
        (categoryWeights.get(category) ?? 0) + source.weight
      );
    }
  }

  // Profile vector = weighted mean of engaged videos' embeddings, then
  // re-normalized so cosine similarity stays a plain dot product.
  let profileVector: Float32Array | null = null;
  const embedded = sources.filter((s) => s.embedding);
  if (embedded.length > 0) {
    const dims = embedded[0].embedding!.length;
    profileVector = new Float32Array(dims);
    for (const source of embedded) {
      for (let i = 0; i < dims; i++) {
        profileVector[i] += source.embedding![i] * source.weight;
      }
    }
    let norm = 0;
    for (let i = 0; i < dims; i++) norm += profileVector[i] ** 2;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dims; i++) profileVector[i] /= norm;
  }

  return { tagWeights, categoryWeights, profileVector };
}

// ---------------------------------------------------------------------------
// Scoring (pure)
// ---------------------------------------------------------------------------

function overlapScore(map: Map<string, number>, names: string[]): number {
  if (map.size === 0 || names.length === 0) return 0;
  let maxWeight = 0;
  map.forEach((weight) => {
    if (weight > maxWeight) maxWeight = weight;
  });
  let score = 0;
  for (const name of names) {
    score += map.get(name) ?? 0;
  }
  // Normalize by the best case: every name matching the heaviest weight.
  return Math.min(1, score / (names.length * maxWeight));
}

export function scoreCandidates(
  profile: TasteProfile,
  candidates: ScorableVideo[],
  options: {
    now?: number;
    recentlySeenIds?: Set<string>;
    recentlySkippedIds?: Set<string>;
  } = {}
): { video: ScorableVideo; score: number }[] {
  const now = options.now ?? Date.now();
  const seen = options.recentlySeenIds ?? new Set();
  const skipped = options.recentlySkippedIds ?? new Set();
  const maxLikes = Math.max(1, ...candidates.map((c) => c.likes));

  const scored = candidates.map((video) => {
    // Semantic taste match: how close is this video to the centroid of
    // everything the viewer has engaged with?
    const embeddingScore =
      profile.profileVector && video.embedding
        ? Math.max(0, cosineSimilarity(profile.profileVector, video.embedding))
        : 0;

    // Explicit metadata match against the weighted tag/category tallies.
    const tagScore = overlapScore(profile.tagWeights, video.tags);
    const categoryScore = overlapScore(profile.categoryWeights, video.categories);

    // Newer videos decay exponentially; popularity is log-scaled so a
    // hundred likes doesn't drown out everything else.
    const ageDays = (now - video.createdAt.getTime()) / 86_400_000;
    const freshness = Math.pow(0.5, ageDays / FRESHNESS_HALF_LIFE_DAYS);
    const engagement = video.likes + video.comments;
    const popularity = Math.log1p(engagement) / Math.log1p(maxLikes + 1);

    let score =
      WEIGHTS.embedding * embeddingScore +
      WEIGHTS.tags * tagScore +
      WEIGHTS.categories * categoryScore +
      WEIGHTS.freshness * freshness +
      WEIGHTS.popularity * Math.min(1, popularity);

    // Behavioral penalties from the event log: things the viewer just saw
    // sink, things they actively skipped sink further.
    if (seen.has(video.id)) score *= SEEN_PENALTY;
    if (skipped.has(video.id)) score *= SKIP_PENALTY;

    return { video, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ---------------------------------------------------------------------------
// Exploration (pure, deterministic)
// ---------------------------------------------------------------------------

// Deterministic PRNG so exploration picks are stable across paginated
// requests within the same day (seeded by viewer + date).
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  }
  return hash;
}

export function applyExploration<T>(ranked: T[], seedText: string): T[] {
  const random = mulberry32(seedFromString(seedText));
  const head = [...ranked];
  // The "tail" (everything past the top 20) feeds the exploration slots, so
  // low-ranked videos still get a chance to surface and generate signals.
  const tail = head.splice(Math.min(head.length, 20));
  const ordered: T[] = [];

  while (head.length > 0 || tail.length > 0) {
    const isExplorationSlot =
      (ordered.length + 1) % EXPLORATION_SLOT === 0 && tail.length > 0;
    if (isExplorationSlot) {
      const pick = Math.floor(random() * tail.length);
      ordered.push(tail.splice(pick, 1)[0]);
    } else if (head.length > 0) {
      ordered.push(head.shift()!);
    } else {
      ordered.push(tail.shift()!);
    }
  }

  return ordered;
}

// ---------------------------------------------------------------------------
// Feed orchestration (Prisma)
// ---------------------------------------------------------------------------

type PrismaCandidate = {
  id: string;
  userId: string;
  videoUrl: string;
  description: string | null;
  createdAt: Date;
  embedding: Uint8Array | null;
  user: { id: string; username: string | null; imageUrl: string | null };
  tags: { tag: { name: string } }[];
  categories: { category: { name: string } }[];
  _count: { likes: number; comments: number };
};

function toScorable(video: PrismaCandidate): ScorableVideo {
  return {
    id: video.id,
    createdAt: video.createdAt,
    tags: video.tags.map((t) => t.tag.name),
    categories: video.categories.map((c) => c.category.name),
    embedding: video.embedding ? bufferToEmbedding(video.embedding) : null,
    likes: video._count.likes,
    comments: video._count.comments,
  };
}

export async function getForYouVideos({
  viewerId,
  limit,
  offset,
}: {
  viewerId: string;
  limit: number;
  offset: number;
}) {
  // --- Gather taste signals: explicit likes + implicit watch events ---
  const [likes, watchEvents] = await Promise.all([
    prisma.like.findMany({
      where: { userId: viewerId },
      orderBy: { createdAt: "desc" },
      take: PROFILE_LIKES_LIMIT,
      include: {
        video: {
          include: {
            tags: { include: { tag: true } },
            categories: { include: { category: true } },
          },
        },
      },
    }),
    prisma.videoEvent.findMany({
      where: { userId: viewerId, type: "watch" },
      orderBy: { createdAt: "desc" },
      take: PROFILE_WATCH_EVENTS_LIMIT,
    }),
  ]);

  // Classify watch events into behavioral buckets.
  const completedIds = new Set<string>();
  const recentlySkippedIds = new Set<string>();
  const recentlySeenIds = new Set<string>();
  const now = Date.now();

  for (const event of watchEvents) {
    const watchMs = event.watchMs ?? 0;
    const ratio = event.durationMs ? watchMs / event.durationMs : null;
    const ageMs = now - event.createdAt.getTime();

    // Completion: watched most of it (or a long time when duration unknown).
    if (
      (ratio !== null && ratio >= COMPLETED_RATIO) ||
      (ratio === null && watchMs >= COMPLETED_FALLBACK_MS)
    ) {
      completedIds.add(event.videoId);
    }
    // Skip: bailed almost immediately — a strong negative signal.
    if (watchMs < SKIP_MS && ageMs < SKIP_WINDOW_DAYS * 86_400_000) {
      recentlySkippedIds.add(event.videoId);
    }
    // Seen: anything watched recently gets demoted to keep the feed fresh.
    if (ageMs < SEEN_WINDOW_HOURS * 3_600_000) {
      recentlySeenIds.add(event.videoId);
    }
  }

  const likedVideoIds = new Set(likes.map((l) => l.videoId));

  // Cold start: no likes and no completed watches — nothing to learn from,
  // let the caller fall back to the recency feed.
  if (likedVideoIds.size === 0 && completedIds.size === 0) return null;

  // --- Build the taste profile from likes + completed (unliked) watches ---
  const completedUnlikedIds = Array.from(completedIds).filter(
    (id) => !likedVideoIds.has(id)
  );
  const completedVideos =
    completedUnlikedIds.length > 0
      ? await prisma.video.findMany({
          where: { id: { in: completedUnlikedIds } },
          include: {
            tags: { include: { tag: true } },
            categories: { include: { category: true } },
          },
        })
      : [];

  const profileSources: ProfileSource[] = [
    ...likes.map((like) => ({
      videoId: like.videoId,
      tags: like.video.tags.map((t) => t.tag.name),
      categories: like.video.categories.map((c) => c.category.name),
      embedding: like.video.embedding
        ? bufferToEmbedding(like.video.embedding)
        : null,
      weight: LIKE_WEIGHT,
    })),
    ...completedVideos.map((video) => ({
      videoId: video.id,
      tags: video.tags.map((t) => t.tag.name),
      categories: video.categories.map((c) => c.category.name),
      embedding: video.embedding ? bufferToEmbedding(video.embedding) : null,
      weight: COMPLETED_WATCH_WEIGHT,
    })),
  ];

  const profile = buildTasteProfile(profileSources);

  // --- Candidates: ready, unflagged, not liked, not the viewer's own ---
  const candidateInclude = {
    user: true,
    tags: { include: { tag: true } },
    categories: { include: { category: true } },
    _count: { select: { likes: true as const, comments: true as const } },
  };

  let candidates: PrismaCandidate[] = await prisma.video.findMany({
    where: {
      flagged: false,
      status: "ready",
      userId: { not: viewerId },
      id: { notIn: Array.from(likedVideoIds) },
    },
    include: candidateInclude,
  });

  // Single-creator instances: if every other video is the viewer's own,
  // rank their unliked uploads instead of returning an empty feed.
  if (candidates.length === 0) {
    candidates = await prisma.video.findMany({
      where: {
        flagged: false,
        status: "ready",
        id: { notIn: Array.from(likedVideoIds) },
      },
      include: candidateInclude,
    });
  }

  // Nothing left to rank — let the caller fall back to the recency feed.
  if (candidates.length === 0) return null;

  // --- Score, rank, sprinkle exploration, and paginate ---
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const scored = scoreCandidates(profile, candidates.map(toScorable), {
    now,
    recentlySeenIds,
    recentlySkippedIds,
  });

  const ordered = applyExploration(
    scored.map((s) => byId.get(s.video.id)!),
    `${viewerId}:${new Date().toDateString()}`
  );

  const page = ordered.slice(offset, offset + limit);
  return serializeVideos(page, viewerId);
}
