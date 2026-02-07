import { atom } from "nanostores";
import type {
  UserProfile,
  FeedResponse,
  AnnotationItem,
  Collection,
} from "../types";
export type { Collection } from "../types";

export const sessionAtom = atom<UserProfile | null>(null);

export async function checkSession(): Promise<UserProfile | null> {
  try {
    const res = await fetch("/auth/session");
    if (!res.ok) {
      sessionAtom.set(null);
      return null;
    }
    const data = await res.json();

    if (data.authenticated || data.did) {
      const baseProfile: UserProfile = {
        did: data.did,
        handle: data.handle,
        displayName: data.displayName,
        avatar: data.avatar,
        description: data.description,
        website: data.website,
        links: data.links,
        followersCount: data.followersCount,
        followsCount: data.followsCount,
        postsCount: data.postsCount,
      };

      try {
        const bskyRes = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(data.did)}`,
        );
        if (bskyRes.ok) {
          const bskyData = await bskyRes.json();
          if (bskyData.avatar) baseProfile.avatar = bskyData.avatar;
          if (bskyData.displayName)
            baseProfile.displayName = bskyData.displayName;
        }
      } catch (e) {
        console.warn("Failed to fetch Bsky profile for session", e);
      }

      try {
        const marginProfile = await getProfile(data.did);
        if (marginProfile) {
          if (marginProfile.description)
            baseProfile.description = marginProfile.description;
          if (marginProfile.followersCount)
            baseProfile.followersCount = marginProfile.followersCount;
          if (marginProfile.followsCount)
            baseProfile.followsCount = marginProfile.followsCount;
          if (marginProfile.postsCount)
            baseProfile.postsCount = marginProfile.postsCount;
          if (marginProfile.website)
            baseProfile.website = marginProfile.website;
          if (marginProfile.links) baseProfile.links = marginProfile.links;
        }
      } catch (e) {}

      sessionAtom.set(baseProfile);
      return baseProfile;
    }

    sessionAtom.set(null);
    return null;
  } catch (e) {
    sessionAtom.set(null);
    return null;
  }
}

async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const apiPath =
    path.startsWith("/api") || path.startsWith("/auth") ? path : `/api${path}`;

  const response = await fetch(apiPath, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    sessionAtom.set(null);
    window.location.href = "/login";
  }

  return response;
}

interface GetFeedParams {
  source?: string;
  type?: string;
  limit?: number;
  offset?: number;
  motivation?: string;
  tag?: string;
  creator?: string;
}

function normalizeItem(raw: any): AnnotationItem {
  if (raw.type === "CollectionItem" || raw.collectionUri) {
    const inner = raw.annotation || raw.highlight || raw.bookmark || {};
    const normalizedInner = normalizeItem(inner);

    return {
      ...normalizedInner,
      uri: normalizedInner.uri || raw.uri,
      author: normalizedInner.author || raw.author,
      collection: raw.collection
        ? {
            uri: raw.collection.uri,
            name: raw.collection.name,
            icon: raw.collection.icon,
          }
        : undefined,
      addedBy: raw.creator || raw.author,
      createdAt: raw.created || raw.createdAt,
      collectionItemUri: raw.uri,
    };
  }

  let target = raw.target;
  if (!target || !target.source) {
    const url =
      raw.url ||
      raw.targetUrl ||
      (typeof raw.target === "string" ? raw.target : raw.target?.source);
    if (url) {
      target = {
        source: url,
        title: raw.title || raw.target?.title,
        selector: raw.selector || raw.target?.selector,
      };
    }
  }

  return {
    ...raw,
    uri: raw.id || raw.uri,
    author: raw.creator || raw.author,
    createdAt: raw.created || raw.createdAt,
    target: target || raw.target,
    viewer: raw.viewer || { like: raw.viewerHasLiked ? "true" : undefined },
  };
}

export async function getFeed({
  source,
  type = "all",
  limit = 50,
  offset = 0,
  motivation,
  tag,
  creator,
}: GetFeedParams): Promise<FeedResponse> {
  const params = new URLSearchParams();
  if (source) params.append("source", source);
  if (type) params.append("type", type);
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());
  if (motivation) params.append("motivation", motivation);
  if (tag) params.append("tag", tag);
  if (creator) params.append("creator", creator);

  const endpoint = source ? "/api/targets" : "/api/annotations/feed";

  try {
    const res = await apiRequest(`${endpoint}?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch feed");
    const data = await res.json();
    return {
      cursor: data.cursor,
      items: (data.items || []).map(normalizeItem),
    };
  } catch (e) {
    console.error(e);
    return { items: [] };
  }
}

interface CreateAnnotationParams {
  url: string;
  text?: string;
  title?: string;
  selector?: { exact: string; prefix?: string; suffix?: string };
  tags?: string[];
}

export async function createAnnotation({
  url,
  text,
  title,
  selector,
  tags,
}: CreateAnnotationParams) {
  try {
    const res = await apiRequest("/api/annotations", {
      method: "POST",
      body: JSON.stringify({ url, text, title, selector, tags }),
    });
    if (!res.ok) throw new Error(await res.text());
    const raw = await res.json();
    return normalizeItem(raw);
  } catch (e: any) {
    console.error(e);
    return { error: e.message };
  }
}

interface CreateHighlightParams {
  url: string;
  selector: { exact: string; prefix?: string; suffix?: string };
  color?: string;
  tags?: string[];
  title?: string;
}

export async function createHighlight({
  url,
  selector,
  color,
  tags,
  title,
}: CreateHighlightParams) {
  try {
    const res = await apiRequest("/api/highlights", {
      method: "POST",
      body: JSON.stringify({ url, selector, color, tags, title }),
    });
    if (!res.ok) throw new Error(await res.text());
    const raw = await res.json();
    return normalizeItem(raw);
  } catch (e: any) {
    console.error(e);
    return { error: e.message };
  }
}

export async function createBookmark({
  url,
  title,
  description,
}: {
  url: string;
  title?: string;
  description?: string;
}) {
  try {
    const res = await apiRequest("/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ url, title, description }),
    });
    if (!res.ok) throw new Error(await res.text());
    const raw = await res.json();
    return normalizeItem(raw);
  } catch (e: any) {
    console.error(e);
    return { error: e.message };
  }
}

export async function uploadAvatar(file: File): Promise<{ blob: any }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${(await checkSession())?.did}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload avatar");
  return res.json();
}

export async function updateProfile(updates: {
  displayName?: string;
  description?: string;
  avatar?: any;
  website?: string;
  links?: string[];
}): Promise<boolean> {
  try {
    const res = await apiRequest("/api/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function likeItem(uri: string, cid: string): Promise<boolean> {
  try {
    const res = await apiRequest("/api/annotations/like", {
      method: "POST",
      body: JSON.stringify({ subjectUri: uri, subjectCid: cid }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function unlikeItem(uri: string): Promise<boolean> {
  try {
    const res = await apiRequest(
      `/api/annotations/like?uri=${encodeURIComponent(uri)}`,
      {
        method: "DELETE",
      },
    );
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function deleteItem(
  uri: string,
  type: string = "annotation",
): Promise<boolean> {
  const rkey = (uri || "").split("/").pop();
  let endpoint = "/api/annotations";
  if (uri.includes("highlight")) endpoint = "/api/highlights";
  if (uri.includes("bookmark")) endpoint = "/api/bookmarks";

  try {
    const res = await apiRequest(`${endpoint}?rkey=${rkey}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function updateAnnotation(
  uri: string,
  text: string,
  tags?: string[],
): Promise<boolean> {
  try {
    const res = await apiRequest(
      `/api/annotations?uri=${encodeURIComponent(uri)}`,
      {
        method: "PUT",
        body: JSON.stringify({ text, tags }),
      },
    );
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function updateHighlight(
  uri: string,
  color: string,
  tags?: string[],
): Promise<boolean> {
  try {
    const res = await apiRequest(
      `/api/highlights?uri=${encodeURIComponent(uri)}`,
      {
        method: "PUT",
        body: JSON.stringify({ color, tags }),
      },
    );
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function updateBookmark(
  uri: string,
  title?: string,
  description?: string,
  tags?: string[],
): Promise<boolean> {
  try {
    const res = await apiRequest(
      `/api/bookmarks?uri=${encodeURIComponent(uri)}`,
      {
        method: "PUT",
        body: JSON.stringify({ title, description, tags }),
      },
    );
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function getCollectionsContaining(
  annotationUri: string,
): Promise<string[]> {
  try {
    const res = await apiRequest(
      `/api/collections/containing?uri=${encodeURIComponent(annotationUri)}`,
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export async function getEditHistory(uri: string): Promise<any[]> {
  try {
    const res = await apiRequest(
      `/api/annotations/history?uri=${encodeURIComponent(uri)}`,
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export async function getProfile(did: string): Promise<UserProfile | null> {
  try {
    const res = await apiRequest(`/api/profile/${did}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export interface ActorSearchItem {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export function getAvatarUrl(
  did?: string,
  avatar?: string,
): string | undefined {
  if (!avatar && !did) return undefined;
  if (avatar && !avatar.includes("cdn.bsky.app")) return avatar;
  if (!did) return avatar;

  return `/api/avatar/${encodeURIComponent(did)}`;
}

export async function searchActors(
  query: string,
): Promise<{ actors: ActorSearchItem[] }> {
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(query)}&limit=5`,
    );
    if (!res.ok) throw new Error("Search failed");
    return await res.json();
  } catch (e) {
    return { actors: [] };
  }
}

export async function resolveHandle(handle: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    );
    if (!res.ok) throw new Error("Failed to resolve handle");
    const data = await res.json();
    return data.did;
  } catch (e) {
    return null;
  }
}

export async function startLogin(
  handle: string,
): Promise<{ authorizationUrl?: string }> {
  const res = await apiRequest("/auth/start", {
    method: "POST",
    body: JSON.stringify({ handle }),
  });
  if (!res.ok) throw new Error("Failed to start login");
  return await res.json();
}

export async function startSignup(
  pdsUrl: string,
): Promise<{ authorizationUrl?: string }> {
  const res = await apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ pds_url: pdsUrl }),
  });
  if (!res.ok) throw new Error("Failed to start signup");
  return await res.json();
}

export async function getNotifications(limit = 50, offset = 0): Promise<any[]> {
  try {
    const res = await apiRequest(
      `/api/notifications?limit=${limit}&offset=${offset}`,
    );
    if (!res.ok) throw new Error("Failed to fetch notifications");
    const data = await res.json();
    return (data.items || []).map((n: any) => ({
      ...n,
      subject: n.subject ? normalizeItem(n.subject) : undefined,
    }));
  } catch (e) {
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const res = await apiRequest("/api/notifications/count");
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count || 0;
  } catch (e) {
    return 0;
  }
}

export async function markNotificationsRead(): Promise<boolean> {
  try {
    const res = await apiRequest("/api/notifications/read", { method: "POST" });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export interface APIKey {
  id: string;
  alias: string;
  key?: string;
  createdAt: string;
}

export async function getAPIKeys(): Promise<APIKey[]> {
  try {
    const res = await apiRequest("/api/keys");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.keys || [];
  } catch (e) {
    return [];
  }
}

export async function createAPIKey(alias: string): Promise<APIKey | null> {
  try {
    const res = await apiRequest("/api/keys", {
      method: "POST",
      body: JSON.stringify({ alias }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function deleteAPIKey(id: string): Promise<boolean> {
  try {
    const res = await apiRequest(`/api/keys/${id}`, { method: "DELETE" });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export interface Tag {
  tag: string;
  count: number;
}

export async function getTrendingTags(limit = 10): Promise<Tag[]> {
  try {
    const res = await apiRequest(`/api/tags/trending?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.tags || [];
  } catch (e) {
    return [];
  }
}

export async function getCollections(creator?: string): Promise<Collection[]> {
  try {
    const query = creator ? `?creator=${encodeURIComponent(creator)}` : "";
    const res = await apiRequest(`/api/collections${query}`);
    if (!res.ok) throw new Error("Failed to fetch collections");
    const data = await res.json();
    return Array.isArray(data) ? data : data.items || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function getCollection(uri: string): Promise<Collection | null> {
  try {
    const res = await apiRequest(
      `/api/collection?uri=${encodeURIComponent(uri)}`,
    );
    if (!res.ok) throw new Error("Failed to fetch collection");
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function createCollection(
  name: string,
  description?: string,
  icon?: string,
): Promise<Collection | null> {
  try {
    const res = await apiRequest("/api/collections", {
      method: "POST",
      body: JSON.stringify({ name, description, icon }),
    });
    if (!res.ok) throw new Error("Failed to create collection");
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function deleteCollection(id: string): Promise<boolean> {
  try {
    const res = await apiRequest(
      `/api/collections?uri=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function getCollectionItems(
  uri: string,
): Promise<AnnotationItem[]> {
  try {
    const res = await apiRequest(
      `/api/collections/${encodeURIComponent(uri)}/items`,
    );
    if (!res.ok) throw new Error("Failed to fetch collection items");
    const data = await res.json();
    return (data || []).map(normalizeItem);
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function updateCollection(
  uri: string,
  name: string,
  description?: string,
  icon?: string,
): Promise<Collection | null> {
  try {
    const res = await apiRequest(
      `/api/collections?uri=${encodeURIComponent(uri)}`,
      {
        method: "PUT",
        body: JSON.stringify({ name, description, icon }),
      },
    );
    if (!res.ok) throw new Error("Failed to update collection");
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function addCollectionItem(
  collectionUri: string,
  annotationUri: string,
  position: number = 0,
): Promise<boolean> {
  try {
    const res = await apiRequest(
      `/api/collections/${encodeURIComponent(collectionUri)}/items`,
      {
        method: "POST",
        body: JSON.stringify({ annotationUri, position }),
      },
    );
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function removeCollectionItem(itemUri: string): Promise<boolean> {
  try {
    const res = await apiRequest(
      `/api/collections/items?uri=${encodeURIComponent(itemUri)}`,
      {
        method: "DELETE",
      },
    );
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function createReply(
  parentUri: string,
  parentCid: string,
  rootUri: string,
  rootCid: string,
  text: string,
): Promise<string | null> {
  try {
    const res = await apiRequest("/api/annotations/reply", {
      method: "POST",
      body: JSON.stringify({ parentUri, parentCid, rootUri, rootCid, text }),
    });
    if (!res.ok) throw new Error("Failed to create reply");
    const data = await res.json();
    return data.uri;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function deleteReply(uri: string): Promise<boolean> {
  try {
    const res = await apiRequest(
      `/api/annotations/reply?uri=${encodeURIComponent(uri)}`,
      {
        method: "DELETE",
      },
    );
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function getAnnotation(
  uri: string,
): Promise<AnnotationItem | null> {
  try {
    const res = await apiRequest(
      `/api/annotation?uri=${encodeURIComponent(uri)}`,
    );
    if (!res.ok) return null;
    return normalizeItem(await res.json());
  } catch (e) {
    return null;
  }
}

export async function getReplies(
  uri: string,
): Promise<{ items: AnnotationItem[] }> {
  try {
    const res = await apiRequest(`/api/replies?uri=${encodeURIComponent(uri)}`);
    if (!res.ok) return { items: [] };
    const data = await res.json();
    return { items: (data.items || []).map(normalizeItem) };
  } catch (e) {
    return { items: [] };
  }
}

export async function getByTarget(
  url: string,
  limit = 50,
  offset = 0,
): Promise<{ annotations: AnnotationItem[]; highlights: AnnotationItem[] }> {
  try {
    const res = await apiRequest(
      `/api/targets?source=${encodeURIComponent(url)}&limit=${limit}&offset=${offset}`,
    );
    if (!res.ok) return { annotations: [], highlights: [] };
    const data = await res.json();
    return {
      annotations: (data.annotations || []).map(normalizeItem),
      highlights: (data.highlights || []).map(normalizeItem),
    };
  } catch (e) {
    return { annotations: [], highlights: [] };
  }
}

export async function getUserTargetItems(
  did: string,
  url: string,
  limit = 50,
  offset = 0,
): Promise<{ annotations: AnnotationItem[]; highlights: AnnotationItem[] }> {
  try {
    const res = await apiRequest(
      `/api/users/${encodeURIComponent(did)}/targets?source=${encodeURIComponent(url)}&limit=${limit}&offset=${offset}`,
    );
    if (!res.ok) return { annotations: [], highlights: [] };
    const data = await res.json();
    return {
      annotations: (data.annotations || []).map(normalizeItem),
      highlights: (data.highlights || []).map(normalizeItem),
    };
  } catch (e) {
    return { annotations: [], highlights: [] };
  }
}
export async function getPreferences(): Promise<{
  externalLinkSkippedHostnames?: string[];
}> {
  try {
    const res = await apiRequest("/api/preferences");
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    console.error(e);
    return {};
  }
}

export async function updatePreferences(prefs: {
  externalLinkSkippedHostnames?: string[];
}): Promise<boolean> {
  try {
    const res = await apiRequest("/api/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}
