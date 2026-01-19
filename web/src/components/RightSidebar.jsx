import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import {
  SiFirefox,
  SiGooglechrome,
  SiGithub,
  SiBluesky,
  SiApple,
  SiKofi,
} from "react-icons/si";
import { FaEdge } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { getTrendingTags } from "../api/client";

const isFirefox =
  typeof navigator !== "undefined" && /Firefox/i.test(navigator.userAgent);
const isEdge =
  typeof navigator !== "undefined" && /Edg/i.test(navigator.userAgent);
const isMobileSafari =
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod/.test(navigator.userAgent) &&
  /Safari/.test(navigator.userAgent) &&
  !/CriOS|FxiOS|OPiOS|EdgiOS/.test(navigator.userAgent);

function getExtensionInfo() {
  if (isMobileSafari) {
    return {
      url: "https://margin.at/soon",
      icon: SiApple,
      name: "iOS",
      label: "Coming Soon",
    };
  }
  if (isFirefox) {
    return {
      url: "https://addons.mozilla.org/en-US/firefox/addon/margin/",
      icon: SiFirefox,
      name: "Firefox",
      label: "Install for Firefox",
    };
  }
  if (isEdge) {
    return {
      url: "https://microsoftedge.microsoft.com/addons/detail/margin/nfjnmllpdgcdnhmmggjihjbidmeadddn",
      icon: FaEdge,
      name: "Edge",
      label: "Install for Edge",
    };
  }
  return {
    url: "https://chromewebstore.google.com/detail/margin/cgpmbiiagnehkikhcbnhiagfomajncpa/",
    icon: SiGooglechrome,
    name: "Chrome",
    label: "Install for Chrome",
  };
}

export default function RightSidebar() {
  const { isAuthenticated } = useAuth();
  const ext = getExtensionInfo();
  const ExtIcon = ext.icon;
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrendingTags()
      .then((tags) => setTrendingTags(tags))
      .catch((err) => console.error("Failed to fetch trending tags:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <aside className="right-sidebar">
      <div className="right-section">
        <h3 className="right-section-title">
          {isMobileSafari ? "Save from Safari" : "Get the Extension"}
        </h3>
        <p className="right-section-desc">
          {isMobileSafari
            ? "Bookmark pages using Safari's share sheet"
            : "Annotate, highlight, and bookmark any webpage"}
        </p>
        <a
          href={ext.url}
          target="_blank"
          rel="noopener noreferrer"
          className="right-extension-btn"
        >
          <ExtIcon size={18} />
          {ext.label}
          <ExternalLink size={14} />
        </a>
      </div>

      {isAuthenticated ? (
        <div className="right-section">
          <h3 className="right-section-title">Trending Tags</h3>
          <div className="right-links">
            {loading ? (
              <span className="right-section-desc">Loading...</span>
            ) : trendingTags.length > 0 ? (
              trendingTags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  to={`/?tag=${encodeURIComponent(tag)}`}
                  className="right-link"
                >
                  <span>#{tag}</span>
                  <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                    {count}
                  </span>
                </Link>
              ))
            ) : (
              <span className="right-section-desc">No trending tags yet</span>
            )}
          </div>
        </div>
      ) : (
        <div className="right-section">
          <h3 className="right-section-title">Explore</h3>
          <nav className="right-links">
            <Link to="/url" className="right-link">
              Browse by URL
            </Link>
          </nav>
        </div>
      )}

      <div className="right-section">
        <h3 className="right-section-title">Resources</h3>
        <nav className="right-links">
          <a
            href="https://github.com/margin-at/margin"
            target="_blank"
            rel="noopener noreferrer"
            className="right-link"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SiGithub size={16} />
              GitHub
            </div>
            <ExternalLink size={12} />
          </a>
          <a
            href="https://tangled.org/margin.at/margin"
            target="_blank"
            rel="noopener noreferrer"
            className="right-link"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="tangled-icon" />
              Tangled
            </div>
            <ExternalLink size={12} />
          </a>
          <a
            href="https://bsky.app/profile/margin.at"
            target="_blank"
            rel="noopener noreferrer"
            className="right-link"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SiBluesky size={16} />
              Bluesky
            </div>
            <ExternalLink size={12} />
          </a>
          <a
            href="https://ko-fi.com/scan"
            target="_blank"
            rel="noopener noreferrer"
            className="right-link"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SiKofi size={16} />
              Donate
            </div>
            <ExternalLink size={12} />
          </a>
        </nav>
      </div>

      <div className="right-footer">
        <Link to="/privacy">Privacy</Link>
        <span>·</span>
        <Link to="/terms">Terms</Link>
      </div>
    </aside>
  );
}
