import { services } from "@/services";

/** Durable identity for a Supabase Storage object. */
export interface MediaRef {
  bucket: string;
  path: string;
  name?: string;
  mimeType?: string | null;
  size?: number;
}

export const PRIVATE_BUCKETS = ["documents"] as const;

export type ExternalMediaProvider =
  | "youtube"
  | "spotify"
  | "apple-music"
  | "soundcloud"
  | "vimeo"
  | "tiktok"
  | "instagram"
  | "direct";

export interface ExternalMediaLink {
  key: string;
  label: string;
  url: string;
  provider: ExternalMediaProvider;
}

export interface ExternalMediaEmbed {
  provider: ExternalMediaProvider;
  url: string;
  title: string;
  className?: string;
  allow?: string;
  allowFullScreen?: boolean;
}

type MetadataBag = Record<string, unknown> | null | undefined;

function isRef(value: unknown): value is MediaRef {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MediaRef).bucket === "string" &&
    typeof (value as MediaRef).path === "string" &&
    (value as MediaRef).path.length > 0
  );
}

export function getMediaRef(
  metadata: MetadataBag,
  key: string,
): MediaRef | null {
  const raw = (metadata ?? {})[key];

  return isRef(raw) ? raw : null;
}

export function mediaUrl(
  ref: MediaRef | null | undefined,
): string | null {
  if (
    !ref ||
    PRIVATE_BUCKETS.includes(ref.bucket as never)
  ) {
    return null;
  }

  try {
    return services().storage.publicUrl(
      ref.bucket,
      ref.path,
    );
  } catch {
    return null;
  }
}

/**
 * Accept only administrator-provided HTTP(S) URLs.
 */
export function safeExternalUrl(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function hostnameIs(
  url: URL,
  hostnames: string[],
): boolean {
  return hostnames.includes(
    url.hostname.toLowerCase(),
  );
}

function youtubeId(
  url: URL,
): string | null {
  if (
    hostnameIs(url, [
      "youtu.be",
    ])
  ) {
    return (
      url.pathname
        .slice(1)
        .split("/")[0] || null
    );
  }

  if (
    !hostnameIs(url, [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com",
    ])
  ) {
    return null;
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }

  const match = url.pathname.match(
    /^\/(?:embed|shorts|live)\/([^/?]+)/,
  );

  return match?.[1] ?? null;
}

function spotifyId(
  url: URL,
): {
  type: string;
  id: string;
} | null {
  if (
    url.hostname !==
    "open.spotify.com"
  ) {
    return null;
  }

  const parts = url.pathname
    .split("/")
    .filter(Boolean);

  if (
    parts.length >= 2 &&
    [
      "track",
      "album",
      "playlist",
      "artist",
      "episode",
      "show",
    ].includes(parts[0]!)
  ) {
    return {
      type: parts[0]!,
      id: parts[1]!,
    };
  }

  return null;
}

function vimeoId(
  url: URL,
): string | null {
  if (
    !hostnameIs(url, [
      "vimeo.com",
      "www.vimeo.com",
      "player.vimeo.com",
    ])
  ) {
    return null;
  }

  const match = url.pathname.match(
    /\/(?:video\/)?(\d+)/,
  );

  return match?.[1] ?? null;
}

function tiktokId(
  url: URL,
): string | null {
  if (
    !hostnameIs(url, [
      "tiktok.com",
      "www.tiktok.com",
      "m.tiktok.com",
    ])
  ) {
    return null;
  }

  const match = url.pathname.match(
    /\/video\/(\d+)/,
  );

  return match?.[1] ?? null;
}

function instagramId(
  url: URL,
): string | null {
  if (
    !hostnameIs(url, [
      "instagram.com",
      "www.instagram.com",
    ])
  ) {
    return null;
  }

  const match = url.pathname.match(
    /^\/(?:p|reel|tv)\/([^/]+)/,
  );

  return match?.[1] ?? null;
}

export function externalMediaProvider(
  value: unknown,
): ExternalMediaProvider | null {
  const safe = safeExternalUrl(value);

  if (!safe) {
    return null;
  }

  const url = new URL(safe);

  if (youtubeId(url)) {
    return "youtube";
  }

  if (spotifyId(url)) {
    return "spotify";
  }

  if (
    hostnameIs(url, [
      "music.apple.com",
      "itunes.apple.com",
    ])
  ) {
    return "apple-music";
  }

  if (
    hostnameIs(url, [
      "soundcloud.com",
      "on.soundcloud.com",
    ])
  ) {
    return "soundcloud";
  }

  if (vimeoId(url)) {
    return "vimeo";
  }

  if (tiktokId(url)) {
    return "tiktok";
  }

  if (instagramId(url)) {
    return "instagram";
  }

  return "direct";
}

export function externalEmbedUrl(
  value: unknown,
): string | null {
  const safe = safeExternalUrl(value);

  if (!safe) {
    return null;
  }

  const url = new URL(safe);

  const youtube = youtubeId(url);

  if (youtube) {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
      youtube,
    )}`;
  }

  const spotify = spotifyId(url);

  if (spotify) {
    return `https://open.spotify.com/embed/${encodeURIComponent(
      spotify.type,
    )}/${encodeURIComponent(
      spotify.id,
    )}`;
  }

  const vimeo = vimeoId(url);

  if (vimeo) {
    return `https://player.vimeo.com/video/${encodeURIComponent(
      vimeo,
    )}`;
  }

  const tiktok = tiktokId(url);

  if (tiktok) {
    return `https://www.tiktok.com/player/v1/${encodeURIComponent(
      tiktok,
    )}`;
  }

  return null;
}
const PROVIDER_LABELS: Record<
  ExternalMediaProvider,
  string
> = {
  youtube: "YouTube",
  spotify: "Spotify",
  "apple-music": "Apple Music",
  soundcloud: "SoundCloud",
  vimeo: "Vimeo",
  tiktok: "TikTok",
  instagram: "Instagram",
  direct: "Open link",
};

export function externalMediaLabel(
  provider: ExternalMediaProvider,
): string {
  return PROVIDER_LABELS[provider];
}

/**
 * Returns known platform links stored in content metadata.
 *
 * URLs are validated before they are exposed to the public UI.
 */
export function getExternalMediaLinks(
  metadata: MetadataBag,
  keys: string[],
): ExternalMediaLink[] {
  const source = metadata ?? {};

  return keys.flatMap((key) => {
    const url = safeExternalUrl(
      source[key],
    );

    if (!url) {
      return [];
    }

    const provider =
      externalMediaProvider(url);

    if (!provider) {
      return [];
    }

    return [
      {
        key,
        label:
          externalMediaLabel(provider),
        url,
        provider,
      },
    ];
  });
}

/**
 * Build the configuration required by the public
 * renderer for providers that have a verified
 * official iframe/player URL.
 *
 * Apple Music and Instagram are intentionally
 * excluded from iframe rendering here.
 *
 * Apple Music requires MusicKit Web.
 * Instagram requires the currently supported
 * Meta/Instagram embed mechanism.
 */
export function getExternalMediaEmbed(
  value: unknown,
): ExternalMediaEmbed | null {
  const provider =
    externalMediaProvider(value);

  const url = safeExternalUrl(value);

  if (!provider || !url) {
    return null;
  }

  const embedUrl =
    externalEmbedUrl(url);

  if (!embedUrl) {
    return null;
  }

  if (provider === "youtube") {
    return {
      provider,
      url: embedUrl,
      title: "YouTube player",
      allow:
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
      allowFullScreen: true,
    };
  }

  if (provider === "spotify") {
    return {
      provider,
      url: embedUrl,
      title: "Spotify player",
      allow:
        "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
      allowFullScreen: true,
    };
  }

  if (provider === "vimeo") {
    return {
      provider,
      url: embedUrl,
      title: "Vimeo player",
      allow:
        "autoplay; fullscreen; picture-in-picture",
      allowFullScreen: true,
    };
  }

  if (provider === "tiktok") {
    return {
      provider,
      url: embedUrl,
      title: "TikTok player",
      allow: "fullscreen",
      allowFullScreen: true,
    };
  }

  return null;
}

export function isDirectMediaUrl(
  value: unknown,
): boolean {
  const safe = safeExternalUrl(value);

  if (!safe) {
    return false;
  }

  const url = new URL(safe);

  if (
    externalMediaProvider(url) !==
    "direct"
  ) {
    return false;
  }

  const pathname =
    url.pathname.toLowerCase();

  return /\.(?:mp3|wav|ogg|m4a|aac|flac|mp4|webm|mov|m4v)$/i.test(
    pathname,
  );
}

export async function mediaSignedUrl(
  ref: MediaRef,
  expiresIn = 3600,
): Promise<string | null> {
  const result =
    await services().storage.signedUrl(
      ref.bucket,
      ref.path,
      expiresIn,
    );

  return result.error
    ? null
    : result.data.url;
}

/**
 * Resolves uploaded media first.
 *
 * This helper remains useful for images and
 * direct media files. Provider page URLs should
 * be handled through getExternalMediaEmbed()
 * rather than passed to <audio>/<video>.
 */
export function resolveMedia(
  metadata: MetadataBag,
  key: string,
  fallback:
    | string
    | null
    | undefined,
): string | null {
  return (
    mediaUrl(
      getMediaRef(
        metadata,
        key,
      ),
    ) ??
    safeExternalUrl(
      (metadata ?? {})[
        `${key}_url`
      ],
    ) ??
    safeExternalUrl(fallback)
  );
}

export function fileNameOf(
  ref:
    | MediaRef
    | null
    | undefined,
) {
  if (!ref) {
    return "";
  }

  return (
    ref.name ??
    ref.path.split("/").pop() ??
    ref.path
  );
    }
