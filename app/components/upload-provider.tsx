"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import type { FeedVideo } from "./video-card";

// "uploading"  — file bytes are in flight (real progress bar)
// "processing" — file saved; server-side AI enrichment is running and we
//                poll /status until the video flips to "ready"
// "done"       — video is live; the feed picks it up via completedVideo
type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

type UploadInput = {
  file: File;
  description: string;
};

type UploadContextValue = {
  status: UploadStatus;
  progress: number;
  error: string | null;
  startUpload: (input: UploadInput) => void;
  completedVideo: FeedVideo | null;
  consumeCompletedVideo: () => FeedVideo | null;
};

const UploadContext = createContext<UploadContextValue | null>(null);

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used inside <UploadProvider>");
  }
  return context;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 60; // give enrichment up to ~3 minutes before giving up

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completedVideo, setCompletedVideo] = useState<FeedVideo | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll the status endpoint until enrichment finishes, then hand the
  // feed-ready video object to whoever consumes completedVideo.
  const pollUntilReady = useCallback(async (videoId: string) => {
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      try {
        const response = await fetch(`/api/videos/${videoId}/status`);
        if (!response.ok) continue;
        const data = await response.json();
        if (data.status === "ready") {
          if (data.video) setCompletedVideo(data.video);
          setStatus("done");
          hideTimer.current = setTimeout(() => setStatus("idle"), 4000);
          return;
        }
      } catch {
        // transient network error — keep polling
      }
    }
    // Enrichment is taking unusually long; the video will still appear on
    // the next feed refresh, so don't treat this as a failure.
    setStatus("done");
    hideTimer.current = setTimeout(() => setStatus("idle"), 4000);
  }, []);

  const startUpload = useCallback(
    (input: UploadInput) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setStatus("uploading");
      setProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append("file", input.file);
      formData.append("description", input.description);

      // XMLHttpRequest instead of fetch: it exposes upload progress events.
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload-video");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setProgress(100);
            // File is saved; now wait for the AI pipeline to finish.
            setStatus("processing");
            pollUntilReady(data.videoId);
          } catch {
            setStatus("error");
            setError("Upload finished but the response was invalid.");
          }
        } else {
          let message = "Video upload failed.";
          try {
            message = JSON.parse(xhr.responseText).error || message;
          } catch {}
          setStatus("error");
          setError(message);
        }
      };

      xhr.onerror = () => {
        setStatus("error");
        setError("Network error during upload.");
      };

      xhr.send(formData);
    },
    [pollUntilReady]
  );

  const consumeCompletedVideo = useCallback(() => {
    if (!completedVideo) return null;
    setCompletedVideo(null);
    return completedVideo;
  }, [completedVideo]);

  return (
    <UploadContext.Provider
      value={{
        status,
        progress,
        error,
        startUpload,
        completedVideo,
        consumeCompletedVideo,
      }}
    >
      {children}

      {status !== "idle" && (
        <div className="fixed bottom-4 right-4 z-[100] w-72 rounded-lg bg-gray-900 text-white shadow-lg border border-white/10 p-4">
          {status === "uploading" && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading your video...
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#FE2C55] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-gray-400">
                {progress}%
              </p>
            </>
          )}

          {status === "processing" && (
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 animate-pulse text-[#25F4EE]" />
              Analyzing with AI — almost there...
            </div>
          )}

          {status === "done" && (
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Posted! Your video is live.
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => setStatus("idle")}
                aria-label="Dismiss"
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </UploadContext.Provider>
  );
}
