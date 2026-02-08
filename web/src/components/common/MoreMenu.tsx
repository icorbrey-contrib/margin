import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { clsx } from "clsx";

export interface MoreMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface MoreMenuProps {
  items: MoreMenuItem[];
  className?: string;
}

export default function MoreMenu({ items, className }: MoreMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => setIsOpen(false);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (items.length === 0) return null;

  return (
    <div className={clsx("relative", className)}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-2 py-1.5 rounded-lg text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
        title="More options"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg py-1 animate-fade-in"
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              disabled={item.disabled}
              className={clsx(
                "w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors text-left",
                item.variant === "danger"
                  ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  : "text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800",
                item.disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {item.icon && (
                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
