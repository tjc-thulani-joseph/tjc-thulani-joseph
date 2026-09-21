/**
 * Single source of truth for public brand metadata and navigation.
 * Update here — every layout, menu and SEO tag reads from this file.
 */
import { TJC_IDENTITY } from "./identity";

export const SITE = {
  brand: TJC_IDENTITY.alternateName,
  name: TJC_IDENTITY.name,
  fullName: TJC_IDENTITY.label,
  system: "TJC OS",
  tagline: "The official digital headquarters of TJC (Thulani Joseph).",
  description: TJC_IDENTITY.description,
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
