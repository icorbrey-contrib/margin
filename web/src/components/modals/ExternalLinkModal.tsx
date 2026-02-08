import React, { useState } from "react";
import { Button } from "../ui";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { addSkippedHostname } from "../../store/preferences";

interface ExternalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
}

export default function ExternalLinkModal({
  isOpen,
  onClose,
  url,
}: ExternalLinkModalProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  if (!isOpen || !url) return null;

  const displayUrl = url.split("#:~:text=")[0];

  const handleContinue = () => {
    if (dontAskAgain && url) {
      try {
        const hostname = new URL(url).hostname;
        addSkippedHostname(hostname);
      } catch (e) {
        console.error("Invalid URL", e);
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "this site";
    }
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in ring-1 ring-black/5 dark:ring-white/10 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
            You are leaving Margin
          </h2>

          <p className="text-surface-500 dark:text-surface-400 text-sm mb-6 leading-relaxed">
            This link will take you to an external website:
            <br />
            <span className="font-medium text-sm bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 p-3 rounded-xl mt-3 block break-all border border-surface-200 dark:border-surface-700 shadow-sm">
              {displayUrl}
            </span>
          </p>

          <div className="flex items-center gap-2 mb-6 w-full px-1">
            <input
              type="checkbox"
              id="dontAskAgain"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
            />
            <label
              htmlFor="dontAskAgain"
              className="text-sm text-surface-600 dark:text-surface-300 cursor-pointer select-none"
            >
              Don't ask again for{" "}
              <span className="font-medium">{hostname}</span>
            </label>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={handleContinue}
              variant="primary"
              className="w-full justify-center"
              icon={<ExternalLink size={16} />}
            >
              Continue to Site
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full justify-center"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
