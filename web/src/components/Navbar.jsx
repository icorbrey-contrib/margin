import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Folder } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  PenIcon,
  BookmarkIcon,
  HighlightIcon,
  SearchIcon,
  LogoutIcon,
  BellIcon,
} from "./Icons";
import { getUnreadNotificationCount } from "../api/client";
import { SiFirefox, SiGooglechrome } from "react-icons/si";
import { FaEdge } from "react-icons/fa";

import logo from "../assets/logo.svg";

const isFirefox =
  typeof navigator !== "undefined" && /Firefox/i.test(navigator.userAgent);
const isEdge =
  typeof navigator !== "undefined" && /Edg/i.test(navigator.userAgent);
const isChrome =
  typeof navigator !== "undefined" &&
  /Chrome/i.test(navigator.userAgent) &&
  !isEdge;

export default function Navbar() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);

  const isActive = (path) => location.pathname === path;

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
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.substring(0, 2).toUpperCase();
    }
    if (user?.handle) {
      return user.handle.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {}
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="Margin Logo" className="navbar-logo-img" />
          <span className="navbar-title">Margin</span>
        </Link>

        {}
        <div className="navbar-center">
          <Link
            to="/"
            className={`navbar-link ${isActive("/") ? "active" : ""}`}
          >
            Feed
          </Link>
          <Link
            to="/url"
            className={`navbar-link ${isActive("/url") ? "active" : ""}`}
          >
            <SearchIcon size={16} />
            Browse
          </Link>
          {isFirefox ? (
            <a
              href="https://addons.mozilla.org/en-US/firefox/addon/margin/"
              target="_blank"
              rel="noopener noreferrer"
              className="navbar-link navbar-extension-link"
            >
              <SiFirefox size={16} />
              Get Extension
            </a>
          ) : isEdge ? (
            <a
              href="https://microsoftedge.microsoft.com/addons/detail/margin/nfjnmllpdgcdnhmmggjihjbidmeadddn"
              target="_blank"
              rel="noopener noreferrer"
              className="navbar-link navbar-extension-link"
            >
              <FaEdge size={16} />
              Get Extension
            </a>
          ) : isChrome ? (
            <a
              href="https://chromewebstore.google.com/detail/margin/cgpmbiiagnehkikhcbnhiagfomajncpa/"
              target="_blank"
              rel="noopener noreferrer"
              className="navbar-link navbar-extension-link"
            >
              <SiGooglechrome size={16} />
              Get Extension
            </a>
          ) : (
            <a
              href="https://addons.mozilla.org/en-US/firefox/addon/margin/"
              target="_blank"
              rel="noopener noreferrer"
              className="navbar-link navbar-extension-link"
            >
              <SiFirefox size={16} />
              Get Extension
            </a>
          )}
        </div>

        {}
        <div className="navbar-right">
          {!loading &&
            (isAuthenticated ? (
              <>
                <Link
                  to="/highlights"
                  className={`navbar-icon-link ${isActive("/highlights") ? "active" : ""}`}
                  title="Highlights"
                >
                  <HighlightIcon size={20} />
                </Link>
                <Link
                  to="/bookmarks"
                  className={`navbar-icon-link ${isActive("/bookmarks") ? "active" : ""}`}
                  title="Bookmarks"
                >
                  <BookmarkIcon size={20} />
                </Link>
                <Link
                  to="/collections"
                  className={`navbar-icon-link ${isActive("/collections") ? "active" : ""}`}
                  title="Collections"
                >
                  <Folder size={20} />
                </Link>
                <Link
                  to="/notifications"
                  className={`navbar-icon-link notification-link ${isActive("/notifications") ? "active" : ""}`}
                  title="Notifications"
                  onClick={() => setUnreadCount(0)}
                >
                  <BellIcon size={20} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </Link>
                <Link
                  to="/new"
                  className="navbar-new-btn"
                  title="New Annotation"
                >
                  <PenIcon size={16} />
                  <span>New</span>
                </Link>

                {}
                <div className="navbar-user-menu" ref={menuRef}>
                  <button
                    className="navbar-avatar-btn"
                    onClick={() => setMenuOpen(!menuOpen)}
                    title={user?.handle}
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.displayName}
                        className="navbar-avatar-img"
                      />
                    ) : (
                      <span className="navbar-avatar-text">
                        {getInitials()}
                      </span>
                    )}
                  </button>

                  {menuOpen && (
                    <div className="navbar-dropdown">
                      <div className="navbar-dropdown-header">
                        <span className="navbar-dropdown-name">
                          {user?.displayName}
                        </span>
                        <span className="navbar-dropdown-handle">
                          @{user?.handle}
                        </span>
                      </div>
                      <div className="navbar-dropdown-divider" />
                      <Link
                        to={`/profile/${user?.did}`}
                        className="navbar-dropdown-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                        }}
                        className="navbar-dropdown-item navbar-dropdown-logout"
                      >
                        <LogoutIcon size={16} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login" className="navbar-signin">
                Sign In
              </Link>
            ))}
        </div>
      </div>
    </nav>
  );
}
