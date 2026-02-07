import React, { useState } from "react";
import { createAnnotation, createHighlight } from "../../api/client";
import { X } from "lucide-react";

interface ComposerProps {
  url: string;
  selector?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function Composer({
  url,
  selector: initialSelector,
  onSuccess,
  onCancel,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [tags, setTags] = useState("");
  const [selector, setSelector] = useState(initialSelector);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuoteInput, setShowQuoteInput] = useState(false);

  const highlightedText =
    selector?.type === "TextQuoteSelector" ? selector.exact : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !highlightedText && !quoteText.trim()) return;

    try {
      setLoading(true);
      setError(null);

      let finalSelector = selector;
      if (!finalSelector && quoteText.trim()) {
        finalSelector = {
          type: "TextQuoteSelector",
          exact: quoteText.trim(),
        };
      }

      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (!text.trim()) {
        await createHighlight({
          url,
          selector: finalSelector,
          color: "yellow",
          tags: tagList,
        });
      } else {
        await createAnnotation({
          url,
          text: text.trim(),
          selector: finalSelector || undefined,
          tags: tagList,
        });
      }

      setText("");
      setQuoteText("");
      setSelector(null);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to post");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSelector = () => {
    setSelector(null);
    setQuoteText("");
    setShowQuoteInput(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-surface-900 dark:text-white">
          New Annotation
        </h3>
        {url && (
          <div className="text-xs text-surface-400 dark:text-surface-500 max-w-[200px] truncate">
            {url}
          </div>
        )}
      </div>

      {highlightedText && (
        <div className="relative p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg">
          <button
            type="button"
            className="absolute top-2 right-2 text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300"
            onClick={handleRemoveSelector}
          >
            <X size={16} />
          </button>
          <blockquote className="italic text-surface-600 dark:text-surface-300 border-l-2 border-primary-400 dark:border-primary-500 pl-3 text-sm">
            "{highlightedText}"
          </blockquote>
        </div>
      )}

      {!highlightedText && (
        <>
          {!showQuoteInput ? (
            <button
              type="button"
              className="text-left text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium py-1"
              onClick={() => setShowQuoteInput(true)}
            >
              + Add a quote from the page
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Paste or type the text you're annotating..."
                className="w-full text-sm p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400 outline-none"
                rows={2}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-red-500 dark:text-red-400 font-medium"
                  onClick={handleRemoveSelector}
                >
                  Remove Quote
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          highlightedText || quoteText
            ? "Add your comment..."
            : "Write your annotation..."
        }
        className="w-full p-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400 outline-none min-h-[100px] resize-none"
        maxLength={3000}
        disabled={loading}
      />

      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma separated)"
        className="w-full p-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-900 dark:text-white placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400 outline-none text-sm"
        disabled={loading}
      />

      <div className="flex items-center justify-between pt-2">
        <span
          className={
            text.length > 2900
              ? "text-red-500 dark:text-red-400 text-xs font-medium"
              : "text-surface-400 dark:text-surface-500 text-xs"
          }
        >
          {text.length}/3000
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              className="text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 px-3 py-1.5"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
            disabled={
              loading || (!text.trim() && !highlightedText && !quoteText.trim())
            }
          >
            {loading ? "..." : "Post"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">
          {error}
        </div>
      )}
    </form>
  );
}
