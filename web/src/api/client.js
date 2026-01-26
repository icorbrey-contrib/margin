const API_BASE = "/api";
const AUTH_BASE = "/auth";

async function request(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getURLMetadata(url) {
  return request(`${API_BASE}/url-metadata?url=${encodeURIComponent(url)}`);
}

export async function getAnnotationFeed(
  limit = 50,
  offset = 0,
  tag = "",
  creator = "",
  feedType = "",
  motivation = "",
) {
  let url = `${API_BASE}/annotations/feed?limit=${limit}&offset=${offset}`;
  if (tag) url += `&tag=${encodeURIComponent(tag)}`;
  if (creator) url += `&creator=${encodeURIComponent(creator)}`;
  if (feedType) url += `&type=${encodeURIComponent(feedType)}`;
  if (motivation) url += `&motivation=${encodeURIComponent(motivation)}`;
  return request(url);
}

export async function getAnnotations({
  source,
  motivation,
  limit = 50,
  offset = 0,
} = {}) {
  let url = `${API_BASE}/annotations?limit=${limit}&offset=${offset}`;
  if (source) url += `&source=${encodeURIComponent(source)}`;
  if (motivation) url += `&motivation=${motivation}`;
  return request(url);
}

export async function getByTarget(source, limit = 50, offset = 0) {
  return request(
    `${API_BASE}/targets?source=${encodeURIComponent(source)}&limit=${limit}&offset=${offset}`,
  );
}

export async function getAnnotation(uri) {
  return request(`${API_BASE}/annotation?uri=${encodeURIComponent(uri)}`);
}

export async function getProfile(did) {
  return request(`${API_BASE}/profile/${encodeURIComponent(did)}`);
}

export async function getUserAnnotations(did, limit = 50, offset = 0) {
  return request(
    `${API_BASE}/users/${encodeURIComponent(did)}/annotations?limit=${limit}&offset=${offset}`,
  );
}

export async function getUserHighlights(did, limit = 50, offset = 0) {
  return request(
    `${API_BASE}/users/${encodeURIComponent(did)}/highlights?limit=${limit}&offset=${offset}`,
  );
}

export async function getUserBookmarks(did, limit = 50, offset = 0) {
  return request(
    `${API_BASE}/users/${encodeURIComponent(did)}/bookmarks?limit=${limit}&offset=${offset}`,
  );
}

export async function getUserTargetItems(did, url, limit = 50, offset = 0) {
  return request(
    `${API_BASE}/users/${encodeURIComponent(did)}/targets?source=${encodeURIComponent(url)}&limit=${limit}&offset=${offset}`,
  );
}

export async function getHighlights(creatorDid, limit = 50, offset = 0) {
  return request(
    `${API_BASE}/highlights?creator=${encodeURIComponent(creatorDid)}&limit=${limit}&offset=${offset}`,
  );
}

export async function getBookmarks(creatorDid, limit = 50, offset = 0) {
  return request(
    `${API_BASE}/bookmarks?creator=${encodeURIComponent(creatorDid)}&limit=${limit}&offset=${offset}`,
  );
}

export async function getReplies(annotationUri) {
  return request(
    `${API_BASE}/replies?uri=${encodeURIComponent(annotationUri)}`,
  );
}

export async function updateAnnotation(uri, text, tags) {
  return request(`${API_BASE}/annotations?uri=${encodeURIComponent(uri)}`, {
    method: "PUT",
    body: JSON.stringify({ text, tags }),
  });
}

export async function updateHighlight(uri, color, tags) {
  return request(`${API_BASE}/highlights?uri=${encodeURIComponent(uri)}`, {
    method: "PUT",
    body: JSON.stringify({ color, tags }),
  });
}

export async function createBookmark(url, title, description) {
  return request(`${API_BASE}/bookmarks`, {
    method: "POST",
    body: JSON.stringify({ url, title, description }),
  });
}

export async function updateBookmark(uri, title, description, tags) {
  return request(`${API_BASE}/bookmarks?uri=${encodeURIComponent(uri)}`, {
    method: "PUT",
    body: JSON.stringify({ title, description, tags }),
  });
}

export async function getCollections(did) {
  let url = `${API_BASE}/collections`;
  if (did) url += `?author=${encodeURIComponent(did)}`;
  return request(url);
}

export async function getCollection(uri) {
  return request(`${API_BASE}/collection?uri=${encodeURIComponent(uri)}`);
}

export async function getCollectionsContaining(annotationUri) {
  return request(
    `${API_BASE}/collections/containing?uri=${encodeURIComponent(annotationUri)}`,
  );
}

export async function getEditHistory(uri) {
  return request(
    `${API_BASE}/annotations/history?uri=${encodeURIComponent(uri)}`,
  );
}

export async function getNotifications(limit = 50, offset = 0) {
  return request(`${API_BASE}/notifications?limit=${limit}&offset=${offset}`);
}

export async function getUnreadNotificationCount() {
  return request(`${API_BASE}/notifications/count`);
}

export async function markNotificationsRead() {
  return request(`${API_BASE}/notifications/read`, { method: "POST" });
}

export async function updateCollection(uri, name, description, icon) {
  return request(`${API_BASE}/collections?uri=${encodeURIComponent(uri)}`, {
    method: "PUT",
    body: JSON.stringify({ name, description, icon }),
  });
}

export async function updateProfile({ bio, website, links }) {
  return request(`${API_BASE}/profile`, {
    method: "PUT",
    body: JSON.stringify({ bio, website, links }),
  });
}

export async function createCollection(name, description, icon) {
  return request(`${API_BASE}/collections`, {
    method: "POST",
    body: JSON.stringify({ name, description, icon }),
  });
}

export async function deleteCollection(uri) {
  return request(`${API_BASE}/collections?uri=${encodeURIComponent(uri)}`, {
    method: "DELETE",
  });
}

export async function getCollectionItems(collectionUri) {
  return request(
    `${API_BASE}/collections/${encodeURIComponent(collectionUri)}/items`,
  );
}

export async function addItemToCollection(
  collectionUri,
  annotationUri,
  position = 0,
) {
  return request(
    `${API_BASE}/collections/${encodeURIComponent(collectionUri)}/items`,
    {
      method: "POST",
      body: JSON.stringify({ annotationUri, position }),
    },
  );
}

export async function removeItemFromCollection(itemUri) {
  return request(
    `${API_BASE}/collections/items?uri=${encodeURIComponent(itemUri)}`,
    {
      method: "DELETE",
    },
  );
}

export async function getLikeCount(annotationUri) {
  return request(`${API_BASE}/likes?uri=${encodeURIComponent(annotationUri)}`);
}

export async function deleteHighlight(rkey) {
  return request(`${API_BASE}/highlights?rkey=${encodeURIComponent(rkey)}`, {
    method: "DELETE",
  });
}

export async function deleteBookmark(rkey) {
  return request(`${API_BASE}/bookmarks?rkey=${encodeURIComponent(rkey)}`, {
    method: "DELETE",
  });
}

export async function createHighlight({ url, title, selector, color, tags }) {
  return request(`${API_BASE}/highlights`, {
    method: "POST",
    body: JSON.stringify({ url, title, selector, color, tags }),
  });
}

export async function createAnnotation({
  url,
  text,
  quote,
  title,
  selector,
  tags,
}) {
  return request(`${API_BASE}/annotations`, {
    method: "POST",
    body: JSON.stringify({ url, text, quote, title, selector, tags }),
  });
}

export async function deleteAnnotation(rkey, type = "annotation") {
  return request(
    `${API_BASE}/annotations?rkey=${encodeURIComponent(rkey)}&type=${encodeURIComponent(type)}`,
    {
      method: "DELETE",
    },
  );
}

export async function likeAnnotation(subjectUri, subjectCid) {
  return request(`${API_BASE}/annotations/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subjectUri,
      subjectCid,
    }),
  });
}

export async function unlikeAnnotation(subjectUri) {
  return request(
    `${API_BASE}/annotations/like?uri=${encodeURIComponent(subjectUri)}`,
    {
      method: "DELETE",
    },
  );
}

export async function createReply({
  parentUri,
  parentCid,
  rootUri,
  rootCid,
  text,
}) {
  return request(`${API_BASE}/annotations/reply`, {
    method: "POST",
    body: JSON.stringify({ parentUri, parentCid, rootUri, rootCid, text }),
  });
}

export async function deleteReply(uri) {
  return request(
    `${API_BASE}/annotations/reply?uri=${encodeURIComponent(uri)}`,
    {
      method: "DELETE",
    },
  );
}

export async function getSession() {
  return request(`${AUTH_BASE}/session`);
}

export async function logout() {
  return request(`${AUTH_BASE}/logout`, { method: "POST" });
}

export function normalizeAnnotation(item) {
  if (!item) return {};

  if (item.type === "Annotation") {
    return {
      type: item.type,
      uri: item.uri || item.id,
      author: item.author || item.creator,
      url: item.url || item.target?.source,
      title: item.title || item.target?.title,
      text: item.text || item.body?.value,
      selector: item.selector || item.target?.selector,
      motivation: item.motivation,
      tags: item.tags || [],
      createdAt: item.createdAt || item.created,
      cid: item.cid || item.CID,
      likeCount: item.likeCount || 0,
      replyCount: item.replyCount || 0,
      viewerHasLiked: item.viewerHasLiked || false,
    };
  }

  if (item.type === "Bookmark") {
    return {
      type: item.type,
      uri: item.uri || item.id,
      author: item.author || item.creator,
      url: item.url || item.source,
      title: item.title,
      description: item.description,
      tags: item.tags || [],
      createdAt: item.createdAt || item.created,
      cid: item.cid || item.CID,
      likeCount: item.likeCount || 0,
      replyCount: item.replyCount || 0,
      viewerHasLiked: item.viewerHasLiked || false,
    };
  }

  if (item.type === "Highlight") {
    return {
      type: item.type,
      uri: item.uri || item.id,
      author: item.author || item.creator,
      url: item.url || item.target?.source,
      title: item.title || item.target?.title,
      selector: item.selector || item.target?.selector,
      color: item.color,
      tags: item.tags || [],
      createdAt: item.createdAt || item.created,
      cid: item.cid || item.CID,
      likeCount: item.likeCount || 0,
      replyCount: item.replyCount || 0,
      viewerHasLiked: item.viewerHasLiked || false,
    };
  }

  return {
    uri: item.uri || item.id,
    author: item.author || item.creator,
    url: item.url || item.source || item.target?.source,
    title: item.title || item.target?.title,
    text: item.text || item.body?.value,
    description: item.description,
    selector: item.selector || item.target?.selector,
    color: item.color,
    tags: item.tags || [],
    createdAt: item.createdAt || item.created,
    cid: item.cid || item.CID,
    likeCount: item.likeCount || 0,
    replyCount: item.replyCount || 0,
    viewerHasLiked: item.viewerHasLiked || false,
  };
}

export function normalizeHighlight(highlight) {
  return {
    uri: highlight.uri || highlight.id,
    author: highlight.author || highlight.creator,
    url: highlight.url || highlight.target?.source,
    title: highlight.title || highlight.target?.title,
    selector: highlight.selector || highlight.target?.selector,
    color: highlight.color,
    tags: highlight.tags || [],
    createdAt: highlight.createdAt || highlight.created,
    likeCount: highlight.likeCount || 0,
    replyCount: highlight.replyCount || 0,
    viewerHasLiked: highlight.viewerHasLiked || false,
  };
}

export function normalizeBookmark(bookmark) {
  return {
    uri: bookmark.uri || bookmark.id,
    author: bookmark.author || bookmark.creator,
    url: bookmark.url || bookmark.source,
    title: bookmark.title,
    description: bookmark.description,
    tags: bookmark.tags || [],
    createdAt: bookmark.createdAt || bookmark.created,
    likeCount: bookmark.likeCount || 0,
    replyCount: bookmark.replyCount || 0,
    viewerHasLiked: bookmark.viewerHasLiked || false,
  };
}

export async function searchActors(query) {
  const res = await fetch(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(query)}&limit=5`,
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function resolveHandle(handle) {
  const res = await fetch(
    `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
  );
  if (!res.ok) throw new Error("Failed to resolve handle");
  const data = await res.json();
  return data.did;
}

export async function startLogin(handle, inviteCode) {
  return request(`${AUTH_BASE}/start`, {
    method: "POST",
    body: JSON.stringify({ handle, invite_code: inviteCode }),
  });
}
export async function getTrendingTags(limit = 10) {
  return request(`${API_BASE}/tags/trending?limit=${limit}`);
}

export async function getAPIKeys() {
  return request(`${API_BASE}/keys`);
}

export async function createAPIKey(name) {
  return request(`${API_BASE}/keys`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteAPIKey(id) {
  return request(`${API_BASE}/keys/${id}`, { method: "DELETE" });
}

export async function describeServer(service) {
  const res = await fetch(`${service}/xrpc/com.atproto.server.describeServer`);
  if (!res.ok) throw new Error("Failed to describe server");
  return res.json();
}

export async function createAccount(
  service,
  { handle, email, password, inviteCode },
) {
  const res = await fetch(`${service}/xrpc/com.atproto.server.createAccount`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      handle,
      email,
      password,
      inviteCode,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Failed to create account");
  }
  return data;
}
