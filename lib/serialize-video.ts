import { prisma } from "./prisma";

type VideoWithRelations = {
  id: string;
  userId: string;
  videoUrl: string;
  description: string | null;
  createdAt: Date;
  user: {
    id: string;
    username: string | null;
    imageUrl: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
};

export async function serializeVideos(
  videos: VideoWithRelations[],
  viewerId?: string | null
) {
  let likedVideoIds = new Set<string>();
  let followedUserIds = new Set<string>();

  // Share totals come from the event log (one "share" event per tap),
  // aggregated in a single grouped query for the whole page of videos.
  const shareCounts = new Map<string, number>();
  if (videos.length > 0) {
    const shares = await prisma.videoEvent.groupBy({
      by: ["videoId"],
      where: {
        type: "share",
        videoId: { in: videos.map((v) => v.id) },
      },
      _count: { _all: true },
    });
    for (const row of shares) {
      shareCounts.set(row.videoId, row._count._all);
    }
  }

  if (viewerId && videos.length > 0) {
    const [likes, follows] = await Promise.all([
      prisma.like.findMany({
        where: {
          userId: viewerId,
          videoId: { in: videos.map((v) => v.id) },
        },
        select: { videoId: true },
      }),
      prisma.follow.findMany({
        where: {
          followerId: viewerId,
          followingId: { in: videos.map((v) => v.userId) },
        },
        select: { followingId: true },
      }),
    ]);
    likedVideoIds = new Set(likes.map((l) => l.videoId));
    followedUserIds = new Set(follows.map((f) => f.followingId));
  }

  return videos.map((video) => ({
    video_id: video.id,
    user_id: video.userId,
    username: video.user.username || video.userId,
    user_image: video.user.imageUrl,
    description: video.description,
    likes: video._count.likes,
    comments: video._count.comments,
    shares: shareCounts.get(video.id) ?? 0,
    video_url: video.videoUrl,
    created_at: video.createdAt,
    liked_by_viewer: likedVideoIds.has(video.id),
    following_author: followedUserIds.has(video.userId),
  }));
}
