(() => {
  let sidebarHost = null;
  let sidebarShadow = null;
  let popoverEl = null;

  let activeItems = [];

  let hoveredItems = [];
  let tooltipEl = null;
  let hideTimer = null;

  const OVERLAY_STYLES = `
    :host { all: initial; }
    .margin-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .margin-badge {
      position: absolute;
      background: #6366f1;
      color: white;
      padding: 4px 10px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      cursor: pointer;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      display: flex;
      align-items: center;
      gap: 6px;
      transform: translateY(-120%);
      white-space: nowrap;
      transition: transform 0.15s, background-color 0.15s;
      z-index: 2147483647;
    }
    .margin-badge:hover {
      transform: translateY(-125%) scale(1.05);
      background: #4f46e5;
      z-index: 2147483647;
    }
    .margin-badge-avatar {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      object-fit: cover;
    }
    .margin-badge-stack {
      display: flex;
      align-items: center;
    }
    .margin-badge-stack .margin-badge-avatar {
      margin-left: -6px;
      border: 1px solid #6366f1;
    }
    .margin-badge-stack .margin-badge-avatar:first-child {
      margin-left: 0;
    }
    .margin-badge-stem {
      position: absolute;
      left: 14px;
      bottom: -6px;
      width: 2px;
      height: 6px;
      background: #6366f1;
      border-radius: 2px;
    }

    .margin-popover {
      position: absolute;
      width: 320px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #e4e4e7;
      opacity: 0;
      transform: scale(0.95);
      animation: popover-in 0.15s forwards;
      max-height: 480px;
      overflow: hidden;
    }
    @keyframes popover-in { to { opacity: 1; transform: scale(1); } }
    .popover-header {
      padding: 12px 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f0f12;
      border-radius: 12px 12px 0 0;
      font-weight: 600;
      font-size: 13px;
    }
    .popover-scroll-area {
      overflow-y: auto;
      max-height: 400px;
    }
    .popover-item-block {
      border-bottom: 1px solid #27272a;
      margin-bottom: 0;
      animation: fade-in 0.2s;
    }
    .popover-item-block:last-child {
      border-bottom: none;
    }
    .popover-item-header {
      padding: 12px 16px 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .popover-avatar {
      width: 24px; height: 24px; border-radius: 50%; background: #27272a;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: #a1a1aa;
    }
    .popover-handle { font-size: 12px; font-weight: 600; color: #e4e4e7; }
    .popover-close { background: none; border: none; color: #71717a; cursor: pointer; padding: 4px; }
    .popover-close:hover { color: #e4e4e7; }
    .popover-content { padding: 4px 16px 12px; font-size: 13px; line-height: 1.5; color: #e4e4e7; }
    .popover-quote {
      margin-top: 8px; padding: 6px 10px; background: #18181b;
      border-left: 2px solid #6366f1; border-radius: 4px;
      font-size: 11px; color: #a1a1aa; font-style: italic;
    }
    .popover-actions {
      padding: 8px 16px;
      display: flex; justify-content: flex-end; gap: 8px;
    }
    .btn-action {
      background: none; border: 1px solid #27272a; border-radius: 4px;
      padding: 4px 8px; color: #a1a1aa; font-size: 11px; cursor: pointer;
    }
    .btn-action:hover { background: #27272a; color: #e4e4e7; }
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
        const cleaned = searchText.replace(/\s+/g, " ");
        return null;
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

  function initOverlay() {
    sidebarHost = document.createElement("div");
    sidebarHost.id = "margin-overlay-host";
    const getScrollHeight = () => {
      const bodyH = document.body?.scrollHeight || 0;
      const docH = document.documentElement?.scrollHeight || 0;
      return Math.max(bodyH, docH);
    };

    sidebarHost.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; 
        height: ${getScrollHeight()}px; 
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

    createTooltip(container);

    const observer = new ResizeObserver(() => {
      sidebarHost.style.height = `${getScrollHeight()}px`;
    });
    if (document.body) observer.observe(document.body);
    if (document.documentElement) observer.observe(document.documentElement);

    fetchAnnotations();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleDocumentClick);
  }

  function createTooltip(container) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "margin-badge";
    tooltipEl.style.opacity = "0";
    tooltipEl.style.transition = "opacity 0.1s, transform 0.1s";
    tooltipEl.style.pointerEvents = "auto";

    tooltipEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (hoveredItems.length > 0) {
        const firstItem = hoveredItems[0];
        const rect = activeItems
          .find((x) => x.item === firstItem)
          ?.range.getBoundingClientRect();
        if (rect) {
          const top = rect.top + window.scrollY;
          const left = rect.left + window.scrollX;
          showPopover(hoveredItems, top, left);
        }
      }
    });
    container.appendChild(tooltipEl);
  }

  function handleMouseMove(e) {
    const x = e.clientX;
    const y = e.clientY;

    let foundItems = [];

    for (const { range, item } of activeItems) {
      const rects = range.getClientRects();
      for (const rect of rects) {
        const padding = 5;
        if (
          x >= rect.left - padding &&
          x <= rect.right + padding &&
          y >= rect.top - padding &&
          y <= rect.bottom + padding
        ) {
          if (!foundItems.includes(item)) {
            foundItems.push(item);
          }
          break;
        }
      }
    }

    let isOverTooltip = false;
    if (tooltipEl && tooltipEl.style.opacity === "1") {
      const rect = tooltipEl.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        isOverTooltip = true;
      }
    }

    if (foundItems.length > 0 || isOverTooltip) {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (foundItems.length > 0) {
        const currentIds = hoveredItems
          .map((i) => i.id || i.cid)
          .sort()
          .join(",");
        const newIds = foundItems
          .map((i) => i.id || i.cid)
          .sort()
          .join(",");

        if (currentIds !== newIds) {
          hoveredItems = foundItems;
          updateTooltip();
        }
      }
    } else {
      if (!hideTimer && hoveredItems.length > 0) {
        hideTimer = setTimeout(() => {
          hoveredItems = [];
          updateTooltip();
          hideTimer = null;
        }, 300);
      }
    }
  }

  function updateTooltip() {
    if (!tooltipEl) return;

    if (hoveredItems.length === 0) {
      tooltipEl.style.opacity = "0";
      tooltipEl.style.transform = "translateY(-105%) scale(0.9)";
      tooltipEl.style.pointerEvents = "none";
      return;
    }

    tooltipEl.style.pointerEvents = "auto";

    const authorsMap = new Map();
    hoveredItems.forEach((item) => {
      const author = item.author || item.creator || {};
      const id = author.did || author.handle;
      if (id && !authorsMap.has(id)) {
        authorsMap.set(id, author);
      }
    });

    const uniqueAuthors = Array.from(authorsMap.values());
    let contentHtml = "";

    if (uniqueAuthors.length === 1) {
      const author = uniqueAuthors[0] || {};
      const handle = author.handle || "User";
      const avatar = author.avatar;
      const count = hoveredItems.length;

      let avatarHtml = `<div class="margin-badge-avatar">${handle[0]?.toUpperCase() || "U"}</div>`;
      if (avatar) {
        avatarHtml = `<img src="${avatar}" class="margin-badge-avatar">`;
      }

      contentHtml = `${avatarHtml}<span>${handle}${count > 1 ? ` (${count})` : ""}</span>`;
    } else {
      let stackHtml = `<div class="margin-badge-stack">`;
      const displayAuthors = uniqueAuthors.slice(0, 3);
      displayAuthors.forEach((author) => {
        const handle = author.handle || "U";
        const avatar = author.avatar;
        if (avatar) {
          stackHtml += `<img src="${avatar}" class="margin-badge-avatar">`;
        } else {
          stackHtml += `<div class="margin-badge-avatar">${handle[0]?.toUpperCase() || "U"}</div>`;
        }
      });
      stackHtml += `</div>`;

      contentHtml = `${stackHtml}<span>${uniqueAuthors.length} people</span>`;
    }

    tooltipEl.innerHTML = `
          ${contentHtml}
          <div class="margin-badge-stem"></div>
      `;

    const firstItem = hoveredItems[0];
    const match = activeItems.find((x) => x.item === firstItem);
    if (match) {
      const rects = match.range.getClientRects();
      if (rects && rects.length > 0) {
        const rect = rects[0];
        const top = rect.top + window.scrollY;
        const left = rect.left + window.scrollX;

        tooltipEl.style.top = `${top - 36}px`;
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.opacity = "1";
        tooltipEl.style.transform = "translateY(0) scale(1)";
      }
    }
  }

  function handleDocumentClick(e) {
    if (hoveredItems.length > 0) {
      e.preventDefault();
      e.stopPropagation();

      const item = hoveredItems[0];
      const match = activeItems.find((x) => x.item === item);
      if (match) {
        const rects = match.range.getClientRects();
        if (rects.length > 0) {
          const rect = rects[0];
          const top = rect.top + window.scrollY;
          const left = rect.left + window.scrollX;
          showPopover(hoveredItems, top, left);
        }
      }
    }
  }

  function refreshPositions() {}

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

        const color = item.color || "#c084fc";
        if (!rangesByColor[color]) rangesByColor[color] = [];
        rangesByColor[color].push(range);
      }
    });

    if (CSS.highlights) {
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
            background-color: ${color}66;
            color: inherit;
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

    const popWidth = 320;
    const screenWidth = window.innerWidth;
    let finalLeft = left;
    if (left + popWidth > screenWidth) finalLeft = screenWidth - popWidth - 20;

    popoverEl.style.top = `${top + 20}px`;
    popoverEl.style.left = `${finalLeft}px`;

    const title =
      items.length > 1 ? `${items.length} Annotations` : "Annotation";

    let contentHtml = items
      .map((item) => {
        const author = item.author || item.creator || {};
        const handle = author.handle || "User";
        const avatar = author.avatar;
        const text = item.body?.value || item.text || "";
        const quote =
          item.target?.selector?.exact || item.selector?.exact || "";
        const id = item.id || item.uri;

        let avatarHtml = `<div class="popover-avatar">${handle[0]?.toUpperCase() || "U"}</div>`;
        if (avatar) {
          avatarHtml = `<img src="${avatar}" class="popover-avatar" style="object-fit: cover;">`;
        }

        const isHighlight = item.type === "Highlight";

        let bodyHtml = "";
        if (isHighlight) {
          bodyHtml = `<div class="popover-text" style="font-style: italic; color: #a1a1aa;">"${quote}"</div>`;
        } else {
          bodyHtml = `<div class="popover-text">${text}</div>`;
          if (quote) {
            bodyHtml += `<div class="popover-quote">"${quote}"</div>`;
          }
        }

        return `
        <div class="popover-item-block">
            <div class="popover-item-header">
                <div class="popover-author">
                    ${avatarHtml}
                    <span class="popover-handle">@${handle}</span>
                </div>
            </div>
            <div class="popover-content">
                ${bodyHtml}
            </div>
            <div class="popover-actions">
                ${!isHighlight ? `<button class="btn-action btn-reply" data-id="${id}">Reply</button>` : ""}
                <button class="btn-action btn-share" data-id="${id}" data-text="${text}" data-quote="${quote}">Share</button>
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

    popoverEl.querySelector(".popover-close").addEventListener("click", () => {
      popoverEl.remove();
      popoverEl = null;
    });

    const replyBtns = popoverEl.querySelectorAll(".btn-reply");
    replyBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
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
        const quote = btn.getAttribute("data-quote");
        const u = `https://margin.at/annotation/${encodeURIComponent(id)}`;
        const shareText = `${text ? text + "\n" : ""}${quote ? `"${quote}"\n` : ""}${u}`;

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

  function closePopoverOutside(e) {
    if (popoverEl) {
      popoverEl.remove();
      popoverEl = null;
      document.removeEventListener("click", closePopoverOutside);
    }
  }

  function fetchAnnotations() {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          type: "GET_ANNOTATIONS",
          data: { url: window.location.href },
        },
        (res) => {
          if (res && res.success) {
            renderBadges(res.data);
          }
        },
      );
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_SELECTOR_FOR_ANNOTATE_INLINE") {
      const sel = window.getSelection();
      if (!sel || !sel.toString()) {
        sendResponse({ selector: null });
        return true;
      }
      const exact = sel.toString().trim();
      sendResponse({ selector: { type: "TextQuoteSelector", exact } });
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
})();
