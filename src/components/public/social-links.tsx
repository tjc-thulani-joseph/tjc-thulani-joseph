import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  Facebook,
  Instagram,
  Music2,
  Send,
} from "lucide-react";
import { services } from "@/services";
import type { ContentRecord } from "@/types";
import { safeExternalUrl } from "@/lib/media";

type SocialLinksProps = {
  title?: string;
  mode?: "compact" | "directory";
};

type BrandPlatform =
  | "youtube"
  | "facebook"
  | "instagram"
  | "spotify"
  | "tiktok"
  | "apple-music";

function platformFromLink(link: ContentRecord) {
  const title = String(link.title ?? "").toLowerCase();

  const url = String(
    link.url ??
      (typeof link.metadata?.url === "string"
        ? link.metadata.url
        : ""),
  ).toLowerCase();

  if (
    title.includes("youtube") ||
    url.includes("youtube.com") ||
    url.includes("youtu.be")
  ) {
    return "youtube";
  }

  if (
    title.includes("facebook") ||
    url.includes("facebook.com")
  ) {
    return "facebook";
  }

  if (
    title.includes("instagram") ||
    url.includes("instagram.com")
  ) {
    return "instagram";
  }

  if (
    title.includes("spotify") ||
    url.includes("spotify.com")
  ) {
    return "spotify";
  }

  if (
    title.includes("tiktok") ||
    url.includes("tiktok.com")
  ) {
    return "tiktok";
  }

  if (
    title.includes("apple music") ||
    title.includes("applemusic") ||
    url.includes("music.apple.com")
  ) {
    return "apple-music";
  }

  return "generic";
}

/*
 * Small inline brand marks.
 *
 * These are intentionally local SVGs so the TJC build does not depend
 * on an npm icon package or a project terminal installation.
 */
function BrandIcon({
  platform,
}: {
  platform: BrandPlatform;
}) {
  switch (platform) {
    case "youtube":
      return (
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.7V8.3l6.5 3.7-6.5 3.7Z" />
        </svg>
      );

    case "tiktok":
      return (
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M19.6 7.1a5.9 5.9 0 0 1-3.5-1.1v7.1a5.9 5.9 0 1 1-5.1-5.8v3a2.9 2.9 0 1 0 2.1 2.8V2h3a5.9 5.9 0 0 0 3.5 2.7v2.4Z" />
        </svg>
      );

    case "facebook":
      return (
        <Facebook
          className="size-5 fill-current"
          aria-hidden="true"
        />
      );

    case "instagram":
      return (
        <Instagram
          className="size-5"
          aria-hidden="true"
        />
      );

    case "spotify":
      return (
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4a.75.75 0 0 1-1 .2c-2.7-1.7-6.1-2.1-10.1-1.1a.75.75 0 1 1-.4-1.4c4.4-1.2 8.2-.7 11.2 1.2.4.2.5.7.3 1.1Zm1.3-2.9a.95.95 0 0 1-1.3.3c-3.1-1.9-7.8-2.5-11.4-1.4a.95.95 0 1 1-.6-1.8c4.2-1.3 9.4-.7 13 1.5.4.3.5.9.3 1.4Zm.1-3a1.15 1.15 0 0 1-1.6.4c-3.6-2.1-9.4-2.6-13.6-1.4a1.15 1.15 0 1 1-.7-2.2c4.9-1.5 11.3-.9 15.5 1.6.6.3.8 1.1.4 1.6Z" />
        </svg>
      );

    case "apple-music":
      return (
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M16.8 2.8c.2 1-.1 2-.8 2.8-.7.8-1.7 1.3-2.7 1.2-.2-1 .1-2 .8-2.8.7-.7 1.7-1.2 2.7-1.2ZM20.2 17.4c-.5 1.1-1 2-1.7 2.9-.8 1-1.8 2.2-3.2 2.2-1.2 0-1.5-.7-3-.7s-1.9.7-3 .7c-1.4 0-2.5-1.2-3.3-2.2C3.8 17.9 2.9 14 4.4 11.2c1-1.8 2.7-3 4.6-3 .9 0 1.8.4 2.5.7.6.2 1.1.4 1.5.4.4 0 .9-.2 1.6-.5.8-.3 1.7-.7 2.6-.6 1.8.1 3.5 1 4.4 2.5-1.6 1-2.5 2.6-2.5 4.5 0 2 1.1 3.6 2.8 4.2-.4 1.1-.9 2.1-1.7 3Z" />
        </svg>
      );

    default:
      return (
        <Send
          className="size-5"
          aria-hidden="true"
        />
      );
  }
}

function PlatformIcon({
  platform,
}: {
  platform: string;
}) {
  if (
    platform === "youtube" ||
    platform === "tiktok" ||
    platform === "spotify" ||
    platform === "apple-music"
  ) {
    return (
      <BrandIcon
        platform={platform}
      />
    );
  }

  if (platform === "facebook") {
    return (
      <Facebook
        className="size-5 fill-current"
        aria-hidden="true"
      />
    );
  }

  if (platform === "instagram") {
    return (
      <Instagram
        className="size-5"
        aria-hidden="true"
      />
    );
  }

  return (
    <Send
      className="size-5"
      aria-hidden="true"
    />
  );
}

function getLinkUrl(link: ContentRecord) {
  const metadata = link.metadata ?? {};

  return safeExternalUrl(
    link.url ??
      (typeof metadata.url === "string"
        ? metadata.url
        : null),
  );
}

function getHandle(link: ContentRecord) {
  return typeof link.metadata?.handle === "string"
    ? link.metadata.handle
    : null;
}

export function usePublishedSocialLinks(
  limit = 20,
) {
  const query = useQuery({
    queryKey: [
      "public",
      "social_links",
      limit,
    ],

    queryFn: () =>
      services()
        .repository<ContentRecord>(
          "social_links",
        )
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

export function HomepageQuickLinks() {
  const { links, pending } =
    usePublishedSocialLinks();

  if (
    pending ||
    links.length === 0
  ) {
    return null;
  }

  const quickLinks = links
    .filter((link) =>
      Boolean(
        link.metadata?.homepage_quick_link,
      ),
    )
    .sort(
      (a, b) =>
        (a.position ?? 9999) -
        (b.position ?? 9999),
    )
    .slice(0, 4);

  if (quickLinks.length === 0) {
    return null;
  }

  return (
    <div
      data-tjc-slot="homepage-quick-links"
      className="mb-8 flex items-center gap-3"
    >
      <span className="sr-only">
        TJC quick links
      </span>

      <div className="flex items-center gap-2">
        {quickLinks.map((link) => {
          const url = getLinkUrl(link);
          const platform =
            platformFromLink(link);

          if (
            !url ||
            platform === "generic"
          ) {
            return null;
          }

          return (
            <a
              key={link.id}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Open TJC on ${
                link.title ??
                "this platform"
              }`}
              title={
                link.title ??
                "Official platform"
              }
              className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/25 text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <BrandIcon
                platform={
                  platform as BrandPlatform
                }
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function SocialLinks({
  title = "Follow TJC",
  mode = "compact",
}: SocialLinksProps) {
  const { links, pending } =
    usePublishedSocialLinks();

  if (
    pending ||
    links.length === 0
  ) {
    return null;
  }

  if (mode === "directory") {
    return (
      <section className="container-tjc section-y">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => {
            const url = getLinkUrl(link);

            if (!url) {
              return null;
            }

            const platform =
              platformFromLink(link);
            const handle =
              getHandle(link);

            return (
              <a
                key={link.id}
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="surface-panel group rounded-2xl border border-border p-6 transition-all hover:-translate-y-1 hover:border-gold/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-secondary text-gold">
                    <PlatformIcon
                      platform={platform}
                    />
                  </div>

                  <ExternalLink
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>

                <h2 className="mt-5 font-display text-xl font-semibold">
                  {link.title ??
                    "Official platform"}
                </h2>

                {handle && (
                  <p className="mt-1 text-sm text-gold">
                    {handle}
                  </p>
                )}

                {link.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {link.description}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="tjc-social-links"
      className="flex items-center gap-3"
    >
      <h2
        id="tjc-social-links"
        className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold"
      >
        {title}
      </h2>

      <div className="flex items-center gap-1.5">
        {links.map((link) => {
          const url = getLinkUrl(link);

          if (!url) {
            return null;
          }

          const platform =
            platformFromLink(link);

          return (
            <a
              key={link.id}
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Follow TJC on ${
                link.title ??
                "this platform"
              }`}
              title={
                link.title ??
                "Official platform"
              }
              className="grid size-9 place-items-center rounded-full border border-border bg-background/40 text-muted-foreground transition-all hover:border-gold/60 hover:bg-gold/10 hover:text-gold"
            >
              <PlatformIcon
                platform={platform}
              />
            </a>
          );
        })}
      </div>
    </section>
  );
}
