import { ExternalLink, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/services";
import type { ContentRecord } from "@/types";
import { safeExternalUrl } from "@/lib/media";

export function usePublishedSocialLinks(limit = 20) {
  const query = useQuery({
    queryKey: ["public", "social_links", limit],

    queryFn: () =>
      services()
        .repository<ContentRecord>("social_links")
        .list({
          status: "published",
          perPage: limit,
          orderBy: "position",
          ascending: true,
        }),
  });

  const links = query.data?.error
    ? []
    : (query.data?.data?.items ?? []);

  return {
    links,
    pending: query.isPending,
    error: query.data?.error ?? null,
  };
}

export function SocialLinks({
  title = "Follow TJC",
}: {
  title?: string;
}) {
  const { links, pending } = usePublishedSocialLinks();

  if (pending || links.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="tjc-social-links"
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <Share2
          className="size-4 text-gold"
          aria-hidden
        />

        <h2
          id="tjc-social-links"
          className="text-xs uppercase tracking-[0.24em] text-gold"
        >
          {title}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const url = safeExternalUrl(link.url);

          if (!url) {
            return null;
          }

          const handle =
            typeof link.metadata?.handle === "string"
              ? link.metadata.handle
              : null;

          return (
            <a
              key={link.id}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-gold/60 hover:text-foreground"
            >
              <span>{link.title ?? "Platform"}</span>

              {handle && (
                <span className="text-xs text-muted-foreground/70">
                  {handle}
                </span>
              )}

              <ExternalLink
                className="size-3.5"
                aria-hidden
              />
            </a>
          );
        })}
      </div>
    </section>
  );
}
