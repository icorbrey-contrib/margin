import { useState } from "react";
import { createAnnotation, createHighlight } from "../api/client";

export default function Composer({
  url,
  selector: initialSelector,
  onSuccess,
  onCancel,
}) {
  const [text, setText] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [tags, setTags] = useState("");
  const [selector, setSelector] = useState(initialSelector);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showQuoteInput, setShowQuoteInput] = useState(false);

  const highlightedText =
    selector?.type === "TextQuoteSelector" ? selector.exact : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !highlightedText && !quoteText.trim()) return;

    try {
      setLoading(true);
      setError(null);

      let finalSelector = selector;
      if (!finalSelector && quoteText.trim()) {
        finalSelector = {
          type: "TextQuoteSelector",
          exact: quoteText.trim(),
        };
      }

      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (!text.trim()) {
        await createHighlight({
          url,
          selector: finalSelector,
          color: "yellow",
          tags: tagList,
        });
      } else {
        await createAnnotation({
          url,
          text,
          selector: finalSelector || undefined,
          tags: tagList,
        });
      }

      setText("");
      setQuoteText("");
      setSelector(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSelector = () => {
    setSelector(null);
    setQuoteText("");
    setShowQuoteInput(false);
  };

  return (
    <form onSubmit={handleSubmit} className="composer">
      <div className="composer-header">
        <h3 className="composer-title">New Annotation</h3>
        {url && <div className="composer-url">{url}</div>}
      </div>

      {}
      {highlightedText && (
        <div className="composer-quote">
          <button
            type="button"
            className="composer-quote-remove"
            onClick={handleRemoveSelector}
            title="Remove selection"
          >
            ×
          </button>
          <blockquote>
            <mark className="quote-exact">"{highlightedText}"</mark>
          </blockquote>
        </div>
      )}

      {}
      {!highlightedText && (
        <>
          {!showQuoteInput ? (
            <button
              type="button"
              className="composer-add-quote"
              onClick={() => setShowQuoteInput(true)}
            >
              + Add a quote from the page
            </button>
          ) : (
            <div className="composer-quote-input-wrapper">
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Paste or type the text you're annotating..."
                className="composer-quote-input"
                rows={2}
              />
              <button
                type="button"
                className="composer-quote-remove-btn"
                onClick={handleRemoveSelector}
              >
                Remove
              </button>
            </div>
          )}
        </>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          highlightedText || quoteText
            ? "Add your comment about this selection..."
            : "Write your annotation..."
        }
        className="composer-input"
        rows={4}
        maxLength={3000}
        disabled={loading}
      />

      <div className="composer-tags">
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Add tags (comma separated)..."
          className="composer-tags-input"
          disabled={loading}
        />
      </div>

      <div className="composer-footer">
        <span className="composer-count">{text.length}/3000</span>
        <div className="composer-actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              loading || (!text.trim() && !highlightedText && !quoteText)
            }
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </div>

      {error && <div className="composer-error">{error}</div>}
    </form>
  );
}
