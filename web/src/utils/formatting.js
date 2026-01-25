export function getLinkIconType(url) {
  if (!url) return "link";
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes("github.com")) return "github";
    if (hostname.includes("bsky.app")) return "bluesky";
    if (hostname.includes("linkedin.com")) return "linkedin";
    if (hostname.includes("tangled.org")) return "tangled";
    if (hostname.includes("youtube.com")) return "youtube";
  } catch {
    /* ignore */
  }
  return "link";
}

export function formatUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    /* ignore */
    return url;
  }
}
