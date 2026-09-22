import { useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import type { ContentRecord } from "@/types";

/**
 * Shared homepage data hook. Reads published, non-deleted records through the
 * existing service/repository layer — newest first. Every homepage section
 * consumes this; nothing queries Supabase directly.
 */
export function usePublished(resource: string, limit = 6) {
  const query = useQuery({
    queryKey: ["home", resource, limit],
    queryFn: () =>
      services()
        .repository<ContentRecord>(resource)
        .list({ status: "published", perPage: limit, orderBy: "published_at" }),
  });
  const items = query.data?.error ? [] : (query.data?.data?.items ?? []);
  return { items, pending: query.isPending };
}

/** Reads a trimmed string out of a record's metadata jsonb. */
export function meta(item: ContentRecord, key: string): string | null {
  const value = (item.metadata ?? {})[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function metaFlag(item: ContentRecord, key: string): boolean {
  return (item.metadata ?? {})[key] === true;
}

/** Formats an ISO date for display; returns null for missing/invalid values. */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** Featured-flagged records first, preserving the newest-first order otherwise. */
export function featuredFirst(items: ContentRecord[]): ContentRecord[] {
  return [...items].sort((a, b) => Number(metaFlag(b, "featured")) - Number(metaFlag(a, "featured")));
}
