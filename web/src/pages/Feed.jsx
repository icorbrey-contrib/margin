import { useState, useEffect } from "react";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import BookmarkCard from "../components/BookmarkCard";
import CollectionItemCard from "../components/CollectionItemCard";
import { getAnnotationFeed, deleteHighlight } from "../api/client";
import { AlertIcon, InboxIcon } from "../components/Icons";

export default function Feed() {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function fetchFeed() {
      try {
        setLoading(true);
        const data = await getAnnotationFeed();
        setAnnotations(data.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFeed();
  }, []);

  const filteredAnnotations =
    filter === "all"
      ? annotations
      : annotations.filter((a) => {
          if (filter === "commenting")
            return a.motivation === "commenting" || a.type === "Annotation";
          if (filter === "highlighting")
            return a.motivation === "highlighting" || a.type === "Highlight";
          if (filter === "bookmarking")
            return a.motivation === "bookmarking" || a.type === "Bookmark";
          return a.motivation === filter;
        });

  return (
    <div className="feed-page">
      <div className="page-header">
        <h1 className="page-title">Feed</h1>
        <p className="page-description">
          See what people are annotating, highlighting, and bookmarking
        </p>
      </div>

      {}
      <div className="feed-filters">
        <button
          className={`filter-tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === "commenting" ? "active" : ""}`}
          onClick={() => setFilter("commenting")}
        >
          Annotations
        </button>
        <button
          className={`filter-tab ${filter === "highlighting" ? "active" : ""}`}
          onClick={() => setFilter("highlighting")}
        >
          Highlights
        </button>
        <button
          className={`filter-tab ${filter === "bookmarking" ? "active" : ""}`}
          onClick={() => setFilter("bookmarking")}
        >
          Bookmarks
        </button>
      </div>

      {loading && (
        <div className="feed">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div
                className="skeleton skeleton-text"
                style={{ width: "40%" }}
              />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" />
              <div
                className="skeleton skeleton-text"
                style={{ width: "60%" }}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <AlertIcon size={32} />
          </div>
          <h3 className="empty-state-title">Something went wrong</h3>
          <p className="empty-state-text">{error}</p>
        </div>
      )}

      {!loading && !error && filteredAnnotations.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <InboxIcon size={32} />
          </div>
          <h3 className="empty-state-title">No items yet</h3>
          <p className="empty-state-text">
            {filter === "all"
              ? "Be the first to annotate something!"
              : `No ${filter} items found.`}
          </p>
        </div>
      )}

      {!loading && !error && filteredAnnotations.length > 0 && (
        <div className="feed">
          {filteredAnnotations.map((item) => {
            if (item.type === "CollectionItem") {
              return <CollectionItemCard key={item.id} item={item} />;
            }
            if (
              item.type === "Highlight" ||
              item.motivation === "highlighting"
            ) {
              return (
                <HighlightCard
                  key={item.id}
                  highlight={item}
                  onDelete={async (uri) => {
                    const rkey = uri.split("/").pop();
                    await deleteHighlight(rkey);
                    setAnnotations((prev) =>
                      prev.filter((a) => a.id !== item.id),
                    );
                  }}
                />
              );
            }
            if (item.type === "Bookmark" || item.motivation === "bookmarking") {
              return <BookmarkCard key={item.id} bookmark={item} />;
            }
            return <AnnotationCard key={item.id} annotation={item} />;
          })}
        </div>
      )}
    </div>
  );
}
