"use client";

import { Sidebar } from "../components/sidebar";
import { VideoFeed } from "../components/video-feed";

export default function Following() {
  return (
    <>
      <Sidebar />
      <VideoFeed
        fetchUrl="/api/videos/following"
        emptyMessage="Follow creators to see their videos here."
      />
    </>
  );
}
