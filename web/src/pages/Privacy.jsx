import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="feed-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        <span>Home</span>
      </Link>

      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="text-secondary">Last updated: January 11, 2026</p>

        <section>
          <h2>Overview</h2>
          <p>
            Margin ("we", "our", or "us") is a web annotation tool that lets you
            highlight, annotate, and bookmark any webpage. Your data is stored
            on the decentralized AT Protocol network, giving you ownership and
            control over your content.
          </p>
        </section>

        <section>
          <h2>Data We Collect</h2>
          <h3>Account Information</h3>
          <p>
            When you log in with your Bluesky/AT Protocol account, we access
            your:
          </p>
          <ul>
            <li>Decentralized Identifier (DID)</li>
            <li>Handle (username)</li>
            <li>Display name and avatar (for showing your profile)</li>
          </ul>

          <h3>Annotations & Content</h3>
          <p>When you use Margin, we store:</p>
          <ul>
            <li>URLs of pages you annotate</li>
            <li>Text you highlight or select</li>
            <li>Annotations and comments you create</li>
            <li>Bookmarks you save</li>
            <li>Collections you organize content into</li>
          </ul>

          <h3>Authentication</h3>
          <p>
            We store OAuth session tokens locally in your browser to keep you
            logged in. These tokens are used solely for authenticating API
            requests.
          </p>
        </section>

        <section>
          <h2>How We Use Your Data</h2>
          <p>Your data is used exclusively to:</p>
          <ul>
            <li>Display your annotations on webpages</li>
            <li>Sync your content across devices</li>
            <li>Show your public annotations to other users</li>
            <li>Enable social features like replies and likes</li>
          </ul>
        </section>

        <section>
          <h2>Data Storage</h2>
          <p>
            Your annotations are stored on the AT Protocol network through your
            Personal Data Server (PDS). This means:
          </p>
          <ul>
            <li>You own your data</li>
            <li>You can export or delete it at any time</li>
            <li>Your data is portable across AT Protocol services</li>
          </ul>
          <p>
            We also maintain a local index of annotations to provide faster
            search and discovery features.
          </p>
        </section>

        <section>
          <h2>Data Sharing</h2>
          <p>
            <strong>We do not sell your data.</strong> We do not share your data
            with third parties for advertising or marketing purposes.
          </p>
          <p>Your public annotations may be visible to:</p>
          <ul>
            <li>Other Margin users viewing the same webpage</li>
            <li>Anyone on the AT Protocol network (for public content)</li>
          </ul>
        </section>

        <section>
          <h2>Browser Extension Permissions</h2>
          <p>The Margin browser extension requires certain permissions:</p>
          <ul>
            <li>
              <strong>All URLs:</strong> To display and create annotations on
              any webpage
            </li>
            <li>
              <strong>Storage:</strong> To save your preferences and session
              locally
            </li>
            <li>
              <strong>Cookies:</strong> To maintain your logged-in session
            </li>
            <li>
              <strong>Tabs:</strong> To know which page you're viewing
            </li>
          </ul>
        </section>

        <section>
          <h2>Your Rights</h2>
          <p>You can:</p>
          <ul>
            <li>
              Delete any annotation, highlight, or bookmark you've created
            </li>
            <li>Delete your collections</li>
            <li>Export your data from your PDS</li>
            <li>Revoke the extension's access at any time</li>
          </ul>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For privacy questions or concerns, contact us at{" "}
            <a href="mailto:hello@margin.at">hello@margin.at</a>
          </p>
        </section>
      </div>
    </div>
  );
}
