import React from "react";
import { Link } from "react-router-dom";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function RichText({ text }) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <p className="annotation-text">
      {parts.map((part, i) => {
        if (part.match(URL_REGEX)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rich-text-link"
            >
              {part}
            </a>
          );
        }

        const subParts = part.split(/((?:^|\s)@[a-zA-Z0-9.-]+\b)/g);

        return (
          <React.Fragment key={i}>
            {subParts.map((subPart, j) => {
              const mentionMatch = subPart.match(/^(\s*)@([a-zA-Z0-9.-]+)$/);
              if (mentionMatch) {
                const prefix = mentionMatch[1];
                const handle = mentionMatch[2];
                if (handle.includes(".")) {
                  return (
                    <React.Fragment key={j}>
                      {prefix}
                      <Link
                        to={`/profile/${handle}`}
                        className="rich-text-mention"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{handle}
                      </Link>
                    </React.Fragment>
                  );
                }
              }
              return subPart;
            })}
          </React.Fragment>
        );
      })}
    </p>
  );
}
