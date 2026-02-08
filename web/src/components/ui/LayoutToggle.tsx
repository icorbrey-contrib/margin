import React from "react";
import { List, LayoutGrid } from "lucide-react";
import { useStore } from "@nanostores/react";
import {
  $feedLayout,
  setFeedLayout,
  type FeedLayout,
} from "../../store/feedLayout";
import { clsx } from "clsx";

export default function LayoutToggle() {
  const layout = useStore($feedLayout);

  const options: { id: FeedLayout; icon: typeof List; label: string }[] = [
    { id: "list", icon: List, label: "List" },
    { id: "mosaic", icon: LayoutGrid, label: "Mosaic" },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border border-surface-200 dark:border-surface-700 p-0.5 bg-surface-100 dark:bg-surface-800/60">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setFeedLayout(opt.id)}
          title={opt.label}
          className={clsx(
            "flex items-center justify-center w-7 h-7 rounded-md transition-all",
            layout === opt.id
              ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm"
              : "text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300",
          )}
        >
          <opt.icon size={14} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
