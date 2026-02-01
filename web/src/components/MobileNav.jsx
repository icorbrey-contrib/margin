import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { getUnreadNotificationCount } from "../api/client";
import {
  Home,
  Search,
  Folder,
  User,
  PenSquare,
  Bookmark,
  Settings,
  MoreHorizontal,
  LogOut,
  Bell,
  Highlighter,
} from "lucide-react";

export default function MobileNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (isAuthenticated) {
      getUnreadNotificationCount()
        .then((data) => setUnreadCount(data.count || 0))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {isMenuOpen && (
        <>
          <div className="mobile-nav-overlay" onClick={closeMenu} />
          <div className="mobile-nav-menu">
            {isAuthenticated ? (
              <>
                <Link
                  to={`/profile/${user.did}`}
                  className="mobile-menu-profile-card"
                  onClick={closeMenu}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="mobile-nav-avatar"
                    />
                  ) : (
                    <div
                      className="mobile-nav-avatar"
                      style={{
                        background: "var(--bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={14} />
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {user.displayName || user.handle}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      @{user.handle}
                    </span>
                  </div>
                </Link>

                <Link
                  to="/highlights"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  <Highlighter size={20} />
                  <span>Highlights</span>
                </Link>

                <Link
                  to="/bookmarks"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  <Bookmark size={20} />
                  <span>Bookmarks</span>
                </Link>

                <Link
                  to="/collections"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  <Folder size={20} />
                  <span>Collections</span>
                </Link>

                <Link
                  to="/settings"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  <Settings size={20} />
                  <span>Settings</span>
                </Link>

                <div className="dropdown-divider" />

                <button
                  className="mobile-menu-item danger"
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                >
                  <LogOut size={20} />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  <User size={20} />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/collections"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  <Folder size={20} />
                  <span>Collections</span>
                </Link>
                <Link
                  to="/settings"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  <Settings size={20} />
                  <span>Settings</span>
                </Link>
              </>
            )}
          </div>
        </>
      )}

      <nav className="mobile-bottom-nav">
        <Link
          to="/home"
          className={`mobile-bottom-nav-item ${isActive("/home") ? "active" : ""}`}
          onClick={closeMenu}
        >
          <Home size={24} strokeWidth={1.5} />
        </Link>

        <Link
          to="/url"
          className={`mobile-bottom-nav-item ${isActive("/url") ? "active" : ""}`}
          onClick={closeMenu}
        >
          <Search size={24} strokeWidth={1.5} />
        </Link>

        {isAuthenticated ? (
          <>
            <Link
              to="/new"
              className="mobile-bottom-nav-item mobile-bottom-nav-new"
              onClick={closeMenu}
            >
              <div className="mobile-nav-new-btn">
                <PenSquare size={20} strokeWidth={2} />
              </div>
            </Link>

            <Link
              to="/notifications"
              className={`mobile-bottom-nav-item ${isActive("/notifications") ? "active" : ""}`}
              onClick={closeMenu}
            >
              <div style={{ position: "relative", display: "flex" }}>
                <Bell size={24} strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 8,
                      height: 8,
                      background: "var(--accent)",
                      borderRadius: "50%",
                      border: "2px solid var(--nav-bg)",
                    }}
                  />
                )}
              </div>
            </Link>
          </>
        ) : (
          <Link
            to="/login"
            className="mobile-bottom-nav-item mobile-bottom-nav-new"
            onClick={closeMenu}
          >
            <div className="mobile-nav-new-btn">
              <User size={20} strokeWidth={2} />
            </div>
          </Link>
        )}

        <button
          className={`mobile-bottom-nav-item ${isMenuOpen ? "active" : ""}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <MoreHorizontal size={24} strokeWidth={1.5} />
        </button>
      </nav>
    </>
  );
}
