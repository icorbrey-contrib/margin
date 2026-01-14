import React from "react";
import { Link } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "./AnnotationCard";
import BookmarkCard from "./BookmarkCard";

import CollectionIcon from "./CollectionIcon";
import ShareMenu from "./ShareMenu";

export default function CollectionItemCard({ item }) {
  const author = item.creator;
  const collection = item.collection;

  if (!author || !collection) return null;

  let inner = null;
  if (item.annotation) {
    inner = <AnnotationCard annotation={item.annotation} />;
  } else if (item.highlight) {
    inner = <HighlightCard highlight={item.highlight} />;
  } else if (item.bookmark) {
    inner = <BookmarkCard bookmark={item.bookmark} />;
  }

  if (!inner) return null;

  return (
    <div className="collection-feed-item" style={{ marginBottom: "20px" }}>
      <div
        className="feed-context-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
          fontSize: "14px",
          color: "var(--text-secondary)",
        }}
      >
        {author.avatar && (
          <img
            src={author.avatar}
            alt={author.handle}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        )}
        <span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {author.displayName || author.handle}
          </span>{" "}
          added to{" "}
          <Link
            to={`/${author.handle}/collection/${collection.uri.split("/").pop()}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontWeight: 500,
              color: "var(--primary)",
              textDecoration: "none",
            }}
          >
            <CollectionIcon icon={collection.icon} size={14} />
            {collection.name}
          </Link>
        </span>
        <div style={{ marginLeft: "auto" }}>
          <ShareMenu
            uri={collection.uri}
            handle={author.handle}
            type="Collection"
            text={`Check out this collection by ${author.displayName}: ${collection.name}`}
          />
        </div>
      </div>
      <div
        className="feed-context-body"
        style={{
          paddingLeft: "16px",
          borderLeft: "2px solid var(--border-color)",
        }}
      >
        {inner}
      </div>
    </div>
  );
}
