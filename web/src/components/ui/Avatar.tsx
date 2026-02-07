import React from "react";
import { User } from "lucide-react";
import { clsx } from "clsx";
import { getAvatarUrl } from "../../api/client";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  did?: string;
  avatar?: string;
  src?: string;
  alt?: string;
  size?: AvatarSize;
  className?: string;
}

const sizes: Record<AvatarSize, { container: string; icon: number }> = {
  xs: { container: "h-6 w-6", icon: 12 },
  sm: { container: "h-8 w-8", icon: 14 },
  md: { container: "h-10 w-10", icon: 18 },
  lg: { container: "h-14 w-14", icon: 24 },
  xl: { container: "h-20 w-20", icon: 32 },
};

export default function Avatar({
  did,
  avatar,
  src,
  alt = "Avatar",
  size = "md",
  className,
}: AvatarProps) {
  const imageUrl = src || getAvatarUrl(did, avatar);
  const { container, icon } = sizes[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={clsx(
          container,
          "rounded-full object-cover bg-surface-100 dark:bg-surface-800",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        container,
        "rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 dark:text-surface-500",
        className,
      )}
    >
      <User size={icon} />
    </div>
  );
}
