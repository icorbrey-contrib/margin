import React from "react";
import { clsx } from "clsx";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default:
    "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400",
  primary:
    "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300",
  success:
    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  warning:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  danger: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

export default function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface CountBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

export function CountBadge({ count, max = 99, className }: CountBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5",
        "text-[10px] font-bold rounded-full bg-primary-600 text-white",
        className,
      )}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
