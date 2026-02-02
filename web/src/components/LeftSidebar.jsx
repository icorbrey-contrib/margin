import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import {
  Home,
  Search,
  Highlighter,
  Bookmark,
  Folder,
  Bell,
  PenSquare,
  User,
  LogOut,
  Settings,
  ChevronUp,
} from "lucide-react";
import { getUnreadNotificationCount } from "../api/client";

export default function LeftSidebar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

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
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  const navItems = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/url", icon: Search, label: "Browse" },
  ];

  const authNavItems = [
    { path: "/highlights", icon: Highlighter, label: "Highlights" },
    { path: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
    { path: "/collections", icon: Folder, label: "Collections" },
    {
      path: "/notifications",
      icon: Bell,
      label: "Notifications",
      badge: unreadCount,
    },
  ];

  return (
    <aside className="left-sidebar">
      <div className="sidebar-header">
        <Link to="/home" className="sidebar-logo">
          <svg
            width="32"
            height="32"
            viewBox="0 0 265 231"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z" />
            <path d="M215 214.224 V230 H264.5 V0 H215.07 V16.2242 H248.5 V214.224 H215 Z" />
          </svg>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`sidebar-nav-item ${isActive(path) ? "active" : ""}`}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </Link>
        ))}

        {isAuthenticated &&
          authNavItems.map(({ path, icon: Icon, label, badge }) => (
            <Link
              key={path}
              to={path}
              className={`sidebar-nav-item ${isActive(path) ? "active" : ""}`}
            >
              <Icon size={20} strokeWidth={1.75} />
              <span>{label}</span>
              {badge > 0 && <span className="sidebar-badge">{badge}</span>}
            </Link>
          ))}
      </nav>

      {isAuthenticated && (
        <Link to="/new" className="sidebar-new-btn">
          <PenSquare size={18} strokeWidth={2} />
          <span>New Annotation</span>
        </Link>
      )}

      <div className="sidebar-footer" ref={userMenuRef}>
        {isAuthenticated ? (
          <>
            <button
              className={`sidebar-user-btn ${userMenuOpen ? "active" : ""}`}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="sidebar-user-avatar" />
              ) : (
                <div className="sidebar-user-avatar-placeholder">
                  <User size={16} />
                </div>
              )}
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">
                  {user?.displayName || user?.handle}
                </span>
                <span className="sidebar-user-handle">@{user?.handle}</span>
              </div>
              <ChevronUp
                size={16}
                className={`sidebar-user-chevron ${userMenuOpen ? "open" : ""}`}
              />
            </button>

            {userMenuOpen && (
              <div className="sidebar-user-menu">
                <Link
                  to={`/profile/${user?.did}`}
                  className="sidebar-user-menu-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User size={16} />
                  <span>View Profile</span>
                </Link>
                <Link
                  to="/settings"
                  className="sidebar-user-menu-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
                <button
                  className="sidebar-user-menu-item danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <Link to="/login" className="sidebar-signin-btn">
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
