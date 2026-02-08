import React from "react";
import { Link } from "react-router-dom";

interface RichTextProps {
  text: string;
  className?: string;
}

const MENTION_REGEX =
  /(^|[\s(])@([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)/g;

export default function RichText({ text, className }: RichTextProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MENTION_REGEX)) {
    const fullMatch = match[0];
    const prefix = match[1];
    const handle = match[2];
    const startIndex = match.index!;

    if (startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, startIndex));
    }

    if (prefix) {
      parts.push(prefix);
    }

    parts.push(
      <Link
        key={startIndex}
        to={`/profile/${handle}`}
        className="text-primary-600 dark:text-primary-400 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        @{handle}
      </Link>,
    );

    lastIndex = startIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{parts}</span>;
}
