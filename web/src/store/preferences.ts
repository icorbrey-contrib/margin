import { atom } from "nanostores";
import { getPreferences, updatePreferences } from "../api/client";

export interface Preferences {
  externalLinkSkippedHostnames: string[];
}

export const $preferences = atom<Preferences>({
  externalLinkSkippedHostnames: [],
});

export async function loadPreferences() {
  const prefs = await getPreferences();
  $preferences.set({
    externalLinkSkippedHostnames: prefs.externalLinkSkippedHostnames || [],
  });
}

export async function addSkippedHostname(hostname: string) {
  const current = $preferences.get();
  if (current.externalLinkSkippedHostnames.includes(hostname)) return;

  const newHostnames = [...current.externalLinkSkippedHostnames, hostname];
  $preferences.set({
    ...current,
    externalLinkSkippedHostnames: newHostnames,
  });

  await updatePreferences({
    externalLinkSkippedHostnames: newHostnames,
  });
}
