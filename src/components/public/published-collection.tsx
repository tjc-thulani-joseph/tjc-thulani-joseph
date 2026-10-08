import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/layout/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { services } from "@/services";
import type { BaseRecord } from "@/types";
import { SafeImage } from "@/components/public/home/safe-image";

/** A published content row as stored in every TJC OS content table. */
export interface PublishedRecord extends BaseRecord {
  title: string | null;
  slug: string | null;
  description: string | null;
  body: string | null;
  url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  published_at: string | null;
}

interface Props {
  /** Supabase table backing this page. */
  resource: string;
  emptyTitle: string;
  emptyBody: string;
  /** Render the long-form body (used by the biography page). */
  showBody?: boolean;
}

/**
 * Reads published records straight from Supabase through the service layer and
 * renders them in the existing surface-panel style. Falls back to the same
 * honest empty state the page shipped with — no mock data, no design changes.
 */
export function PublishedCollection({ resource, emptyTitle, emptyBody, showBody = false }: Props) {
  const query = useQuery({
    queryKey: ["public", resource],
    queryFn: () => services().repository<PublishedRecord>(resource).list({ status: "published", perPage: 48 }),
  });

  if (query.isPending) {
    return (
      <section className="container-tjc section-y">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  const items = query.data?.data?.items ?? [];
  if (query.data?.error || items.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <section className="container-tjc section-y">
      <div className={showBody ? "mx-auto max-w-3xl space-y-8" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
        {items.map((item) => {
          const card = (
            <article key={item.id} className="surface-panel h-full overflow-hidden rounded-2xl">
              {item.thumbnail_url && !showBody && (
                <SafeImage
                  src={item.thumbnail_url}
                  alt={item.title ?? ""}
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="p-6">
                {item.category && (
                  <p className="text-xs uppercase tracking-[0.28em] text-gold">{item.category}</p>
                )}
                <h2 className="mt-3 font-display text-xl font-semibold">{item.title ?? "Untitled"}</h2>
                {item.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                )}
                {showBody && item.body && (
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                )}
              </div>
            </article>
          );

          return item.url && !showBody ? (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="block transition-transform hover:-translate-y-0.5"
            >
              {card}
            </a>
          ) : (
            card
          );
        })}
      </div>
    </section>
  );
}
