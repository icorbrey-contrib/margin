import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import BookmarkCard from "../components/BookmarkCard";
import CollectionItemCard from "../components/CollectionItemCard";
import AnnotationSkeleton from "../components/AnnotationSkeleton";
import IOSInstallBanner from "../components/IOSInstallBanner";
import { getAnnotationFeed, deleteHighlight } from "../api/client";
import { AlertIcon, InboxIcon } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { X } from "lucide-react";

import AddToCollectionModal from "../components/AddToCollectionModal";

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tagFilter = searchParams.get("tag");

  const [filter, setFilter] = useState(() => {
    return localStorage.getItem("feedFilter") || "all";
  });

  const [feedType, setFeedType] = useState(() => {
    return localStorage.getItem("feedType") || "all";
  });

  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem("feedFilter", filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem("feedType", feedType);
  }, [feedType]);

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

        if (feedType === "my-feed") {
          if (user?.did) {
            creatorDid = user.did;
          } else {
            setAnnotations([]);
            setLoading(false);
            return;
          }
        }

        const motivationMap = {
          commenting: "commenting",
          highlighting: "highlighting",
          bookmarking: "bookmarking",
        };
        const motivation = motivationMap[filter] || "";

        const data = await getAnnotationFeed(
          50,
          0,
          tagFilter || "",
          creatorDid,
          feedType,
          motivation,
        );
        setAnnotations(data.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFeed();
  }, [tagFilter, feedType, filter, user]);

  const deduplicatedAnnotations = useMemo(() => {
    const inCollectionUris = new Set();
    for (const item of annotations) {
      if (item.type === "CollectionItem") {
        const inner = item.annotation || item.highlight || item.bookmark;
        if (inner) {
          if (inner.uri) inCollectionUris.add(inner.uri.trim());
          if (inner.id) inCollectionUris.add(inner.id.trim());
        }
      }
    }

    const result = [];

    for (const item of annotations) {
      if (item.type !== "CollectionItem") {
        const itemUri = (item.uri || "").trim();
        const itemId = (item.id || "").trim();
        if (
          (itemUri && inCollectionUris.has(itemUri)) ||
          (itemId && inCollectionUris.has(itemId))
        ) {
          continue;
        }
      }

      result.push(item);
    }

    return result;
  }, [annotations]);

  const filteredAnnotations =
    feedType === "all" ||
    feedType === "popular" ||
    feedType === "semble" ||
    feedType === "margin" ||
    feedType === "my-feed"
      ? filter === "all"
        ? deduplicatedAnnotations
        : deduplicatedAnnotations.filter((a) => {
            if (a.type === "CollectionItem") {
              if (filter === "commenting") return !!a.annotation;
              if (filter === "highlighting") return !!a.highlight;
              if (filter === "bookmarking") return !!a.bookmark;
            }
            if (filter === "commenting")
              return a.motivation === "commenting" || a.type === "Annotation";
            if (filter === "highlighting")
              return a.motivation === "highlighting" || a.type === "Highlight";
            if (filter === "bookmarking")
              return a.motivation === "bookmarking" || a.type === "Bookmark";
            return a.motivation === filter;
          })
      : deduplicatedAnnotations;

  return (
    <div className="feed-page">
      <div className="page-header">
        <h1 className="page-title">Feed</h1>
        <p className="page-description">
          See what people are annotating and bookmarking
        </p>
      </div>

      {tagFilter && (
        <div className="active-filter-banner">
          <span>
            Filtering by <strong>#{tagFilter}</strong>
          </span>
          <button
            onClick={() =>
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("tag");
                return next;
              })
            }
            className="active-filter-clear"
            aria-label="Clear filter"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="feed-controls">
        <div className="feed-filters">
          {[
            { key: "all", label: "All" },
            { key: "popular", label: "Popular" },
            { key: "margin", label: "Margin" },
            { key: "semble", label: "Semble" },
            ...(user ? [{ key: "my-feed", label: "Mine" }] : []),
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-tab ${feedType === key ? "active" : ""}`}
              onClick={() => setFeedType(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="feed-filters">
          {[
            { key: "all", label: "All" },
            { key: "commenting", label: "Notes" },
            { key: "highlighting", label: "Highlights" },
            { key: "bookmarking", label: "Bookmarks" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-pill ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <IOSInstallBanner />

      {loading ? (
        <div className="feed-container">
          <div className="feed">
            {[1, 2, 3, 4, 5].map((i) => (
              <AnnotationSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <AlertIcon size={24} />
              </div>
              <h3 className="empty-state-title">Something went wrong</h3>
              <p className="empty-state-text">{error}</p>
            </div>
          )}

          {!error && filteredAnnotations.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <InboxIcon size={24} />
              </div>
              <h3 className="empty-state-title">No items yet</h3>
              <p className="empty-state-text">
                {filter === "all"
                  ? "Be the first to annotate something!"
                  : `No ${filter} items found.`}
              </p>
            </div>
          )}

          {!error && filteredAnnotations.length > 0 && (
            <div className="feed-container">
              <div className="feed">
                {filteredAnnotations.map((item) => {
                  if (item.type === "CollectionItem") {
                    return (
                      <CollectionItemCard
                        key={item.id}
                        item={item}
                        onAddToCollection={(uri) =>
                          setCollectionModalState({
                            isOpen: true,
                            uri: uri,
                          })
                        }
                      />
                    );
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
                  if (
                    item.type === "Bookmark" ||
                    item.motivation === "bookmarking"
                  ) {
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
            </div>
          )}
        </>
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
