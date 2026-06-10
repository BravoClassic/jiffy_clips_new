"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Sidebar } from "../components/sidebar";
import { InfoMessage } from "../components/infoMessage";
import { useUpload } from "../components/upload-provider";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [infoMessageType, setInfoMessageType] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const router = useRouter();
  const hasMounted = useRef(false);
  const { startUpload, status } = useUpload();
  const uploading = status === "uploading";

  // One AI pass per selected file: description, tags, and categories
  // come back from a single /api/analyze-video call.
  const analyzeVideo = async (selectedFile: File) => {
    setAnalyzing(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      const response = await fetch("/api/analyze-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Video analysis failed");
      }

      const result = await response.json();
      setDescription(result.description || "");
      setTags(result.tags || []);
      setCategories(result.categories || []);
    } catch (err: any) {
      console.error("Error analyzing video:", err.message);
      setMessage(
        `${err.message || "Video analysis failed"} — you can still write a description and upload.`
      );
      setInfoMessageType("warning");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setTags([]);
    setCategories([]);
  };

  useEffect(() => {
    if (hasMounted.current) {
      if (file) {
        analyzeVideo(file);
      }
    } else {
      hasMounted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) {
      if (!file) {
        setMessage("Something went wrong. Upload a video");
        setInfoMessageType("error");
      }
      return;
    }

    // The upload continues in the background (see UploadProvider) while
    // the user is sent straight to the feed; a progress card tracks it.
    startUpload({ file, description, tags, categories });
    resetForm();
    router.push("/home");
  };

  const resetForm = () => {
    setFile(null);
    setDescription("");
    setTags([]);
    setCategories([]);
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                analyzing ? "Generating description..." : "Describe your video"
              }
              required
            />
          </div>

          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-gray-900 text-white px-3 py-1 text-xs"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analyzing && (
            <p className="text-sm text-gray-500">
              Analyzing your video with AI...
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={analyzing || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
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
