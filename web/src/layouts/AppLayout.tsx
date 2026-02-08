import React from "react";
import { useStore } from "@nanostores/react";
import Sidebar from "../components/navigation/Sidebar";
import RightSidebar from "../components/navigation/RightSidebar";
import MobileNav from "../components/navigation/MobileNav";
import { $theme } from "../store/theme";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  useStore($theme);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex">
      <Sidebar />

      <div className="flex-1 min-w-0 transition-all duration-200">
        <div className="flex w-full max-w-[1200px] mx-auto">
          <main className="flex-1 w-full min-w-0 py-6 px-3 md:px-5 lg:px-8 pb-20 md:pb-6">
            {children}
          </main>

          <RightSidebar />
        </div>
      </div>

      <MobileNav />
    </div>
  );
}

export function LandingLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-surface-950">{children}</div>
  );
}
