import { useState } from "react";
import AnnotationCard, { HighlightCard } from "../components/AnnotationCard";
import { getByTarget } from "../api/client";
import { PenIcon, AlertIcon, SearchIcon } from "../components/Icons";

export default function Url() {
  const [url, setUrl] = useState("");
  const [annotations, setAnnotations] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSearched(true);
      const data = await getByTarget(url);
      setAnnotations(data.annotations || []);
      setHighlights(data.highlights || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        <h1 className="page-title">Browse by URL</h1>
        <p className="page-description">
          See annotations and highlights for any webpage
        </p>
      </div>

      <form onSubmit={handleSearch} className="url-input-wrapper">
        <div className="url-input-container">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="url-input"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
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
          <div className="feed">{renderResults()}</div>
        </>
      )}
    </div>
  );
}
