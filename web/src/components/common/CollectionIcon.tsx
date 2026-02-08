import React from "react";
import { Folder } from "lucide-react";
import { ICON_MAP } from "./iconMap";

interface CollectionIconProps {
  icon?: string;
  size?: number;
  className?: string;
}

export default function CollectionIcon({
  icon,
  size = 22,
  className = "",
}: CollectionIconProps) {
  if (!icon) {
    return <Folder size={size} className={className} />;
  }

  if (icon === "icon:semble") {
    return (
      <img
        src="/semble-logo.svg"
        alt="Semble"
        style={{ width: size, height: size, objectFit: "contain" }}
        className={className}
      />
    );
  }

  if (icon.startsWith("icon:")) {
    const iconName = icon.replace("icon:", "");
    const IconComponent = ICON_MAP[iconName];
    if (IconComponent) {
      return <IconComponent size={size} className={className} />;
    }
    return <Folder size={size} className={className} />;
  }

  return (
    <span
      style={{ fontSize: `${size * 0.8}px`, lineHeight: 1 }}
      className={className}
    >
      {icon}
    </span>
  );
}
