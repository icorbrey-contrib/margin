import React from "react";
import { Link } from "react-router-dom";
import { Home, AlertCircle } from "lucide-react";
import { useStore } from "@nanostores/react";
import { $theme } from "../store/theme";

export default function NotFound() {
  useStore($theme);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 dark:bg-surface-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/60 dark:border-surface-800 p-8 shadow-sm dark:shadow-none text-center">
        <div className="w-16 h-16 bg-surface-50 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-surface-400 dark:text-surface-500">
          <AlertCircle size={32} />
        </div>

        <h1 className="text-3xl font-bold font-display text-surface-900 dark:text-white mb-3 tracking-tight">
          Page not found
        </h1>

        <p className="text-surface-500 dark:text-surface-400 text-base mb-8 leading-relaxed max-w-xs mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/home"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 w-full bg-surface-900 dark:bg-white text-white dark:text-surface-900 rounded-xl font-bold text-sm transition-transform active:scale-[0.98] hover:bg-surface-800 dark:hover:bg-surface-50 shadow-lg shadow-surface-900/10 dark:shadow-none"
        >
          <Home size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
