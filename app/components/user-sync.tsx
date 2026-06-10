"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function UserSync() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/users/sync", { method: "POST" }).catch((error) => {
      console.error("Error syncing user:", error);
    });
  }, [isSignedIn]);

  return null;
}
