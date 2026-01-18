import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserHighlights, deleteHighlight } from "../api/client";
import { HighlightIcon } from "../components/Icons";
import { HighlightCard } from "../components/AnnotationCard";

export default function Highlights() {
  const { user, isAuthenticated, loading } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHighlights() {
      if (!user?.did) return;

      try {
        setLoadingHighlights(true);
        const data = await getUserHighlights(user.did);
        setHighlights(data.items || []);
      } catch (err) {
        console.error("Failed to load highlights:", err);
        setError(err.message);
      } finally {
        setLoadingHighlights(false);
      }
    }

    if (isAuthenticated && user) {
      loadHighlights();
    }
  }, [isAuthenticated, user]);

  const handleDelete = async (uri) => {
    if (!confirm("Delete this highlight?")) return;

    try {
      const parts = uri.split("/");
      const rkey = parts[parts.length - 1];
      await deleteHighlight(rkey);
      setHighlights((prev) => prev.filter((h) => (h.id || h.uri) !== uri));
    } catch (err) {
      alert("Failed to delete: " + err.message);
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
          <h2>Sign in to view your highlights</h2>
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
      <div className="page-header">
        <h1 className="page-title">My Highlights</h1>
        <p className="page-description">
          Text you&apos;ve highlighted across the web
        </p>
      </div>

      {loadingHighlights ? (
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
          <h3 className="empty-state-title">Error loading highlights</h3>
          <p className="empty-state-text">{error}</p>
        </div>
      ) : highlights.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <HighlightIcon size={32} />
          </div>
          <h3 className="empty-state-title">No highlights yet</h3>
          <p className="empty-state-text">
            Highlight text on any page using the browser extension.
          </p>
        </div>
      ) : (
        <div className="feed">
          {highlights.map((highlight) => (
            <HighlightCard
              key={highlight.id}
              highlight={highlight}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
