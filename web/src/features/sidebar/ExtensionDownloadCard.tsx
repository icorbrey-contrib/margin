import { useState } from "react";

export const ExtensionDownloadCard = () => (
  <div
    className="
      rounded-xl p-4 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950/30
      dark:to-primary-900/10 border border-primary-200/40 dark:border-primary-800/30
    "
  >
    <h3 className="font-semibold text-sm mb-1 text-surface-900 dark:text-white">
      Get the Extension
    </h3>
    <p className="text-surface-500 dark:text-surface-400 text-xs mb-3 leading-relaxed">
      Highlight, annotate, and bookmark from any page.
    </p>
    <ExtensionDownloadLink />
  </div>
);

export const ExtensionDownloadLink = () => {
  const [browser] = useState<"chrome" | "firefox" | "edge" | "other">(() => {
    if (typeof navigator === "undefined") return "other";
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return "edge";
    if (/Firefox/i.test(ua)) return "firefox";
    if (/Chrome/i.test(ua)) return "chrome";
    return "other";
  });

  const { browserName, extensionLink } = {
    firefox: {
      extensionLink: "https://addons.mozilla.org/en-US/firefox/addon/margin/",
      browserName: "Firefox",
    },
    chrome: {
      extensionLink:
        "https://chromewebstore.google.com/detail/margin/cgpmbiiagnehkikhcbnhiagfomajncpa",
      browserName: "Chrome",
    },
    edge: {
      extensionLink:
        "https://microsoftedge.microsoft.com/addons/detail/margin/nfjnmllpdgcdnhmmggjihjbidmeadddn",
      browserName: "Edge",
    },
  }[browser];

  return (
    <a
      className="
        flex items-center justify-center w-full px-4 py-2 bg-primary-600 hover:bg-primary-700
        dark:bg-primary-500 dark:hover:bg-primary-400 text-white dark:text-white rounded-lg
        transition-colors text-sm font-medium
      "
      rel="noopener noreferrer"
      href={extensionLink}
      target="_blank"
    >
      Download for {browserName}
    </a>
  );
};

export default ExtensionDownloadCard;
