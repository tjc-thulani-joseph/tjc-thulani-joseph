import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  Facebook,
  Instagram,
  Music2,
  Send,
} from "lucide-react";
import {
  siApplemusic,
  siFacebook,
  siSpotify,
  siTiktok,
  siYoutube,
} from "simple-icons";
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

function PlatformIcon({
  platform,
}: {
  platform: string;
}) {
  switch (platform) {
    case "youtube":
      return (
        <span
          aria-hidden
          className="grid size-5 place-items-center rounded-[5px] bg-foreground text-[0.55rem] font-black leading-none text-background"
        >
          YT
        </span>
      );

    case "facebook":
      return (
        <Facebook
          className="size-5 fill-current"
          aria-hidden
        />
      );

    case "instagram":
      return (
        <Instagram
          className="size-5"
          aria-hidden
        />
      );

    case "spotify":
      return (
        <Music2
          className="size-5"
          aria-hidden
        />
      );

    case "tiktok":
      return (
        <span
          aria-hidden
          className="text-sm font-black"
        >
          TT
        </span>
      );

    default:
      return (
        <Send
          className="size-5"
          aria-hidden
        />
      );
  }
}

function BrandIcon({
  platform,
}: {
  platform: BrandPlatform;
}) {
  const icon = {
    youtube: siYoutube,
    facebook: siFacebook,
    spotify: siSpotify,
    tiktok: siTiktok,
    "apple-music": siApplemusic,
  }[platform];

  if (!icon) {
    return null;
  }

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className="size-5"
      style={{ color: `#${icon.hex}` }}
    >
      <path
        d={icon.path}
        fill="currentColor"
      />
    </svg>
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

export function HomepageQuickLinks() {
  const { links, pending } =
    usePublishedSocialLinks();

  if (pending || links.length === 0) {
    return null;
  }

  const quickLinks = links
    .filter(
      (link) =>
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
              className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

  if (pending || links.length === 0) {
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
                    aria-hidden
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
