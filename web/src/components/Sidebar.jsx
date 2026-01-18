import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Home,
  Search,
  Folder,
  Bell,
  PenSquare,
  User,
  LogOut,
  MoreHorizontal,
  Highlighter,
  Bookmark,
} from "lucide-react";
import { getUnreadNotificationCount } from "../api/client";
import logo from "../assets/logo.svg";

export default function Sidebar() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

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
    <aside className="sidebar">
      <Link to="/" className="sidebar-header">
        <img src={logo} alt="Margin" className="sidebar-logo" />
        <span className="sidebar-brand">Margin</span>
      </Link>

      <nav className="sidebar-nav">
        <Link
          to="/"
          className={`sidebar-link ${isActive("/") ? "active" : ""}`}
        >
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link
          to="/url"
          className={`sidebar-link ${isActive("/url") ? "active" : ""}`}
        >
          <Search size={20} />
          <span>Browse</span>
        </Link>

        {isAuthenticated && (
          <>
            <div className="sidebar-section-title">Library</div>
            <Link
              to="/highlights"
              className={`sidebar-link ${isActive("/highlights") ? "active" : ""}`}
            >
              <Highlighter size={20} />
              <span>Highlights</span>
            </Link>
            <Link
              to="/bookmarks"
              className={`sidebar-link ${isActive("/bookmarks") ? "active" : ""}`}
            >
              <Bookmark size={20} />
              <span>Bookmarks</span>
            </Link>
            <Link
              to="/collections"
              className={`sidebar-link ${isActive("/collections") ? "active" : ""}`}
            >
              <Folder size={20} />
              <span>Collections</span>
            </Link>
            <Link
              to="/notifications"
              className={`sidebar-link ${isActive("/notifications") ? "active" : ""}`}
              onClick={() => setUnreadCount(0)}
            >
              <Bell size={20} />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </Link>
          </>
        )}
      </nav>

      {isAuthenticated && (
        <Link to="/new" className="sidebar-new-btn">
          <PenSquare size={18} />
          <span>New</span>
        </Link>
      )}

      <div className="sidebar-footer" ref={menuRef}>
        {!loading &&
          (isAuthenticated ? (
            <>
              <div
                className="sidebar-user"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <div className="sidebar-avatar">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.displayName} />
                  ) : (
                    <span>{getInitials()}</span>
                  )}
                </div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">
                    {user?.displayName || user?.handle}
                  </div>
                  <div className="sidebar-user-handle">@{user?.handle}</div>
                </div>
                <MoreHorizontal size={18} className="sidebar-user-menu" />
              </div>

              {menuOpen && (
                <div className="sidebar-dropdown">
                  <Link
                    to={`/profile/${user?.did}`}
                    className="sidebar-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User size={16} />
                    View Profile
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="sidebar-dropdown-item danger"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link to="/login" className="sidebar-new-btn" style={{ margin: 0 }}>
              Sign In
            </Link>
          ))}
      </div>
    </aside>
  );
}
