import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  MessageSquare,
  Highlighter,
  Users,
  ArrowRight,
  Github,
  Database,
  Shield,
  Zap,
} from "lucide-react";
import { SiFirefox, SiGooglechrome, SiBluesky, SiApple } from "react-icons/si";
import { FaEdge } from "react-icons/fa";
import logo from "../assets/logo.svg";

const isFirefox =
  typeof navigator !== "undefined" && /Firefox/i.test(navigator.userAgent);
const isEdge =
  typeof navigator !== "undefined" && /Edg/i.test(navigator.userAgent);
const isIOS =
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari =
  typeof navigator !== "undefined" &&
  /Safari/.test(navigator.userAgent) &&
  !/Chrome/.test(navigator.userAgent);
const isIOSSafari = isIOS && isSafari;

function getExtensionInfo() {
  if (isIOSSafari) {
    return {
      url: "https://www.icloud.com/shortcuts/21c87edf29b046db892c9e57dac6d1fd",
      Icon: SiApple,
      label: "iOS",
      isShortcut: true,
    };
  }
  if (isFirefox) {
    return {
      url: "https://addons.mozilla.org/en-US/firefox/addon/margin/",
      Icon: SiFirefox,
      label: "Firefox",
    };
  }
  if (isEdge) {
    return {
      url: "https://microsoftedge.microsoft.com/addons/detail/margin/nfjnmllpdgcdnhmmggjihjbidmeadddn",
      Icon: FaEdge,
      label: "Edge",
    };
  }
  return {
    url: "https://chromewebstore.google.com/detail/margin/cgpmbiiagnehkikhcbnhiagfomajncpa/",
    Icon: SiGooglechrome,
    label: "Chrome",
  };
}

import { getAnnotations, normalizeAnnotation } from "../api/client";
import { formatDistanceToNow } from "date-fns";

function DemoAnnotation() {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoverPos, setHoverPos] = useState(null);
  const [hoverVisible, setHoverVisible] = useState(false);
  const [hoverAuthors, setHoverAuthors] = useState([]);

  const [showPopover, setShowPopover] = useState(false);
  const [popoverPos, setPopoverPos] = useState(null);
  const [popoverAnnotations, setPopoverAnnotations] = useState([]);

  const highlightRef = useRef(null);
  const articleRef = useRef(null);

  useEffect(() => {
    getAnnotations({ source: "https://en.wikipedia.org/wiki/AT_Protocol" })
      .then((res) => {
        const rawItems = res.items || (Array.isArray(res) ? res : []);
        const normalized = rawItems.map(normalizeAnnotation);
        setAnnotations(normalized);
      })
      .catch((err) => {
        console.error("Failed to fetch demo annotations:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = () => setShowPopover(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showPopover]);

  const getMatches = () => {
    return annotations.filter(
      (a) =>
        (a.selector?.exact &&
          a.selector.exact.includes("A handle serves as")) ||
        (a.quote && a.quote.includes("A handle serves as")),
    );
  };

  const handleMouseEnter = () => {
    const matches = getMatches();
    const authorsMap = new Map();
    matches.forEach((a) => {
      const author = a.author || a.creator || { handle: "unknown" };
      const id = author.did || author.handle;
      if (!authorsMap.has(id)) authorsMap.set(id, author);
    });
    const unique = Array.from(authorsMap.values());

    setHoverAuthors(unique);

    if (highlightRef.current && articleRef.current) {
      const spanRect = highlightRef.current.getBoundingClientRect();
      const articleRect = articleRef.current.getBoundingClientRect();

      const visibleCount = Math.min(unique.length, 3);
      const hasOverflow = unique.length > 3;
      const countForCalc = visibleCount + (hasOverflow ? 1 : 0);
      const width = countForCalc > 0 ? countForCalc * 18 + 10 : 0;

      const top = spanRect.top - articleRect.top + spanRect.height / 2 - 14;
      const left = spanRect.left - articleRect.left - width;

      setHoverPos({ top, left });
      setHoverVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setHoverVisible(false);
  };

  const handleHighlightClick = (e) => {
    e.stopPropagation();
    const matches = getMatches();
    setPopoverAnnotations(matches);

    if (highlightRef.current && articleRef.current) {
      const spanRect = highlightRef.current.getBoundingClientRect();
      const articleRect = articleRef.current.getBoundingClientRect();

      const top = spanRect.top - articleRect.top + spanRect.height + 10;
      let left = spanRect.left - articleRect.left;

      if (left + 300 > articleRect.width) {
        left = articleRect.width - 300;
      }

      setPopoverPos({ top, left });
      setShowPopover(true);
    }
  };

  const maxShow = 3;
  const displayHoverAuthors = hoverAuthors.slice(0, maxShow);
  const hoverOverflow = hoverAuthors.length - maxShow;

  return (
    <div className="demo-window">
      <div className="demo-browser-bar">
        <div className="demo-browser-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="demo-browser-url">
          <span>en.wikipedia.org/wiki/AT_Protocol</span>
        </div>
      </div>
      <div className="demo-content">
        <div
          className="demo-article"
          ref={articleRef}
          style={{ position: "relative" }}
        >
          {hoverPos && hoverAuthors.length > 0 && (
            <div
              className={`demo-hover-indicator ${hoverVisible ? "visible" : ""}`}
              style={{
                top: hoverPos.top,
                left: hoverPos.left,
                cursor: "pointer",
              }}
              onClick={handleHighlightClick}
            >
              {displayHoverAuthors.map((author, i) =>
                author.avatar ? (
                  <img
                    key={i}
                    src={author.avatar}
                    className="demo-hover-avatar"
                    alt={author.handle}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : (
                  <div key={i} className="demo-hover-avatar-fallback">
                    {author.handle?.[0]?.toUpperCase() || "U"}
                  </div>
                ),
              )}
              {hoverOverflow > 0 && (
                <div
                  className="demo-hover-avatar-fallback"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                    fontSize: 10,
                  }}
                >
                  +{hoverOverflow}
                </div>
              )}
            </div>
          )}

          {showPopover && popoverPos && (
            <div
              className="demo-popover"
              style={{
                top: popoverPos.top,
                left: popoverPos.left,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="demo-popover-header">
                <span>
                  {popoverAnnotations.length}{" "}
                  {popoverAnnotations.length === 1 ? "Comment" : "Comments"}
                </span>
                <button
                  className="demo-popover-close"
                  onClick={() => setShowPopover(false)}
                >
                  ✕
                </button>
              </div>
              <div className="demo-popover-scroll-area">
                {popoverAnnotations.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 13, color: "#666" }}>
                    No comments
                  </div>
                ) : (
                  popoverAnnotations.map((ann, i) => (
                    <div key={ann.uri || i} className="demo-comment-item">
                      <div className="demo-comment-header">
                        <img
                          src={ann.author?.avatar || logo}
                          className="demo-comment-avatar"
                          onError={(e) => (e.target.src = logo)}
                          alt=""
                        />
                        <span className="demo-comment-handle">
                          @{ann.author?.handle || "user"}
                        </span>
                      </div>
                      <div className="demo-comment-text">
                        {ann.text || ann.body?.value}
                      </div>
                      <div className="demo-comment-actions">
                        <button className="demo-comment-action-btn">
                          Reply
                        </button>
                        <button className="demo-comment-action-btn">
                          Share
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <p className="demo-text">
            The AT Protocol utilizes a dual identifier system: a mutable handle,
            in the form of a domain name, and an immutable decentralized
            identifier (DID).
          </p>
          <p className="demo-text">
            <span
              className="demo-highlight"
              ref={highlightRef}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={handleHighlightClick}
              style={{ cursor: "pointer" }}
            >
              A handle serves as a verifiable user identifier.
            </span>{" "}
            Verification is by either of two equivalent methods proving control
            of the domain name: Either a DNS query of a resource record with the
            same name as the handle, or a request for a text file from a Web
            service with the same name.
          </p>
          <p className="demo-text">
            DIDs resolve to DID documents, which contain references to key user
            metadata, such as the user&apos;s handle, public keys, and data
            repository. While any DID method could, in theory, be used by the
            protocol if its components provide support for the method, in
            practice only two methods are supported (&apos;blessed&apos;) by the
            protocol&apos;s reference implementations: did:plc and did:web. The
            validity of these identifiers can be verified by a registry which
            hosts the DID&apos;s associated document and a file that is hosted
            at a well-known location on the connected domain name, respectively.
          </p>
        </div>
        <div className="demo-sidebar">
          <div className="demo-sidebar-header">
            <div className="demo-logo-section">
              <span
                className="demo-logo-icon"
                style={{ color: "var(--accent)" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 265 231"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z" />
                  <path d="M215 214.224 V230 H264.5 V0 H215.07 V16.2242 H248.5 V214.224 H215 Z" />
                </svg>
              </span>
              <span className="demo-logo-text">Margin</span>
            </div>
            <div className="demo-user-section">
              <span className="demo-user-handle">@margin.at</span>
            </div>
          </div>
          <div className="demo-page-info">
            <span>en.wikipedia.org</span>
          </div>
          <div className="demo-annotations-list">
            {loading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
                Loading...
              </div>
            ) : annotations.length > 0 ? (
              annotations.map((ann, i) => (
                <div
                  key={ann.uri || i}
                  className={`demo-annotation ${i > 0 ? "demo-annotation-secondary" : ""}`}
                >
                  <div className="demo-annotation-header">
                    <div
                      className="demo-avatar"
                      style={{ background: "transparent" }}
                    >
                      <img
                        src={ann.author?.avatar || logo}
                        alt={ann.author?.handle || "User"}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                        }}
                        onError={(e) => {
                          e.target.src = logo;
                        }}
                      />
                    </div>
                    <div className="demo-meta">
                      <span className="demo-author">
                        @{ann.author?.handle || "margin.at"}
                      </span>
                      <span className="demo-time">
                        {ann.createdAt
                          ? formatDistanceToNow(new Date(ann.createdAt), {
                              addSuffix: true,
                            })
                          : "recently"}
                      </span>
                    </div>
                  </div>
                  {ann.selector?.exact && (
                    <p className="demo-quote">
                      &ldquo;{ann.selector.exact}&rdquo;
                    </p>
                  )}
                  <p className="demo-comment">{ann.text || ann.body?.value}</p>
                  <button className="demo-jump-btn">Jump to text →</button>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                }}
              >
                No annotations found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const ext = getExtensionInfo();

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link
          to="/"
          className="landing-logo"
          style={{ color: "var(--accent)" }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 265 231"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z" />
            <path d="M215 214.224 V230 H264.5 V0 H215.07 V16.2242 H248.5 V214.224 H215 Z" />
          </svg>
          <span>Margin</span>
        </Link>
        <div className="landing-nav-links">
          <a
            href="https://github.com/margin-at/margin"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://tangled.org/margin.at/margin"
            target="_blank"
            rel="noreferrer"
          >
            Tangled
          </a>
          <a
            href="https://bsky.app/profile/margin.at"
            target="_blank"
            rel="noreferrer"
          >
            Bluesky
          </a>
          {user ? (
            <Link to="/home" className="btn btn-primary">
              Open App
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">
            <SiBluesky size={14} />
            Built on ATProto
          </div>
          <h1 className="landing-title">
            Write in the margins
            <br />
            <span className="landing-title-accent">of the web.</span>
          </h1>
          <p className="landing-subtitle">
            Margin is a social layer for reading online. Highlight passages,
            leave thoughts in the margins, and see what others are thinking
            about the pages you read.
          </p>
          <div className="landing-cta">
            <a
              href={ext.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-lg"
            >
              {ext.Icon && <ext.Icon size={18} />}
              {ext.isShortcut ? "Get iOS Shortcut" : `Install for ${ext.label}`}
            </a>
            {user ? (
              <Link to="/home" className="btn btn-secondary btn-lg">
                Open App
                <ArrowRight size={18} />
              </Link>
            ) : (
              <Link to="/login" className="btn btn-secondary btn-lg">
                Sign In with ATProto
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
          {!isIOSSafari && (
            <p className="landing-browsers">
              Also available for{" "}
              {isFirefox ? (
                <>
                  <a
                    href="https://microsoftedge.microsoft.com/addons/detail/margin/nfjnmllpdgcdnhmmggjihjbidmeadddn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Edge
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://chromewebstore.google.com/detail/margin/cgpmbiiagnehkikhcbnhiagfomajncpa/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chrome
                  </a>
                </>
              ) : isEdge ? (
                <>
                  <a
                    href="https://addons.mozilla.org/en-US/firefox/addon/margin/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Firefox
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://chromewebstore.google.com/detail/margin/cgpmbiiagnehkikhcbnhiagfomajncpa/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chrome
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="https://addons.mozilla.org/en-US/firefox/addon/margin/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Firefox
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://microsoftedge.microsoft.com/addons/detail/margin/nfjnmllpdgcdnhmmggjihjbidmeadddn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Edge
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      </section>

      <section className="landing-demo">
        <DemoAnnotation />
      </section>

      <section className="landing-section">
        <h2 className="landing-section-title">How it works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <div className="landing-step-content">
              <h3>Install & Login</h3>
              <p>
                Add Margin to your browser and sign in with your AT Protocol
                handle. No new account needed, just your existing handle.
              </p>
            </div>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <div className="landing-step-content">
              <h3>Annotate the Web</h3>
              <p>
                Highlight text on any page. Leave notes in the margins, ask
                questions, or add context to the conversation precisely where it
                belongs.
              </p>
            </div>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <div className="landing-step-content">
              <h3>Share & Discover</h3>
              <p>
                Your annotations are published to your PDS. Discover what the
                community is reading and discussing across the web.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <div className="landing-features-grid">
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <Highlighter size={20} />
            </div>
            <h3>Universal Highlights</h3>
            <p>
              Save passages from any article, paper, or post. Your collection
              travels with you, independent of any single platform.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <MessageSquare size={20} />
            </div>
            <h3>Universal Notes</h3>
            <p>
              Move the discussion out of the comments section. Contextual
              conversations that live right alongside the content.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <Shield size={20} />
            </div>
            <h3>Open Identity</h3>
            <p>
              Your data, your handle, your graph. Built on the AT Protocol for
              true ownership and portability.
            </p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <Users size={20} />
            </div>
            <h3>Community Context</h3>
            <p>
              See the web with fresh eyes. Discover highlights and notes from
              other readers directly on the page.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-protocol">
        <div className="landing-protocol-grid">
          <div className="landing-protocol-main">
            <h2>Your data, your identity</h2>
            <p>
              Margin is built on the{" "}
              <a href="https://atproto.com" target="_blank" rel="noreferrer">
                AT Protocol
              </a>
              , the same open protocol that powers Bluesky. Sign in with your
              existing Bluesky account or create a new one in your preferred
              PDS.
            </p>
            <p>
              Your annotations are stored in your PDS. You can export them
              anytime, use them with other apps, or self-host your own server.
              No vendor lock-in.
            </p>
          </div>
          <div className="landing-protocol-features">
            <div className="landing-protocol-item">
              <Database size={20} />
              <div>
                <strong>Portable data</strong>
                <span>Export or migrate anytime</span>
              </div>
            </div>
            <div className="landing-protocol-item">
              <Shield size={20} />
              <div>
                <strong>You own your identity</strong>
                <span>Use your own domain as handle</span>
              </div>
            </div>
            <div className="landing-protocol-item">
              <Zap size={20} />
              <div>
                <strong>Interoperable</strong>
                <span>Works with the ATProto ecosystem</span>
              </div>
            </div>
            <div className="landing-protocol-item">
              <Github size={20} />
              <div>
                <strong>Open source</strong>
                <span>Audit, contribute, self-host</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-final-cta">
        <h2>Start annotating today</h2>
        <p>Free and open source. Sign in with ATProto to get started.</p>
        <div className="landing-cta">
          <a
            href={ext.url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-lg"
          >
            {ext.Icon && <ext.Icon size={18} />}
            {ext.isShortcut ? "Get iOS Shortcut" : "Get the Extension"}
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Link to="/" className="landing-logo">
              <svg
                width="24"
                height="24"
                viewBox="0 0 265 231"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z" />
                <path d="M215 214.224 V230 H264.5 V0 H215.07 V16.2242 H248.5 V214.224 H215 Z" />
              </svg>
              <span>Margin</span>
            </Link>
            <p>Write in the margins of the web.</p>
          </div>
          <div className="landing-footer-links">
            <div className="landing-footer-col">
              <h4>Product</h4>
              <a href={ext.url} target="_blank" rel="noreferrer">
                Browser Extension
              </a>
              <Link to="/home">Web App</Link>
            </div>
            <div className="landing-footer-col">
              <h4>Community</h4>
              <a
                href="https://github.com/margin-at/margin"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a
                href="https://tangled.org/margin.at/margin"
                target="_blank"
                rel="noreferrer"
              >
                Tangled
              </a>
              <a
                href="https://bsky.app/profile/margin.at"
                target="_blank"
                rel="noreferrer"
              >
                Bluesky
              </a>
            </div>
            <div className="landing-footer-col">
              <h4>Legal</h4>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>© {new Date().getFullYear()} Margin. Open source under MIT.</p>
        </div>
      </footer>
    </div>
  );
}
