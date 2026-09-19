import { services } from "@/services";

/**
 * Canonical media identity for TJC OS.
 *
 * A content record never stores a temporary/signed URL as its source of truth.
 * It stores the durable Supabase Storage coordinates (bucket + object path)
 * inside the record's `metadata`, and the browsable URL is derived from
 * that reference at render time.
 */
export interface MediaRef {
  bucket: string;
  path: string;
  name?: string;
  mimeType?: string | null;
  size?: number;
}

export const PRIVATE_BUCKETS = ["documents"];

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

/** Reads a canonical media reference out of a record's metadata bag. */
export function getMediaRef(metadata: MetadataBag, key: string): MediaRef | null {
  const raw = (metadata ?? {})[key];
  return isRef(raw) ? raw : null;
}

/** Derives the persistent public URL for a stored object. */
export function mediaUrl(ref: MediaRef | null | undefined): string | null {
  if (!ref || PRIVATE_BUCKETS.includes(ref.bucket)) return null;
  try {
    return services().storage.publicUrl(ref.bucket, ref.path);
  } catch {
    return null;
  }
}

/** Only http(s) URLs may be used as externally hosted content. */
export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Signed URL for objects living in a protected bucket. */
export async function mediaSignedUrl(ref: MediaRef, expiresIn = 3600): Promise<string | null> {
  const result = await services().storage.signedUrl(ref.bucket, ref.path, expiresIn);
  return result.error ? null : result.data.url;
}

/**
 * Resolves the URL to play/show: canonical storage reference first, falling
 * back to a safe external URL and then any legacy column value.
 */
export function resolveMedia(
  metadata: MetadataBag,
  key: string,
  fallback: string | null | undefined,
): string | null {
  return mediaUrl(getMediaRef(metadata, key)) ?? safeExternalUrl((metadata ?? {})[`${key}_url`]) ?? safeExternalUrl(fallback);
}

export function fileNameOf(ref: MediaRef | null | undefined) {
  if (!ref) return "";
  return ref.name ?? ref.path.split("/").pop() ?? ref.path;
}
