"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/sidebar";
import { InfoMessage } from "../components/infoMessage";
import { useUpload } from "../components/upload-provider";

// The upload page only collects the file and an optional caption. All AI
// analysis (description, tags, categories, embedding) happens server-side
// after submit — the user is sent straight to the feed and the progress
// card in the corner tracks upload + processing.
export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [infoMessageType, setInfoMessageType] = useState<string>("");
  const router = useRouter();
  const { startUpload, status } = useUpload();
  const uploading = status === "uploading";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setFile(e.target.files?.[0] || null);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) {
      if (!file) {
        setMessage("Choose a video to upload first");
        setInfoMessageType("error");
      }
      return;
    }

    // Hand off to the global UploadProvider (survives navigation) and go
    // straight back to the feed.
    startUpload({ file, description });
    setFile(null);
    setDescription("");
    router.push("/home");
  };

  return (
    <>
      <Sidebar></Sidebar>
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Upload a Video</h1>
        <form onSubmit={handleUpload} className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video">Choose a video</Label>
            <Input
              id="video"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Caption (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a caption — or leave it empty and AI will describe your video"
            />
          </div>
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? "Uploading..." : "Post"}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Tags and categories are generated automatically after you post.
          </p>
        </form>
      </div>
      {infoMessageType && (
        <InfoMessage
          message={message || ""}
          type={infoMessageType as "error" | "warning" | "success"}
          onClose={() => {
            setInfoMessageType("");
            setMessage("");
          }}
        />
      )}
    </>
  );
}
