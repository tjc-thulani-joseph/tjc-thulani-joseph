/**
 * Single source of truth for public brand metadata and navigation.
 * Update here — every layout, menu and SEO tag reads from this file.
 */
export const SITE = {
  brand: "TJC",
  name: "Thulani Joseph",
  fullName: "TJC | Thulani Joseph",
  system: "TJC OS",
  tagline: "The official digital headquarters of Thulani Joseph.",
  description:
    "The official home of Thulani Joseph — music, films, creative projects, writing and the story behind the work.",
  locale: "en",
} as const;

export type NavItem = {
  label: string;
  to: string;
  description?: string;
};

export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Music", to: "/music" },
  { label: "Videos", to: "/videos" },
  { label: "Gallery", to: "/gallery" },
  { label: "Projects", to: "/projects" },
  { label: "Blog", to: "/blog" },
  { label: "News", to: "/news" },
  { label: "Contact", to: "/contact" },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Links", to: "/links" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];
