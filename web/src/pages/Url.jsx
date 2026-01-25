import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import { getByTarget, searchActors } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PenIcon, AlertIcon, SearchIcon } from "../components/Icons";
import { Copy, Check, ExternalLink } from "lucide-react";

export default function Url() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [annotations, setAnnotations] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [copied, setCopied] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const isUrl = url.includes("http") || url.includes("://");
      if (url.length >= 2 && !isUrl) {
        try {
          const data = await searchActors(url);
          setSuggestions(data.actors || []);
          setShowSuggestions(true);
        } catch {
          // ignore
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (actor) => {
    navigate(`/profile/${encodeURIComponent(actor.handle)}`);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    const isProtocol = url.startsWith("http://") || url.startsWith("https://");
    if (!isProtocol) {
      try {
        const actorRes = await searchActors(url);
        if (actorRes?.actors?.length > 0) {
          const match = actorRes.actors[0];
          navigate(`/profile/${encodeURIComponent(match.handle)}`);
          return;
        }
      } catch {
        // ignore
      }
    }

    try {
      const data = await getByTarget(url);
      setAnnotations(data.annotations || []);
      setHighlights(data.highlights || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const myAnnotations = user
    ? annotations.filter((a) => (a.creator?.did || a.author?.did) === user.did)
    : [];
  const myHighlights = user
    ? highlights.filter((h) => (h.creator?.did || h.author?.did) === user.did)
    : [];
  const myItemsCount = myAnnotations.length + myHighlights.length;

  const getShareUrl = () => {
    if (!user?.handle || !url) return null;
    return `${window.location.origin}/${user.handle}/url/${url}`;
  };

  const handleCopyShareLink = async () => {
    const shareUrl = getShareUrl();
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy this link:", shareUrl);
    }
  };

  const totalItems = annotations.length + highlights.length;

  const renderResults = () => {
    if (activeTab === "annotations" && annotations.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">
            <PenIcon size={32} />
          </div>
          <h3 className="empty-state-title">No annotations</h3>
        </div>
      );
    }

    return (
      <>
        {(activeTab === "all" || activeTab === "annotations") &&
          annotations.map((a) => <AnnotationCard key={a.id} annotation={a} />)}
        {(activeTab === "all" || activeTab === "highlights") &&
          highlights.map((h) => <HighlightCard key={h.id} highlight={h} />)}
      </>
    );
  };

  return (
    <div className="url-page">
      <div className="page-header">
        <h1 className="page-title">Explore</h1>
        <p className="page-description">
          Search for a URL to view its context layer, or find a user by their
          handle
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="url-input-wrapper"
        style={{ position: "relative" }}
      >
        <div className="url-input-container">
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://... or handle"
            className="url-input"
            autoComplete="off"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div
            className="login-suggestions"
            ref={suggestionsRef}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "8px",
              width: "100%",
              zIndex: 50,
              background: "var(--bg-primary)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border)",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {suggestions.map((actor, index) => (
              <button
                key={actor.did}
                type="button"
                className={`login-suggestion ${index === selectedIndex ? "selected" : ""}`}
                onClick={() => selectSuggestion(actor)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  border: "none",
                  background:
                    index === selectedIndex
                      ? "var(--bg-secondary)"
                      : "transparent",
                  cursor: "pointer",
                }}
              >
                <div
                  className="login-suggestion-avatar"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "var(--bg-tertiary)",
                  }}
                >
                  {actor.avatar ? (
                    <img
                      src={actor.avatar}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        fontSize: "0.8rem",
                      }}
                    >
                      {(actor.displayName || actor.handle)
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div
                  className="login-suggestion-info"
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <span
                    className="login-suggestion-name"
                    style={{ fontWeight: 600, fontSize: "0.95rem" }}
                  >
                    {actor.displayName || actor.handle}
                  </span>
                  <span
                    className="login-suggestion-handle"
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    @{actor.handle}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {error && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <AlertIcon size={32} />
          </div>
          <h3 className="empty-state-title">Error</h3>
          <p className="empty-state-text">{error}</p>
        </div>
      )}

      {searched && !loading && !error && totalItems === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <SearchIcon size={32} />
          </div>
          <h3 className="empty-state-title">No annotations found</h3>
          <p className="empty-state-text">
            Be the first to annotate this URL! Sign in to add your thoughts.
          </p>
        </div>
      )}

      {searched && totalItems > 0 && (
        <>
          <div className="url-results-header">
            <h2 className="feed-title">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </h2>
            <div className="feed-filters">
              <button
                className={`filter-tab ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All ({totalItems})
              </button>
              <button
                className={`filter-tab ${activeTab === "annotations" ? "active" : ""}`}
                onClick={() => setActiveTab("annotations")}
              >
                Annotations ({annotations.length})
              </button>
              <button
                className={`filter-tab ${activeTab === "highlights" ? "active" : ""}`}
                onClick={() => setActiveTab("highlights")}
              >
                Highlights ({highlights.length})
              </button>
            </div>
          </div>

          {user && myItemsCount > 0 && (
            <div className="share-notes-banner">
              <div className="share-notes-info">
                <ExternalLink size={16} />
                <span>
                  You have {myItemsCount} note{myItemsCount !== 1 ? "s" : ""} on
                  this page
                </span>
              </div>
              <div className="share-notes-actions">
                <Link
                  to={`/${user.handle}/url/${encodeURIComponent(url)}`}
                  className="btn btn-ghost btn-sm"
                >
                  View
                </Link>
                <button
                  onClick={handleCopyShareLink}
                  className="btn btn-primary btn-sm"
                >
                  {copied ? (
                    <>
                      <Check size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy Share Link
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="feed">{renderResults()}</div>
        </>
      )}
    </div>
  );
}
