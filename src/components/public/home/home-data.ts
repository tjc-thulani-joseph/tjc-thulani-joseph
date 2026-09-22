import { useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import type { ContentRecord } from "@/types";

/**
 * Public homepage content contract.
 *
 * The database/RLS layer is the final security boundary:
 *
 *   status = published
 *   AND deleted_at IS NULL
 *
 * The repository also applies the same filters at the
 * application data layer.
 */

export function usePublished(
  resource: string,
  limit = 6,
) {
  const query = useQuery({
    queryKey: ["home", resource, limit],

    queryFn: () =>
      services()
        .repository<ContentRecord>(resource)
        .list({
          status: "published",
          perPage: limit,
          orderBy: "published_at",
        }),
  });

  const items = query.data?.error
    ? []
    : (query.data?.data?.items ?? []);

  return {
    items,
    pending: query.isPending,
    error: query.data?.error ?? null,
  };
}

/**
 * Returns featured content first while preserving the
 * original order of non-featured content.
 *
 * Content can mark itself as featured through metadata.
 */
export function featuredFirst(
  items: ContentRecord[],
): ContentRecord[] {
  return [...items].sort((a, b) => {
    const aFeatured = Boolean(a.metadata?.featured);
    const bFeatured = Boolean(b.metadata?.featured);

    if (aFeatured === bFeatured) {
      return 0;
    }

    return bFeatured ? 1 : -1;
  });
}

/**
 * Formats a published date for public editorial presentation.
 */
export function formatDate(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Homepage Builder public feed.
 *
 * This intentionally uses the same publishing contract as
 * every other public content feed.
 *
 * Nothing marked draft, private, scheduled or archived
 * should reach the public homepage.
 */
export function usePublishedHomepageSections(
  limit = 30,
) {
  const query = useQuery({
    queryKey: ["home", "homepage_sections", limit],

    queryFn: () =>
      services()
        .repository<ContentRecord>("homepage_sections")
        .list({
          status: "published",
          perPage: limit,
          orderBy: "position",
          ascending: true,
        }),
  });

  const sections = query.data?.error
    ? []
    : (query.data?.data?.items ?? []);

  return {
    sections,
    pending: query.isPending,
    error: query.data?.error ?? null,
  };
}
