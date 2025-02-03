"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "../components/sidebar";
import { InfoMessage } from "../components/infoMessage";
import { useSession, useUser } from "@clerk/nextjs";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [infoMessageType, setInfoMessageType] = useState<string>("");
  const router = useRouter();
  const [loading, setLoading] = useState<Boolean | null>();
  const query = useSearchParams();
  const { user } = useUser();
  // The `useSession()` hook will be used to get the Clerk session object
  const { session } = useSession();
  const hasMounted = useRef(false);

  const getDescription = async () => {
    console.log("description");
    console.log(message);
    if (!file) {
      setMessage("Something went wrong. Upload a video");
      setInfoMessageType("error");
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("video", file);

    console.log(file);

    try {
      const response = await fetch("/api/analyze-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Description generation failed");
      }

      const result = await response.json();
      console.log("Video Description:", result.description);
      setDescription(() => result.description);

      // Display or use the description
    } catch (err: any) {
      console.error("Error uploading video:", err.message);
      setMessage(err.message || "Something went wrong");
      setInfoMessageType("error");
    } finally {
      setLoading(false);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  useEffect(()=>{
     if (hasMounted.current) {
       if (file) {
         getDescription();
       }
     } else {
       hasMounted.current = true;
     }
  },[file])

  const getTags = async () => {
    if (!file) {
      setMessage("Something went wrong. Upload a video");
      setInfoMessageType("error");
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("video", file);

    console.log(file);

    try {
      const response = await fetch("/api/generate-tags", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Description generation failed");
      }

      const result = await response.json();
      console.log("Tags and Categories:", result);
      return result;
    } catch (err: any) {
      console.error("Error uploading video:", err.message);
      setMessage(err.message || "Something went wrong");
      setInfoMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the video file and description to your backend
    if (!file) {
      setMessage("Something went wrong. Upload a video");
      setInfoMessageType("error");
      console.log(message);
      return;
    }
    const result = await getTags();
    if (result) {
      const { tags, categories } = result;
      console.log("Tags:", tags, "Categories:", categories);

      try {
        const tagsAndCategories = await getTags();
        if (!tagsAndCategories) return;

        const { tags, categories } = tagsAndCategories;

        // Step 1: Upload video to Supabase bucket
        const formData = new FormData();
        formData.append("file", file);
        formData.append("description", description);
        formData.append("user_id", user?.id || "");
        const uploadResponse = await fetch("/api/upload-video", {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${await session?.getToken()}`, // Add the token here
          },
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Video upload failed.");
        }

        const { videoId } = await uploadResponse.json();

        // Step 2: Insert tags and categories into Supabase
        await Promise.all([
          ...tags.map(async (tag: string) => {
            const tagResponse = await fetch("/api/add-tag", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ videoId, tag }),
            });
            if (!tagResponse.ok) {
              throw new Error("Failed to insert tag.");
            }
          }),
          ...categories.map(async (category: string) => {
            const categoryResponse = await fetch("/api/add-category", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ videoId, category }),
            });
            if (!categoryResponse.ok) {
              throw new Error("Failed to insert category.");
            }
          }),
        ]);

        setMessage("Video uploaded successfully!");
        setInfoMessageType("success");
        resetForm(); // Reset the form after successful upload
        router.push("/upload?success=true");
      } catch (err: any) {
        console.error("Error during upload:", err.message);
        setMessage(err.message || "Something went wrong.");
        setInfoMessageType("error");
      }
    }
  };

   const resetForm = () => {
     setFile(null);
     setDescription("");
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
              required
            />
          </div>
          {!loading &&
        
          <Button type="submit" className="w-full">
            Upload
          </Button>
          }
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
