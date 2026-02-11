import ExtensionDownloadCard from "./ExtensionDownloadCard";
import TrendingTags from "./TrendingTags";
import Footer from "./Footer";
import Search from "./Search";

export const RightSidebar = () => (
  <aside
    className="
      hidden xl:block w-[280px] shrink-0 sticky top-0 h-screen overflow-y-auto
      px-5 py-6 border-l border-surface-200/60 dark:border-surface-800/60
    "
  >
    <div className="space-y-5">
      <Search />
      <ExtensionDownloadCard />
      <TrendingTags />

      <Footer>
        <Footer.Link href="/about">About</Footer.Link>
        <Footer.Link href="/privacy">Privacy</Footer.Link>
        <Footer.Link href="/terms">Terms</Footer.Link>
        <Footer.Link href="https://github.com/margin-at/margin" openInNewTab>
          GitHub
        </Footer.Link>
        <Footer.Link href="https://tangled.org/margin.at/margin" openInNewTab>
          Tangled
        </Footer.Link>
      </Footer>
    </div>
  </aside>
);

export default RightSidebar;
