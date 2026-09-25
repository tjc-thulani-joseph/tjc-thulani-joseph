/**
 * Integration registry — architecture only.
 *
 * TJC AI is the application's AI system.
 *
 * External AI engines are implementation details of TJC AI
 * and therefore do not appear as top-level TJC OS integrations.
 *
 * Secrets live only in secure server-side configuration.
 */

export type IntegrationCategory =
  | "ai"
  | "social"
  | "music"
  | "messaging"
  | "commerce";

export interface IntegrationDefinition {
  key: string;
  label: string;
  category: IntegrationCategory;

  /**
   * Environment variable names used by the integration.
   *
   * Values never live in source code.
   */
  envKeys: string[];

  enabled: boolean;
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    key: "tjc-ai",
    label: "TJC AI",
    category: "ai",
    envKeys: [],
    enabled: false,
  },

  {
    key: "youtube",
    label: "YouTube",
    category: "social",
    envKeys: ["YOUTUBE_API_KEY"],
    enabled: false,
  },

  {
    key: "facebook",
    label: "Facebook",
    category: "social",
    envKeys: ["FACEBOOK_APP_ID"],
    enabled: false,
  },

  {
    key: "instagram",
    label: "Instagram",
    category: "social",
    envKeys: ["INSTAGRAM_APP_ID"],
    enabled: false,
  },

  {
    key: "tiktok",
    label: "TikTok",
    category: "social",
    envKeys: ["TIKTOK_CLIENT_KEY"],
    enabled: false,
  },

  {
    key: "linkedin",
    label: "LinkedIn",
    category: "social",
    envKeys: ["LINKEDIN_CLIENT_ID"],
    enabled: false,
  },

  {
    key: "spotify",
    label: "Spotify",
    category: "music",
    envKeys: ["SPOTIFY_CLIENT_ID"],
    enabled: false,
  },

  {
    key: "apple-music",
    label: "Apple Music",
    category: "music",
    envKeys: ["APPLE_MUSIC_TOKEN"],
    enabled: false,
  },

  {
    key: "email",
    label: "Transactional email",
    category: "messaging",
    envKeys: ["EMAIL_API_KEY"],
    enabled: false,
  },

  {
    key: "push",
    label: "Push notifications",
    category: "messaging",
    envKeys: ["PUSH_PUBLIC_KEY"],
    enabled: false,
  },

  {
    key: "payments",
    label: "Payments",
    category: "commerce",
    envKeys: ["PAYMENTS_API_KEY"],
    enabled: false,
  },
];
