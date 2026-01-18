import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getUserBookmarks,
  deleteBookmark,
  createBookmark,
  getURLMetadata,
} from "../api/client";
import { BookmarkIcon } from "../components/Icons";
import BookmarkCard from "../components/BookmarkCard";

export default function Bookmarks() {
  const { user, isAuthenticated, loading } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);

  const loadBookmarks = useCallback(async () => {
    if (!user?.did) return;

    try {
      setLoadingBookmarks(true);
      const data = await getUserBookmarks(user.did);
      setBookmarks(data.items || []);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
      setError(err.message);
    } finally {
      setLoadingBookmarks(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadBookmarks();
    }
  }, [isAuthenticated, user, loadBookmarks]);

  const handleDelete = async (uri) => {
    if (!confirm("Delete this bookmark?")) return;

    try {
      const parts = uri.split("/");
      const rkey = parts[parts.length - 1];
      await deleteBookmark(rkey);
      setBookmarks((prev) => prev.filter((b) => (b.id || b.uri) !== uri));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleUrlBlur = async () => {
    if (!newUrl.trim() || newTitle.trim()) return;
    try {
      new URL(newUrl);
    } catch {
      return;
    }
    try {
      setFetchingTitle(true);
      const data = await getURLMetadata(newUrl.trim());
      if (data.title && !newTitle) {
        setNewTitle(data.title);
      }
    } catch (err) {
      console.error("Failed to fetch title:", err);
    } finally {
      setFetchingTitle(false);
    }
  };

  const handleAddBookmark = async (e) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    try {
      setSubmitting(true);
      await createBookmark(newUrl.trim(), newTitle.trim() || undefined);
      setNewUrl("");
      setNewTitle("");
      setShowAddForm(false);
      await loadBookmarks();
    } catch (err) {
      alert("Failed to add bookmark: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="page-loading">
        <div className="spinner"></div>
      </div>
    );

  if (!isAuthenticated) {
    return (
      <div className="new-page">
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <h2>Sign in to view your bookmarks</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
            You need to be logged in with your Bluesky account
          </p>
          <Link
            to="/login"
            className="btn btn-primary"
            style={{ marginTop: "24px" }}
          >
            Sign in with Bluesky
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="page-title">My Bookmarks</h1>
          <p className="page-description">Pages you&apos;ve saved for later</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Add Bookmark
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: "20px", padding: "24px" }}>
          <h3
            style={{
              marginBottom: "16px",
              fontSize: "1.1rem",
              color: "var(--text-primary)",
            }}
          >
            Add a Bookmark
          </h3>
          <form onSubmit={handleAddBookmark}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  URL *
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/article"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  className="input"
                  style={{ width: "100%" }}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Title{" "}
                  {fetchingTitle ? (
                    <span style={{ color: "var(--accent)" }}>Fetching...</span>
                  ) : (
                    <span style={{ color: "var(--text-tertiary)" }}>
                      (auto-fetched)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder={
                    fetchingTitle
                      ? "Fetching title..."
                      : "Page title will be fetched automatically"
                  }
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewUrl("");
                    setNewTitle("");
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !newUrl.trim()}
                >
                  {submitting ? "Adding..." : "Save Bookmark"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {loadingBookmarks ? (
        <div className="feed">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div
                className="skeleton skeleton-text"
                style={{ width: "40%" }}
              ></div>
              <div className="skeleton skeleton-text"></div>
              <div
                className="skeleton skeleton-text"
                style={{ width: "60%" }}
              ></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Error loading bookmarks</h3>
          <p className="empty-state-text">{error}</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <BookmarkIcon size={32} />
          </div>
          <h3 className="empty-state-title">No bookmarks yet</h3>
          <p className="empty-state-text">
            Click &quot;Add Bookmark&quot; above to save a page, or use the
            browser extension.
          </p>
        </div>
      ) : (
        <div className="feed">
          {bookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
