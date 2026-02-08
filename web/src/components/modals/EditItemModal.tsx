import React, { useState, useEffect } from "react";
import { X, ShieldAlert } from "lucide-react";
import {
  updateAnnotation,
  updateHighlight,
  updateBookmark,
} from "../../api/client";
import type { AnnotationItem, ContentLabelValue } from "../../types";

const SELF_LABEL_OPTIONS: { value: ContentLabelValue; label: string }[] = [
  { value: "sexual", label: "Sexual" },
  { value: "nudity", label: "Nudity" },
  { value: "violence", label: "Violence" },
  { value: "gore", label: "Gore" },
  { value: "spam", label: "Spam" },
  { value: "misleading", label: "Misleading" },
];

const HIGHLIGHT_COLORS = [
  { value: "yellow", bg: "bg-yellow-400", ring: "ring-yellow-500" },
  { value: "green", bg: "bg-green-400", ring: "ring-green-500" },
  { value: "blue", bg: "bg-blue-400", ring: "ring-blue-500" },
  { value: "red", bg: "bg-red-400", ring: "ring-red-500" },
];

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AnnotationItem;
  type: "annotation" | "highlight" | "bookmark";
  onSaved?: (item: AnnotationItem) => void;
}

export default function EditItemModal({
  isOpen,
  onClose,
  item,
  type,
  onSaved,
}: EditItemModalProps) {
  const [text, setText] = useState(item.body?.value || "");
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState("");

  const [color, setColor] = useState(item.color || "yellow");

  const [title, setTitle] = useState(item.title || item.target?.title || "");
  const [description, setDescription] = useState(item.description || "");

  const existingLabels = (item.labels || [])
    .filter((l) => l.src === item.author?.did)
    .map((l) => l.val as ContentLabelValue);
  const [selfLabels, setSelfLabels] =
    useState<ContentLabelValue[]>(existingLabels);
  const [showLabelPicker, setShowLabelPicker] = useState(
    existingLabels.length > 0,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setText(item.body?.value || "");
      setTags(item.tags || []);
      setTagInput("");
      setColor(item.color || "yellow");
      setTitle(item.title || item.target?.title || "");
      setDescription(item.description || "");
      const labels = (item.labels || [])
        .filter((l) => l.src === item.author?.did)
        .map((l) => l.val as ContentLabelValue);
      setSelfLabels(labels);
      setShowLabelPicker(labels.length > 0);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const toggleLabel = (val: ContentLabelValue) => {
    setSelfLabels((prev) =>
      prev.includes(val) ? prev.filter((l) => l !== val) : [...prev, val],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    let success = false;
    const labels = selfLabels.length > 0 ? selfLabels : [];

    try {
      if (type === "annotation") {
        success = await updateAnnotation(
          item.uri,
          text,
          tags.length > 0 ? tags : undefined,
          labels,
        );
      } else if (type === "highlight") {
        success = await updateHighlight(
          item.uri,
          color,
          tags.length > 0 ? tags : undefined,
          labels,
        );
      } else if (type === "bookmark") {
        success = await updateBookmark(
          item.uri,
          title || undefined,
          description || undefined,
          tags.length > 0 ? tags : undefined,
          labels,
        );
      }
    } catch (e) {
      console.error("Edit save error:", e);
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
      return;
    }

    setSaving(false);
    if (!success) {
      setError("Failed to save changes. Please try again.");
      return;
    }
    const updated = { ...item };
    if (type === "annotation") {
      updated.body = { type: "TextualBody", value: text, format: "text/plain" };
    } else if (type === "highlight") {
      updated.color = color;
    } else if (type === "bookmark") {
      updated.title = title;
      updated.description = description;
    }
    updated.tags = tags;
    const otherLabels = (item.labels || []).filter(
      (l) => l.src !== item.author?.did,
    );
    const newSelfLabels = selfLabels.map((val) => ({
      val,
      src: item.author?.did || "",
      scope: "content" as const,
    }));
    updated.labels = [...otherLabels, ...newSelfLabels];
    onSaved?.(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-700">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            Edit{" "}
            {type === "annotation"
              ? "Annotation"
              : type === "highlight"
                ? "Highlight"
                : "Bookmark"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {type === "annotation" && (
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={3000}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Write your annotation..."
              />
              <p className="text-xs text-surface-400 mt-1">
                {text.length}/3000
              </p>
            </div>
          )}

          {type === "highlight" && (
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-full ${c.bg} transition-all ${
                      color === c.value
                        ? `ring-2 ${c.ring} ring-offset-2 dark:ring-offset-surface-900 scale-110`
                        : "opacity-60 hover:opacity-100"
                    }`}
                    title={c.value}
                  />
                ))}
              </div>
              {item.target?.selector?.exact && (
                <blockquote className="mt-3 pl-3 py-2 border-l-2 border-surface-300 dark:border-surface-600 text-sm italic text-surface-500 dark:text-surface-400">
                  {item.target.selector.exact}
                </blockquote>
              )}
            </div>
          )}

          {type === "bookmark" && (
            <>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Bookmark title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Optional description..."
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium"
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Add a tag..."
              />
              <button
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowLabelPicker(!showLabelPicker)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                showLabelPicker || selfLabels.length > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
              }`}
            >
              <ShieldAlert size={16} />
              Content Warning
              {selfLabels.length > 0 && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                  {selfLabels.length}
                </span>
              )}
            </button>
            {showLabelPicker && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SELF_LABEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleLabel(opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      selfLabels.includes(opt.value)
                        ? "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
                        : "bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-amber-300 dark:hover:border-amber-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-surface-200 dark:border-surface-700">
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (type === "annotation" && !text.trim())}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
