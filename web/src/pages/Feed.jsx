import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import BookmarkCard from "../components/BookmarkCard";
import CollectionItemCard from "../components/CollectionItemCard";
import { getAnnotationFeed, deleteHighlight } from "../api/client";
import { AlertIcon, InboxIcon } from "../components/Icons";
import { useAuth } from "../context/AuthContext";

import AddToCollectionModal from "../components/AddToCollectionModal";

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tagFilter = searchParams.get("tag");

  const [filter, setFilter] = useState(() => {
    return localStorage.getItem("feedFilter") || "all";
  });

  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem("feedFilter", filter);
  }, [filter]);

  const [collectionModalState, setCollectionModalState] = useState({
    isOpen: false,
    uri: null,
  });

  const { user } = useAuth();

  useEffect(() => {
    async function fetchFeed() {
      try {
        setLoading(true);
        let creatorDid = "";

        if (filter === "my-tags") {
          if (user?.did) {
            creatorDid = user.did;
          } else {
            setAnnotations([]);
            setLoading(false);
            return;
          }
        }

        const data = await getAnnotationFeed(
          50,
          0,
          tagFilter || "",
          creatorDid,
        );
        setAnnotations(data.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFeed();
  }, [tagFilter, filter, user]);

  const filteredAnnotations =
    filter === "all" || filter === "my-tags"
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
        {tagFilter && (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
            >
              Filtering by tag: <strong>#{tagFilter}</strong>
            </span>
            <button
              onClick={() =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("tag");
                  return next;
                })
              }
              className="btn btn-sm"
              style={{ padding: "2px 8px", fontSize: "0.8rem" }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {}
      <div className="feed-filters">
        <button
          className={`filter-tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {user && (
          <button
            className={`filter-tab ${filter === "my-tags" ? "active" : ""}`}
            onClick={() => setFilter("my-tags")}
          >
            My Feed
          </button>
        )}
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
                  onAddToCollection={() =>
                    setCollectionModalState({
                      isOpen: true,
                      uri: item.uri || item.id,
                    })
                  }
                />
              );
            }
            if (item.type === "Bookmark" || item.motivation === "bookmarking") {
              return (
                <BookmarkCard
                  key={item.id}
                  bookmark={item}
                  onAddToCollection={() =>
                    setCollectionModalState({
                      isOpen: true,
                      uri: item.uri || item.id,
                    })
                  }
                />
              );
            }
            return (
              <AnnotationCard
                key={item.id}
                annotation={item}
                onAddToCollection={() =>
                  setCollectionModalState({
                    isOpen: true,
                    uri: item.uri || item.id,
                  })
                }
              />
            );
          })}
        </div>
      )}

      {collectionModalState.isOpen && (
        <AddToCollectionModal
          isOpen={collectionModalState.isOpen}
          onClose={() => setCollectionModalState({ isOpen: false, uri: null })}
          annotationUri={collectionModalState.uri}
        />
      )}
    </div>
  );
}
