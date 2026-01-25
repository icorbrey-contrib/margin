import { useState } from "react";
import { updateProfile } from "../api/client";

export default function EditProfileModal({ profile, onClose, onUpdate }) {
  const [bio, setBio] = useState(profile?.bio || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [links, setLinks] = useState(profile?.links || []);
  const [newLink, setNewLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateProfile({ bio, website, links });
      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    if (!newLink) return;

    if (!links.includes(newLink)) {
      setLinks([...links, newLink]);
      setNewLink("");
      setError(null);
    }
  };

  const removeLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Bio</label>
            <textarea
              className="input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={5000}
            />
            <div className="char-count">{bio.length}/5000</div>
          </div>

          <div className="form-group">
            <label>Website</label>
            <input
              type="url"
              className="input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              maxLength={1000}
            />
          </div>

          <div className="form-group">
            <label>Links</label>
            <div className="links-input-group">
              <input
                type="url"
                className="input"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Add a link (e.g. GitHub, LinkedIn)..."
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addLink())
                }
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addLink}
              >
                Add
              </button>
            </div>
            <ul className="links-list">
              {links.map((link, i) => (
                <li key={i} className="link-item">
                  <span>{link}</span>
                  <button
                    type="button"
                    className="btn-icon-sm"
                    onClick={() => removeLink(i)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
