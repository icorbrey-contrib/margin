import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import TopNav from "./TopNav";
import MobileNav from "./MobileNav";

import { useTheme } from "../context/ThemeContext";

export default function AppLayout({ children }) {
  const { layout } = useTheme();

  return (
    <>
      <div
        className={`layout-wrapper ${layout === "topnav" ? "layout-mode-topnav" : ""}`}
      >
        <TopNav />
        <div className="app-layout">
          {layout !== "topnav" && <LeftSidebar />}
          <main className="main-content">{children}</main>
          {layout !== "topnav" && <RightSidebar />}
        </div>
      </div>
      <MobileNav />
    </>
  );
}
