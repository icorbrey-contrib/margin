import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Monitor, ExternalLink } from "lucide-react";
import {
  SiFirefox,
  SiGooglechrome,
  SiGithub,
  SiBluesky,
  SiDiscord,
} from "react-icons/si";
import { FaEdge } from "react-icons/fa";
import tangledLogo from "../assets/tangled.svg";
import { getTrendingTags } from "../api/client";

const isFirefox =
  typeof navigator !== "undefined" && /Firefox/i.test(navigator.userAgent);
const isEdge =
  typeof navigator !== "undefined" && /Edg/i.test(navigator.userAgent);

function getExtensionInfo() {
  if (isFirefox) {
    return {
      url: "https://addons.mozilla.org/en-US/firefox/addon/margin/",
      icon: SiFirefox,
      label: "Firefox",
    };
  }
  if (isEdge) {
    return {
      url: "https://microsoftedge.microsoft.com/addons/detail/margin/nfjnmllpdgcdnhmmggjihjbidmeadddn",
      icon: FaEdge,
      label: "Edge",
    };
  }
  return {
    url: "https://chromewebstore.google.com/detail/margin/cgpmbiiagnehkikhcbnhiagfomajncpa/",
    icon: SiGooglechrome,
    label: "Chrome",
  };
}

export default function RightSidebar() {
  const { theme, setTheme } = useTheme();
  const [trendingTags, setTrendingTags] = useState([]);
  const ext = getExtensionInfo();
  const ExtIcon = ext.icon;

  useEffect(() => {
    getTrendingTags(10)
      .then((data) => setTrendingTags(data.tags || []))
      .catch(() => {});
  }, []);

  const cycleTheme = () => {
    const next =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
  };

  return (
    <aside className="right-sidebar">
      {trendingTags.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Trending Tags</h3>
          <div className="sidebar-tags">
            {trendingTags.map((tag) => (
              <Link
                key={tag}
                to={`/home?tag=${tag}`}
                className="sidebar-tag-pill"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <h3 className="sidebar-section-title">Get the Extension</h3>
        <a
          href={ext.url}
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-extension-link"
        >
          <ExtIcon size={18} />
          <span>Install for {ext.label}</span>
          <ExternalLink size={14} className="sidebar-external-icon" />
        </a>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-section-title">Links</h3>
        <div className="sidebar-links">
          <a
            href="https://github.com/margin-at/margin"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link-item"
          >
            <SiGithub size={16} />
            <span>GitHub</span>
          </a>
          <a
            href="https://tangled.sh/@margin.at/margin"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link-item"
          >
            <span
              className="sidebar-tangled-icon"
              style={{ "--tangled-logo": `url(${tangledLogo})` }}
            />
            <span>Tangled</span>
          </a>
          <a
            href="https://bsky.app/profile/margin.at"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link-item"
          >
            <SiBluesky size={16} />
            <span>Bluesky</span>
          </a>
          <a
            href="https://discord.gg/ZQbkGqwzBH"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link-item"
          >
            <SiDiscord size={16} />
            <span>Discord</span>
          </a>
        </div>
      </div>

      <div className="sidebar-section">
        <button className="sidebar-theme-toggle" onClick={cycleTheme}>
          {theme === "system" && <Monitor size={16} />}
          {theme === "dark" && <Moon size={16} />}
          {theme === "light" && <Sun size={16} />}
          <span>Theme: {theme}</span>
        </button>
      </div>

      <div className="sidebar-footer-links">
        <Link to="/privacy">Privacy</Link>
        <span>·</span>
        <Link to="/terms">Terms</Link>
      </div>
    </aside>
  );
}
