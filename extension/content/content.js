(() => {
  function buildTextQuoteSelector(selection) {
    const exact = selection.toString().trim();
    if (!exact) return null;

    const range = selection.getRangeAt(0);
    const contextLength = 32;

    let prefix = "";
    try {
      const preRange = document.createRange();
      preRange.selectNodeContents(document.body);
      preRange.setEnd(range.startContainer, range.startOffset);
      const preText = preRange.toString();
      prefix = preText.slice(-contextLength).trim();
    } catch (e) {
      console.warn("Could not get prefix:", e);
    }

    let suffix = "";
    try {
      const postRange = document.createRange();
      postRange.selectNodeContents(document.body);
      postRange.setStart(range.endContainer, range.endOffset);
      const postText = postRange.toString();
      suffix = postText.slice(0, contextLength).trim();
    } catch (e) {
      console.warn("Could not get suffix:", e);
    }

    return {
      type: "TextQuoteSelector",
      exact: exact,
      prefix: prefix || undefined,
      suffix: suffix || undefined,
    };
  }

  function findAndScrollToText(selector) {
    if (!selector || !selector.exact) return false;

    const searchText = selector.exact.trim();
    const normalizedSearch = searchText.replace(/\s+/g, " ");

    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );

    let currentNode;
    while ((currentNode = treeWalker.nextNode())) {
      const nodeText = currentNode.textContent;
      const normalizedNode = nodeText.replace(/\s+/g, " ");

      let index = nodeText.indexOf(searchText);

      if (index === -1) {
        const normIndex = normalizedNode.indexOf(normalizedSearch);
        if (normIndex !== -1) {
          index = nodeText.indexOf(searchText.substring(0, 20));
          if (index === -1) index = 0;
        }
      }

      if (index !== -1 && nodeText.trim().length > 0) {
        try {
          const range = document.createRange();
          const endIndex = Math.min(index + searchText.length, nodeText.length);
          range.setStart(currentNode, index);
          range.setEnd(currentNode, endIndex);

          if (typeof CSS !== "undefined" && CSS.highlights) {
            const highlight = new Highlight(range);
            CSS.highlights.set("margin-scroll-highlight", highlight);

            setTimeout(() => {
              CSS.highlights.delete("margin-scroll-highlight");
            }, 3000);
          }

          const rect = range.getBoundingClientRect();
          window.scrollTo({
            top: window.scrollY + rect.top - window.innerHeight / 3,
            behavior: "smooth",
          });

          window.scrollTo({
            top: window.scrollY + rect.top - window.innerHeight / 3,
            behavior: "smooth",
          });

          return true;
        } catch (e) {
          console.warn("Could not create range:", e);
        }
      }
    }

    if (window.find) {
      window.getSelection()?.removeAllRanges();
      const found = window.find(searchText, false, false, true, false);
      if (found) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          window.scrollTo({
            top: window.scrollY + rect.top - window.innerHeight / 3,
            behavior: "smooth",
          });
        }
        return true;
      }
    }

    return false;
  }

  function renderPageHighlights(highlights) {
    if (!highlights || !Array.isArray(highlights) || !CSS.highlights) return;

    const ranges = [];

    highlights.forEach((item) => {
      const selector = item.target?.selector;
      if (!selector?.exact) return;

      const searchText = selector.exact;
      const treeWalker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false,
      );

      let currentNode;
      while ((currentNode = treeWalker.nextNode())) {
        const nodeText = currentNode.textContent;
        const index = nodeText.indexOf(searchText);

        if (index !== -1) {
          try {
            const range = document.createRange();
            range.setStart(currentNode, index);
            range.setEnd(currentNode, index + searchText.length);
            ranges.push(range);
          } catch (e) {
            console.warn("Could not create range for highlight:", e);
          }
          break;
        }
      }
    });

    if (ranges.length > 0) {
      const highlight = new Highlight(...ranges);
      CSS.highlights.set("margin-page-highlights", highlight);
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_SELECTOR_FOR_ANNOTATE_INLINE") {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        sendResponse({ selector: null });
        return true;
      }

      const selector = buildTextQuoteSelector(selection);
      sendResponse({ selector: selector });
      return true;
    }

    if (request.type === "GET_SELECTOR_FOR_ANNOTATE") {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        return;
      }

      const selector = buildTextQuoteSelector(selection);
      if (selector) {
        chrome.runtime.sendMessage({
          type: "OPEN_COMPOSE",
          data: {
            url: window.location.href,
            selector: selector,
          },
        });
      }
    }

    if (request.type === "GET_SELECTOR_FOR_HIGHLIGHT") {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        sendResponse({ success: false, error: "No text selected" });
        return true;
      }

      const selector = buildTextQuoteSelector(selection);
      if (selector) {
        chrome.runtime
          .sendMessage({
            type: "CREATE_HIGHLIGHT",
            data: {
              url: window.location.href,
              title: document.title,
              selector: selector,
            },
          })
          .then((response) => {
            if (response?.success) {
              showNotification("Text highlighted!", "success");

              if (CSS.highlights) {
                try {
                  const range = selection.getRangeAt(0);
                  const highlight = new Highlight(range);
                  CSS.highlights.set("margin-highlight-preview", highlight);
                } catch (e) {
                  console.warn("Could not visually highlight:", e);
                }
              }

              window.getSelection().removeAllRanges();
            } else {
              showNotification(
                "Failed to highlight: " + (response?.error || "Unknown error"),
                "error",
              );
            }
            sendResponse(response);
          })
          .catch((err) => {
            console.error("Highlight error:", err);
            showNotification("Error creating highlight", "error");
            sendResponse({ success: false, error: err.message });
          });
        return true;
      }
      sendResponse({ success: false, error: "Could not build selector" });
      return true;
    }

    if (request.type === "SCROLL_TO_TEXT") {
      const found = findAndScrollToText(request.selector);
      if (!found) {
        showNotification("Could not find text on page", "error");
      }
    }

    if (request.type === "RENDER_HIGHLIGHTS") {
      renderPageHighlights(request.highlights);
    }

    return true;
  });

  function showNotification(message, type = "info") {
    const existing = document.querySelector(".margin-notification");
    if (existing) existing.remove();

    const notification = document.createElement("div");
    notification.className = "margin-notification";
    notification.textContent = message;

    const bgColor =
      type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#6366f1";
    notification.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 12px 20px;
            background: ${bgColor};
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 999999;
            animation: margin-slide-in 0.2s ease;
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "margin-slide-out 0.2s ease forwards";
      setTimeout(() => notification.remove(), 200);
    }, 3000);
  }

  const style = document.createElement("style");
  style.textContent = `
        @keyframes margin-slide-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes margin-slide-out {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(10px); }
        }
        ::highlight(margin-highlight-preview) {
            background-color: rgba(168, 85, 247, 0.3);
            color: inherit;
        }
        ::highlight(margin-scroll-highlight) {
            background-color: rgba(99, 102, 241, 0.4);
            color: inherit;
        }
        ::highlight(margin-page-highlights) {
            background-color: rgba(252, 211, 77, 0.3);
            color: inherit;
        }
    `;
  document.head.appendChild(style);
})();
