"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Sidebar } from "../components/sidebar";

function VideoCard({
  video,
  isActive,
}: {
  video: {
    video_id: string;
    user_id: string;
    description: string;
    likes: number;
    comments: number;
    shares: number;
    video_url: string;
  };
  isActive: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleVideoClick = () => {
      try {
        if (videoRef.current) {
          videoRef.current.paused
            ? videoRef.current.play()
            : videoRef.current.pause();
        }
      } catch (error) {
        console.error("Error handling video click:", error);
      }
    };

    if (isActive && videoRef.current) {
      try {
        videoRef.current.play();
      } catch (error) {
        console.error("Error playing video:", error);
      }

      if (videoRef.current) {
        try {
          videoRef.current.addEventListener("click", handleVideoClick);
        } catch (error) {
          console.error("Error adding click event listener:", error);
        }
      }
    } else if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (error) {
        console.error("Error pausing video:", error);
      }
    }

    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.removeEventListener("click", handleVideoClick);
        } catch (error) {
          console.error("Error removing click event listener:", error);
        }
      }
    };
  }, [isActive]);

  return (
    <div className="h-screen w-full flex-shrink-0 snap-start relative">
      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
        <video
          ref={videoRef}
          src={video.video_url}
          controls={false}
          className="w-full h-full"
          loop
          playsInline
        />
      </div>
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="flex items-start space-x-2">
          <Avatar>
            {/* https://tovaadvdtovtmmfmoxor.supabase.co/storage/v1/object/sign/videos/jiffy_clips/YouTube%20Shorts%20HD.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJ2aWRlb3MvamlmZnlfY2xpcHMvWW91VHViZSBTaG9ydHMgSEQubXA0IiwiaWF0IjoxNzM3NDY0NjYyLCJleHAiOjMxNTUzMDU5Mjg2NjJ9.VS2rLzWQP0X-OyKfzjtUOWMmDtXB3DTlE0gvL-Ljy-8&t=2025-01-21T13%3A04%3A22.759Z */}
            <AvatarImage src={`https://avatar.vercel.sh/${video.user_id}`} />
            <AvatarFallback>{video.user_id.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{video.user_id}</h2>
            {/* <p className="text-sm">{video.description}</p> */}
          </div>
        </div>
      </div>
      <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-4">
        <Button variant="ghost" size="icon">
          <Heart className="h-6 w-6" />
          <span className="text-xs">{video.likes}</span>
        </Button>
        <Button variant="ghost" size="icon">
          <MessageCircle className="h-6 w-6" />
          <span className="text-xs">{video.comments}</span>
        </Button>
        <Button variant="ghost" size="icon">
          <Share2 className="h-6 w-6" />
          <span className="text-xs">{video.shares}</span>
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(1);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [videos, setVideos] = useState<any[]>([]); // Adjust type as needed
  const [offset, setOffset] = useState(0);
  const limit = 10; // Number of videos to fetch per request


  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch(
          `/api/get-videos?limit=${limit}&offset=${offset}`
        );
        const data = await response.json();
        setVideos((prevVideos) => [...prevVideos, ...data.videos]);
      } catch (error) {
        console.error("Error fetching videos:", error);
      }
    };

    fetchVideos();
  }, [offset,]);

  useEffect(() => {
    const observers = videos.map((_, index) => {
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
                  setOffset((prevOffset) => prevOffset + limit);
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

  return (
    <>
      <Sidebar></Sidebar>
      <main className="flex flex-col bg-black text-white pl-16 h-screen overflow-y-scroll snap-y snap-start snap-always snap-mandatory">
        {videos.map((video, index) => (
          <div
            key={index}
            ref={(el) => {
              videoRefs.current[index] = el;
            }}
          >
            <VideoCard video={video} isActive={index === activeVideoIndex} />
          </div>
        ))}
      </main>
    </>
  );
}
