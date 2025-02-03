import React, { useEffect, useState } from "react";
import clsx from "clsx";

interface InfoMessageProps {
  message: string;
  type: "error" | "success" | "warning";
  onClose: () => void;
}

export function InfoMessage({ message, type, onClose }: InfoMessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div
      className={clsx(
        "fixed bottom-4 right-4 p-4 rounded shadow-lg transition-opacity",
        {
          "bg-red-500 text-white": type === "error",
          "bg-green-500 text-white": type === "success",
          "bg-yellow-500 text-black": type === "warning",
        }
      )}
    >
      {message}
    </div>
  );
}
