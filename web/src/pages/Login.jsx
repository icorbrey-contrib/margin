import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { searchActors, startLogin } from "../api/client";
import { AtSign } from "lucide-react";
import SignUpModal from "../components/SignUpModal";

export default function Login() {
  const { isAuthenticated, user, logout } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [handle, setHandle] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const [providerIndex, setProviderIndex] = useState(0);
  const [morphClass, setMorphClass] = useState("morph-in");
  const providers = [
    "AT Protocol",
    "Margin",
    "Bluesky",
    "Blacksky",
    "Tangled",
    "Northsky",
    "witchcraft.systems",
    "tophhie.social",
    "altq.net",
  ];

  useEffect(() => {
    const cycleText = () => {
      setMorphClass("morph-out");

      setTimeout(() => {
        setProviderIndex((prev) => (prev + 1) % providers.length);
        setMorphClass("morph-in");
      }, 400);
    };

    const interval = setInterval(cycleText, 3000);
    return () => clearInterval(interval);
  }, [providers.length]);

  const isSelectionRef = useRef(false);

  useEffect(() => {
    if (handle.length >= 3) {
      if (isSelectionRef.current) {
        isSelectionRef.current = false;
        return;
      }

      const timer = setTimeout(async () => {
        try {
          const data = await searchActors(handle);
          setSuggestions(data.actors || []);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } catch (e) {
          console.error("Search failed:", e);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [handle]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-avatar-large">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.displayName || user.handle} />
          ) : (
            <span>
              {(user?.displayName || user?.handle || "??")
                .substring(0, 2)
                .toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="login-welcome">
          Welcome back, {user?.displayName || user?.handle}
        </h1>
        <div className="login-actions">
          <Link to={`/profile/${user?.did}`} className="btn btn-primary">
            View Profile
          </Link>
          <button onClick={logout} className="btn btn-ghost">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (actor) => {
    isSelectionRef.current = true;
    setHandle(actor.handle);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!handle.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await startLogin(handle.trim());
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Failed to start login");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-header-group">
        <svg
          viewBox="0 0 265 231"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          className="login-logo-img"
          style={{ color: "var(--accent)" }}
        >
          <path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z" />
          <path d="M215 214.224 V230 H264.5 V0 H215.07 V16.2242 H248.5 V214.224 H215 Z" />
        </svg>
        <span className="login-x">X</span>
        <div className="login-atproto-icon">
          <AtSign size={64} strokeWidth={2.4} />
        </div>
      </div>

      <h1 className="login-heading">
        Sign in with your{" "}
        <span className={`morph-container ${morphClass}`}>
          {providers[providerIndex]}
        </span>{" "}
        handle
      </h1>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="login-input"
            placeholder="yourname.bsky.social"
            value={handle}
            onChange={(e) => {
              const val = e.target.value;
              setHandle(val);
              if (val.length < 3) {
                setSuggestions([]);
                setShowSuggestions(false);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() =>
              handle.length >= 3 &&
              suggestions.length > 0 &&
              !handle.includes(".") &&
              setShowSuggestions(true)
            }
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            disabled={loading}
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="login-suggestions" ref={suggestionsRef}>
              {suggestions.map((actor, index) => (
                <button
                  key={actor.did}
                  type="button"
                  className={`login-suggestion ${index === selectedIndex ? "selected" : ""}`}
                  onClick={() => selectSuggestion(actor)}
                >
                  <div className="login-suggestion-avatar">
                    {actor.avatar ? (
                      <img src={actor.avatar} alt="" />
                    ) : (
                      <span>
                        {(actor.displayName || actor.handle)
                          .substring(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="login-suggestion-info">
                    <span className="login-suggestion-name">
                      {actor.displayName || actor.handle}
                    </span>
                    <span className="login-suggestion-handle">
                      @{actor.handle}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="login-error">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={loading || !handle.trim()}
        >
          {loading ? "Connecting..." : "Continue"}
        </button>

        <p className="login-legal">
          By signing in, you agree to our{" "}
          <Link to="/terms">Terms of Service</Link> and{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary login-signup-btn"
          onClick={() => setShowSignUp(true)}
        >
          Create New Account
        </button>
      </form>

      {showSignUp && <SignUpModal onClose={() => setShowSignUp(false)} />}
    </div>
  );
}
