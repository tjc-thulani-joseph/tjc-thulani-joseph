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
  | "direct";

export interface ExternalMediaLink {
  key: string;
  label: string;
  url: string;
  provider: ExternalMediaProvider;
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
  if (!ref || PRIVATE_BUCKETS.includes(ref.bucket as never)) {
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

/** Accept only administrator-provided HTTP(S) URLs. */
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

function youtubeId(url: URL): string | null {
  if (url.hostname === "youtu.be") {
    return (
      url.pathname.slice(1).split("/")[0] ||
      null
    );
  }

  if (
    url.hostname === "youtube.com" ||
    url.hostname === "www.youtube.com" ||
    url.hostname === "m.youtube.com" ||
    url.hostname === "music.youtube.com"
  ) {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    const match = url.pathname.match(
      /^\/(?:embed|shorts|live)\/([^/?]+)/,
    );

    return match?.[1] ?? null;
  }

  return null;
}

function spotifyId(url: URL): {
  type: string;
  id: string;
} | null {
  if (url.hostname !== "open.spotify.com") {
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
    url.hostname === "music.apple.com" ||
    url.hostname === "itunes.apple.com"
  ) {
    return "apple-music";
  }

  if (
    url.hostname === "soundcloud.com" ||
    url.hostname === "on.soundcloud.com"
  ) {
    return "soundcloud";
  }

  if (
    url.hostname === "vimeo.com" ||
    url.hostname === "www.vimeo.com" ||
    url.hostname === "player.vimeo.com"
  ) {
    return "vimeo";
  }

  return "direct";
}

/**
 * Builds safe provider embed URLs where supported.
 *
 * Arbitrary iframe HTML is never accepted.
 */
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
    )}/${encodeURIComponent(spotify.id)}`;
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
    const url = safeExternalUrl(source[key]);

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
        label: externalMediaLabel(provider),
        url,
        provider,
      },
    ];
  });
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

export function resolveMedia(
  metadata: MetadataBag,
  key: string,
  fallback: string | null | undefined,
): string | null {
  return (
    mediaUrl(
      getMediaRef(metadata, key),
    ) ??
    safeExternalUrl(
      (metadata ?? {})[`${key}_url`],
    ) ??
    safeExternalUrl(fallback)
  );
}

export function fileNameOf(
  ref: MediaRef | null | undefined,
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
