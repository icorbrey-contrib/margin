import { atom } from "nanostores";

export type FeedLayout = "list" | "mosaic";

const STORAGE_KEY = "margin:feed-layout";

function getInitial(): FeedLayout {
  if (typeof window === "undefined") return "list";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "mosaic") return "mosaic";
  return "list";
}

export const $feedLayout = atom<FeedLayout>(getInitial());

export function setFeedLayout(layout: FeedLayout) {
  $feedLayout.set(layout);
  localStorage.setItem(STORAGE_KEY, layout);
}
