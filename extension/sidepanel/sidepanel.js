document.addEventListener("DOMContentLoaded", async () => {
  const views = {
    loading: document.getElementById("loading"),
    login: document.getElementById("login-prompt"),
    main: document.getElementById("main-content"),
    settings: document.getElementById("settings-view"),
    collectionSelector: document.getElementById("collection-selector"),
  };

  const els = {
    userHandle: document.getElementById("user-handle"),
    userInfo: document.getElementById("user-info"),
    signInBtn: document.getElementById("sign-in"),
    openWebBtn: document.getElementById("open-web"),
    submitBtn: document.getElementById("submit-annotation"),
    textInput: document.getElementById("annotation-text"),
    currentPageUrl: document.getElementById("current-page-url"),
    annotationsList: document.getElementById("annotations"),
    annotationCount: document.getElementById("annotation-count"),
    emptyState: document.getElementById("empty"),
    toggleSettings: document.getElementById("toggle-settings"),
    closeSettings: document.getElementById("close-settings"),
    saveSettings: document.getElementById("save-settings"),
    signOutBtn: document.getElementById("sign-out"),
    apiUrlInput: document.getElementById("api-url"),
    bookmarkBtn: document.getElementById("bookmark-page"),
    refreshBtn: document.getElementById("refresh-annotations"),
    tabs: document.querySelectorAll(".tab-btn"),
    tabContents: document.querySelectorAll(".tab-content"),
    bookmarksList: document.getElementById("bookmarks-list"),
    bookmarksEmpty: document.getElementById("bookmarks-empty"),
    highlightsList: document.getElementById("highlights-list"),
    highlightsEmpty: document.getElementById("highlights-empty"),
    closeCollectionSelector: document.getElementById(
      "close-collection-selector",
    ),
    collectionList: document.getElementById("collection-list"),
    collectionLoading: document.getElementById("collection-loading"),
    collectionsEmpty: document.getElementById("collections-empty"),
    overlayToggle: document.getElementById("overlay-toggle"),
  };

  let currentTab = null;
  let apiUrl = "";
  let currentUserDid = null;
  let pendingSelector = null;

  const storage = await chrome.storage.local.get(["apiUrl"]);
  if (storage.apiUrl) {
    apiUrl = storage.apiUrl;
  }

  els.apiUrlInput.value = apiUrl;

  const overlayStorage = await chrome.storage.local.get(["showOverlay"]);
  if (els.overlayToggle) {
    els.overlayToggle.checked = overlayStorage.showOverlay !== false;
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.apiUrl) {
        apiUrl = changes.apiUrl.newValue || "";
        els.apiUrlInput.value = apiUrl;
        checkSession();
      }
      if (changes.theme) {
        const newTheme = changes.theme.newValue || "system";
        applyTheme(newTheme);
        updateThemeUI(newTheme);
      }
    }
  });

  chrome.storage.local.get(["theme"], (result) => {
    const currentTheme = result.theme || "system";
    applyTheme(currentTheme);
    updateThemeUI(currentTheme);
  });

  const themeBtns = document.querySelectorAll(".theme-btn");
  themeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.getAttribute("data-theme");
      chrome.storage.local.set({ theme });
      applyTheme(theme);
      updateThemeUI(theme);
    });
  });

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    currentTab = tab;
    if (els.currentPageUrl) {
      try {
        els.currentPageUrl.textContent = new URL(tab.url).hostname;
      } catch {
        els.currentPageUrl.textContent = tab.url;
      }
    }

    let pendingData = null;
    if (chrome.storage.session) {
      const sessionData = await chrome.storage.session.get([
        "pendingAnnotation",
      ]);
      if (sessionData.pendingAnnotation) {
        pendingData = sessionData.pendingAnnotation;
        await chrome.storage.session.remove(["pendingAnnotation"]);
      }
    }

    if (!pendingData) {
      const localData = await chrome.storage.local.get([
        "pendingAnnotation",
        "pendingAnnotationExpiry",
      ]);
      if (
        localData.pendingAnnotation &&
        localData.pendingAnnotationExpiry > Date.now()
      ) {
        pendingData = localData.pendingAnnotation;
      }
      await chrome.storage.local.remove([
        "pendingAnnotation",
        "pendingAnnotationExpiry",
      ]);
    }

    if (pendingData?.selector) {
      pendingSelector = pendingData.selector;
      showQuotePreview(pendingSelector);
    }

    checkSession();
  } catch (err) {
    console.error("Init error:", err);
    showView("login");
  }

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      currentTab = tab;
      if (els.currentPageUrl) {
        try {
          els.currentPageUrl.textContent = new URL(tab.url).hostname;
        } catch {
          els.currentPageUrl.textContent = tab.url;
        }
      }
      loadAnnotations();
    } catch (err) {
      console.error("Tab change error:", err);
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (currentTab && tabId === currentTab.id && changeInfo.url) {
      currentTab = tab;
      if (els.currentPageUrl) {
        try {
          els.currentPageUrl.textContent = new URL(tab.url).hostname;
        } catch {
          els.currentPageUrl.textContent = tab.url;
        }
      }
      loadAnnotations();
    }
  });

  els.signInBtn?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_LOGIN" });
  });

  els.openWebBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "OPEN_WEB" });
  });

  els.tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.tabs.forEach((t) => t.classList.remove("active"));
      els.tabContents.forEach((c) => c.classList.remove("active"));
      const tabId = btn.getAttribute("data-tab");
      btn.classList.add("active");
      document.getElementById(`tab-${tabId}`).classList.add("active");
      if (tabId === "bookmarks") loadBookmarks();
      if (tabId === "highlights") loadHighlights();
    });
  });

  els.submitBtn?.addEventListener("click", async () => {
    const text = els.textInput.value.trim();
    if (!text) return;

    els.submitBtn.disabled = true;
    els.submitBtn.textContent = "Posting...";

    try {
      const annotationData = {
        url: currentTab.url,
        text: text,
        title: currentTab.title,
      };

      if (pendingSelector) {
        annotationData.selector = pendingSelector;
      }

      const res = await sendMessage({
        type: "CREATE_ANNOTATION",
        data: annotationData,
      });

      if (res.success) {
        els.textInput.value = "";
        pendingSelector = null;
        hideQuotePreview();
        loadAnnotations();
      } else {
        alert("Failed to post annotation: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Post error:", err);
      alert("Error posting annotation");
    } finally {
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = "Post";
    }
  });

  els.bookmarkBtn?.addEventListener("click", async () => {
    els.bookmarkBtn.disabled = true;
    const originalText = els.bookmarkBtn.textContent;
    els.bookmarkBtn.textContent = "Saving...";

    try {
      const res = await sendMessage({
        type: "CREATE_BOOKMARK",
        data: {
          url: currentTab.url,
          title: currentTab.title,
        },
      });

      if (res.success) {
        els.bookmarkBtn.textContent = "✓ Bookmarked";
        setTimeout(() => {
          els.bookmarkBtn.textContent = originalText;
          els.bookmarkBtn.disabled = false;
        }, 2000);
      } else {
        alert("Failed to bookmark page: " + (res.error || "Unknown error"));
        els.bookmarkBtn.textContent = originalText;
        els.bookmarkBtn.disabled = false;
      }
    } catch (err) {
      console.error("Bookmark error:", err);
      alert("Error bookmarking page");
      els.bookmarkBtn.textContent = originalText;
      els.bookmarkBtn.disabled = false;
    }
  });

  els.refreshBtn?.addEventListener("click", () => {
    loadAnnotations();
  });

  els.toggleSettings?.addEventListener("click", () => {
    views.settings.style.display = "flex";
  });

  els.closeSettings?.addEventListener("click", () => {
    views.settings.style.display = "none";
  });

  els.closeCollectionSelector?.addEventListener("click", () => {
    views.collectionSelector.style.display = "none";
  });

  els.saveSettings?.addEventListener("click", async () => {
    const newUrl = els.apiUrlInput.value.replace(/\/$/, "");
    const showOverlay = els.overlayToggle?.checked ?? true;

    await chrome.storage.local.set({
      apiUrl: newUrl,
      showOverlay,
    });
    if (newUrl) {
      apiUrl = newUrl;
    }
    await sendMessage({ type: "UPDATE_SETTINGS" });

    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: "UPDATE_OVERLAY_VISIBILITY",
            show: showOverlay,
          });
        } catch {
          /* ignore */
        }
      }
    }

    views.settings.style.display = "none";
    checkSession();
  });

  els.signOutBtn?.addEventListener("click", async () => {
    if (apiUrl) {
      await chrome.cookies.remove({
        url: apiUrl,
        name: "margin_session",
      });
    }
    views.settings.style.display = "none";
    showView("login");
    els.userInfo.style.display = "none";
  });

  async function checkSession() {
    showView("loading");
    try {
      const res = await sendMessage({ type: "CHECK_SESSION" });

      if (res.success && res.data?.authenticated) {
        if (els.userHandle) els.userHandle.textContent = "@" + res.data.handle;
        els.userInfo.style.display = "flex";
        currentUserDid = res.data.did;
        showView("main");
        loadAnnotations();
      } else {
        els.userInfo.style.display = "none";
        showView("login");
      }
    } catch (err) {
      console.error("Session check error:", err);
      els.userInfo.style.display = "none";
      showView("login");
    }
  }

  async function loadAnnotations() {
    if (!currentTab?.url) return;

    try {
      const res = await sendMessage({
        type: "GET_ANNOTATIONS",
        data: { url: currentTab.url },
      });

      if (res.success) {
        renderAnnotations(res.data);
      }
    } catch (err) {
      console.error("Load annotations error:", err);
    }
  }

  async function loadBookmarks() {
    if (!currentUserDid) return;
    els.bookmarksList.innerHTML =
      '<div class="loading"><div class="spinner"></div></div>';
    els.bookmarksEmpty.style.display = "none";

    try {
      const res = await sendMessage({
        type: "GET_USER_BOOKMARKS",
        data: { did: currentUserDid },
      });

      if (res.success) {
        renderBookmarks(res.data);
      }
    } catch (err) {
      console.error("Load bookmarks error:", err);
      els.bookmarksList.innerHTML =
        '<p style="color: #ef4444; text-align: center;">Failed to load bookmarks</p>';
    }
  }

  async function loadHighlights() {
    if (!currentUserDid) return;
    els.highlightsList.innerHTML =
      '<div class="loading"><div class="spinner"></div></div>';
    els.highlightsEmpty.style.display = "none";

    try {
      const res = await sendMessage({
        type: "GET_USER_HIGHLIGHTS",
        data: { did: currentUserDid },
      });

      if (res.success) {
        renderHighlights(res.data);
      }
    } catch (err) {
      console.error("Load highlights error:", err);
      els.highlightsList.innerHTML =
        '<p style="color: #ef4444; text-align: center;">Failed to load highlights</p>';
    }
  }

  async function openCollectionSelector(annotationUri) {
    if (!currentUserDid) {
      console.error("No currentUserDid, returning early");
      return;
    }
    views.collectionSelector.style.display = "flex";
    els.collectionList.innerHTML = "";
    els.collectionLoading.style.display = "block";
    els.collectionsEmpty.style.display = "none";

    try {
      const [collectionsRes, containingRes] = await Promise.all([
        sendMessage({
          type: "GET_USER_COLLECTIONS",
          data: { did: currentUserDid },
        }),
        sendMessage({
          type: "GET_CONTAINING_COLLECTIONS",
          data: { uri: annotationUri },
        }),
      ]);

      if (collectionsRes.success) {
        const containingUris = containingRes.success
          ? new Set(containingRes.data)
          : new Set();
        renderCollectionList(
          collectionsRes.data,
          annotationUri,
          containingUris,
        );
      }
    } catch (err) {
      console.error("Load collections error:", err);
      els.collectionList.innerHTML =
        '<p class="error">Failed to load collections</p>';
    } finally {
      els.collectionLoading.style.display = "none";
    }
  }

  function renderCollectionList(
    items,
    annotationUri,
    containingUris = new Set(),
  ) {
    els.collectionList.innerHTML = "";
    els.collectionList.dataset.annotationUri = annotationUri;

    if (!items || items.length === 0) {
      els.collectionsEmpty.style.display = "block";
      return;
    }

    items.forEach((collection) => {
      const btn = document.createElement("button");
      btn.className = "collection-select-btn";
      const isAdded = containingUris.has(collection.uri);

      const icon = document.createElement("span");
      if (isAdded) {
        icon.textContent = "✓";
      } else {
        icon.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
      }
      btn.appendChild(icon);

      const name = document.createElement("span");
      name.textContent = collection.name;
      btn.appendChild(name);

      if (isAdded) {
        btn.classList.add("added");
        btn.disabled = true;
      }

      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const annUri = els.collectionList.dataset.annotationUri;
        await handleAddToCollection(collection.uri, btn, annUri);
      });

      els.collectionList.appendChild(btn);
    });
  }

  async function handleAddToCollection(
    collectionUri,
    btnElement,
    annotationUri,
  ) {
    if (!annotationUri) {
      console.error("No annotationUri provided!");
      alert("Error: No item selected to add");
      return;
    }

    const originalText = btnElement.textContent;
    btnElement.disabled = true;
    btnElement.textContent = "Adding...";

    try {
      const res = await sendMessage({
        type: "ADD_TO_COLLECTION",
        data: {
          collectionUri: collectionUri,
          annotationUri: annotationUri,
        },
      });

      if (res && res.success) {
        btnElement.textContent = "✓ Added";
        setTimeout(() => {
          btnElement.textContent = originalText;
          btnElement.disabled = false;
        }, 2000);
      } else {
        alert(
          "Failed to add to collection: " + (res?.error || "Unknown error"),
        );
        btnElement.textContent = originalText;
        btnElement.disabled = false;
      }
    } catch (err) {
      console.error("Add to collection error:", err);
      alert("Error adding to collection: " + err.message);
      btnElement.textContent = originalText;
      btnElement.disabled = false;
    }
  }

  function renderAnnotations(items) {
    els.annotationsList.innerHTML = "";
    els.annotationCount.textContent = items?.length || 0;

    if (!items || items.length === 0) {
      els.emptyState.style.display = "flex";
      return;
    }

    els.emptyState.style.display = "none";
    items.forEach((item) => {
      const el = document.createElement("div");
      el.className = "annotation-item";

      const author = item.creator || item.author || {};
      const authorName = author.handle || author.displayName || "Unknown";
      const authorInitial = authorName[0]?.toUpperCase() || "?";
      const createdAt = item.created || item.createdAt;
      const text = item.body?.value || item.text || "";
      const selector = item.target?.selector;
      const isHighlight = item.type === "Highlight";
      const quote = selector?.exact || "";

      const header = document.createElement("div");
      header.className = "annotation-item-header";

      const avatar = document.createElement("div");
      avatar.className = "annotation-item-avatar";

      if (author.avatar) {
        const img = document.createElement("img");
        img.src = author.avatar;
        img.alt = authorName;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        avatar.appendChild(img);
        avatar.style.background = "none";
      } else {
        avatar.textContent = authorInitial;
      }
      header.appendChild(avatar);

      const meta = document.createElement("div");
      meta.className = "annotation-item-meta";

      const authorEl = document.createElement("div");
      authorEl.className = "annotation-item-author";
      authorEl.textContent = "@" + authorName;
      meta.appendChild(authorEl);

      const timeEl = document.createElement("div");
      timeEl.className = "annotation-item-time";
      timeEl.textContent = formatDate(createdAt);
      meta.appendChild(timeEl);

      header.appendChild(meta);

      if (isHighlight) {
        const badge = document.createElement("span");
        badge.className = "annotation-type-badge highlight";
        badge.textContent = "Highlight";
        header.appendChild(badge);
      }

      if (currentUserDid) {
        const actions = document.createElement("div");
        actions.className = "annotation-item-actions";

        const folderBtn = document.createElement("button");
        folderBtn.className = "btn-icon";
        folderBtn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        folderBtn.title = "Add to Collection";
        folderBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openCollectionSelector(item.uri);
        });
        actions.appendChild(folderBtn);
        header.appendChild(actions);
      }

      el.appendChild(header);

      if (quote) {
        const quoteEl = document.createElement("div");
        quoteEl.className = "annotation-item-quote";
        quoteEl.textContent = '"' + quote + '"';
        el.appendChild(quoteEl);
      }

      if (text) {
        const textEl = document.createElement("div");
        textEl.className = "annotation-item-text";
        textEl.textContent = text;
        el.appendChild(textEl);
      }

      if (selector) {
        const jumpBtn = document.createElement("button");
        jumpBtn.className = "scroll-to-btn";
        jumpBtn.textContent = "Jump to text →";
        el.appendChild(jumpBtn);
      }

      if (selector) {
        el.querySelector(".scroll-to-btn")?.addEventListener("click", (e) => {
          e.stopPropagation();
          scrollToText(selector);
        });
      }

      els.annotationsList.appendChild(el);
    });
  }

  function renderBookmarks(items) {
    els.bookmarksList.innerHTML = "";

    if (!items || items.length === 0) {
      els.bookmarksEmpty.style.display = "flex";
      return;
    }

    els.bookmarksEmpty.style.display = "none";
    items.forEach((item) => {
      const el = document.createElement("div");
      el.className = "bookmark-item";
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        window.open(item.source, "_blank");
      });

      let hostname = item.source;
      try {
        hostname = new URL(item.source).hostname;
      } catch {
        /* ignore */
      }

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";

      const content = document.createElement("div");
      content.style.flex = "1";
      content.style.overflow = "hidden";

      const titleEl = document.createElement("div");
      titleEl.className = "bookmark-title";
      titleEl.textContent = item.title || item.source;
      content.appendChild(titleEl);

      const urlEl = document.createElement("div");
      urlEl.className = "bookmark-url";
      urlEl.textContent = hostname;
      content.appendChild(urlEl);

      row.appendChild(content);

      if (currentUserDid) {
        const folderBtn = document.createElement("button");
        folderBtn.className = "btn-icon";
        folderBtn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        folderBtn.title = "Add to Collection";
        folderBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openCollectionSelector(item.uri);
        });
        row.appendChild(folderBtn);
      }

      el.appendChild(row);
      els.bookmarksList.appendChild(el);
    });
  }

  function renderHighlights(items) {
    els.highlightsList.innerHTML = "";

    if (!items || items.length === 0) {
      els.highlightsEmpty.style.display = "flex";
      return;
    }

    els.highlightsEmpty.style.display = "none";
    items.forEach((item) => {
      const el = document.createElement("div");
      el.className = "annotation-item";

      const target = item.target || {};
      const selector = target.selector || {};
      const quote = selector.exact || "";
      const url = target.source || "";

      let hostname = url;
      try {
        hostname = new URL(url).hostname;
      } catch {
        /* ignore */
      }

      const header = document.createElement("div");
      header.className = "annotation-item-header";

      const meta = document.createElement("div");
      meta.className = "annotation-item-meta";

      const authorEl = document.createElement("div");
      authorEl.className = "annotation-item-author";
      authorEl.textContent = hostname;
      meta.appendChild(authorEl);

      const timeEl = document.createElement("div");
      timeEl.className = "annotation-item-time";
      timeEl.textContent = formatDate(item.created);
      meta.appendChild(timeEl);

      header.appendChild(meta);

      if (currentUserDid) {
        const actions = document.createElement("div");
        actions.className = "annotation-item-actions";

        const folderBtn = document.createElement("button");
        folderBtn.className = "btn-icon";
        folderBtn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        folderBtn.title = "Add to Collection";
        folderBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openCollectionSelector(item.uri);
        });
        actions.appendChild(folderBtn);
        header.appendChild(actions);
      }

      el.appendChild(header);

      if (quote) {
        const quoteEl = document.createElement("div");
        quoteEl.className = "annotation-item-quote";
        quoteEl.style.borderColor = item.color || "#fcd34d";
        quoteEl.textContent = '"' + quote + '"';
        el.appendChild(quoteEl);
      }

      const openBtn = document.createElement("button");
      openBtn.className = "scroll-to-btn";
      openBtn.textContent = "Open page →";
      el.appendChild(openBtn);

      el.querySelector(".scroll-to-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const textFragment = createTextFragment(url, selector);
        chrome.tabs.create({ url: textFragment });
      });

      els.highlightsList.appendChild(el);
    });
  }

  async function scrollToText(selector) {
    let tabId = currentTab?.id;
    if (!tabId) {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        tabId = tab?.id;
      } catch (e) {
        console.error("Could not get active tab:", e);
      }
    }

    if (!tabId) {
      console.error("No tab ID available for scroll");
      return;
    }

    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "SCROLL_TO_TEXT",
        selector: selector,
      });
    } catch (err) {
      console.error("Error sending SCROLL_TO_TEXT:", err);
    }
  }

  function createTextFragment(url, selector) {
    if (!selector || selector.type !== "TextQuoteSelector" || !selector.exact)
      return url;

    let fragment = ":~:text=";
    if (selector.prefix) fragment += encodeURIComponent(selector.prefix) + "-,";
    fragment += encodeURIComponent(selector.exact);
    if (selector.suffix) fragment += ",-" + encodeURIComponent(selector.suffix);

    return url + "#" + fragment;
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  function showQuotePreview(selector) {
    if (!selector?.exact) return;

    let preview = document.getElementById("quote-preview");
    if (!preview) {
      preview = document.createElement("div");
      preview.id = "quote-preview";
      preview.className = "quote-preview";
      const form = document.querySelector(".create-form");
      if (form) {
        form.insertBefore(preview, form.querySelector(".annotation-input"));
      }
    }

    const header = document.createElement("div");
    header.className = "quote-preview-header";

    const label = document.createElement("span");
    label.textContent = "Annotating selection:";
    header.appendChild(label);

    const clearBtn = document.createElement("button");
    clearBtn.className = "quote-preview-clear";
    clearBtn.title = "Clear selection";
    clearBtn.textContent = "×";
    clearBtn.addEventListener("click", () => {
      pendingSelector = null;
      hideQuotePreview();
    });
    header.appendChild(clearBtn);

    preview.appendChild(header);

    const text = document.createElement("div");
    text.className = "quote-preview-text";
    text.textContent = '"' + selector.exact + '"';
    preview.appendChild(text);

    els.textInput?.focus();
  }

  function hideQuotePreview() {
    const preview = document.getElementById("quote-preview");
    if (preview) {
      preview.remove();
    }
  }

  function showView(viewName) {
    Object.keys(views).forEach((key) => {
      if (views[key]) views[key].style.display = "none";
    });
    if (views[viewName]) {
      views[viewName].style.display =
        viewName === "loading" || viewName === "settings" ? "flex" : "block";
    }
  }

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  function applyTheme(theme) {
    document.body.classList.remove("light", "dark");
    if (theme === "system") return;
    document.body.classList.add(theme);
  }

  function updateThemeUI(theme) {
    const btns = document.querySelectorAll(".theme-btn");
    btns.forEach((btn) => {
      if (btn.getAttribute("data-theme") === theme) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }
});
