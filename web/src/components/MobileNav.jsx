import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Search, Folder, User, PenSquare, Bookmark } from "lucide-react";

export default function MobileNav() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="mobile-bottom-nav">
      <Link
        to="/"
        className={`mobile-bottom-nav-item ${isActive("/") ? "active" : ""}`}
      >
        <Home size={22} />
        <span>Home</span>
      </Link>

      <Link
        to="/url"
        className={`mobile-bottom-nav-item ${isActive("/url") ? "active" : ""}`}
      >
        <Search size={22} />
        <span>Browse</span>
      </Link>

      {isAuthenticated ? (
        <>
          <Link
            to="/new"
            className="mobile-bottom-nav-item mobile-bottom-nav-new"
          >
            <div className="mobile-nav-new-btn">
              <PenSquare size={20} />
            </div>
          </Link>

          <Link
            to="/bookmarks"
            className={`mobile-bottom-nav-item ${isActive("/bookmarks") || isActive("/collections") ? "active" : ""}`}
          >
            <Bookmark size={22} />
            <span>Library</span>
          </Link>

          <Link
            to={user?.did ? `/profile/${user.did}` : "/profile"}
            className={`mobile-bottom-nav-item ${isActive("/profile") ? "active" : ""}`}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="mobile-nav-avatar" />
            ) : (
              <User size={22} />
            )}
            <span>You</span>
          </Link>
        </>
      ) : (
        <>
          <Link
            to="/login"
            className="mobile-bottom-nav-item mobile-bottom-nav-new"
          >
            <div className="mobile-nav-new-btn">
              <User size={20} />
            </div>
          </Link>

          <Link
            to="/collections"
            className={`mobile-bottom-nav-item ${isActive("/collections") ? "active" : ""}`}
          >
            <Folder size={22} />
            <span>Library</span>
          </Link>

          <Link to="/login" className={`mobile-bottom-nav-item`}>
            <User size={22} />
            <span>Sign In</span>
          </Link>
        </>
      )}
    </nav>
  );
}
