import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { searchActors, startLogin } from "../api/client";
import { AtSign } from "lucide-react";
import logo from "../assets/logo.svg";

export default function Login() {
  const { isAuthenticated, user, logout } = useAuth();
  const [handle, setHandle] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const inviteRef = useRef(null);
  const suggestionsRef = useRef(null);

  const [providerIndex, setProviderIndex] = useState(0);
  const [morphClass, setMorphClass] = useState("morph-in");
  const providers = [
    "AT Protocol",
    "Bluesky",
    "Blacksky",
    "Tangled",
    "selfhosted.social",
    "Northsky",
    "witchcraft.systems",
    "topphie.social",
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
    if (showInviteInput && !inviteCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await startLogin(handle.trim(), inviteCode.trim());
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      }
    } catch (err) {
      console.error("Login error:", err);
      if (
        err.message &&
        (err.message.includes("invite_required") ||
          err.message.includes("Invite code required"))
      ) {
        setShowInviteInput(true);
        setError("Please enter an invite code to continue.");
        setTimeout(() => inviteRef.current?.focus(), 100);
      } else {
        setError(err.message || "Failed to start login");
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-header-group">
        <img src={logo} alt="Margin Logo" className="login-logo-img" />
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

        {showInviteInput && (
          <div
            className="login-input-wrapper"
            style={{ marginTop: "12px", animation: "fadeIn 0.3s ease" }}
          >
            <input
              ref={inviteRef}
              type="text"
              className="login-input"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              autoComplete="off"
              disabled={loading}
              style={{ borderColor: "var(--accent)" }}
            />
          </div>
        )}

        {error && <p className="login-error">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={
            loading || !handle.trim() || (showInviteInput && !inviteCode.trim())
          }
        >
          {loading
            ? "Connecting..."
            : showInviteInput
              ? "Submit Code"
              : "Continue"}
        </button>

        <p className="login-legal">
          By signing in, you agree to our{" "}
          <Link to="/terms">Terms of Service</Link> and{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </form>
    </div>
  );
}
