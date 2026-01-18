import { useState, useEffect } from "react";
import {
  X,
  Folder,
  Star,
  Heart,
  Bookmark,
  Lightbulb,
  Zap,
  Coffee,
  Music,
  Camera,
  Code,
  Globe,
  Flag,
  Tag,
  Box,
  Archive,
  FileText,
  Image,
  Video,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Search,
  Settings,
  User,
  Users,
  Home,
  Briefcase,
  Gift,
  Award,
  Target,
  TrendingUp,
  Activity,
  Cpu,
  Database,
  Cloud,
  Sun,
  Moon,
  Flame,
  Leaf,
} from "lucide-react";
import { createCollection, updateCollection } from "../api/client";

const EMOJI_OPTIONS = [
  "📁",
  "📚",
  "💡",
  "⭐",
  "🔖",
  "💻",
  "🎨",
  "📝",
  "🔬",
  "🎯",
  "🚀",
  "💎",
  "🌟",
  "📌",
  "💼",
  "🎮",
  "🎵",
  "🎬",
  "❤️",
  "🔥",
  "🌈",
  "🌸",
  "🌿",
  "🧠",
  "🏆",
  "📊",
  "🎓",
  "✨",
  "🔧",
  "⚡",
];

const ICON_OPTIONS = [
  { icon: Folder, name: "folder" },
  { icon: Star, name: "star" },
  { icon: Heart, name: "heart" },
  { icon: Bookmark, name: "bookmark" },
  { icon: Lightbulb, name: "lightbulb" },
  { icon: Zap, name: "zap" },
  { icon: Coffee, name: "coffee" },
  { icon: Music, name: "music" },
  { icon: Camera, name: "camera" },
  { icon: Code, name: "code" },
  { icon: Globe, name: "globe" },
  { icon: Flag, name: "flag" },
  { icon: Tag, name: "tag" },
  { icon: Box, name: "box" },
  { icon: Archive, name: "archive" },
  { icon: FileText, name: "file" },
  { icon: Image, name: "image" },
  { icon: Video, name: "video" },
  { icon: Mail, name: "mail" },
  { icon: MapPin, name: "pin" },
  { icon: Calendar, name: "calendar" },
  { icon: Clock, name: "clock" },
  { icon: Search, name: "search" },
  { icon: Settings, name: "settings" },
  { icon: User, name: "user" },
  { icon: Users, name: "users" },
  { icon: Home, name: "home" },
  { icon: Briefcase, name: "briefcase" },
  { icon: Gift, name: "gift" },
  { icon: Award, name: "award" },
  { icon: Target, name: "target" },
  { icon: TrendingUp, name: "trending" },
  { icon: Activity, name: "activity" },
  { icon: Cpu, name: "cpu" },
  { icon: Database, name: "database" },
  { icon: Cloud, name: "cloud" },
  { icon: Sun, name: "sun" },
  { icon: Moon, name: "moon" },
  { icon: Flame, name: "flame" },
  { icon: Leaf, name: "leaf" },
];

export default function CollectionModal({
  isOpen,
  onClose,
  onSuccess,
  collectionToEdit,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [customEmoji, setCustomEmoji] = useState("");
  const [activeTab, setActiveTab] = useState("emoji");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (collectionToEdit) {
      setName(collectionToEdit.name);
      setDescription(collectionToEdit.description || "");
      const savedIcon = collectionToEdit.icon || "";
      setIcon(savedIcon);
      setCustomEmoji(savedIcon);

      if (savedIcon.startsWith("icon:")) {
        setActiveTab("icons");
      }
    } else {
      setName("");
      setDescription("");
      setIcon("");
      setCustomEmoji("");
    }
    setError(null);
  }, [collectionToEdit, isOpen]);

  if (!isOpen) return null;

  const handleEmojiSelect = (emoji) => {
    if (icon === emoji) {
      setIcon("");
      setCustomEmoji("");
    } else {
      setIcon(emoji);
      setCustomEmoji(emoji);
    }
  };

  const handleIconSelect = (iconName) => {
    const value = `icon:${iconName}`;
    if (icon === value) {
      setIcon("");
      setCustomEmoji("");
    } else {
      setIcon(value);
      setCustomEmoji(value);
    }
  };

  const handleCustomEmojiChange = (e) => {
    const value = e.target.value;
    setCustomEmoji(value);
    const emojiMatch = value.match(
      /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu,
    );
    if (emojiMatch && emojiMatch.length > 0) {
      setIcon(emojiMatch[emojiMatch.length - 1]);
    } else if (value === "") {
      setIcon("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (collectionToEdit) {
        await updateCollection(collectionToEdit.uri, name, description, icon);
      } else {
        await createCollection(name, description, icon);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save collection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: "420px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {collectionToEdit ? "Edit Collection" : "New Collection"}
          </h2>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div
              className="card text-error"
              style={{
                padding: "12px",
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.2)",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="icon-picker-tabs">
              <button
                type="button"
                className={`icon-picker-tab ${activeTab === "emoji" ? "active" : ""}`}
                onClick={() => setActiveTab("emoji")}
              >
                Emoji
              </button>
              <button
                type="button"
                className={`icon-picker-tab ${activeTab === "icons" ? "active" : ""}`}
                onClick={() => setActiveTab("icons")}
              >
                Icons
              </button>
            </div>

            {activeTab === "emoji" && (
              <div className="emoji-picker-wrapper">
                <div className="emoji-custom-input">
                  <input
                    type="text"
                    value={customEmoji.startsWith("icon:") ? "" : customEmoji}
                    onChange={handleCustomEmojiChange}
                    placeholder="Type any emoji..."
                    className="form-input"
                  />
                </div>
                <div className="emoji-picker">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-option ${icon === emoji ? "selected" : ""}`}
                      onClick={() => handleEmojiSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "icons" && (
              <div className="icon-picker">
                {ICON_OPTIONS.map(({ icon: IconComponent, name: iconName }) => (
                  <button
                    key={iconName}
                    type="button"
                    className={`icon-option ${icon === `icon:${iconName}` ? "selected" : ""}`}
                    onClick={() => handleIconSelect(iconName)}
                  >
                    <IconComponent size={20} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="form-input"
              placeholder="My Favorites"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="form-textarea"
              placeholder="A collection of..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={loading ? { opacity: 0.7, cursor: "wait" } : {}}
            >
              {loading
                ? "Saving..."
                : collectionToEdit
                  ? "Save Changes"
                  : "Create Collection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
