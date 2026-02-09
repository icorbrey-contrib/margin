import React from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  icon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400 dark:text-surface-500">
            {icon}
          </div>
        )}
        <input
          className={clsx(
            "w-full px-3 py-2 bg-surface-50 dark:bg-surface-800",
            "border border-surface-200 dark:border-surface-700 rounded-lg",
            "text-surface-900 dark:text-white",
            "placeholder:text-surface-400 dark:placeholder:text-surface-500",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400",
            "transition-colors text-sm",
            icon && "pl-10",
            error && "border-red-500 dark:border-red-400 focus:ring-red-500/20",
            className,
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
