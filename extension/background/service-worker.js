let API_BASE = "https://margin.at";
let WEB_BASE = "https://margin.at";

const hasSidePanel =
  typeof chrome !== "undefined" && typeof chrome.sidePanel !== "undefined";
const hasSidebarAction =
  typeof browser !== "undefined" &&
  typeof browser.sidebarAction !== "undefined";
const hasSessionStorage =
  typeof chrome !== "undefined" &&
  chrome.storage &&
  typeof chrome.storage.session !== "undefined";
const hasNotifications =
  typeof chrome !== "undefined" && typeof chrome.notifications !== "undefined";

chrome.storage.local.get(["apiUrl"], (result) => {
  if (result.apiUrl) {
    updateBaseUrls(result.apiUrl);
  }
});

function updateBaseUrls(url) {
  let cleanUrl = url.replace(/\/$/, "");

  if (cleanUrl.includes("ngrok") && cleanUrl.startsWith("http://")) {
    cleanUrl = cleanUrl.replace("http://", "https://");
  }

  API_BASE = cleanUrl;
  WEB_BASE = cleanUrl;
  API_BASE = cleanUrl;
  WEB_BASE = cleanUrl;
}

function showNotification(title, message) {
  if (hasNotifications) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/android-chrome-192x192.png",
      title: title,
      message: message,
    });
  }
}

async function openAnnotationUI(tabId) {
  if (hasSidePanel) {
    try {
      const tab = await chrome.tabs.get(tabId);
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: "sidepanel/sidepanel.html",
        enabled: true,
      });
      await chrome.sidePanel.open({ windowId: tab.windowId });
      return true;
    } catch (err) {
      console.error("Could not open Chrome side panel:", err);
    }
  }

  if (hasSidebarAction) {
    try {
      await browser.sidebarAction.open();
      return true;
    } catch (err) {
      console.warn("Could not open Firefox sidebar:", err);
    }
  }

  return false;
}

async function storePendingAnnotation(data) {
  if (hasSessionStorage) {
    await chrome.storage.session.set({ pendingAnnotation: data });
  } else {
    await chrome.storage.local.set({
      pendingAnnotation: data,
      pendingAnnotationExpiry: Date.now() + 60000,
    });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["apiUrl"]);
  if (!stored.apiUrl) {
    await chrome.storage.local.set({ apiUrl: "https://margin.at" });
    updateBaseUrls("https://margin.at");
  }

  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: "margin-annotate",
    title: 'Annotate "%s"',
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "margin-highlight",
    title: 'Highlight "%s"',
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "margin-bookmark",
    title: "Bookmark this page",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "margin-open-sidebar",
    title: "Open Margin Sidebar",
    contexts: ["page", "selection", "link"],
  });

  if (hasSidebarAction) {
    try {
      await browser.sidebarAction.close();
    } catch (e) {}
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  const stored = await chrome.storage.local.get(["apiUrl"]);
  const webUrl = stored.apiUrl || WEB_BASE;
  chrome.tabs.create({ url: webUrl });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "margin-open-sidebar") {
    if (hasSidePanel && chrome.sidePanel && chrome.sidePanel.open) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (err) {
        console.error("Failed to open side panel:", err);
      }
    } else if (hasSidebarAction) {
      try {
        await browser.sidebarAction.open();
      } catch (err) {
        console.error("Failed to open Firefox sidebar:", err);
      }
    }
    return;
  }

  if (info.menuItemId === "margin-bookmark") {
    const cookie = await chrome.cookies.get({
      url: API_BASE,
      name: "margin_session",
    });

    if (!cookie) {
      showNotification("Margin", "Please sign in to bookmark pages");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/bookmarks`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": cookie.value,
        },
        body: JSON.stringify({
          url: tab.url,
          title: tab.title,
        }),
      });

      if (res.ok) {
        showNotification("Margin", "Page bookmarked!");
      }
    } catch (err) {
      console.error("Bookmark error:", err);
    }
    return;
  }

  if (info.menuItemId === "margin-annotate") {
    let selector = null;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "GET_SELECTOR_FOR_ANNOTATE_INLINE",
        selectionText: info.selectionText,
      });
      selector = response?.selector;
    } catch (err) {}

    if (selector && (hasSidePanel || hasSidebarAction)) {
      await storePendingAnnotation({
        url: tab.url,
        title: tab.title,
        selector: selector,
      });
      const opened = await openAnnotationUI(tab.id);
      if (opened) return;
    }

    if (!selector && info.selectionText) {
      selector = {
        type: "TextQuoteSelector",
        exact: info.selectionText,
      };
    }

    if (WEB_BASE) {
      let composeUrl = `${WEB_BASE}/new?url=${encodeURIComponent(tab.url)}`;
      if (selector) {
        composeUrl += `&selector=${encodeURIComponent(JSON.stringify(selector))}`;
      }
      chrome.tabs.create({ url: composeUrl });
    }
    return;
  }

  if (info.menuItemId === "margin-highlight") {
    let selector = null;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "GET_SELECTOR_FOR_HIGHLIGHT",
        selectionText: info.selectionText,
      });
      if (response && response.success) return;
    } catch (err) {}

    if (info.selectionText) {
      selector = {
        type: "TextQuoteSelector",
        exact: info.selectionText,
      };

      try {
        const cookie = await chrome.cookies.get({
          url: API_BASE,
          name: "margin_session",
        });

        if (!cookie) {
          showNotification("Margin", "Please sign in to create highlights");
          return;
        }

        const res = await fetch(`${API_BASE}/api/highlights`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            url: tab.url,
            title: tab.title,
            selector: selector,
          }),
        });

        if (res.ok) {
          showNotification("Margin", "Text highlighted!");
        } else {
          const errText = await res.text();
          console.error("Highlight API error:", res.status, errText);
          showNotification("Margin", "Failed to create highlight");
        }
      } catch (err) {
        console.error("Highlight API error:", err);
        showNotification("Margin", "Error creating highlight");
      }
    } else {
      showNotification("Margin", "No text selected");
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true;
});

async function handleMessage(request, sender, sendResponse) {
  try {
    if (request.type === "UPDATE_SETTINGS") {
      const result = await chrome.storage.local.get(["apiUrl"]);
      if (result.apiUrl) updateBaseUrls(result.apiUrl);
      sendResponse({ success: true });
      return;
    }

    switch (request.type) {
      case "CHECK_SESSION": {
        if (!API_BASE) {
          sendResponse({ success: true, data: { authenticated: false } });
          return;
        }

        const cookie = await chrome.cookies.get({
          url: API_BASE,
          name: "margin_session",
        });

        if (!cookie) {
          sendResponse({ success: true, data: { authenticated: false } });
          return;
        }

        try {
          const response = await fetch(`${API_BASE}/auth/session`, {
            credentials: "include",
          });

          if (!response.ok) {
            sendResponse({ success: true, data: { authenticated: false } });
            return;
          }

          const sessionData = await response.json();
          sendResponse({
            success: true,
            data: {
              authenticated: true,
              did: sessionData.did,
              handle: sessionData.handle,
            },
          });
        } catch (err) {
          console.error("Session check error:", err);
          sendResponse({ success: true, data: { authenticated: false } });
        }
        break;
      }

      case "GET_ANNOTATIONS": {
        const stored = await chrome.storage.local.get(["apiUrl"]);
        const currentApiUrl = stored.apiUrl
          ? stored.apiUrl.replace(/\/$/, "")
          : API_BASE;

        const pageUrl = request.data.url;
        const res = await fetch(
          `${currentApiUrl}/api/targets?source=${encodeURIComponent(pageUrl)}`,
        );
        const data = await res.json();

        const items = [...(data.annotations || []), ...(data.highlights || [])];
        sendResponse({ success: true, data: items });

        if (sender.tab) {
          const count = items.length;
          chrome.action.setBadgeText({
            text: count > 0 ? count.toString() : "",
            tabId: sender.tab.id,
          });
          chrome.action.setBadgeBackgroundColor({
            color: "#6366f1",
            tabId: sender.tab.id,
          });
        }
        break;
      }

      case "CREATE_ANNOTATION": {
        const cookie = await chrome.cookies.get({
          url: API_BASE,
          name: "margin_session",
        });

        if (!cookie) {
          sendResponse({ success: false, error: "Not authenticated" });
          return;
        }

        const payload = {
          url: request.data.url,
          text: request.data.text,
          title: request.data.title,
        };

        if (request.data.selector) {
          payload.selector = request.data.selector;
        }

        const createRes = await fetch(`${API_BASE}/api/annotations`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Token": cookie.value,
          },
          body: JSON.stringify(payload),
        });

        if (!createRes.ok) {
          const errorText = await createRes.text();
          throw new Error(
            `Failed to create annotation: ${createRes.status} ${errorText}`,
          );
        }

        const createData = await createRes.json();
        sendResponse({ success: true, data: createData });
        break;
      }

      case "OPEN_LOGIN":
        if (!WEB_BASE) {
          chrome.runtime.openOptionsPage();
          return;
        }
        chrome.tabs.create({ url: `${WEB_BASE}/login` });
        break;

      case "OPEN_WEB":
        if (!WEB_BASE) {
          chrome.runtime.openOptionsPage();
          return;
        }
        chrome.tabs.create({ url: `${WEB_BASE}` });
        break;

      case "OPEN_COMPOSE": {
        if (!WEB_BASE) {
          chrome.runtime.openOptionsPage();
          return;
        }
        const { url, selector } = request.data;
        let composeUrl = `${WEB_BASE}/new?url=${encodeURIComponent(url)}`;
        if (selector) {
          composeUrl += `&selector=${encodeURIComponent(JSON.stringify(selector))}`;
        }
        chrome.tabs.create({ url: composeUrl });
        break;
      }

      case "OPEN_APP_URL": {
        if (!WEB_BASE) {
          chrome.runtime.openOptionsPage();
          return;
        }
        const path = request.data.path;
        const safePath = path.startsWith("/") ? path : `/${path}`;
        chrome.tabs.create({ url: `${WEB_BASE}${safePath}` });
        break;
      }

      case "OPEN_SIDE_PANEL":
        if (sender.tab && sender.tab.windowId) {
          chrome.sidePanel
            .open({ windowId: sender.tab.windowId })
            .catch((err) => console.error("Failed to open side panel", err));
        }
        break;

      case "CREATE_BOOKMARK": {
        if (!API_BASE) {
          sendResponse({ success: false, error: "API URL not configured" });
          return;
        }

        const cookie = await chrome.cookies.get({
          url: API_BASE,
          name: "margin_session",
        });

        if (!cookie) {
          sendResponse({ success: false, error: "Not authenticated" });
          return;
        }

        const bookmarkRes = await fetch(`${API_BASE}/api/bookmarks`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Token": cookie.value,
          },
          body: JSON.stringify({
            url: request.data.url,
            title: request.data.title,
          }),
        });

        if (!bookmarkRes.ok) {
          const errorText = await bookmarkRes.text();
          throw new Error(
            `Failed to create bookmark: ${bookmarkRes.status} ${errorText}`,
          );
        }

        const bookmarkData = await bookmarkRes.json();
        sendResponse({ success: true, data: bookmarkData });
        break;
      }

      case "CREATE_HIGHLIGHT": {
        if (!API_BASE) {
          sendResponse({ success: false, error: "API URL not configured" });
          return;
        }

        const cookie = await chrome.cookies.get({
          url: API_BASE,
          name: "margin_session",
        });

        if (!cookie) {
          sendResponse({ success: false, error: "Not authenticated" });
          return;
        }

        const highlightRes = await fetch(`${API_BASE}/api/highlights`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Token": cookie.value,
          },
          body: JSON.stringify({
            url: request.data.url,
            title: request.data.title,
            selector: request.data.selector,
            color: request.data.color || "yellow",
          }),
        });

        if (!highlightRes.ok) {
          const errorText = await highlightRes.text();
          throw new Error(
            `Failed to create highlight: ${highlightRes.status} ${errorText}`,
          );
        }

        const highlightData = await highlightRes.json();
        sendResponse({ success: true, data: highlightData });
        break;
      }

      case "GET_USER_BOOKMARKS": {
        if (!API_BASE) {
          sendResponse({ success: false, error: "API URL not configured" });
          return;
        }

        const did = request.data.did;
        const res = await fetch(
          `${API_BASE}/api/users/${encodeURIComponent(did)}/bookmarks`,
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch bookmarks: ${res.status}`);
        }

        const data = await res.json();
        sendResponse({ success: true, data: data.items || [] });
        break;
      }

      case "GET_USER_HIGHLIGHTS": {
        if (!API_BASE) {
          sendResponse({ success: false, error: "API URL not configured" });
          return;
        }

        const did = request.data.did;
        const res = await fetch(
          `${API_BASE}/api/users/${encodeURIComponent(did)}/highlights`,
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch highlights: ${res.status}`);
        }

        const data = await res.json();
        sendResponse({ success: true, data: data.items || [] });
        break;
      }

      case "GET_USER_COLLECTIONS": {
        if (!API_BASE) {
          sendResponse({ success: false, error: "API URL not configured" });
          return;
        }

        const did = request.data.did;
        const res = await fetch(
          `${API_BASE}/api/collections?author=${encodeURIComponent(did)}`,
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch collections: ${res.status}`);
        }

        const data = await res.json();
        sendResponse({ success: true, data: data.items || [] });
        break;
      }

      case "GET_CONTAINING_COLLECTIONS": {
        if (!API_BASE) {
          sendResponse({ success: false, error: "API URL not configured" });
          return;
        }

        const uri = request.data.uri;
        const res = await fetch(
          `${API_BASE}/api/collections/containing?uri=${encodeURIComponent(uri)}`,
        );

        if (!res.ok) {
          throw new Error(
            `Failed to fetch containing collections: ${res.status}`,
          );
        }

        const data = await res.json();
        sendResponse({ success: true, data: data || [] });
        break;
      }

      case "ADD_TO_COLLECTION": {
        if (!API_BASE) {
          sendResponse({ success: false, error: "API URL not configured" });
          return;
        }

        const cookie = await chrome.cookies.get({
          url: API_BASE,
          name: "margin_session",
        });

        if (!cookie) {
          sendResponse({ success: false, error: "Not authenticated" });
          return;
        }

        const { collectionUri, annotationUri } = request.data;
        const res = await fetch(
          `${API_BASE}/api/collections/${encodeURIComponent(collectionUri)}/items`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-Session-Token": cookie.value,
            },
            body: JSON.stringify({
              annotationUri: annotationUri,
            }),
          },
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(
            `Failed to add to collection: ${res.status} ${errText}`,
          );
        }

        const data = await res.json();
        sendResponse({ success: true, data });
        break;
      }
    }
  } catch (error) {
    console.error("Service worker error:", error);
    sendResponse({ success: false, error: error.message });
  }
}
