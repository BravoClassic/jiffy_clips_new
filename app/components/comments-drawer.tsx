"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type CommentItem = {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  username: string;
  user_image: string | null;
};

export function CommentsDrawer({
  videoId,
  isOpen,
  onClose,
  onCommentAdded,
}: {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchComments = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/videos/${videoId}/comments`);
        const data = await response.json();
        setComments(data.comments || []);
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [isOpen, videoId]);

  const submitComment = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!response.ok) throw new Error("Failed to post comment");

      const data = await response.json();
      setComments((prev) => [...prev, data.comment]);
      setText("");
      onCommentAdded();
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full bg-white text-black flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Comments</h3>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <p className="text-sm text-gray-500">Loading comments...</p>
          )}
          {!loading && comments.length === 0 && (
            <p className="text-sm text-gray-500">
              No comments yet. Be the first to comment!
            </p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar className="h-8 w-8">
                {comment.user_image && (
                  <AvatarImage src={comment.user_image} />
                )}
                <AvatarFallback>
                  {comment.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{comment.username}</p>
                <p className="text-sm">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Input
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitComment();
            }}
          />
          <Button onClick={submitComment} disabled={submitting}>
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
