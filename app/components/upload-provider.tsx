"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import type { FeedVideo } from "./video-card";

type UploadStatus = "idle" | "uploading" | "done" | "error";

type UploadInput = {
  file: File;
  description: string;
  tags: string[];
  categories: string[];
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

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completedVideo, setCompletedVideo] = useState<FeedVideo | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startUpload = useCallback((input: UploadInput) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setStatus("uploading");
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", input.file);
    formData.append("description", input.description);
    formData.append("tags", JSON.stringify(input.tags));
    formData.append("categories", JSON.stringify(input.categories));

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
          setStatus("done");
          if (data.video) setCompletedVideo(data.video);
          hideTimer.current = setTimeout(() => setStatus("idle"), 4000);
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
  }, []);

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
