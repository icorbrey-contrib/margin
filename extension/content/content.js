(() => {
  let sidebarHost = null;
  let sidebarShadow = null;
  let popoverEl = null;

  let activeItems = [];
  let currentSelection = null;

  const OVERLAY_STYLES = `
    :host { 
      all: initial; 
      --bg-primary: #0a0a0d;
      --bg-secondary: #121216;
      --bg-tertiary: #1a1a1f;
      --bg-card: #0f0f13;
      --bg-elevated: #18181d;
      --bg-hover: #1e1e24;
      
      --text-primary: #eaeaee;
      --text-secondary: #b7b6c5;
      --text-tertiary: #6e6d7a;
      --border: rgba(183, 182, 197, 0.12);
      
      --accent: #957a86;
      --accent-hover: #a98d98;
      --accent-subtle: rgba(149, 122, 134, 0.15);
    }
    
    :host(.light) {
      --bg-primary: #f8f8fa;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f0f0f4;
      --bg-card: #ffffff;
      --bg-elevated: #ffffff;
      --bg-hover: #eeeef2;
      
      --text-primary: #18171c;
      --text-secondary: #5c495a;
      --text-tertiary: #8a8494;
      --border: rgba(92, 73, 90, 0.12);
      
      --accent: #7a5f6d;
      --accent-hover: #664e5b;
      --accent-subtle: rgba(149, 122, 134, 0.12);
    }

    .margin-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .margin-popover {
      position: absolute;
      width: 300px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      z-index: 2147483647;
      font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text-primary);
      opacity: 0;
      transform: translateY(-4px);
      animation: popover-in 0.15s forwards;
      max-height: 400px;
      overflow: hidden;
    }
    @keyframes popover-in { to { opacity: 1; transform: translateY(0); } }
    
    .popover-header {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-primary);
      border-radius: 12px 12px 0 0;
      font-weight: 500;
      font-size: 11px;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .popover-close { 
      background: none; 
      border: none; 
      color: var(--text-tertiary); 
      cursor: pointer; 
      padding: 2px;
      font-size: 16px;
      line-height: 1;
      opacity: 0.6;
      transition: opacity 0.15s;
    }
    .popover-close:hover { opacity: 1; }
    
    .popover-scroll-area {
      overflow-y: auto;
      max-height: 340px;
    }
    
    .comment-item {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
    }
    .comment-item:last-child {
      border-bottom: none;
    }
    
    .comment-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .comment-avatar {
      width: 22px; 
      height: 22px; 
      border-radius: 50%; 
      background: var(--accent);
      display: flex; 
      align-items: center; 
      justify-content: center;
      font-size: 9px; 
      font-weight: 600;
      color: white;
    }
    .comment-handle { 
      font-size: 12px; 
      font-weight: 600; 
      color: var(--text-primary); 
    }
    .comment-time {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-left: auto;
    }
    
    .comment-text { 
      font-size: 13px; 
      line-height: 1.5; 
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    
    .highlight-only-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: var(--text-tertiary);
      font-style: italic;
    }
    
    .comment-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .highlight-only-badge {
      font-size: 11px;
      color: var(--text-tertiary);
      font-style: italic;
      opacity: 0.7;
    }
    .comment-action-btn {
      background: none; 
      border: none;
      padding: 4px 8px;
      color: var(--text-tertiary); 
      font-size: 11px; 
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .comment-action-btn:hover { 
      background: var(--bg-hover); 
      color: var(--text-secondary); 
    }
    
    .margin-selection-popup {
      position: fixed;
      display: flex;
      gap: 4px;
      padding: 6px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 2147483647;
      pointer-events: auto;
      font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      animation: popover-in 0.15s forwards;
    }
    .selection-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    .selection-btn:hover {
      background: var(--bg-hover);
    }
    .selection-btn svg {
      width: 14px;
      height: 14px;
    }
    .inline-compose-modal {
      position: fixed;
      width: 340px;
      max-width: calc(100vw - 40px);
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      box-sizing: border-box;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
      z-index: 2147483647;
      pointer-events: auto;
      font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text-primary);
      animation: popover-in 0.15s forwards;
      overflow: hidden;
    }
    .inline-compose-modal * {
      box-sizing: border-box;
    }
    .inline-compose-quote {
      padding: 8px 12px;
      background: var(--accent-subtle);
      border-left: 2px solid var(--accent);
      border-radius: 4px;
      font-size: 12px;
      color: var(--text-secondary);
      font-style: italic;
      margin-bottom: 12px;
      max-height: 60px;
      overflow: hidden;
      word-break: break-word;
    }
    .inline-compose-textarea {
      width: 100%;
      min-height: 80px;
      padding: 10px 12px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 13px;
      resize: vertical;
      margin-bottom: 12px;
      box-sizing: border-box;
    }
    .inline-compose-textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
    .inline-compose-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .btn-cancel {
      padding: 8px 16px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
    }
    .btn-cancel:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    .btn-submit {
      padding: 8px 16px;
      background: var(--accent);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-submit:hover {
      background: var(--accent-hover);
    }
    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .reply-section {
      border-top: 1px solid var(--border);
      padding: 10px 14px;
      background: var(--bg-primary);
      border-radius: 0 0 12px 12px;
    }
    .reply-textarea {
      width: 100%;
      min-height: 50px;
      padding: 8px 10px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 12px;
      resize: none;
      margin-bottom: 8px;
    }
    .reply-textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
    .reply-submit {
      padding: 6px 12px;
      background: var(--accent);
      border: none;
      border-radius: 4px;
      color: white;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      float: right;
    }
    .reply-submit:disabled {
      opacity: 0.5;
    }
    .reply-item {
      padding: 8px 0;
      border-top: 1px solid var(--border);
    }
    .reply-item:first-child {
      border-top: none;
    }
    .reply-author {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
    .reply-text {
      font-size: 12px;
      color: var(--text-primary);
      line-height: 1.4;
    }
  `;

  class DOMTextMatcher {
    constructor() {
      this.textNodes = [];
      this.corpus = "";
      this.indices = [];
      this.buildMap();
    }

    buildMap() {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (!node.parentNode) return NodeFilter.FILTER_REJECT;
            const tag = node.parentNode.tagName;
            if (
              ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"].includes(tag)
            )
              return NodeFilter.FILTER_REJECT;
            if (node.textContent.trim().length === 0)
              return NodeFilter.FILTER_SKIP;

            if (node.parentNode.offsetParent === null)
              return NodeFilter.FILTER_REJECT;

            return NodeFilter.FILTER_ACCEPT;
          },
        },
      );

      let currentNode;
      let index = 0;
      while ((currentNode = walker.nextNode())) {
        const text = currentNode.textContent;
        this.textNodes.push(currentNode);
        this.corpus += text;
        this.indices.push({
          start: index,
          node: currentNode,
          length: text.length,
        });
        index += text.length;
      }
    }

    findRange(searchText) {
      if (!searchText) return null;

      let matchIndex = this.corpus.indexOf(searchText);

      if (matchIndex === -1) {
        const normalizedSearch = searchText.replace(/\s+/g, " ").trim();
        matchIndex = this.corpus.indexOf(normalizedSearch);

        if (matchIndex === -1) {
          const fuzzyMatch = this.fuzzyFindInCorpus(searchText);
          if (fuzzyMatch) {
            const start = this.mapIndexToPoint(fuzzyMatch.start);
            const end = this.mapIndexToPoint(fuzzyMatch.end);
            if (start && end) {
              const range = document.createRange();
              range.setStart(start.node, start.offset);
              range.setEnd(end.node, end.offset);
              return range;
            }
          }
          return null;
        }
      }

      const start = this.mapIndexToPoint(matchIndex);
      const end = this.mapIndexToPoint(matchIndex + searchText.length);

      if (start && end) {
        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        return range;
      }
      return null;
    }

    fuzzyFindInCorpus(searchText) {
      const searchWords = searchText
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      if (searchWords.length === 0) return null;

      const corpusLower = this.corpus.toLowerCase();

      const firstWord = searchWords[0].toLowerCase();
      let searchStart = 0;

      while (searchStart < corpusLower.length) {
        const wordStart = corpusLower.indexOf(firstWord, searchStart);
        if (wordStart === -1) break;

        let corpusPos = wordStart;
        let matched = true;
        let lastMatchEnd = wordStart;

        for (const word of searchWords) {
          const wordLower = word.toLowerCase();
          while (
            corpusPos < corpusLower.length &&
            /\s/.test(this.corpus[corpusPos])
          ) {
            corpusPos++;
          }
          const corpusSlice = corpusLower.slice(
            corpusPos,
            corpusPos + wordLower.length,
          );
          if (corpusSlice !== wordLower) {
            matched = false;
            break;
          }

          corpusPos += wordLower.length;
          lastMatchEnd = corpusPos;
        }

        if (matched) {
          return { start: wordStart, end: lastMatchEnd };
        }

        searchStart = wordStart + 1;
      }

      return null;
    }

    mapIndexToPoint(corpusIndex) {
      for (const info of this.indices) {
        if (
          corpusIndex >= info.start &&
          corpusIndex < info.start + info.length
        ) {
          return { node: info.node, offset: corpusIndex - info.start };
        }
      }
      if (this.indices.length > 0) {
        const last = this.indices[this.indices.length - 1];
        if (corpusIndex === last.start + last.length) {
          return { node: last.node, offset: last.length };
        }
      }
      return null;
    }
  }

  function applyTheme(theme) {
    if (!sidebarHost) return;
    sidebarHost.classList.remove("light", "dark");
    if (theme === "system" || !theme) {
      if (window.matchMedia("(prefers-color-scheme: light)").matches) {
        sidebarHost.classList.add("light");
      }
    } else {
      sidebarHost.classList.add(theme);
    }
  }

  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", (e) => {
      chrome.storage.local.get(["theme"], (result) => {
        if (!result.theme || result.theme === "system") {
          if (e.matches) {
            sidebarHost?.classList.add("light");
          } else {
            sidebarHost?.classList.remove("light");
          }
        }
      });
    });

  function initOverlay() {
    sidebarHost = document.createElement("div");
    sidebarHost.id = "margin-overlay-host";
    sidebarHost.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; 
        height: 0; 
        overflow: visible;
        pointer-events: none; z-index: 2147483647;
    `;
    document.body?.appendChild(sidebarHost) ||
      document.documentElement.appendChild(sidebarHost);

    sidebarShadow = sidebarHost.attachShadow({ mode: "open" });
    const styleEl = document.createElement("style");
    styleEl.textContent = OVERLAY_STYLES;
    sidebarShadow.appendChild(styleEl);

    const container = document.createElement("div");
    container.className = "margin-overlay";
    container.id = "margin-overlay-container";
    sidebarShadow.appendChild(container);

    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["showOverlay", "theme"], (result) => {
        applyTheme(result.theme);
        if (result.showOverlay === false) {
          sidebarHost.style.display = "none";
        } else {
          fetchAnnotations();
        }
      });
    } else {
      fetchAnnotations();
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleDocumentClick, true);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        if (changes.theme) {
          applyTheme(changes.theme.newValue);
        }
        if (changes.showOverlay) {
          if (changes.showOverlay.newValue === false) {
            sidebarHost.style.display = "none";
            activeItems = [];
            if (typeof CSS !== "undefined" && CSS.highlights) {
              CSS.highlights.clear();
            }
          } else {
            sidebarHost.style.display = "";
            fetchAnnotations();
          }
        }
      }
    });
  }

  function showInlineComposeModal() {
    if (!sidebarShadow || !currentSelection) return;

    const container = sidebarShadow.getElementById("margin-overlay-container");
    if (!container) return;

    const existingModal = container.querySelector(".inline-compose-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.className = "inline-compose-modal";

    modal.style.left = `${Math.max(20, (window.innerWidth - 340) / 2)}px`;
    modal.style.top = `${Math.min(200, window.innerHeight / 4)}px`;

    const truncatedQuote =
      currentSelection.text.length > 100
        ? currentSelection.text.substring(0, 100) + "..."
        : currentSelection.text;

    modal.innerHTML = `
      <div class="inline-compose-quote">"${truncatedQuote}"</div>
      <textarea class="inline-compose-textarea" placeholder="Add your annotation..." autofocus></textarea>
      <div class="inline-compose-actions">
        <button class="btn-cancel">Cancel</button>
        <button class="btn-submit">Post Annotation</button>
      </div>
    `;

    const textarea = modal.querySelector("textarea");
    const submitBtn = modal.querySelector(".btn-submit");
    const cancelBtn = modal.querySelector(".btn-cancel");

    cancelBtn.addEventListener("click", () => {
      modal.remove();
    });

    submitBtn.addEventListener("click", async () => {
      const text = textarea.value.trim();
      if (!text) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Posting...";

      chrome.runtime.sendMessage(
        {
          type: "CREATE_ANNOTATION",
          data: {
            url: currentSelection.url || window.location.href,
            title: currentSelection.title || document.title,
            text: text,
            selector: currentSelection.selector,
          },
        },
        (res) => {
          if (res && res.success) {
            modal.remove();
            fetchAnnotations();
          } else {
            submitBtn.disabled = false;
            submitBtn.textContent = "Post Annotation";
            alert(
              "Failed to create annotation: " + (res?.error || "Unknown error"),
            );
          }
        },
      );
    });

    container.appendChild(modal);
    textarea.focus();

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  }

  let hoverIndicator = null;

  function handleMouseMove(e) {
    const x = e.clientX;
    const y = e.clientY;

    if (sidebarHost && sidebarHost.style.display === "none") return;

    let foundItems = [];
    let firstRange = null;
    for (const { range, item } of activeItems) {
      const rects = range.getClientRects();
      for (const rect of rects) {
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          let container = range.commonAncestorContainer;
          if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
          }

          if (
            container &&
            (e.target.contains(container) || container.contains(e.target))
          ) {
            if (!firstRange) firstRange = range;
            if (!foundItems.some((f) => f.item === item)) {
              foundItems.push({ range, item, rect });
            }
          }
          break;
        }
      }
    }

    if (foundItems.length > 0) {
      document.body.style.cursor = "pointer";

      if (!hoverIndicator && sidebarShadow) {
        const container = sidebarShadow.getElementById(
          "margin-overlay-container",
        );
        if (container) {
          hoverIndicator = document.createElement("div");
          hoverIndicator.className = "margin-hover-indicator";
          hoverIndicator.style.cssText = `
            position: fixed;
            display: flex;
            align-items: center;
            pointer-events: none;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity 0.15s, transform 0.15s;
            transform: scale(0.8);
          `;
          container.appendChild(hoverIndicator);
        }
      }

      if (hoverIndicator) {
        const authorsMap = new Map();
        foundItems.forEach(({ item }) => {
          const author = item.author || item.creator || {};
          const id = author.did || author.handle || "unknown";
          if (!authorsMap.has(id)) {
            authorsMap.set(id, author);
          }
        });
        const uniqueAuthors = Array.from(authorsMap.values());

        const maxShow = 3;
        const displayAuthors = uniqueAuthors.slice(0, maxShow);
        const overflow = uniqueAuthors.length - maxShow;

        let html = displayAuthors
          .map((author, i) => {
            const avatar = author.avatar;
            const handle = author.handle || "U";
            const marginLeft = i === 0 ? "0" : "-8px";

            if (avatar) {
              return `<img src="${avatar}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid #09090b; margin-left: ${marginLeft};">`;
            } else {
              return `<div style="width: 24px; height: 24px; border-radius: 50%; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; font-family: -apple-system, sans-serif; border: 2px solid #09090b; margin-left: ${marginLeft};">${handle[0]?.toUpperCase() || "U"}</div>`;
            }
          })
          .join("");

        if (overflow > 0) {
          html += `<div style="width: 24px; height: 24px; border-radius: 50%; background: #27272a; color: #a1a1aa; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; font-family: -apple-system, sans-serif; border: 2px solid #09090b; margin-left: -8px;">+${overflow}</div>`;
        }

        hoverIndicator.innerHTML = html;

        const firstRect = firstRange.getClientRects()[0];
        const totalWidth =
          Math.min(uniqueAuthors.length, maxShow + (overflow > 0 ? 1 : 0)) *
            18 +
          8;
        const leftPos = firstRect.left - totalWidth;
        const topPos = firstRect.top + firstRect.height / 2 - 12;

        hoverIndicator.style.left = `${leftPos}px`;
        hoverIndicator.style.top = `${topPos}px`;
        hoverIndicator.style.opacity = "1";
        hoverIndicator.style.transform = "scale(1)";
      }
    } else {
      document.body.style.cursor = "";
      if (hoverIndicator) {
        hoverIndicator.style.opacity = "0";
        hoverIndicator.style.transform = "scale(0.8)";
      }
    }
  }

  function handleDocumentClick(e) {
    const x = e.clientX;
    const y = e.clientY;

    if (sidebarHost && sidebarHost.style.display === "none") return;

    if (popoverEl && sidebarShadow) {
      const rect = popoverEl.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return;
      }
    }

    let clickedItems = [];
    for (const { range, item } of activeItems) {
      const rects = range.getClientRects();
      for (const rect of rects) {
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          let container = range.commonAncestorContainer;
          if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
          }

          if (
            container &&
            (e.target.contains(container) || container.contains(e.target))
          ) {
            if (!clickedItems.includes(item)) {
              clickedItems.push(item);
            }
          }
          break;
        }
      }
    }

    if (clickedItems.length > 0) {
      e.preventDefault();
      e.stopPropagation();

      if (popoverEl) {
        const currentIds = popoverEl.dataset.itemIds;
        const newIds = clickedItems
          .map((i) => i.uri || i.id)
          .sort()
          .join(",");

        if (currentIds === newIds) {
          popoverEl.remove();
          popoverEl = null;
          return;
        }
      }

      const firstItem = clickedItems[0];
      const match = activeItems.find((x) => x.item === firstItem);
      if (match) {
        const rects = match.range.getClientRects();
        if (rects.length > 0) {
          const rect = rects[0];
          const top = rect.top + window.scrollY;
          const left = rect.left + window.scrollX;
          showPopover(clickedItems, top, left);
        }
      }
    } else {
      if (popoverEl) {
        popoverEl.remove();
        popoverEl = null;
      }
    }
  }

  function renderBadges(annotations) {
    if (!sidebarShadow) return;

    const itemsToRender = annotations || [];
    activeItems = [];
    const rangesByColor = {};

    const matcher = new DOMTextMatcher();

    itemsToRender.forEach((item) => {
      const selector = item.target?.selector || item.selector;
      if (!selector?.exact) return;

      const range = matcher.findRange(selector.exact);
      if (range) {
        activeItems.push({ range, item });

        const color = item.color || "#6366f1";
        if (!rangesByColor[color]) rangesByColor[color] = [];
        rangesByColor[color].push(range);
      }
    });

    if (typeof CSS !== "undefined" && CSS.highlights) {
      CSS.highlights.clear();
      for (const [color, ranges] of Object.entries(rangesByColor)) {
        const highlight = new Highlight(...ranges);
        const safeColor = color.replace(/[^a-zA-Z0-9]/g, "");
        const name = `margin-hl-${safeColor}`;
        CSS.highlights.set(name, highlight);
        injectHighlightStyle(name, color);
      }
    }
  }

  const injectedStyles = new Set();
  function injectHighlightStyle(name, color) {
    if (injectedStyles.has(name)) return;
    const style = document.createElement("style");
    style.textContent = `
        ::highlight(${name}) {
            text-decoration: underline;
            text-decoration-color: ${color};
            text-decoration-thickness: 2px;
            text-underline-offset: 2px;
            cursor: pointer;
        }
      `;
    document.head.appendChild(style);
    injectedStyles.add(name);
  }

  function showPopover(items, top, left) {
    if (popoverEl) popoverEl.remove();
    const container = sidebarShadow.getElementById("margin-overlay-container");
    popoverEl = document.createElement("div");
    popoverEl.className = "margin-popover";

    const ids = items
      .map((i) => i.uri || i.id)
      .sort()
      .join(",");
    popoverEl.dataset.itemIds = ids;

    const popWidth = 300;
    const screenWidth = window.innerWidth;
    let finalLeft = left;
    if (left + popWidth > screenWidth) finalLeft = screenWidth - popWidth - 20;

    popoverEl.style.top = `${top + 20}px`;
    popoverEl.style.left = `${finalLeft}px`;

    const count = items.length;
    const title = count === 1 ? "1 Comment" : `${count} Comments`;

    let contentHtml = items
      .map((item) => {
        const author = item.author || item.creator || {};
        const handle = author.handle || "User";
        const avatar = author.avatar;
        const text = item.body?.value || item.text || "";
        const id = item.id || item.uri;
        const isHighlight = item.type === "Highlight";

        let avatarHtml = `<div class="comment-avatar">${handle[0]?.toUpperCase() || "U"}</div>`;
        if (avatar) {
          avatarHtml = `<img src="${avatar}" class="comment-avatar" style="object-fit: cover;">`;
        }

        let bodyHtml = "";
        if (isHighlight && !text) {
          bodyHtml = `<div class="highlight-only-badge">Highlighted</div>`;
        } else {
          bodyHtml = `<div class="comment-text">${text}</div>`;
        }

        return `
        <div class="comment-item">
          <div class="comment-header">
            ${avatarHtml}
            <span class="comment-handle">@${handle}</span>
          </div>
          ${bodyHtml}
          <div class="comment-actions">
            ${!isHighlight ? `<button class="comment-action-btn btn-reply" data-id="${id}">Reply</button>` : ""}
            <button class="comment-action-btn btn-share" data-id="${id}" data-text="${text}">Share</button>
          </div>
        </div>
        `;
      })
      .join("");

    popoverEl.innerHTML = `
        <div class="popover-header">
           <span>${title}</span>
           <button class="popover-close">✕</button>
        </div>
        <div class="popover-scroll-area">
            ${contentHtml}
        </div>
      `;

    popoverEl.querySelector(".popover-close").addEventListener("click", (e) => {
      e.stopPropagation();
      popoverEl.remove();
      popoverEl = null;
    });

    const replyBtns = popoverEl.querySelectorAll(".btn-reply");
    replyBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        if (id) {
          chrome.runtime.sendMessage({
            type: "OPEN_APP_URL",
            data: { path: `/annotation/${encodeURIComponent(id)}` },
          });
        }
      });
    });

    const shareBtns = popoverEl.querySelectorAll(".btn-share");
    shareBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const text = btn.getAttribute("data-text");
        const u = `https://margin.at/annotation/${encodeURIComponent(id)}`;
        const shareText = text ? `${text}\n${u}` : u;

        try {
          await navigator.clipboard.writeText(shareText);
          const originalText = btn.innerText;
          btn.innerText = "Copied!";
          setTimeout(() => (btn.innerText = originalText), 2000);
        } catch (e) {
          console.error("Failed to copy", e);
        }
      });
    });

    container.appendChild(popoverEl);

    setTimeout(() => {
      document.addEventListener("click", closePopoverOutside);
    }, 0);
  }

  function closePopoverOutside() {
    if (popoverEl) {
      popoverEl.remove();
      popoverEl = null;
      document.removeEventListener("click", closePopoverOutside);
    }
  }

  function fetchAnnotations(retryCount = 0) {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      const citedUrls = Array.from(document.querySelectorAll("[cite]"))
        .map((el) => el.getAttribute("cite"))
        .filter((url) => url && url.startsWith("http"));
      const uniqueCitedUrls = [...new Set(citedUrls)];

      chrome.runtime.sendMessage(
        {
          type: "GET_ANNOTATIONS",
          data: {
            url: window.location.href,
            citedUrls: uniqueCitedUrls,
          },
        },
        (res) => {
          if (res && res.success && res.data && res.data.length > 0) {
            renderBadges(res.data);
          } else if (retryCount < 3) {
            setTimeout(
              () => fetchAnnotations(retryCount + 1),
              1000 * (retryCount + 1),
            );
          }
        },
      );
    }
  }

  function findCanonicalUrl(range) {
    if (!range) return null;
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    while (node && node !== document.body) {
      if (
        (node.tagName === "BLOCKQUOTE" || node.tagName === "Q") &&
        node.hasAttribute("cite")
      ) {
        if (node.contains(range.commonAncestorContainer)) {
          return node.getAttribute("cite");
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_SELECTOR_FOR_ANNOTATE_INLINE") {
      const sel = window.getSelection();
      if (!sel || !sel.toString()) {
        sendResponse({ selector: null });
        return true;
      }
      const exact = sel.toString().trim();
      const canonicalUrl = findCanonicalUrl(sel.getRangeAt(0));

      sendResponse({
        selector: { type: "TextQuoteSelector", exact },
        canonicalUrl,
      });
      return true;
    }

    if (request.type === "SHOW_INLINE_ANNOTATE") {
      currentSelection = {
        text: request.data.selector?.exact || "",
        selector: request.data.selector,
        url: request.data.url,
        title: request.data.title,
      };
      showInlineComposeModal();
      sendResponse({ success: true });
      return true;
    }

    if (request.type === "GET_SELECTOR_FOR_HIGHLIGHT") {
      const sel = window.getSelection();
      if (!sel || !sel.toString().trim()) {
        sendResponse({ success: false, selector: null });
        return true;
      }
      const exact = sel.toString().trim();
      const canonicalUrl = findCanonicalUrl(sel.getRangeAt(0));

      sendResponse({
        success: false,
        selector: { type: "TextQuoteSelector", exact },
        canonicalUrl,
      });
      return true;
    }

    if (request.type === "REFRESH_ANNOTATIONS") {
      fetchAnnotations();
      sendResponse({ success: true });
      return true;
    }

    if (request.type === "UPDATE_OVERLAY_VISIBILITY") {
      if (sidebarHost) {
        sidebarHost.style.display = request.show ? "block" : "none";
      }
      if (request.show) {
        fetchAnnotations();
      } else {
        activeItems = [];
        if (typeof CSS !== "undefined" && CSS.highlights) {
          CSS.highlights.clear();
        }
      }
      sendResponse({ success: true });
      return true;
    }

    if (request.type === "SCROLL_TO_TEXT") {
      const selector = request.selector;
      if (selector?.exact) {
        const matcher = new DOMTextMatcher();
        const range = matcher.findRange(selector.exact);
        if (range) {
          const rect = range.getBoundingClientRect();
          window.scrollTo({
            top: window.scrollY + rect.top - window.innerHeight / 3,
            behavior: "smooth",
          });
          const highlight = new Highlight(range);
          CSS.highlights.set("margin-scroll-flash", highlight);
          injectHighlightStyle("margin-scroll-flash", "#8b5cf6");
          setTimeout(() => CSS.highlights.delete("margin-scroll-flash"), 2000);
        }
      }
    }
    return true;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOverlay);
  } else {
    initOverlay();
  }

  window.addEventListener("load", () => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["showOverlay"], (result) => {
        if (result.showOverlay !== false) {
          setTimeout(() => fetchAnnotations(), 500);
        }
      });
    } else {
      setTimeout(() => fetchAnnotations(), 500);
    }
  });

  let lastUrl = window.location.href;

  function checkUrlChange() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      onUrlChange();
    }
  }

  function onUrlChange() {
    if (typeof CSS !== "undefined" && CSS.highlights) {
      CSS.highlights.clear();
    }
    activeItems = [];

    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["showOverlay"], (result) => {
        if (result.showOverlay !== false) {
          fetchAnnotations();
        }
      });
    } else {
      fetchAnnotations();
    }
  }

  window.addEventListener("popstate", onUrlChange);

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    checkUrlChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    checkUrlChange();
  };

  setInterval(checkUrlChange, 1000);
})();
