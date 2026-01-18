import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Search, Folder, User, PenSquare } from "lucide-react";

export default function MobileNav() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        <Link
          to="/"
          className={`mobile-nav-item ${isActive("/") ? "active" : ""}`}
        >
          <Home />
          <span>Home</span>
        </Link>

        <Link
          to="/url"
          className={`mobile-nav-item ${isActive("/url") ? "active" : ""}`}
        >
          <Search />
          <span>Browse</span>
        </Link>

        {isAuthenticated ? (
          <Link to="/new" className="mobile-nav-item mobile-nav-new">
            <PenSquare />
          </Link>
        ) : (
          <Link to="/login" className="mobile-nav-item mobile-nav-new">
            <User />
          </Link>
        )}

        <Link
          to="/collections"
          className={`mobile-nav-item ${isActive("/collections") ? "active" : ""}`}
        >
          <Folder />
          <span>Library</span>
        </Link>

        <Link
          to={isAuthenticated && user?.did ? `/profile/${user.did}` : "/login"}
          className={`mobile-nav-item ${isActive("/profile") ? "active" : ""}`}
        >
          <User />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
