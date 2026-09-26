import {
  Activity,
  BarChart3,
  Bot,
  CalendarClock,
  Contact,
  FileText,
  Film,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  Library,
  Mail,
  Music,
  Navigation,
  Search,
  Settings,
  Share2,
  Sparkles,
  User,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface DashboardModule {
  slug: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "Overview" | "Content" | "Audience" | "System";
  /** Minimum role required to open the module. */
  minRole: Role;
  resource?: string;
}

export const DASHBOARD_MODULES: DashboardModule[] = [
  {
    slug: "manage-center",
    label: "TJC Manage Center",
    description:
      "Central management layer for TJC OS configuration and operations.",
    icon: Settings,
    group: "System",
    minRole: "ceo",
  },

  {
    slug: "overview",
    label: "overview os",
    description: "System status and quick actions across TJC OS.",
    icon: LayoutDashboard,
    group: "Overview",
    minRole: "editor",
  },

  {
    slug: "analytics",
    label: "Analytics os",
    description: "Traffic, engagement and content performance.",
    icon: BarChart3,
    group: "Overview",
    minRole: "admin",
    resource: "analytics",
  },

  {
    slug: "media",
    label: "TJC Media Library",
    description: "Central store for every image, video and document.",
    icon: Library,
    group: "Content",
    minRole: "editor",
    resource: "media_library",
  },

  {
    slug: "music",
    label: "TJC Music Manager",
    description: "Albums, songs, categories and playlists.",
    icon: Music,
    group: "Content",
    minRole: "editor",
    resource: "songs",
  },

  {
    slug: "videos",
    label: "TJC Video Manager",
    description: "Video releases, categories and features.",
    icon: Film,
    group: "Content",
    minRole: "editor",
    resource: "videos",
  },

  {
    slug: "gallery",
    label: "TJC Gallery Manager",
    description: "Photo sets and gallery categories.",
    icon: ImageIcon,
    group: "Content",
    minRole: "editor",
    resource: "gallery",
  },

  {
    slug: "blog",
    label: "TJC Blog Manager",
    description: "Posts, categories and publishing schedule.",
    icon: FileText,
    group: "Content",
    minRole: "editor",
    resource: "posts",
  },

  {
    slug: "biography",
    label: "TJC Biography",
    description: "Story, timeline, skills and achievements.",
    icon: User,
    group: "Content",
    minRole: "editor",
    resource: "biography",
  },

  {
    slug: "projects",
    label: "TJC Projects",
    description: "Creative and business ventures.",
    icon: Sparkles,
    group: "Content",
    minRole: "editor",
    resource: "projects",
  },

  {
    slug: "homepage",
    label: "TJC Homepage Builder",
    description: "Compose and order homepage sections.",
    icon: Workflow,
    group: "Content",
    minRole: "admin",
    resource: "homepage_sections",
  },

  {
    slug: "ai-knowledge",
    label: "TJC AI Knowledge",
    description: "Verified knowledge that TJC AI is allowed to use.",
    icon: Bot,
    group: "Content",
    minRole: "editor",
    resource: "ai_knowledge",
  },

  {
    slug: "messages",
    label: "TJC Messages",
    description: "Direct messages from the contact channels.",
    icon: Mail,
    group: "Audience",
    minRole: "admin",
    resource: "messages",
  },

  {
    slug: "contacts",
    label: "Contact Requests",
    description: "Bookings, collaborations and enquiries.",
    icon: Contact,
    group: "Audience",
    minRole: "admin",
    resource: "contacts",
  },

  {
    slug: "newsletter",
    label: "TJC Newsletter",
    description: "Subscribers and broadcast history.",
    icon: CalendarClock,
    group: "Audience",
    minRole: "admin",
    resource: "newsletter",
  },

  {
    slug: "seo",
    label: "SEO TJC Manage Centre",
    description: "Per-page metadata, structured data and sitemaps.",
    icon: Search,
    group: "System",
    minRole: "admin",
    resource: "seo_settings",
  },

  {
    slug: "navigation",
    label: "Navigation",
    description: "Menus, menu items and link ordering.",
    icon: Navigation,
    group: "System",
    minRole: "admin",
    resource: "navigation",
  },

  {
    slug: "social-links",
    label: "Social Links HQ",
    description: "Manage TJC's official public social and platform links.",
    icon: Share2,
    group: "System",
    minRole: "admin",
    resource: "social_links",
  },

  {
    slug: "settings",
    label: "Site Settings",
    description: "Global configuration and brand details.",
    icon: Settings,
    group: "System",
    minRole: "ceo",
    resource: "site_configuration",
  },

  {
    slug: "activity",
    label: "Activity Logs",
    description: "Audit trail of every change in TJC OS.",
    icon: Activity,
    group: "System",
    minRole: "ceo",
    resource: "activity_logs",
  },

  {
    slug: "ai",
    label: "TJC AI",
    description: "TJC's intelligence, context, tools and automation layer.",
    icon: Bot,
    group: "System",
    minRole: "ceo",
  },

  {
    slug: "ai-management",
    label: "TJC AI Management",
    description:
      "Management console for TJC AI runtime, voice, conversation, knowledge and future intelligence controls.",
    icon: Bot,
    group: "System",
    minRole: "ceo",
  },

  {
    slug: "automation",
    label: "Automation Center",
    description: "Scheduled and event-driven workflows.",
    icon: Globe,
    group: "System",
    minRole: "ceo",
  },
];

export const getModule = (slug: string) =>
  DASHBOARD_MODULES.find((m) => m.slug === slug);
