import {
  Folder,
  Star,
  Heart,
  Bookmark,
  Lightbulb,
  Zap,
  Coffee,
  Music,
  Camera,
  Code,
  Globe,
  Flag,
  Tag,
  Box,
  Archive,
  FileText,
  Image,
  Video,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Search,
  Settings,
  User,
  Users,
  Home,
  Briefcase,
  Gift,
  Award,
  Target,
  TrendingUp,
  Activity,
  Cpu,
  Database,
  Cloud,
  Sun,
  Moon,
  Flame,
  Leaf,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  folder: Folder,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  lightbulb: Lightbulb,
  zap: Zap,
  coffee: Coffee,
  music: Music,
  camera: Camera,
  code: Code,
  globe: Globe,
  flag: Flag,
  tag: Tag,
  box: Box,
  archive: Archive,
  file: FileText,
  image: Image,
  video: Video,
  mail: Mail,
  pin: MapPin,
  calendar: Calendar,
  clock: Clock,
  search: Search,
  settings: Settings,
  user: User,
  users: Users,
  home: Home,
  briefcase: Briefcase,
  gift: Gift,
  award: Award,
  target: Target,
  trending: TrendingUp,
  activity: Activity,
  cpu: Cpu,
  database: Database,
  cloud: Cloud,
  sun: Sun,
  moon: Moon,
  flame: Flame,
  leaf: Leaf,
};

interface CollectionIconProps {
  icon?: string;
  size?: number;
  className?: string;
}

export default function CollectionIcon({ icon, size = 18, className = '' }: CollectionIconProps) {
  if (!icon) {
    return <Folder size={size} className={className} />;
  }

  if (icon === 'icon:semble') {
    return (
      <img
        src="/icons/semble-logo.svg"
        alt="Semble"
        style={{ width: size, height: size, objectFit: 'contain' }}
        className={className}
      />
    );
  }

  if (icon.startsWith('icon:')) {
    const iconName = icon.replace('icon:', '');
    const IconComponent = ICON_MAP[iconName];
    if (IconComponent) {
      return <IconComponent size={size} className={className} />;
    }
    return <Folder size={size} className={className} />;
  }

  return (
    <span style={{ fontSize: `${size * 0.065}rem`, lineHeight: 1 }} className={className}>
      {icon}
    </span>
  );
}
