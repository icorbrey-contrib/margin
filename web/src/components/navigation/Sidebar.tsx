import React, { useEffect, useState } from "react";
import {
  Home,
  Bookmark,
  PenTool,
  Settings,
  LogOut,
  Bell,
  Sun,
  Moon,
  Monitor,
  Folder,
} from "lucide-react";
import { useStore } from "@nanostores/react";
import { $user, logout } from "../../store/auth";
import { $theme, cycleTheme } from "../../store/theme";
import { getUnreadNotificationCount } from "../../api/client";
import { Link, useLocation } from "react-router-dom";
import { Avatar, CountBadge } from "../ui";

export default function Sidebar() {
  const user = useStore($user);
  const theme = useStore($theme);
  const location = useLocation();
  const currentPath = location.pathname;
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const checkNotifications = async () => {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems = [
    { icon: Home, label: "Feed", href: "/home" },
    {
      icon: Bell,
      label: "Activity",
      href: "/notifications",
      badge: unreadCount,
    },
    { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
    { icon: PenTool, label: "Highlights", href: "/highlights" },
    { icon: Folder, label: "Collections", href: "/collections" },
  ];

  if (!user) return null;

  return (
    <aside className="sticky top-0 h-screen w-[240px] hidden md:flex flex-col justify-between py-5 px-4 z-50">
      <div className="flex flex-col gap-8">
        <Link
          to="/home"
          className="px-3 hover:opacity-80 transition-opacity w-fit"
        >
          <img src="/logo.svg" alt="Margin" className="w-9 h-9" />
        </Link>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              currentPath === item.href ||
              (item.href !== "/home" && currentPath.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-[15px] group ${
                  isActive
                    ? "font-bold text-surface-900 dark:text-white bg-surface-100 dark:bg-surface-800"
                    : "font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/50 hover:text-surface-900 dark:hover:text-white"
                }`}
              >
                <item.icon
                  size={22}
                  className={`transition-colors ${isActive ? "text-primary-600 dark:text-primary-400" : ""}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="flex-1">{item.label}</span>
                {(item.badge ?? 0) > 0 && (
                  <CountBadge count={item.badge ?? 0} />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative group">
        <Link
          to={`/profile/${user.did}`}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors w-full"
        >
          <Avatar did={user.did} avatar={user.avatar} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-surface-900 dark:text-white truncate text-sm">
              {user.displayName || user.handle}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
              @{user.handle}
            </p>
          </div>
        </Link>

        <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-surface-900 rounded-xl shadow-xl border border-surface-100 dark:border-surface-800 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-bottom scale-95 group-hover:scale-100">
          <button
            onClick={cycleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 text-sm font-medium text-surface-700 dark:text-surface-300 w-full transition-colors"
          >
            {theme === "light" ? (
              <Sun size={18} />
            ) : theme === "dark" ? (
              <Moon size={18} />
            ) : (
              <Monitor size={18} />
            )}
            <span className="flex-1 text-left">
              {theme === "light"
                ? "Light"
                : theme === "dark"
                  ? "Dark"
                  : "System"}
            </span>
          </button>
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 text-sm font-medium text-surface-700 dark:text-surface-300 transition-colors"
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
          <div className="h-px bg-surface-100 dark:bg-surface-800 my-1" />
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 dark:text-red-400 w-full text-left transition-colors"
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
