"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Volume2, VolumeX } from "lucide-react";
import { JiffyLogo, JiffyLogoMark } from "./jiffy-logo";
import type { FeedVideo } from "./video-card";

const FREE_PREVIEW_COUNT = 2;

function LandingVideo({
  video,
  isActive,
  soundOn,
  onToggleSound,
}: {
  video: FeedVideo;
  isActive: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.muted = !soundOn;

    if (isActive) {
      videoEl.play().catch(() => {
        videoEl.muted = true;
        videoEl.play().catch(() => {});
      });
    } else {
      videoEl.pause();
    }
  }, [isActive, soundOn]);

  return (
    <div className="h-screen w-full flex-shrink-0 snap-start relative">
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <video
          ref={videoRef}
          src={video.video_url}
          className="w-full h-full object-contain"
          loop
          muted
          playsInline
        />
      </div>
      <button
        onClick={onToggleSound}
        className="absolute top-20 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60"
        aria-label={soundOn ? "Mute" : "Unmute"}
      >
        {soundOn ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </button>
      <div className="absolute bottom-4 left-4 right-20 z-10">
        <div className="flex items-start space-x-2">
          <Avatar>
            {video.user_image && <AvatarImage src={video.user_image} />}
            <AvatarFallback>
              {video.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{video.username}</h2>
            {video.description && (
              <p className="text-sm max-w-xs">{video.description}</p>
            )}
          </div>
        </div>
      </div>
      {/* read-only engagement rail — interacting sends visitors to sign-in */}
      <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-4 z-10">
        <Link href="/sign-in" className="flex flex-col items-center">
          <Heart className="h-7 w-7" />
          <span className="text-xs">{video.likes}</span>
        </Link>
        <Link href="/sign-in" className="flex flex-col items-center">
          <MessageCircle className="h-7 w-7" />
          <span className="text-xs">{video.comments}</span>
        </Link>
        <Link href="/sign-in" className="flex flex-col items-center">
          <Share2 className="h-7 w-7" />
          <span className="text-xs">Share</span>
        </Link>
      </div>
    </div>
  );
}

export function LandingFeed() {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch(
          `/api/get-videos?limit=${FREE_PREVIEW_COUNT + 1}&offset=0&sort=top`
        );
        const data = await response.json();
        setVideos(data.videos || []);
      } catch (error) {
        console.error("Error fetching videos:", error);
      }
    };

    fetchVideos();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = sectionRefs.current.findIndex(
              (el) => el === entry.target
            );
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      { threshold: 0.5 }
    );

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [videos]);

  const previewVideos = videos.slice(0, FREE_PREVIEW_COUNT);
  const gateVideo = videos[FREE_PREVIEW_COUNT];

  return (
    <div className="relative bg-black text-white">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <Link href="/">
          <JiffyLogo size={36} />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-full border border-white/40 text-sm font-semibold hover:bg-white/10"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-full bg-[#FE2C55] text-sm font-semibold hover:bg-[#e0264c]"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex flex-col h-screen overflow-y-scroll snap-y snap-mandatory">
        {videos.length === 0 && (
          <div className="h-screen flex flex-col items-center justify-center gap-4">
            <JiffyLogoMark size={64} />
            <p className="text-gray-400">
              No videos yet — sign up and be the first to post!
            </p>
            <Link
              href="/sign-up"
              className="px-6 py-2.5 rounded-full bg-[#FE2C55] font-semibold hover:bg-[#e0264c]"
            >
              Sign up
            </Link>
          </div>
        )}

        {previewVideos.map((video, index) => (
          <div
            key={video.video_id}
            ref={(el) => {
              sectionRefs.current[index] = el;
            }}
          >
            <LandingVideo
              video={video}
              isActive={index === activeIndex}
              soundOn={soundOn}
              onToggleSound={() => setSoundOn((on) => !on)}
            />
          </div>
        ))}

        {/* Scrolling past the free preview lands on the sign-in gate */}
        {videos.length > 0 && (
          <div
            ref={(el) => {
              sectionRefs.current[FREE_PREVIEW_COUNT] = el;
            }}
            className="h-screen w-full flex-shrink-0 snap-start relative"
          >
            {gateVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <video
                  src={gateVideo.video_url}
                  className="w-full h-full object-contain blur-lg scale-105 opacity-60"
                  muted
                  playsInline
                />
              </div>
            )}
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
              <div className="flex flex-col items-center gap-4 text-center px-6">
                <JiffyLogoMark size={64} />
                <h2 className="text-3xl font-bold">
                  Ready for more?
                </h2>
                <p className="text-gray-300 max-w-sm">
                  Sign up for Jiffy Clips to keep watching, like and comment on
                  videos, and follow your favorite creators.
                </p>
                <Link
                  href="/sign-up"
                  className="w-64 px-6 py-3 rounded-full bg-[#FE2C55] font-semibold hover:bg-[#e0264c]"
                >
                  Sign up
                </Link>
                <Link
                  href="/sign-in"
                  className="w-64 px-6 py-3 rounded-full border border-white/40 font-semibold hover:bg-white/10"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
