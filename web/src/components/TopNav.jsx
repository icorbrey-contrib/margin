import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Home,
  Search,
  Folder,
  Bell,
  PenSquare,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Highlighter,
  Bookmark,
  Sun,
  Moon,
  Monitor,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import {
  SiFirefox,
  SiGooglechrome,
  SiGithub,
  SiBluesky,
  SiDiscord,
} from "react-icons/si";
import { FaEdge } from "react-icons/fa";
import tangledLogo from "../assets/tangled.svg";
import { getUnreadNotificationCount } from "../api/client";
import logo from "../assets/logo.svg";

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

export default function TopNav() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const ext = getExtensionInfo();
  const ExtIcon = ext.icon;

  useEffect(() => {
    if (isAuthenticated) {
      getUnreadNotificationCount()
        .then((data) => setUnreadCount(data.count || 0))
        .catch(() => {});
      const interval = setInterval(() => {
        getUnreadNotificationCount()
          .then((data) => setUnreadCount(data.count || 0))
          .catch(() => {});
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const getInitials = () => {
    if (user?.displayName)
      return user.displayName.substring(0, 2).toUpperCase();
    if (user?.handle) return user.handle.substring(0, 2).toUpperCase();
    return "U";
  };

  const cycleTheme = () => {
    const next =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
  };

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <Link to="/home" className="top-nav-logo">
          <svg
            width="26"
            height="26"
            viewBox="0 0 265 231"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z" />
            <path d="M215 214.224 V230 H264.5 V0 H215.07 V16.2242 H248.5 V214.224 H215 Z" />
          </svg>
          <span>Margin</span>
        </Link>

        <nav className="top-nav-links">
          <Link
            to="/home"
            className={`top-nav-link ${isActive("/home") ? "active" : ""}`}
          >
            Home
          </Link>
          <Link
            to="/url"
            className={`top-nav-link ${isActive("/url") ? "active" : ""}`}
          >
            Browse
          </Link>
          {isAuthenticated && (
            <>
              <Link
                to="/highlights"
                className={`top-nav-link ${isActive("/highlights") ? "active" : ""}`}
              >
                Highlights
              </Link>
              <Link
                to="/bookmarks"
                className={`top-nav-link ${isActive("/bookmarks") ? "active" : ""}`}
              >
                Bookmarks
              </Link>
              <Link
                to="/collections"
                className={`top-nav-link ${isActive("/collections") ? "active" : ""}`}
              >
                Collections
              </Link>
            </>
          )}
        </nav>

        <div className="top-nav-actions">
          <a
            href={ext.url}
            target="_blank"
            rel="noopener noreferrer"
            className="top-nav-link extension-link"
            title={`Get ${ext.label} Extension`}
          >
            <ExtIcon size={16} />
            <span>Get Extension</span>
          </a>

          <div className="top-nav-dropdown" ref={moreMenuRef}>
            <button
              className="top-nav-icon-btn"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              title="More"
            >
              <ChevronDown size={18} />
            </button>
            {moreMenuOpen && (
              <div className="dropdown-menu dropdown-right">
                <a
                  href="https://github.com/margin-at/margin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dropdown-item"
                >
                  <SiGithub size={16} />
                  GitHub
                  <ExternalLink size={12} className="dropdown-external" />
                </a>
                <a
                  href="https://tangled.sh/@margin.at/margin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dropdown-item"
                >
                  <span className="tangled-icon-wrapper">
                    <img src={tangledLogo} alt="" />
                  </span>
                  Tangled
                  <ExternalLink size={12} className="dropdown-external" />
                </a>
                <a
                  href="https://bsky.app/profile/margin.at"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dropdown-item"
                >
                  <SiBluesky size={16} />
                  Bluesky
                  <ExternalLink size={12} className="dropdown-external" />
                </a>
                <a
                  href="https://discord.gg/ZQbkGqwzBH"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dropdown-item"
                >
                  <SiDiscord size={16} />
                  Discord
                  <ExternalLink size={12} className="dropdown-external" />
                </a>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={cycleTheme}>
                  {theme === "system" && <Monitor size={16} />}
                  {theme === "dark" && <Moon size={16} />}
                  {theme === "light" && <Sun size={16} />}
                  Theme: {theme}
                </button>
                <div className="dropdown-divider" />
                <Link
                  to="/privacy"
                  className="dropdown-item"
                  onClick={() => setMoreMenuOpen(false)}
                >
                  Privacy
                </Link>
                <Link
                  to="/terms"
                  className="dropdown-item"
                  onClick={() => setMoreMenuOpen(false)}
                >
                  Terms
                </Link>
              </div>
            )}
          </div>

          {isAuthenticated && (
            <>
              <Link
                to="/notifications"
                className="top-nav-icon-btn"
                onClick={() => setUnreadCount(0)}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-dot" />}
              </Link>

              <Link to="/new" className="top-nav-new-btn">
                <PenSquare size={16} />
                <span>New</span>
              </Link>
            </>
          )}

          {!loading &&
            (isAuthenticated ? (
              <div className="top-nav-dropdown" ref={userMenuRef}>
                <button
                  className="top-nav-avatar"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.displayName} />
                  ) : (
                    <span>{getInitials()}</span>
                  )}
                </button>
                {userMenuOpen && (
                  <div className="dropdown-menu dropdown-right">
                    <div className="dropdown-user-info">
                      <span className="dropdown-user-name">
                        {user?.displayName || user?.handle}
                      </span>
                      <span className="dropdown-user-handle">
                        @{user?.handle}
                      </span>
                    </div>
                    <div className="dropdown-divider" />
                    <Link
                      to={`/profile/${user?.did}`}
                      className="dropdown-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User size={16} />
                      View Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="dropdown-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings size={16} />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="dropdown-item danger"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="top-nav-new-btn">
                Sign In
              </Link>
            ))}

          <button
            className="top-nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          <Link
            to="/home"
            className={`mobile-menu-link ${isActive("/home") ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            <Home size={20} /> Home
          </Link>
          <Link
            to="/url"
            className={`mobile-menu-link ${isActive("/url") ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            <Search size={20} /> Browse
          </Link>
          {isAuthenticated && (
            <>
              <Link
                to="/highlights"
                className={`mobile-menu-link ${isActive("/highlights") ? "active" : ""}`}
                onClick={closeMobileMenu}
              >
                <Highlighter size={20} /> Highlights
              </Link>
              <Link
                to="/bookmarks"
                className={`mobile-menu-link ${isActive("/bookmarks") ? "active" : ""}`}
                onClick={closeMobileMenu}
              >
                <Bookmark size={20} /> Bookmarks
              </Link>
              <Link
                to="/collections"
                className={`mobile-menu-link ${isActive("/collections") ? "active" : ""}`}
                onClick={closeMobileMenu}
              >
                <Folder size={20} /> Collections
              </Link>
              <Link
                to="/notifications"
                className={`mobile-menu-link ${isActive("/notifications") ? "active" : ""}`}
                onClick={closeMobileMenu}
              >
                <Bell size={20} /> Notifications
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </Link>
              <Link
                to="/new"
                className={`mobile-menu-link ${isActive("/new") ? "active" : ""}`}
                onClick={closeMobileMenu}
              >
                <PenSquare size={20} /> New
              </Link>
            </>
          )}
          <div className="mobile-menu-divider" />
          <a
            href={ext.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mobile-menu-link"
          >
            <ExtIcon size={20} /> Get Extension
          </a>
        </div>
      )}
    </header>
  );
}
