import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import BookmarkCard from "../components/BookmarkCard";
import CollectionItemCard from "../components/CollectionItemCard";
import AnnotationSkeleton from "../components/AnnotationSkeleton";
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

  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const hasDismissed = localStorage.getItem("iosBannerDismissed");

    if (isIOS && !hasDismissed) {
      setShowIosBanner(true);
    }
  }, []);

  const dismissIosBanner = () => {
    setShowIosBanner(false);
    localStorage.setItem("iosBannerDismissed", "true");
  };

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

        const data = await getAnnotationFeed(
          50,
          0,
          tagFilter || "",
          creatorDid,
          feedType,
          filter !== "all" ? filter : "",
        );
        setAnnotations(data.items || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFeed();
  }, [tagFilter, filter, feedType, user]);

  const filteredAnnotations =
    feedType === "all" ||
      feedType === "popular" ||
      feedType === "semble" ||
      feedType === "margin" ||
      feedType === "my-feed"
      ? filter === "all"
        ? annotations
        : annotations.filter((a) => {
          if (filter === "commenting")
            return a.motivation === "commenting" || a.type === "Annotation";
          if (filter === "highlighting")
            return a.motivation === "highlighting" || a.type === "Highlight";
          if (filter === "bookmarking")
            return a.motivation === "bookmarking" || a.type === "Bookmark";
          return a.motivation === filter;
        })
      : annotations;

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

      {showIosBanner && (
        <div
          className="ios-banner"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "12px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              Get the iOS Shortcut
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Easily save links from Safari using our new shortcut.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <a
              href="https://www.icloud.com/shortcuts/21c87edf29b046db892c9e57dac6d1fd"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              style={{ whiteSpace: "nowrap" }}
            >
              Get It
            </a>
            <button
              className="btn btn-sm"
              onClick={dismissIosBanner}
              style={{
                color: "var(--text-tertiary)",
                padding: "4px",
                height: "auto",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      { }
      <div
        className="feed-filters"
        style={{
          marginBottom: "12px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          className={`filter-tab ${feedType === "all" ? "active" : ""}`}
          onClick={() => setFeedType("all")}
        >
          All
        </button>
        <button
          className={`filter-tab ${feedType === "popular" ? "active" : ""}`}
          onClick={() => setFeedType("popular")}
        >
          Popular
        </button>
        <button
          className={`filter-tab ${feedType === "margin" ? "active" : ""}`}
          onClick={() => setFeedType("margin")}
        >
          Margin
        </button>
        <button
          className={`filter-tab ${feedType === "semble" ? "active" : ""}`}
          onClick={() => setFeedType("semble")}
        >
          Semble
        </button>
        {user && (
          <button
            className={`filter-tab ${feedType === "my-feed" ? "active" : ""}`}
            onClick={() => setFeedType("my-feed")}
          >
            My Feed
          </button>
        )}
      </div>

      <div className="feed-filters">
        <button
          className={`filter-pill ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All Types
        </button>
        <button
          className={`filter-pill ${filter === "commenting" ? "active" : ""}`}
          onClick={() => setFilter("commenting")}
        >
          Annotations
        </button>
        <button
          className={`filter-pill ${filter === "highlighting" ? "active" : ""}`}
          onClick={() => setFilter("highlighting")}
        >
          Highlights
        </button>
        <button
          className={`filter-pill ${filter === "bookmarking" ? "active" : ""}`}
          onClick={() => setFilter("bookmarking")}
        >
          Bookmarks
        </button>
      </div>

      {loading ? (
        <div className="feed">
          {[1, 2, 3, 4, 5].map((i) => (
            <AnnotationSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {error && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <AlertIcon size={32} />
              </div>
              <h3 className="empty-state-title">Something went wrong</h3>
              <p className="empty-state-text">{error}</p>
            </div>
          )}

          {!error && filteredAnnotations.length === 0 && (
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

          {!error && filteredAnnotations.length > 0 && (
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
