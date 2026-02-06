import React from 'react';
import { Home, Bookmark, PenTool, Settings, LogOut, User, Bell, Sun, Moon, Monitor } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { $user, logout } from '../store/auth';
import { $theme, cycleTheme } from '../store/theme';
import { getAvatarUrl, getUnreadNotificationCount } from '../api/client';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

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
        { icon: Home, label: 'Feed', href: '/home' },
        {
            icon: Bell,
            label: 'Activity',
            href: '/notifications',
            badge: unreadCount > 0 ? unreadCount : undefined
        },
        { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
        { icon: PenTool, label: 'Highlights', href: '/highlights' },
        { icon: Settings, label: 'Collections', href: '/collections' },
    ];

    if (!user) return null;

    return (
        <aside className="sticky top-0 h-screen w-[240px] hidden md:flex flex-col justify-between py-4 px-4 z-50">
            <div className="flex flex-col gap-6">
                <Link to="/home" className="px-3 hover:opacity-80 transition-opacity w-fit">
                    <img src="/logo.svg" alt="Margin" className="w-8 h-8 dark:invert" />
                </Link>

                <nav className="flex flex-col gap-1">
                    {navItems.map((item) => {
                        const isActive = currentPath === item.href || currentPath.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center gap-4 px-3 py-3 rounded-full transition-all duration-200 text-lg group ${isActive
                                    ? 'font-bold text-surface-900 dark:text-white'
                                    : 'font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
                                    }`}
                            >
                                <item.icon
                                    size={22}
                                    className={`${isActive ? 'stroke-[2.5px] text-primary-600 dark:text-primary-400' : 'stroke-[2px]'}`}
                                />
                                <span>{item.label}</span>
                                {item.badge && (
                                    <span className="ml-auto bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="relative group">
                <Link
                    to={`/profile/${user.did}`}
                    className="flex items-center gap-3 p-3 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors w-full"
                >
                    {getAvatarUrl(user.did, user.avatar) ? (
                        <img src={getAvatarUrl(user.did, user.avatar)} className="h-10 w-10 rounded-full object-cover bg-surface-100 dark:bg-surface-800" />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 dark:text-surface-500">
                            <User size={20} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 pr-2">
                        <p className="font-bold text-surface-900 dark:text-white truncate text-[15px]">{user.displayName || user.handle}</p>
                        <p className="text-sm text-surface-500 dark:text-surface-400 truncate">@{user.handle}</p>
                    </div>
                </Link>

                <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-100 dark:border-surface-800 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-bottom scale-95 group-hover:scale-100">
                    <button
                        onClick={cycleTheme}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 text-sm font-medium text-surface-700 dark:text-surface-200 w-full"
                    >
                        {theme === 'light' ? <Sun size={18} /> : theme === 'dark' ? <Moon size={18} /> : <Monitor size={18} />}
                        {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
                    </button>
                    <Link to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 text-sm font-medium text-surface-700 dark:text-surface-200">
                        <Settings size={18} />
                        Settings
                    </Link>
                    <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-sm font-medium text-red-600 dark:text-red-400 w-full text-left">
                        <LogOut size={18} />
                        Log out
                    </button>
                </div>
            </div>
        </aside>
    );
}
