const browserAPI = typeof browser !== "undefined" ? browser : chrome;

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
    currentUrl: document.getElementById("current-url"),
    annotationsList: document.getElementById("annotations"),
    annotationCount: document.getElementById("annotation-count"),
    emptyState: document.getElementById("empty"),
    toggleSettings: document.getElementById("toggle-settings"),
    closeSettings: document.getElementById("close-settings"),
    saveSettings: document.getElementById("save-settings"),
    apiUrlInput: document.getElementById("api-url"),
    bookmarkBtn: document.getElementById("bookmark-page"),

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
  };

  let currentTab = null;
  let apiUrl = "https://margin.at";
  let currentUserDid = null;
  let pendingSelector = null;
  let activeAnnotationUriForCollection = null;

  const storage = await browserAPI.storage.local.get(["apiUrl"]);
  if (storage.apiUrl) {
    apiUrl = storage.apiUrl;
  }
  els.apiUrlInput.value = apiUrl;

  try {
    const [tab] = await browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    });
    currentTab = tab;

    if (els.currentUrl) {
      els.currentUrl.textContent = new URL(tab.url).hostname;
    }

    let pendingData = null;
    if (browserAPI.storage.session) {
      try {
        const sessionData = await browserAPI.storage.session.get([
          "pendingAnnotation",
        ]);
        if (sessionData.pendingAnnotation) {
          pendingData = sessionData.pendingAnnotation;
          await browserAPI.storage.session.remove(["pendingAnnotation"]);
        }
      } catch (e) {}
    }

    if (!pendingData) {
      const localData = await browserAPI.storage.local.get([
        "pendingAnnotation",
        "pendingAnnotationExpiry",
      ]);
      if (
        localData.pendingAnnotation &&
        localData.pendingAnnotationExpiry > Date.now()
      ) {
        pendingData = localData.pendingAnnotation;
      }
      await browserAPI.storage.local.remove([
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

  els.signInBtn?.addEventListener("click", () => {
    browserAPI.runtime.sendMessage({ type: "OPEN_LOGIN" });
  });

  els.openWebBtn?.addEventListener("click", () => {
    browserAPI.runtime.sendMessage({ type: "OPEN_WEB" });
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
        alert("Failed to post annotation");
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
          els.bookmarkBtn.textContent = "Bookmark Page";
          els.bookmarkBtn.disabled = false;
        }, 2000);
      } else {
        alert("Failed to bookmark page");
        els.bookmarkBtn.textContent = "Bookmark Page";
        els.bookmarkBtn.disabled = false;
      }
    } catch (err) {
      console.error("Bookmark error:", err);
      alert("Error bookmarking page");
      els.bookmarkBtn.textContent = "Bookmark Page";
      els.bookmarkBtn.disabled = false;
    }
  });

  els.toggleSettings?.addEventListener("click", () => {
    views.settings.style.display = "flex";
  });

  els.closeSettings?.addEventListener("click", () => {
    views.settings.style.display = "none";
  });

  els.saveSettings?.addEventListener("click", async () => {
    const newUrl = els.apiUrlInput.value.replace(/\/$/, "");
    if (newUrl) {
      await browserAPI.storage.local.set({ apiUrl: newUrl });
      apiUrl = newUrl;
      await sendMessage({ type: "UPDATE_SETTINGS" });
      views.settings.style.display = "none";
      checkSession();
    }
  });

  els.closeCollectionSelector?.addEventListener("click", () => {
    views.collectionSelector.style.display = "none";
    activeAnnotationUriForCollection = null;
  });

  async function openCollectionSelector(annotationUri) {
    if (!currentUserDid) {
      console.error("No currentUserDid, returning early");
      return;
    }
    activeAnnotationUriForCollection = annotationUri;
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

    items.forEach((col) => {
      const btn = document.createElement("button");
      btn.className = "collection-select-btn";
      const isAdded = containingUris.has(col.uri);

      const iconSpan = document.createElement("span");
      iconSpan.textContent = isAdded ? "✓" : "📁";
      btn.appendChild(iconSpan);

      const nameSpan = document.createElement("span");
      nameSpan.textContent = col.name;
      btn.appendChild(nameSpan);

      if (isAdded) {
        btn.classList.add("added");
        btn.disabled = true;
      }

      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        const annUri = els.collectionList.dataset.annotationUri;
        await handleAddToCollection(col.uri, btn, annUri);
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

  async function checkSession() {
    showView("loading");
    try {
      const res = await sendMessage({ type: "CHECK_SESSION" });

      if (res.success && res.data?.authenticated) {
        if (els.userHandle) {
          const handle = res.data.handle || res.data.email || "User";
          els.userHandle.textContent = "@" + handle;
        }
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
      '<div class="spinner" style="margin: 20px auto;"></div>';
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
        '<p class="error">Failed to load bookmarks</p>';
    }
  }

  async function loadHighlights() {
    if (!currentUserDid) return;
    els.highlightsList.innerHTML =
      '<div class="spinner" style="margin: 20px auto;"></div>';
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
        '<p class="error">Failed to load highlights</p>';
    }
  }

  function renderAnnotations(items) {
    els.annotationsList.innerHTML = "";
    els.annotationCount.textContent = items?.length || 0;

    if (!items || items.length === 0) {
      els.emptyState.style.display = "block";
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

      el.appendChild(header);

      const actions = document.createElement("div");
      actions.className = "annotation-item-actions";

      if (
        item.author?.did === currentUserDid ||
        item.creator?.did === currentUserDid
      ) {
        const folderBtn = document.createElement("button");
        folderBtn.className = "btn-icon";
        folderBtn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        folderBtn.title = "Add to Collection";
        folderBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const uri = item.id || item.uri;
          openCollectionSelector(uri);
        });
        actions.appendChild(folderBtn);
      }

      header.appendChild(actions);

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
      const el = document.createElement("a");
      el.className = "bookmark-item";
      el.href = item.source;
      el.target = "_blank";

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
      urlEl.textContent = new URL(item.source).hostname;
      content.appendChild(urlEl);

      row.appendChild(content);

      if (
        item.author?.did === currentUserDid ||
        item.creator?.did === currentUserDid
      ) {
        const folderBtn = document.createElement("button");
        folderBtn.className = "btn-icon";
        folderBtn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        folderBtn.title = "Add to Collection";
        folderBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const uri = item.id || item.uri;
          openCollectionSelector(uri);
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

      const header = document.createElement("div");
      header.className = "annotation-item-header";

      const meta = document.createElement("div");
      meta.className = "annotation-item-meta";

      const authorEl = document.createElement("div");
      authorEl.className = "annotation-item-author";
      authorEl.textContent = new URL(url).hostname;
      meta.appendChild(authorEl);

      const timeEl = document.createElement("div");
      timeEl.className = "annotation-item-time";
      timeEl.textContent = formatDate(item.created);
      meta.appendChild(timeEl);

      header.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "annotation-item-actions";

      const folderBtn = document.createElement("button");
      folderBtn.className = "btn-icon";
      folderBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
      folderBtn.title = "Add to Collection";
      folderBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const uri = item.id || item.uri;
        openCollectionSelector(uri);
      });
      actions.appendChild(folderBtn);

      header.appendChild(actions);
      el.appendChild(header);

      if (quote) {
        const quoteEl = document.createElement("div");
        quoteEl.className = "annotation-item-quote";
        quoteEl.style.marginLeft = "0";
        quoteEl.style.borderColor = item.color || "#fcd34d";
        quoteEl.textContent = '"' + quote + '"';
        el.appendChild(quoteEl);
      }

      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        const textFragment = createTextFragment(url, selector);
        browserAPI.tabs.create({ url: textFragment });
      });

      els.highlightsList.appendChild(el);
    });
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

  function showQuotePreview(selector) {
    if (!selector?.exact) return;

    let preview = document.getElementById("quote-preview");
    if (!preview) {
      preview = document.createElement("div");
      preview.id = "quote-preview";
      preview.className = "quote-preview";
      const form = document.getElementById("create-form");
      if (form) {
        form.insertBefore(preview, els.textInput);
      }
    }

    const header = document.createElement("div");
    header.className = "quote-preview-header";

    const label = document.createElement("span");
    label.textContent = "Annotating:";
    header.appendChild(label);

    const clearBtn = document.createElement("button");
    clearBtn.className = "quote-preview-clear";
    clearBtn.title = "Clear";
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
    if (preview) preview.remove();
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
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
      browserAPI.runtime.sendMessage(message, (response) => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
});
