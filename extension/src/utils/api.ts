import type { MarginSession, TextSelector } from './types';
import { apiUrlItem } from './storage';

async function getApiUrl(): Promise<string> {
  return await apiUrlItem.getValue();
}

async function getSessionCookie(): Promise<string | null> {
  try {
    const apiUrl = await getApiUrl();
    const cookie = await browser.cookies.get({
      url: apiUrl,
      name: 'margin_session',
    });
    return cookie?.value || null;
  } catch (error) {
    console.error('Get cookie error:', error);
    return null;
  }
}

export async function checkSession(): Promise<MarginSession> {
  try {
    const apiUrl = await getApiUrl();
    const cookie = await getSessionCookie();

    if (!cookie) {
      return { authenticated: false };
    }

    const res = await fetch(`${apiUrl}/auth/session`, {
      headers: {
        'X-Session-Token': cookie,
      },
    });

    if (!res.ok) {
      return { authenticated: false };
    }

    const sessionData = await res.json();

    if (!sessionData.did || !sessionData.handle) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      did: sessionData.did,
      handle: sessionData.handle,
      accessJwt: sessionData.accessJwt,
      refreshJwt: sessionData.refreshJwt,
    };
  } catch (error) {
    console.error('Session check error:', error);
    return { authenticated: false };
  }
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const apiUrl = await getApiUrl();
  const cookie = await getSessionCookie();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (cookie) {
    headers['X-Session-Token'] = cookie;
  }

  const apiPath = path.startsWith('/api') ? path : `/api${path}`;

  const response = await fetch(`${apiUrl}${apiPath}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return response;
}

export async function getAnnotations(url: string, citedUrls: string[] = []) {
  try {
    const apiUrl = await getApiUrl();
    const uniqueUrls = [...new Set([url, ...citedUrls])];

    const fetchPromises = uniqueUrls.map(async (u) => {
      try {
        const res = await fetch(`${apiUrl}/api/targets?source=${encodeURIComponent(u)}`);
        if (!res.ok) return { annotations: [], highlights: [], bookmarks: [] };
        return await res.json();
      } catch {
        return { annotations: [], highlights: [], bookmarks: [] };
      }
    });

    const results = await Promise.all(fetchPromises);
    const allItems: any[] = [];
    const seenIds = new Set<string>();

    results.forEach((data) => {
      const items = [
        ...(data.annotations || []),
        ...(data.highlights || []),
        ...(data.bookmarks || []),
      ];
      items.forEach((item: any) => {
        const id = item.uri || item.id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          allItems.push(item);
        }
      });
    });

    return allItems;
  } catch (error) {
    console.error('Get annotations error:', error);
    return [];
  }
}

export async function createAnnotation(data: {
  url: string;
  text: string;
  title?: string;
  selector?: TextSelector;
}) {
  try {
    const res = await apiRequest('/annotations', {
      method: 'POST',
      body: JSON.stringify({
        url: data.url,
        text: data.text,
        title: data.title,
        selector: data.selector,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      return { success: false, error };
    }

    return { success: true, data: await res.json() };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function createBookmark(data: { url: string; title?: string }) {
  try {
    const res = await apiRequest('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ url: data.url, title: data.title }),
    });

    if (!res.ok) {
      const error = await res.text();
      return { success: false, error };
    }

    return { success: true, data: await res.json() };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function createHighlight(data: {
  url: string;
  title?: string;
  selector: TextSelector;
  color?: string;
}) {
  try {
    const res = await apiRequest('/highlights', {
      method: 'POST',
      body: JSON.stringify({
        url: data.url,
        title: data.title,
        selector: data.selector,
        color: data.color,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      return { success: false, error };
    }

    return { success: true, data: await res.json() };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getUserBookmarks(did: string) {
  try {
    const res = await apiRequest(`/users/${did}/bookmarks`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || data || [];
  } catch (error) {
    console.error('Get bookmarks error:', error);
    return [];
  }
}

export async function getUserHighlights(did: string) {
  try {
    const res = await apiRequest(`/users/${did}/highlights`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || data || [];
  } catch (error) {
    console.error('Get highlights error:', error);
    return [];
  }
}

export async function getUserCollections(did: string) {
  try {
    const res = await apiRequest(`/collections?author=${encodeURIComponent(did)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || data || [];
  } catch (error) {
    console.error('Get collections error:', error);
    return [];
  }
}

export async function addToCollection(collectionUri: string, annotationUri: string) {
  try {
    const res = await apiRequest(`/collections/${encodeURIComponent(collectionUri)}/items`, {
      method: 'POST',
      body: JSON.stringify({ annotationUri, position: 0 }),
    });

    if (!res.ok) {
      const error = await res.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getItemCollections(annotationUri: string): Promise<string[]> {
  try {
    const res = await apiRequest(
      `/collections/containing?uri=${encodeURIComponent(annotationUri)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Get item collections error:', error);
    return [];
  }
}

export async function getReplies(uri: string) {
  try {
    const res = await apiRequest(`/annotations/${encodeURIComponent(uri)}/replies`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || data || [];
  } catch (error) {
    console.error('Get replies error:', error);
    return [];
  }
}

export async function createReply(data: {
  parentUri: string;
  parentCid: string;
  rootUri: string;
  rootCid: string;
  text: string;
}) {
  try {
    const res = await apiRequest('/replies', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
