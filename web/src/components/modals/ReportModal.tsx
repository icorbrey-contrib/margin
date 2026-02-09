import React, { useState } from "react";
import { Flag, X } from "lucide-react";
import { reportUser } from "../../api/client";
import type { ReportReasonType } from "../../types";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectDid: string;
  subjectUri?: string;
  subjectHandle?: string;
}

const REASONS: {
  value: ReportReasonType;
  label: string;
  description: string;
}[] = [
  { value: "spam", label: "Spam", description: "Unwanted repetitive content" },
  {
    value: "violation",
    label: "Rule violation",
    description: "Violates community guidelines",
  },
  {
    value: "misleading",
    label: "Misleading",
    description: "False or misleading information",
  },
  {
    value: "rude",
    label: "Rude or harassing",
    description: "Targeting or harassing a user",
  },
  {
    value: "sexual",
    label: "Inappropriate content",
    description: "Sexual or explicit material",
  },
  {
    value: "other",
    label: "Other",
    description: "Something else not listed above",
  },
];

export default function ReportModal({
  isOpen,
  onClose,
  subjectDid,
  subjectUri,
  subjectHandle,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReasonType | null>(
    null,
  );
  const [additionalText, setAdditionalText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setSubmitting(true);
    const success = await reportUser({
      subjectDid: subjectDid,
      subjectUri: subjectUri,
      reasonType: selectedReason,
      reasonText: additionalText || undefined,
    });

    setSubmitting(false);
    if (success) {
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setSelectedReason(null);
        setAdditionalText("");
      }, 1500);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedReason(null);
    setAdditionalText("");
    setSubmitted(false);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-700 w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Flag size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
              Report submitted
            </h3>
            <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">
              Thank you. We'll review this shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Flag size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-surface-900 dark:text-white">
                    Report {subjectHandle ? `@${subjectHandle}` : "user"}
                  </h3>
                  {subjectUri && (
                    <p className="text-xs text-surface-400 dark:text-surface-500">
                      Reporting specific content
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                What's the issue?
              </p>
              {REASONS.map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => setSelectedReason(reason.value)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                    selectedReason === reason.value
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      selectedReason === reason.value
                        ? "text-primary-700 dark:text-primary-300"
                        : "text-surface-800 dark:text-surface-200"
                    }`}
                  >
                    {reason.label}
                  </span>
                  <span
                    className={`block text-xs mt-0.5 ${
                      selectedReason === reason.value
                        ? "text-primary-600/70 dark:text-primary-400/70"
                        : "text-surface-400 dark:text-surface-500"
                    }`}
                  >
                    {reason.description}
                  </span>
                </button>
              ))}
            </div>

            {selectedReason && (
              <div className="px-4 pb-2">
                <textarea
                  value={additionalText}
                  onChange={(e) => setAdditionalText(e.target.value)}
                  placeholder="Additional details (optional)"
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 p-4 border-t border-surface-200 dark:border-surface-700">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedReason || submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting…" : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
