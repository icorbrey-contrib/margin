import React from "react";
import { clsx } from "clsx";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  action?: React.ReactNode | { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "text-center py-16 px-6",
        "bg-surface-50/50 dark:bg-surface-800/50 rounded-2xl",
        "border border-dashed border-surface-200 dark:border-surface-700",
        className,
      )}
    >
      {icon && (
        <div className="flex justify-center mb-4 text-surface-300 dark:text-surface-600">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-2">
          {title}
        </h3>
      )}
      <p className="text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
        {message}
      </p>
      {action && (
        <div className="mt-6">
          {typeof action === "object" &&
          "label" in action &&
          "onClick" in action ? (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              {action.label}
            </button>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  );
}
