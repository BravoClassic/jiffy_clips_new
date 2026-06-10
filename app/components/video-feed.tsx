"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { VideoCard, FeedVideo } from "./video-card";
import { useUpload } from "./upload-provider";

const LIMIT = 10;

export function VideoFeed({
  fetchUrl,
  emptyMessage,
  acceptUploads = false,
}: {
  fetchUrl: string;
  emptyMessage: string;
  acceptUploads?: boolean;
}) {
  const { user } = useUser();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const { completedVideo, consumeCompletedVideo } = useUpload();

  useEffect(() => {
    if (!hasMore || loading) return;

    const fetchVideos = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(LIMIT),
          offset: String(offset),
        });
        if (user?.id) params.set("viewerId", user.id);

        const response = await fetch(`${fetchUrl}?${params.toString()}`);
        const data = await response.json();
        const newVideos: FeedVideo[] = data.videos || [];

        setVideos((prev) => {
          const seen = new Set(prev.map((v) => v.video_id));
          return [...prev, ...newVideos.filter((v) => !seen.has(v.video_id))];
        });
        if (newVideos.length < LIMIT) setHasMore(false);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, fetchUrl, user?.id]);

  useEffect(() => {
    const observers = videos.map(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const index = videoRefs.current.findIndex(
                (videoElement) => videoElement === entry.target
              );
              if (index !== -1) {
                setActiveVideoIndex(index);
                if (index === videos.length - 1) {
                  setOffset((prevOffset) => prevOffset + LIMIT);
                }
              }
            }
          });
        },
        { threshold: 0.5 }
      );

      videoRefs.current.forEach((videoElement) => {
        if (videoElement) {
          observer.observe(videoElement);
        }
      });

      return observer;
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [videos]);

  // When a background upload finishes, slot the new video in right after
  // the one currently on screen so it's the next thing the user sees.
  useEffect(() => {
    if (!acceptUploads || !completedVideo) return;

    const video = consumeCompletedVideo();
    if (!video) return;

    setVideos((prev) => {
      if (prev.some((v) => v.video_id === video.video_id)) return prev;
      const insertAt = Math.min(activeVideoIndex + 1, prev.length);
      return [...prev.slice(0, insertAt), video, ...prev.slice(insertAt)];
    });
  }, [acceptUploads, completedVideo, consumeCompletedVideo, activeVideoIndex]);

  const handleReported = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.video_id !== videoId));
  };

  if (!loading && videos.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center bg-black text-white pl-16 h-screen">
        <p className="text-gray-400">{emptyMessage}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-black text-white pl-16 h-screen overflow-y-scroll snap-y snap-start snap-always snap-mandatory">
      {videos.map((video, index) => (
        <div
          key={video.video_id}
          ref={(el) => {
            videoRefs.current[index] = el;
          }}
        >
          <VideoCard
            video={video}
            isActive={index === activeVideoIndex}
            viewerId={user?.id}
            soundOn={soundOn}
            onToggleSound={() => setSoundOn((on) => !on)}
            onReported={handleReported}
          />
        </div>
      ))}
    </main>
  );
}
