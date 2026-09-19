import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/layout/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { services } from "@/services";
import { resolveMedia } from "@/lib/media";
import type { ContentRecord } from "@/types";

type Kind = "audio" | "video" | "image";

interface Props {
  resource: "songs" | "videos" | "gallery";
  kind: Kind;
  emptyTitle: string;
  emptyBody: string;
}

const MEDIA_KEY: Record<Kind, string> = { audio: "audio", video: "video", image: "image" };
const COVER_KEY: Record<Kind, string> = { audio: "cover", video: "thumbnail", image: "image" };

/**
 * Public renderer for the three media content types. Reads published,
 * non-deleted rows from Supabase and plays the file behind the record's
 * canonical storage reference — no hardcoded or demo media.
 */
export function MediaCollection({ resource, kind, emptyTitle, emptyBody }: Props) {
  const query = useQuery({
    queryKey: ["public", resource],
    queryFn: () =>
      services()
        .repository<ContentRecord>(resource)
        .list({ status: "published", perPage: 48, orderBy: "published_at" }),
  });

  if (query.isPending) {
    return (
      <section className="container-tjc section-y">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const metadata = (item.metadata ?? {}) as Record<string, unknown>;
          const media = resolveMedia(metadata, MEDIA_KEY[kind], item.url);
          const cover = resolveMedia(metadata, COVER_KEY[kind], item.thumbnail_url);
          const artist = typeof metadata['artist'] === "string" ? metadata['artist'] : null;
          const album = typeof metadata['album'] === "string" ? metadata['album'] : null;

          return (
            <article key={item.id} className="surface-panel flex h-full flex-col overflow-hidden rounded-2xl">
              {kind === "image" && media && (
                <img
                  src={media}
                  alt={item.title ?? ""}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
              )}

              {kind === "video" &&
                (media ? (
                  <video
                    controls
                    preload="metadata"
                    className="aspect-video w-full bg-black object-cover"
                    {...(cover ? { poster: cover } : {})}
                  >
                    <source src={media} />
                  </video>
                ) : (
                  cover && <img src={cover} alt={item.title ?? ""} loading="lazy" className="aspect-video w-full object-cover" />
                ))}

              {kind === "audio" && cover && (
                <img src={cover} alt={item.title ?? ""} loading="lazy" className="aspect-square w-full object-cover" />
              )}

              <div className="flex flex-1 flex-col p-6">
                {item.category && (
                  <p className="text-xs uppercase tracking-[0.28em] text-gold">{item.category}</p>
                )}
                <h2 className="mt-3 font-display text-xl font-semibold">{item.title ?? "Untitled"}</h2>
                {(artist || album) && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[artist, album].filter(Boolean).join(" · ")}
                  </p>
                )}
                {item.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                )}
                {kind === "audio" && media && (
                  <audio controls preload="none" src={media} className="mt-5 w-full" />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
