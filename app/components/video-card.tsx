"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share2, Flag, X } from "lucide-react";
import { CommentsDrawer } from "./comments-drawer";
import { InfoMessage } from "./infoMessage";

export type FeedVideo = {
  video_id: string;
  user_id: string;
  username: string;
  user_image: string | null;
  description: string | null;
  likes: number;
  comments: number;
  shares: number;
  video_url: string;
  liked_by_viewer: boolean;
  following_author: boolean;
};

export function VideoCard({
  video,
  isActive,
  viewerId,
  onReported,
}: {
  video: FeedVideo;
  isActive: boolean;
  viewerId: string | null | undefined;
  onReported: (videoId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [liked, setLiked] = useState(video.liked_by_viewer);
  const [likesCount, setLikesCount] = useState(video.likes);
  const [commentsCount, setCommentsCount] = useState(video.comments);
  const [following, setFollowing] = useState(video.following_author);
  const [showComments, setShowComments] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const isOwnVideo = viewerId === video.user_id;

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

  const toggleLike = async () => {
    if (!viewerId) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((count) => count + (nextLiked ? 1 : -1));

    try {
      const response = await fetch(`/api/videos/${video.video_id}/like`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to toggle like");
      const data = await response.json();
      setLiked(data.liked);
      setLikesCount(data.likesCount);
    } catch (error) {
      console.error("Error toggling like:", error);
      setLiked(!nextLiked);
      setLikesCount((count) => count + (nextLiked ? -1 : 1));
    }
  };

  const toggleFollow = async () => {
    if (!viewerId || isOwnVideo) return;

    const nextFollowing = !following;
    setFollowing(nextFollowing);

    try {
      const response = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: video.user_id }),
      });
      if (!response.ok) throw new Error("Failed to toggle follow");
      const data = await response.json();
      setFollowing(data.following);
    } catch (error) {
      console.error("Error toggling follow:", error);
      setFollowing(!nextFollowing);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/home?video=${video.video_id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Check out this video on Jiffy Clips",
          url: shareUrl,
        });
        return;
      }
    } catch (error) {
      // user cancelled the share sheet, fall through to clipboard copy
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast({ message: "Link copied to clipboard!", type: "success" });
    } catch (error) {
      setToast({ message: "Could not copy link", type: "error" });
    }
  };

  const submitReport = async () => {
    if (!viewerId || reporting) return;

    setReporting(true);
    try {
      const response = await fetch(`/api/videos/${video.video_id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason }),
      });
      if (!response.ok) throw new Error("Failed to report video");

      setShowReportForm(false);
      setToast({ message: "Video reported and hidden", type: "success" });
      onReported(video.video_id);
    } catch (error) {
      console.error("Error reporting video:", error);
      setToast({ message: "Could not report video", type: "error" });
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="h-screen w-full flex-shrink-0 snap-start relative">
      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
        <video
          ref={videoRef}
          src={video.video_url}
          controls={false}
          className="w-full h-full object-contain"
          loop
          playsInline
        />
      </div>
      <div className="absolute bottom-4 left-4 right-20 z-10">
        <div className="flex items-start space-x-2">
          <Avatar>
            {video.user_image && <AvatarImage src={video.user_image} />}
            <AvatarFallback>
              {video.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{video.username}</h2>
              {!isOwnVideo && viewerId && (
                <button
                  onClick={toggleFollow}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    following
                      ? "border-white/40 text-white/80"
                      : "border-white bg-white text-black font-semibold"
                  }`}
                >
                  {following ? "Following" : "Follow"}
                </button>
              )}
            </div>
            {video.description && (
              <p className="text-sm max-w-xs">{video.description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-4">
        <div className="flex flex-col items-center">
          <Button variant="ghost" size="icon" onClick={toggleLike}>
            <Heart
              className={`h-6 w-6 ${
                liked ? "fill-red-500 text-red-500" : ""
              }`}
            />
          </Button>
          <span className="text-xs">{likesCount}</span>
        </div>
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowComments(true)}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          <span className="text-xs">{commentsCount}</span>
        </div>
        <div className="flex flex-col items-center">
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-6 w-6" />
          </Button>
          <span className="text-xs">{video.shares}</span>
        </div>
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowReportForm((open) => !open)}
          >
            <Flag className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {showReportForm && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="bg-white text-black rounded-lg p-4 w-80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Report video</h3>
              <button onClick={() => setShowReportForm(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Reported videos are immediately hidden from all feeds.
            </p>
            <Textarea
              placeholder="Why are you reporting this video? (optional)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReportForm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={submitReport}
                disabled={reporting}
              >
                {reporting ? "Reporting..." : "Report"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CommentsDrawer
        videoId={video.video_id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onCommentAdded={() => setCommentsCount((count) => count + 1)}
      />

      {toast && (
        <InfoMessage
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
