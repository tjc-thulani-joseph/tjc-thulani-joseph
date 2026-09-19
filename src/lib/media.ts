import { services } from "@/services";

/** Durable identity for a Supabase Storage object. */
export interface MediaRef {
  bucket: string;
  path: string;
  name?: string;
  mimeType?: string | null;
  size?: number;
}

export const PRIVATE_BUCKETS = ["documents"];
export type ExternalMediaProvider = "youtube" | "spotify" | "direct";

type MetadataBag = Record<string, unknown> | null | undefined;

function isRef(value: unknown): value is MediaRef {
  return typeof value === "object" && value !== null &&
    typeof (value as MediaRef).bucket === "string" &&
    typeof (value as MediaRef).path === "string" && (value as MediaRef).path.length > 0;
}

export function getMediaRef(metadata: MetadataBag, key: string): MediaRef | null {
  const raw = (metadata ?? {})[key];
  return isRef(raw) ? raw : null;
}

export function mediaUrl(ref: MediaRef | null | undefined): string | null {
  if (!ref || PRIVATE_BUCKETS.includes(ref.bucket)) return null;
  try { return services().storage.publicUrl(ref.bucket, ref.path); } catch { return null; }
}

/** Accept only administrator-provided HTTP(S) URLs. */
export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

function youtubeId(url: URL): string | null {
  if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
  if (url.hostname === "youtube.com" || url.hostname === "www.youtube.com" || url.hostname === "m.youtube.com" || url.hostname === "music.youtube.com") {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
    return match?.[1] ?? null;
  }
  return null;
}

export function externalMediaProvider(value: unknown): ExternalMediaProvider | null {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  if (youtubeId(url)) return "youtube";
  if (url.hostname === "open.spotify.com") return "spotify";
  return "direct";
}

/** Builds provider URLs from parsed IDs; arbitrary iframe HTML is never accepted. */
export function externalEmbedUrl(value: unknown): string | null {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  const id = youtubeId(url);
  if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  if (url.hostname === "open.spotify.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["track", "album", "playlist", "artist", "episode", "show"].includes(parts[0]!)) {
      return `https://open.spotify.com/embed/${encodeURIComponent(parts[0]!)}/${encodeURIComponent(parts[1]!)}`;
    }
  }
  return null;
}

export async function mediaSignedUrl(ref: MediaRef, expiresIn = 3600): Promise<string | null> {
  const result = await services().storage.signedUrl(ref.bucket, ref.path, expiresIn);
  return result.error ? null : result.data.url;
}

export function resolveMedia(metadata: MetadataBag, key: string, fallback: string | null | undefined): string | null {
  return mediaUrl(getMediaRef(metadata, key)) ?? safeExternalUrl((metadata ?? {})[`${key}_url`]) ?? safeExternalUrl(fallback);
}

export function fileNameOf(ref: MediaRef | null | undefined) {
  if (!ref) return "";
  return ref.name ?? ref.path.split("/").pop() ?? ref.path;
}
