import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Composer from "../components/Composer";

export default function New() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialUrl = searchParams.get("url") || "";

  let initialSelector = null;
  const selectorParam = searchParams.get("selector");
  if (selectorParam) {
    try {
      initialSelector = JSON.parse(selectorParam);
    } catch (e) {
      console.error("Failed to parse selector:", e);
    }
  }

  const legacyQuote = searchParams.get("quote") || "";
  if (legacyQuote && !initialSelector) {
    initialSelector = {
      type: "TextQuoteSelector",
      exact: legacyQuote,
    };
  }

  const [url, setUrl] = useState(initialUrl);

  if (loading) {
    return (
      <div className="new-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="new-page">
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <h2>Sign in to create annotations</h2>
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

  const handleSuccess = () => {
    navigate("/");
  };

  return (
    <div className="new-page">
      <div className="page-header">
        <h1 className="page-title">New Annotation</h1>
        <p className="page-description">Write in the margins of the web</p>
      </div>

      {!initialUrl && (
        <div className="url-input-wrapper">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="url-input"
            required
          />
        </div>
      )}

      <div className="card">
        <Composer
          url={
            (url || initialUrl) && !/^(?:f|ht)tps?:\/\//.test(url || initialUrl)
              ? `https://${url || initialUrl}`
              : url || initialUrl
          }
          selector={initialSelector}
          onSuccess={handleSuccess}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  );
}
