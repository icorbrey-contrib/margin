import { useState, useRef } from "react";
import { updateProfile, uploadAvatar } from "../api/client";

export default function EditProfileModal({ profile, onClose, onUpdate }) {
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [avatarBlob, setAvatarBlob] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bio, setBio] = useState(profile?.bio || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [links, setLinks] = useState(profile?.links || []);
  const [newLink, setNewLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Please select a JPEG or PNG image");
      return;
    }

    if (file.size > 1024 * 1024) {
      setError("Image must be under 1MB");
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);

    try {
      const result = await uploadAvatar(file);
      setAvatarBlob(result.blob);
    } catch (err) {
      setError("Failed to upload avatar: " + err.message);
      setAvatarPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateProfile({
        displayName,
        avatar: avatarBlob,
        bio,
        website,
        links,
      });
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

  const currentAvatar =
    avatarPreview || (profile?.did ? `/api/avatar/${profile.did}` : null);

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
            <label>Avatar</label>
            <div className="avatar-upload-container">
              <div
                className="avatar-preview"
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: "pointer" }}
              >
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Avatar preview"
                    className="avatar-preview-img"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
                {uploading && (
                  <div className="avatar-uploading">
                    <span>Uploading...</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Change Avatar"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={64}
            />
            <div className="char-count">{displayName.length}/64</div>
          </div>

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
              disabled={saving || uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || uploading}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
