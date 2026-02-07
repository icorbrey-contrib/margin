import React from "react";
import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  className,
  variant = "text",
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-surface-200 dark:bg-surface-700",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-lg",
        variant === "text" && "rounded h-4",
        className,
      )}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-lg p-4 mb-3 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton width="40%" />
          <Skeleton width="25%" />
        </div>
      </div>
      <Skeleton className="h-4 mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
