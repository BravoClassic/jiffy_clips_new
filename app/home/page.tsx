"use client";

import { Sidebar } from "../components/sidebar";
import { VideoFeed } from "../components/video-feed";

export default function Home() {
  return (
    <>
      <Sidebar />
      <VideoFeed
        fetchUrl="/api/get-videos"
        emptyMessage="No videos yet. Be the first to upload one!"
        acceptUploads
      />
    </>
  );
}
